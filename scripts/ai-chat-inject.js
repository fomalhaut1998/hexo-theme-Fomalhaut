/* global hexo */
/**
 * ai-chat-inject —— 博客 AI 助手（站点级注入器，不改主题源码）
 * ---------------------------------------------------------------------------
 * 作用：在每个 HTML 页面的 </body> 之前注入两样东西——
 *   1) <script id="ai-chat-boot">window.AI_CHAT_CONFIG = {...}</script>
 *      配置来自 _config.fomalhaut.yml 的 ai_chat: 段（也支持站点 _config.yml）。
 *      API Key 优先取 ai_chat.api_key，为空时读 ai_chat.api_key_file
 *      （默认 .ai-chat-key，已在 .gitignore 里，不会进仓库）。
 *   2) <script defer src="/js/ai-chat.js"></script>   —— 前端本体。
 *
 * 为什么用注入器而不是主题 pug：右侧部件由主题模板渲染，改它要动 themes/ 下的源码；
 * 本文件在站点根 scripts/ 里，hexo.load() 阶段执行，不参与渲染，属于站点侧改动。
 *
 * 关闭方式：_config.fomalhaut.yml → ai_chat.enable: false（或删掉整个 ai_chat 段）。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MARK = 'ai-chat-boot';
const SCRIPT_SRC = '/js/ai-chat.js';

/** 给前端本体带一个版本号（源文件 mtime + 字节数）。
 *  没有它的话浏览器会一直吃缓存：改完 ai-chat.js，访客（包括自己）刷新页面拿到的还是旧脚本。 */
function scriptVer() {
  try {
    const st = fs.statSync(path.join(hexo.base_dir || process.cwd(), 'source/js/ai-chat.js'));
    return '?v=' + Math.floor(st.mtimeMs).toString(36) + '-' + st.size.toString(36);
  } catch (e) { return ''; }
}

const DEFAULTS = {
  enable: true,
  api_base: 'https://api.deepseek.com',
  api_key: '',
  api_key_file: '.ai-chat-key',
  // —— 部署（Vercel）模式：构建环境里有 DEEPSEEK_API_KEY 时前端不内联真 key，改走同源代理 ——
  proxy_api_base: '/api',
  proxy_key_stub: 'via-proxy',
  model: 'deepseek-chat',
  temperature: 0.7,
  max_tokens: 8192,
  system_prompt: '',
  welcome: '',
  first_question: '',
  max_history: 12,
  max_page_chars: 6000,
  storage_key: 'ai_chat_history_v1',
  panel_width: 460,
  panel_height: 640,
  panel_right: 88,
  timeout_ms: 10000
};

/** API Key：先看 api_key，再看 api_key_file（相对站点根目录）。 */
function resolveKey(baseDir, cfg) {
  if (cfg.api_key) return String(cfg.api_key).trim();
  const file = cfg.api_key_file;
  if (!file) return '';
  try {
    const p = path.isAbsolute(file) ? file : path.join(baseDir, file);
    return fs.readFileSync(p, 'utf8').trim();
  } catch (e) {
    return '';
  }
}

hexo.extend.filter.register('after_render:html', function (html) {
  try {
    if (typeof html !== 'string' || html.indexOf('</body>') === -1) return html;
    if (html.indexOf(MARK) !== -1) return html;
    // 只有带右侧部件的页面才注入（没有 #rightside 就没有挂载点）
    if (!/id\s*=\s*["']?rightside["'\s>]/.test(html)) return html;

    const themeCfg = (hexo.theme && hexo.theme.config) || {};
    const siteCfg = (hexo.config && hexo.config.ai_chat) || {};
    const userCfg = themeCfg.ai_chat || {};
    const cfg = Object.assign({}, DEFAULTS, userCfg, siteCfg);
    if (cfg.enable === false) return html;
    const envKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
    const localKey = resolveKey(hexo.base_dir || process.cwd(), cfg);
    // 始终走同源代理：真实 key（无论来自环境变量还是本地文件）只留在服务端，
    // 绝不序列化进客户端 HTML，避免任何访客通过查看源码窃取 API Key。
    cfg.api_base = cfg.proxy_api_base || '/api';
    cfg.api_key = cfg.proxy_key_stub || 'via-proxy';
    cfg.proxied = true;
    cfg.has_key = !!(envKey || localKey);

    const json = JSON.stringify(cfg)
      .replace(/</g, '\\u003c')          // 防止 </script> 提前闭合
      .replace(/\u2028|\u2029/g, '');   // 行分隔符会让整个脚本语法错误
    const boot = '<script id="' + MARK + '">window.AI_CHAT_CONFIG=' + json + ';</script>'
      + '<script defer src="' + SCRIPT_SRC + scriptVer() + '"></script>';
    return html.replace(/<\/body>/i, boot + '</body>');
  } catch (err) {
    try { hexo.log.warn('[ai-chat] 注入失败：' + (err && err.message)); } catch (e) {}
    return html;
  }
}, 99);
