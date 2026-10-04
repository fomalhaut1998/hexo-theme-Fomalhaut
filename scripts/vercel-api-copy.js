/* global hexo */
/**
 * vercel-api-copy —— 让「构建产物仓库」同时带上 Vercel 函数和 Cloudflare Pages 函数
 * ---------------------------------------------------------------------------
 * 背景：本站的部署方式是「本地 hexo generate → 把 public/ 推到 yourname.github.io
 * → Vercel 直接托管那个仓库」。Vercel 只会把仓库根目录的 api/*.js 当成函数，
 * 而 hexo 生成的产物里没有 api/ 目录，函数就不会被部署（访问 /api/... 直接 404）。
 *
 * Cloudflare Pages 不认 Vercel 的 api/ 约定（POST 静态文件直接 405），它的函数约定是仓库
 * 根目录的 functions/。所以这里同时拷两套，两个平台各自认领自己那份：
 *   api/chat/completions.js            →  Vercel 函数，路由 /api/chat/completions
 *   vercel.json                        →  Vercel 函数配置（60 秒超时、内存、区域 hkg1）
 *   functions/api/chat/completions.js  →  Cloudflare Pages Function，同名路由（Pages 里函数优先于静态文件）
 *
 * 真 key 不在这两个文件里：函数运行时从 Vercel 环境变量 DEEPSEEK_API_KEY 读。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIRS = [
  ['api/chat/completions.js', 'api/chat/completions.js'],
  ['vercel.json', 'vercel.json'],
  ['functions/api/chat/completions.js', 'functions/api/chat/completions.js']
];

hexo.extend.filter.register('after_generate', function () {
  const base = hexo.base_dir || process.cwd();
  const pub = path.join(base, 'public');
  PAIRS.forEach(function (pair) {
    const src = path.join(base, pair[0]);
    const dst = path.join(pub, pair[1]);
    try {
      if (!fs.existsSync(src)) {
        hexo.log.warn('vercel-api-copy：找不到 ' + pair[0] + '，跳过（对应平台的 AI 代理会失效）');
        return;
      }
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      hexo.log.info('vercel-api-copy：' + pair[0] + ' → public/' + pair[1]);
    } catch (e) {
      hexo.log.warn('vercel-api-copy 失败：' + pair[0] + ' —— ' + (e && e.message));
    }
  });
});
