#!/usr/bin/env node
/**
 * deploy-vercel —— 一键「代理模式」构建并部署到产物仓库
 * ---------------------------------------------------------------------------
 * 为什么要这个脚本：scripts/ai-chat-inject.js 只有在构建环境里看到
 * DEEPSEEK_API_KEY 时才会把页面配置改成「走同源代理 /api」（真 key 不内联进 HTML）。
 * 手敲 $env:DEEPSEEK_API_KEY=... 太容易忘，忘了就会退回直连 + 空 key，
 * 线上照旧显示「还没配 API Key」。这个脚本自己从 .ai-chat-key 读 key 塞进构建环境，
 * 然后依次执行 hexo clean / generate / deploy。
 *
 * 用法：
 *   npm run deploy:vercel                      正常构建 + 部署
 *   node tools/deploy-vercel.js --dry-run      只看会用什么模式，不真跑
 *
 * 为什么放在 tools/ 而不是 scripts/：
 *   hexo 会把 scripts/ 下每个文件的顶层代码当成插件执行
 *   （node_modules/hexo/lib/hexo/load_plugins.js 的 loadScripts → ctx.loadPlugin），
 *   对所有命令都生效。本文件顶层的 process.exit / spawnSync 一旦被 hexo 加载，
 *   CI 构建会因为「找不到 API Key」直接退出，本机则会套娃执行 hexo。
 *   详见下面那行 require.main 防御检查。
 */
'use strict';

// 防御检查：万一本文件又被挪回 scripts/，被 hexo 加载时立刻返回，绝不干扰构建。
// 直接 node tools/deploy-vercel.js 运行时 require.main === module，正常往下走。
if (require.main !== module) return;

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE = path.join(__dirname, '..');
const DRY = process.argv.indexOf('--dry-run') >= 0;

/** 从站点根目录的 .ai-chat-key 读（.gitignore 里，不会进仓库）。 */
function keyFromFile() {
  try { return fs.readFileSync(path.join(BASE, '.ai-chat-key'), 'utf8').trim(); } catch (e) { return ''; }
}

/** 从 _config.fomalhaut.yml 的 ai_chat: 段里读 api_key（缩进块扫描，不会误抓别的段）。 */
function keyFromYml() {
  try {
    const lines = fs.readFileSync(path.join(BASE, '_config.fomalhaut.yml'), 'utf8').split(/\r?\n/);
    let inside = false;
    for (const line of lines) {
      if (/^ai_chat:\s*$/.test(line)) { inside = true; continue; }
      if (inside && /^\S/.test(line)) break;               // 走出了 ai_chat 段
      if (inside) {
        const m = line.match(/^\s+api_key:\s*(.+?)\s*$/);
        if (m) {
          const v = m[1].replace(/^["']|["']$/g, '').trim();
          return /^sk-/.test(v) ? v : '';
        }
      }
    }
    return '';
  } catch (e) { return ''; }
}

const key = String(process.env.DEEPSEEK_API_KEY || '').trim() || keyFromFile() || keyFromYml();
if (!key) {
  console.error('✗ 没找到 API Key：确认站点根目录有 .ai-chat-key（里面是 sk-… 那一串），或在环境变量里设好 DEEPSEEK_API_KEY。');
  process.exit(1);
}
console.log('✓ Vercel 代理模式：key 已就绪（长度 ' + key.length + '），它只会进函数的环境变量，不会写进页面。');
if (DRY) { console.log('（--dry-run：到此为止，没有执行 hexo）'); process.exit(0); }

const env = Object.assign({}, process.env, { DEEPSEEK_API_KEY: key });
const isWin = process.platform === 'win32';
const steps = [['clean'], ['generate'], ['deploy']];
for (const args of steps) {
  console.log('\n$ hexo ' + args.join(' '));
  const r = spawnSync('hexo', args, { stdio: 'inherit', env: env, cwd: BASE, shell: isWin });
  if (r.error) {
    console.error('✗ 执行 hexo 失败：' + r.error.message);
    console.error('  如果本机不是全局安装 hexo，可以改用 npx：npx hexo ' + args.join(' '));
    process.exit(1);
  }
  if (r.status !== 0) { console.error('✗ hexo ' + args.join(' ') + ' 退出码 ' + r.status); process.exit(r.status || 1); }
}
console.log('\n✓ 完成：产物已推送，Vercel 会用环境变量里的真 key，页面走 /api 代理。');
