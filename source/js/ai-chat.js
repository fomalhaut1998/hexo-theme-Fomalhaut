/* 博客 AI 助手（前端本体）—— 站点侧文件：source/js/ai-chat.js
 * ---------------------------------------------------------------------------
 * 由 scripts/ai-chat-inject.js 注入：<script defer src="/js/ai-chat.js"></script>
 * 配置来自 _config.fomalhaut.yml 的 ai_chat: 段（window.AI_CHAT_CONFIG）。
 * 主题源码 themes/ 一行都不用改：样式、按钮、面板全部由本文件在运行时创建。
 * 依赖：无（不依赖 jQuery / Vue / 任何组件库）。
 */
(function () {
  'use strict';

  var DEFAULTS = {
    enable: true,
    api_base: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    temperature: 0.7,
    max_tokens: 8192,
    has_key: false,
    welcome: '你好，我是这个页面的 AI 助手。可以帮你总结当前页面、解释名词、回答关于本页的问题。',
    first_question: '请用中文总结这个页面的内容：先用一句话概括，再列 3-5 条要点。',
    system_prompt: '你是这个博客的页面助手，语气自然、简洁、像朋友聊天。默认用中文回答；只依据给出的页面内容和对话历史作答，页面里没有的信息不要编造，确实不知道就直说。回答用 Markdown 排版，能用列表就用列表，避免长篇大论。',
    max_history: 12,
    max_page_chars: 32000,
    storage_key: 'ai_chat_history_v1',
    panel_width: 460,
    panel_height: 640,
    panel_right: 88,
    timeout_ms: 10000,
    // 同源代理（Vercel 函数 /api/chat/completions）：页面里有它时，没配 key 也能用
    proxy_api_base: '/api',
    proxy_key_stub: 'via-proxy'
  };

  var CFG = {}, k;
  for (k in DEFAULTS) { if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) CFG[k] = DEFAULTS[k]; }
  var _src = window.AI_CHAT_CONFIG || {};
  for (k in _src) { if (Object.prototype.hasOwnProperty.call(_src, k)) CFG[k] = _src[k]; }
  /* 没配 Key 但有同源代理时自动走代理：页面里不含真 key，
     构建环境忘了设 DEEPSEEK_API_KEY 也不会退化成「还没配 API Key」。 */
  if (!String(CFG.api_key || '').trim() && String(CFG.proxy_api_base || '').trim()) {
    CFG.api_base = String(CFG.proxy_api_base).replace(/\/+$/, '');
    CFG.api_key = String(CFG.proxy_key_stub || 'via-proxy');
    CFG.proxied = true;
    CFG.has_key = true;
  }
  if (CFG.enable === false) return;

  var BTN_ID = 'ai-chat-btn', PANEL_ID = 'ai-chat-panel', STYLE_ID = 'ai-chat-style';

  function qs(sel, r) { return (r || document).querySelector(sel); }
  function mk(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function trim(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function px(v, d) { var n = parseInt(v, 10); return (isNaN(n) || n <= 0) ? d : n; }

  // 纸飞机（发送）/ 圆角方块（停止生成）：内联 SVG，跟着 currentColor
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<rect x="6" y="6" width="12" height="12" rx="2.4"/></svg>';

  // 小鲸鱼图标（DeepSeek）：内联 SVG，跟着 currentColor，按钮 / 面板标题 / 消息头像共用
  var WHALE = '<svg class="ai-whale" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path fill-rule="evenodd" d="M9.7 8.2c3.3-1.1 6.7-.1 8.6 2.6.5.8 1.4 1.2 2.3 1.2h.9c.8 0 1.3.5 1.3 1.3 0 .7-.5 1.3-1.3 1.3h-1c-.9 0-1.7.4-2.2 1.2-2.1 3.1-6.3 4.2-9.7 2.8-3.2-1.3-5-4.6-4.1-7.8.6-2.1 2.7-3.4 5.2-2.6Zm-.7 4.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/>' +
    '<path d="M17.9 6.4c1.2-1 2.6-1.5 3.8-1.4.4 0 .6.4.4.7-.7 1.4-1.9 2.5-3.3 3-.8.2-1.5-.6-1.2-1.3l.3-1Z"/>' +
    '<path d="M7.2 4.6c.7-.5 1.6-.6 2.3-.3.5.3.6.9.2 1.3-.5.5-1.3.7-2 .4-.5-.2-.7-.8-.5-1.4Z"/>' +
    '<path d="M10.6 2.1c.8-.4 1.8-.3 2.4.2.4.4.2 1-.3 1.4-.7.4-1.6.4-2.2 0-.5-.3-.4-.9.1-1.3Z"/>' +
    '</svg>';

  // 「恢复默认大小」图标（四角向外）
  var RESET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"/><path d="M20 15v5h-5"/><path d="M4 4l6 6"/><path d="M20 20l-6-6"/></svg>';

  // 把「不成对的代理项」换成 U+FFFD。
  // 网页里被劈开的 emoji（主题的逐字打字机、substring 截断、slice 截断）会留下孤立的
  // 高/低代理项，JSON.stringify 把它转义成 \ud83d 这种不成对转义，
  // DeepSeek 的 JSON 解析器直接返回 400：unexpected end of hex escape。
  // —— 选中配色：按当前日夜模式与主题色算成纯 rgb，写进面板的 CSS 变量
  function themeRGB() {
    var v = '';
    try { v = String(getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || '').trim(); } catch (e) {}
    var m = /#([0-9a-f]{6})/i.exec(v) || /#([0-9a-f]{3})/i.exec(v);
    var hex = m ? m[1] : '39c5bb';
    if (hex.length === 3) hex = hex.replace(/./g, function (c) { return c + c; });
    return [parseInt(hex.slice(0, 2), 16) || 57, parseInt(hex.slice(2, 4), 16) || 197, parseInt(hex.slice(4, 6), 16) || 187];
  }
  function mixc(rgb, pct, base) {
    return 'rgb(' + rgb.map(function (c, i) { return Math.round(c * pct + base[i] * (1 - pct)); }).join(',') + ')';
  }
  // 浏览器支持 color-mix 时，选中色由 CSS 实时算（换主题色立刻跟着变），不再需要写死变量
  function selLive() {
    // 注意：本作用域里 CSS 是「样式字符串数组」这个局部变量，必须用 window.CSS 才不会误判
    try { return !!(window.CSS && window.CSS.supports && window.CSS.supports('background', 'color-mix(in srgb,red 10%,#fff)')); } catch (e) { return false; }
  }
  function paintSel(p) {
    if (!p || !p.style) return;
    if (selLive()) {
      // 支持 color-mix 时选中色由 CSS 实时算（换主题色立即跟随），清掉可能残留的旧内联值
      ['--ai-sel-bg', '--ai-sel-fg', '--ai-sel-bg-u', '--ai-sel-fg-u'].forEach(function (k) { try { p.style.removeProperty(k); } catch (e) {} });
      return;
    }
    var t = themeRGB();
    var dark = false;
    try { dark = document.documentElement.getAttribute('data-theme') === 'dark'; } catch (e) {}
    p.style.setProperty('--ai-sel-bg', dark ? mixc(t, .38, [4, 18, 15]) : mixc(t, .26, [255, 255, 255]));
    p.style.setProperty('--ai-sel-fg', dark ? '#eafaf7' : '#12303a');
    p.style.setProperty('--ai-sel-bg-u', dark ? mixc(t, .26, [4, 18, 15]) : 'rgb(255,255,255)');
    p.style.setProperty('--ai-sel-fg-u', dark ? '#fff' : '#0f2e2c');
  }
  function cleanSurrogates(s) {
    s = String(s == null ? '' : s);
    var res = '', i, c, d;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) {
        d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { res += s.charAt(i) + s.charAt(i + 1); i++; }
        else res += '\uFFFD';
      } else if (c >= 0xDC00 && c <= 0xDFFF) {
        res += '\uFFFD';
      } else {
        res += s.charAt(i);
      }
    }
    return res;
  }

  var CSS = [
    '#' + BTN_ID + '{font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.5px;position:relative;overflow:visible}',
    '#' + BTN_ID + ' svg{width:22px;height:22px;display:block;margin:0 auto;pointer-events:none}',
    '#' + BTN_ID + ':hover{background:var(--btn-hover-color)}',
    '#' + BTN_ID + '.ai-on{background:var(--btn-hover-color);color:var(--btn-color)}',
    '#' + BTN_ID + '.ai-on::after{content:"";position:absolute;right:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--theme-color);box-shadow:0 0 0 2px var(--card-bg);animation:aiPulse 1.8s ease-in-out infinite}',
    '@keyframes aiPulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}',

    '#' + PANEL_ID + '{position:fixed;top:50%;right:88px;width:420px;height:640px;max-height:calc(100vh - 48px);',
    'display:flex;flex-direction:column;box-sizing:border-box;border-radius:18px;overflow:hidden;z-index:1001;',
    'background:var(--card-bg);color:var(--font-color);border:1px solid rgba(128,128,128,.18);',
    'box-shadow:0 18px 48px rgba(0,0,0,.26),0 2px 8px rgba(0,0,0,.12);',
    '--ai-soft:rgba(128,128,128,.10);--ai-line:rgba(128,128,128,.18);',
    // 白天：底部提示、模型名、引用等次要文字用偏深的灰绿（原来用 --light-grey，白底上根本看不见）
    '--ai-mute:rgba(46,68,64,.66);--ai-ph:rgba(46,68,64,.42);',
    'opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-50%) translateX(14px) scale(.97);',
    'transition:opacity .26s ease,transform .26s ease,visibility .26s}',
    '#' + PANEL_ID + '.ai-open{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(-50%) translateX(0) scale(1)}',
    '[data-theme="dark"] #' + PANEL_ID + '{--ai-soft:rgba(255,255,255,.07);--ai-line:rgba(255,255,255,.13);border-color:rgba(255,255,255,.10);--ai-mute:rgba(255,255,255,.50);--ai-ph:rgba(255,255,255,.38)}',
    '#' + PANEL_ID + '{min-width:300px;min-height:300px}',
    '#' + PANEL_ID + '.ai-free{transform:translateX(14px) scale(.97)}',
    '#' + PANEL_ID + '.ai-free.ai-open{transform:none}',
    '#' + PANEL_ID + ' .ai-grip{position:absolute;bottom:0;width:20px;height:20px;z-index:3;opacity:.5;cursor:nwse-resize;touch-action:none;transition:opacity .2s}',
    '#' + PANEL_ID + ' .ai-grip:hover{opacity:1}',
    '#' + PANEL_ID + ' .ai-grip-bl{left:0;background:linear-gradient(45deg,transparent 44%,var(--ai-mute) 44%,var(--ai-mute) 56%,transparent 56%)}',
    '#' + PANEL_ID + ' .ai-grip-br{right:0;cursor:nesw-resize;background:linear-gradient(-45deg,transparent 44%,var(--ai-mute) 44%,var(--ai-mute) 56%,transparent 56%)}',

    '.' + PANEL_ID + '-hd{display:flex;align-items:center;gap:10px;padding:13px 14px;flex:0 0 auto;',
    'border-bottom:1px solid var(--ai-line);background:linear-gradient(135deg,color-mix(in srgb,var(--theme-color) 14%,transparent),transparent 70%)}',
    '.' + PANEL_ID + '-hd .ai-logo svg{width:19px;height:19px;display:block}',
    '.' + PANEL_ID + '-hd .ai-logo{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;',
    'font-size:12px;font-weight:800;letter-spacing:.5px;color:#fff;background:var(--theme-color);box-shadow:0 4px 12px color-mix(in srgb,var(--theme-color) 40%,transparent)}',
    '.' + PANEL_ID + '-hd .ai-tt{flex:1 1 auto;min-width:0;line-height:1.25}',
    '.' + PANEL_ID + '-hd .ai-tt b{display:block;font-size:14px;font-weight:600;color:var(--text-highlight-color)}',
    '.' + PANEL_ID + '-hd .ai-tt i{display:block;font-style:normal;font-size:11px;color:var(--ai-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.' + PANEL_ID + '-hd button{flex:0 0 auto;width:30px;height:30px;border:0;border-radius:9px;cursor:pointer;background:transparent;color:var(--font-color);',
    'font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}',
    '.' + PANEL_ID + '-hd button:hover{background:var(--ai-soft);color:var(--theme-color)}',
    '.' + PANEL_ID + '-hd .ai-reset svg{width:16px;height:16px;display:block}',
    // 头部渐变：白天主题色浅色系，夜间深底 + 鲸鱼头像辉光
    '.' + PANEL_ID + '-hd{background:linear-gradient(120deg,color-mix(in srgb,var(--theme-color) 20%,#fff),color-mix(in srgb,var(--theme-color) 5%,#fff) 74%)}',
    '[data-theme="dark"] .' + PANEL_ID + '-hd{background:linear-gradient(120deg,color-mix(in srgb,var(--theme-color) 22%,#0e1315),color-mix(in srgb,var(--theme-color) 4%,#0e1315) 74%),radial-gradient(62% 130% at 13% 50%,color-mix(in srgb,var(--theme-color) 26%,transparent),transparent 72%)}',
    '.' + PANEL_ID + '-hd .ai-logo{transition:box-shadow .4s ease,filter .4s ease}',
    '[data-theme="dark"] #' + PANEL_ID + ' .ai-logo{box-shadow:0 0 10px color-mix(in srgb,var(--theme-color) 55%,transparent),0 0 22px color-mix(in srgb,var(--theme-color) 28%,transparent)}',
    '[data-theme="dark"] #' + PANEL_ID + ' .ai-av{box-shadow:0 0 8px color-mix(in srgb,var(--theme-color) 34%,transparent)}',
    '[data-theme="dark"] #' + PANEL_ID + '.ai-open .' + PANEL_ID + '-hd .ai-logo{animation:aiGlow 2.9s ease-in-out infinite}',
    '@keyframes aiGlow{0%,100%{box-shadow:0 0 7px color-mix(in srgb,var(--theme-color) 45%,transparent),0 0 14px color-mix(in srgb,var(--theme-color) 20%,transparent)}50%{box-shadow:0 0 15px color-mix(in srgb,var(--theme-color) 85%,transparent),0 0 30px color-mix(in srgb,var(--theme-color) 45%,transparent)}}',
    '@media (prefers-reduced-motion:reduce){[data-theme="dark"] #' + PANEL_ID + '.ai-open .' + PANEL_ID + '-hd .ai-logo{animation:none}}'
  ].join('');
  CSS += [
    '#' + PANEL_ID + ' .ai-bd{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:14px;display:flex;flex-direction:column;gap:12px}',
    '#' + PANEL_ID + ' .ai-bd::-webkit-scrollbar{width:6px}',
    '#' + PANEL_ID + ' .ai-bd::-webkit-scrollbar-thumb{background:var(--ai-line);border-radius:3px}',
    '.ai-row{display:flex;gap:8px;align-items:flex-start;max-width:100%}',
    '.ai-row.user{justify-content:flex-end}',
    '.ai-av{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;letter-spacing:.3px;color:#fff;background:var(--theme-color);margin-top:2px}',
    '.ai-av svg{width:15px;height:15px;display:block}',
    '.ai-bub{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.72;word-break:break-word;overflow-wrap:anywhere;box-sizing:border-box}',
    '.ai-row.ai .ai-bub{background:var(--ai-soft);border:1px solid var(--ai-line);border-top-left-radius:5px}',
    '.ai-row.user .ai-bub{background:var(--theme-color);color:#fff;border-top-right-radius:5px;box-shadow:0 4px 14px color-mix(in srgb,var(--theme-color) 26%,transparent)}',
    '.ai-row.err .ai-bub{background:rgba(255,92,92,.10);border:1px solid rgba(255,92,92,.30);color:#ff6b6b;border-top-left-radius:5px}',
    '.ai-bub p{margin:0 0 8px}.ai-bub p:last-child{margin-bottom:0}',
    '.ai-bub ul,.ai-bub ol{margin:6px 0;padding-left:20px}.ai-bub li{margin:3px 0}',
    '.ai-bub h1,.ai-bub h2,.ai-bub h3,.ai-bub h4{margin:10px 0 6px;font-size:14.5px;font-weight:600;color:var(--text-highlight-color)}',
    '.ai-bub code{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12.5px;padding:1px 5px;border-radius:5px;background:rgba(128,128,128,.16)}',
    '.ai-bub pre{margin:8px 0;padding:10px 12px;border-radius:10px;background:rgba(128,128,128,.14);overflow-x:auto}',
    '.ai-bub pre code{padding:0;background:none;font-size:12.5px;line-height:1.6}',
    '.ai-bub blockquote{margin:8px 0;padding:2px 0 2px 10px;border-left:3px solid var(--theme-color);color:var(--ai-mute)}',
    '.ai-bub a{color:var(--theme-color);text-decoration:none;border-bottom:1px dashed currentColor}',
    '.ai-row.user .ai-bub a{color:#fff}',
    '.ai-bub hr{border:0;border-top:1px solid var(--ai-line);margin:10px 0}',
    '.ai-dots{display:inline-flex;gap:4px;align-items:center;height:20px}',
    '.ai-dots i{width:6px;height:6px;border-radius:50%;background:var(--theme-color);opacity:.45;animation:aiDot 1.2s infinite}',
    '.ai-dots i:nth-child(2){animation-delay:.18s}.ai-dots i:nth-child(3){animation-delay:.36s}',
    '.ai-wait{display:inline-flex;align-items:baseline;color:var(--ai-mute);font-size:13.5px}',
    '.ai-ell i{font-style:normal;animation:aiBlink 1.1s infinite}',
    '.ai-ell i:nth-child(2){animation-delay:.18s}.ai-ell i:nth-child(3){animation-delay:.36s}',
    '.ai-note{margin-top:8px;font-size:12.5px;line-height:1.6;color:var(--ai-mute)}',
    '@keyframes aiDot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}',
    '.ai-cursor{display:inline-block;width:7px;height:14px;margin-left:2px;vertical-align:-2px;background:var(--theme-color);opacity:.7;animation:aiBlink 1s steps(2) infinite}',
    '@keyframes aiBlink{0%,100%{opacity:.15}50%{opacity:.8}}',
    '.ai-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 9px}',
    '.ai-chip{font-size:12px;padding:5px 11px;border-radius:999px;border:1px solid var(--ai-line);background:transparent;color:var(--font-color);cursor:pointer;font-family:inherit;transition:all .2s}',
    '.ai-chip:hover{border-color:var(--theme-color);color:var(--theme-color);background:var(--ai-soft)}',
    '.' + PANEL_ID + '-ft{flex:0 0 auto;padding:10px 12px 11px;border-top:1px solid var(--ai-line);background:linear-gradient(180deg,transparent,var(--ai-soft))}',
    '.ai-inbar{display:flex;gap:8px;align-items:flex-end}',
    '.ai-input{flex:1 1 auto;width:100%;box-sizing:border-box;resize:none;min-height:42px;max-height:132px;padding:11px 12px;font-size:14px;line-height:1.5;font-family:inherit;',
    'color:var(--font-color);background:var(--ai-soft);border:1px solid var(--ai-line);border-radius:12px;outline:none;transition:border-color .2s,box-shadow .2s}',
    '.ai-input::placeholder{color:var(--ai-ph,var(--ai-mute))}',
    '.ai-input:focus{border-color:var(--theme-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--theme-color) 18%,transparent)}',
    '.ai-input{scrollbar-width:thin}',
    '.ai-input::-webkit-scrollbar{width:6px}',
    '.ai-input::-webkit-scrollbar-thumb{background:var(--ai-line);border-radius:3px}',
    // 选中文字要看得见：白天走浅色系（浅底深字），夜间走主题色暗色系（深底浅字）
    // 颜色用 color-mix 现算，直接引用 var(--theme-color)：用户在设置里换主题色时，
    // 这些值跟着 <html> 上的 --theme-color 立刻变，不会像写死的 rgb 那样留在旧颜色上。
    // 主题在 themes/fomalhaut/source/css/_custom/custom.css:2055 用 *::selection{background:var(--theme-color)!important} 全局钉死了选中底色，
    // 面板里要换色必须同样带 !important（更高优先级：id + 伪元素）。
    '#' + PANEL_ID + ' ::selection{background:var(--ai-sel-bg,color-mix(in srgb,var(--theme-color) 24%,#fff))!important;color:var(--ai-sel-fg,#12303a)!important}',
    '[data-theme="dark"] #' + PANEL_ID + ' ::selection{background:var(--ai-sel-bg,color-mix(in srgb,var(--theme-color) 42%,#0a1512))!important;color:var(--ai-sel-fg,#eafaf7)!important}',
    '#' + PANEL_ID + ' .ai-row.user .ai-bub::selection,#' + PANEL_ID + ' .ai-row.user .ai-bub *::selection{background:var(--ai-sel-bg-u,#fff)!important;color:var(--ai-sel-fg-u,#0f2e2c)!important}',
    '[data-theme="dark"] #' + PANEL_ID + ' .ai-row.user .ai-bub::selection,[data-theme="dark"] #' + PANEL_ID + ' .ai-row.user .ai-bub *::selection{background:var(--ai-sel-bg-u,color-mix(in srgb,var(--theme-color) 24%,#0a1512))!important;color:var(--ai-sel-fg-u,#fff)!important}',
    '#' + PANEL_ID + ' .ai-send{flex:0 0 auto;height:42px;width:44px;padding:0;border:0;border-radius:12px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;letter-spacing:.3px;display:inline-flex;align-items:center;justify-content:center;',
    'color:#fff;background:var(--theme-color);box-shadow:0 4px 14px color-mix(in srgb,var(--theme-color) 30%,transparent);transition:filter .2s,opacity .2s}',
    '#' + PANEL_ID + ' .ai-send svg{width:19px;height:19px;display:block;fill:#fff}',
    '#' + PANEL_ID + ' .ai-send:hover{filter:brightness(1.08)}',
    '#' + PANEL_ID + ' .ai-send[disabled]{opacity:.5;cursor:not-allowed;box-shadow:none}',
    '#' + PANEL_ID + ' .ai-send.ai-stop{background:#ff6b6b;box-shadow:0 4px 14px rgba(255,107,107,.3)}',
    '.ai-hint{margin:7px 2px 0;font-size:11px;color:var(--ai-mute);display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}',
    '.ai-hint .ai-ctx{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ai-hint .ai-enter{flex:0 0 auto;white-space:nowrap;opacity:.9}',
    '.ai-hint.ai-narrow .ai-enter{display:none}',
    '.ai-hint b{font-weight:600;color:var(--theme-color);cursor:pointer}',
    // 手机端：面板改成满宽 + 底部贴合；inline 的宽高必须用 !important 才压得住
    '@media (max-width:768px){' +
      '#' + PANEL_ID + '{left:10px!important;right:10px!important;width:auto!important;height:min(78vh,600px)!important;top:50%!important;max-height:calc(100vh - 24px)!important;border-radius:16px}' +
      '#' + PANEL_ID + ',#' + PANEL_ID + '.ai-free{transform:translateY(-50%) translateX(14px) scale(.97)!important}' +
      '#' + PANEL_ID + '.ai-open,#' + PANEL_ID + '.ai-free.ai-open{transform:translateY(-50%) translateX(0) scale(1)!important}' +
      '#' + PANEL_ID + ' .ai-grip{display:none}' +
      '#' + PANEL_ID + ' .ai-bub{max-width:88%}' +
      '#' + PANEL_ID + ' .ai-inbar{gap:6px}' +
      '.' + PANEL_ID + '-hd .ai-tt i{display:none}' +
      '.' + PANEL_ID + '-hd button{width:34px;height:34px}' +
      '}'
  ].join('');

  /* ------------------------------------------------------------------ 样式 / 按钮 / 面板 */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // 按钮挂在右侧竖排的「常显」组 #rightside-config-show 里，紧跟设置齿轮之后，
  // 这样它和齿轮同属一组：右侧部件整体隐藏时它自动跟着消失，不需要额外处理。
  function ensureButton() {
    ensureStyle();
    if (document.getElementById(BTN_ID)) return;
    var host = qs('#rightside-config-show') || qs('#rightside');
    if (!host) return;
    var btn = mk('button', null, 'AI');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.title = 'AI 助手：总结本页 / 继续追问（再点一下收起）';
    btn.setAttribute('aria-label', 'AI 助手');
    var gear = qs('#rightside_config', host);
    if (gear && gear.parentNode === host) host.insertBefore(btn, gear.nextSibling);
    else host.insertBefore(btn, host.firstChild);
    if (isOpen()) btn.classList.add('ai-on');
  }

  function buildPanel() {
    var p = document.getElementById(PANEL_ID);
    if (p) return p;
    p = mk('div');
    p.id = PANEL_ID;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'AI 助手');
    p.style.width = px(CFG.panel_width, 460) + 'px';
    p.style.height = px(CFG.panel_height, 640) + 'px';
    p.style.right = px(CFG.panel_right, 88) + 'px';

    var hd = mk('div', PANEL_ID + '-hd');
    hd.appendChild(mk('span', 'ai-logo', WHALE));
    var tt = mk('div', 'ai-tt');
    tt.appendChild(mk('b', null, 'AI 助手'));
    tt.appendChild(mk('i', 'ai-sub', esc(CFG.model || '')));
    hd.appendChild(tt);
    var bClear = mk('button', 'ai-clear', '&#8635;');
    bClear.type = 'button';
    bClear.title = '清空本页对话记录';
    var bReset = mk('button', 'ai-reset', RESET_ICON);
    bReset.type = 'button';
    bReset.title = '恢复默认大小';
    bReset.style.display = 'none';
    var bClose = mk('button', 'ai-close', '&#10005;');
    bClose.type = 'button';
    bClose.title = '收起（Esc）';
    hd.appendChild(bClear);
    hd.appendChild(bReset);
    hd.appendChild(bClose);

    var bd = mk('div', 'ai-bd');
    var chips = mk('div', 'ai-chips');
    var CHIPS = ['总结这个页面', '这个页面有哪些要点？', '用一个自然段概括这一页'];
    CHIPS.forEach(function (t) {
      var c = mk('button', 'ai-chip', esc(t));
      c.type = 'button';
      c.setAttribute('data-q', t);
      chips.appendChild(c);
    });

    var ft = mk('div', PANEL_ID + '-ft');
    var inbar = mk('div', 'ai-inbar');
    var ta = mk('textarea', 'ai-input');
    ta.rows = 1;
    // 手机/窄屏放不下长占位符，缩成短的（下面那行提示仍然写着 Enter 发送）
    ta.placeholder = (isTouch() || window.innerWidth < 480) ? '问点什么…' : '问点什么…（Enter 发送 / Shift+Enter 换行）';
    var send = mk('button', 'ai-send', ICON_SEND);
    send.type = 'button';
    send.title = '发送（Enter）';
    send.setAttribute('aria-label', '发送');
    inbar.appendChild(ta);
    inbar.appendChild(send);
    var hint = mk('div', 'ai-hint');
    hint.appendChild(mk('span', 'ai-ctx', '上下文：统计中…'));
    hint.appendChild(mk('span', 'ai-enter', 'Enter 发送'));
    ft.appendChild(inbar);
    ft.appendChild(hint);

    p.appendChild(hd);
    p.appendChild(bd);
    p.appendChild(chips);
    p.appendChild(ft);
    p.appendChild(mk('div', 'ai-grip ai-grip-bl'));
    p.appendChild(mk('div', 'ai-grip ai-grip-br'));
    document.body.appendChild(p);
    p.addEventListener('pointerdown', startResize, false);
    applyBox(loadBox());
    return p;
  }

  function isOpen() {
    var p = document.getElementById(PANEL_ID);
    return !!(p && p.classList.contains('ai-open'));
  }

  function openPanel() {
    var p = buildPanel();
    paintSel(p);
    p.classList.add('ai-open');
    var b = document.getElementById(BTN_ID);
    if (b) b.classList.add('ai-on');
    restore();
    updateCtx();
    setTimeout(function () { var ta = qs('.ai-input', p); if (ta && !isTouch()) ta.focus(); }, 280);
  }

  function closePanel() {
    var p = document.getElementById(PANEL_ID);
    if (p) p.classList.remove('ai-open');
    var b = document.getElementById(BTN_ID);
    if (b) b.classList.remove('ai-on');
  }

  function togglePanel() { if (isOpen()) closePanel(); else openPanel(); }
  function isTouch() { return 'ontouchstart' in window && window.innerWidth < 768; }

  /* ------------------------------------------------------------------ 轻量 Markdown（代码块 / 行内代码 / 粗斜体 / 链接 / 标题 / 列表 / 引用 / 分隔线） */
  function md(src) {
    var text = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    var blocks = [], inlines = [];
    text = text.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, function (m, lang, code) {
      blocks.push('<pre><code>' + esc(String(code).replace(/\n$/, '')) + '</code></pre>');
      return '@@AIB' + (blocks.length - 1) + '@@';
    });
    text = text.replace(/`([^`\n]+)`/g, function (m, code) {
      inlines.push('<code>' + esc(code) + '</code>');
      return '@@AII' + (inlines.length - 1) + '@@';
    });
    var html = esc(text);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/&lt;(https?:[^\s&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    var lines = html.split('\n'), out = [], list = null, i, m, t;
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t) { closeList(); continue; }
      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { closeList(); out.push('<h' + m[1].length + '>' + m[2] + '</h' + m[1].length + '>'); continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeList(); out.push('<hr>'); continue; }
      if ((m = t.match(/^[-*+]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + m[1] + '</li>'); continue; }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + m[1] + '</li>'); continue; }
      if ((m = t.match(/^&gt;\s?(.*)$/))) { closeList(); out.push('<blockquote>' + m[1] + '</blockquote>'); continue; }
      closeList();
      out.push('<p>' + t + '</p>');
    }
    closeList();
    var res = out.join('');
    res = res.replace(/<p>\s*@@AIB(\d+)@@\s*<\/p>/g, function (mm, n) { return blocks[+n]; });
    res = res.replace(/@@AIB(\d+)@@/g, function (mm, n) { return blocks[+n] || ''; });
    res = res.replace(/@@AII(\d+)@@/g, function (mm, n) { return inlines[+n] || ''; });
    return res;
  }

  /* ------------------------------------------------------------------ 本地历史：一个 localStorage key，按页面路径分桶 */
  var STORE_KEY = CFG.storage_key || 'ai_chat_history_v1';
  var MAX_PAGES = 40;
  var MAX_MSGS = 80;

  function store() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function storeSave(db) {
    try {
      var pages = db.pages || {}, keys = Object.keys(pages);
      if (keys.length > MAX_PAGES) {
        keys.sort(function (a, b) { return (pages[b].t || 0) - (pages[a].t || 0); });
        keys.slice(MAX_PAGES).forEach(function (kk) { delete pages[kk]; });
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch (e) {}
  }
  function pageKey() { return location.pathname.replace(/index\.html$/, ''); }
  function histGet() {
    var rec = (store().pages || {})[pageKey()];
    return (rec && rec.m) ? rec.m : [];
  }
  function histSet(msgs) {
    var db = store();
    db.v = 1;
    db.pages = db.pages || {};
    db.pages[pageKey()] = { t: Date.now(), m: msgs.slice(-MAX_MSGS) };
    storeSave(db);
  }
  function histClear() {
    var db = store();
    if (db.pages) { delete db.pages[pageKey()]; storeSave(db); }
  }

  /* ------------------------------------------------------------------ 页面内容（给模型看的上下文） */
  // 这些都不是「正文」：顶栏、侧栏、页脚、目录、分页、评论区、右下角按钮列、搜索框、播放器……
  // 文章正文节点里通常没有它们；但列表页/关于页没有正文容器时只能退化成整页，那时候必须清掉。
  var JUNK = 'nav,header,footer,aside,script,style,noscript,' +
    '#nav,.nav,#site-nav,#sidebar,.sidebar,#sidebar-menus,#rightside,#footer,.footer,' +
    '.copyright,.post-copyright,#pagination,.pagination,.page-number,.toc,#toc,.catalog,' +
    '.widget,.search-dialog,#search,.aplayer,#reward,.post-tools,.relatedPosts,' +
    '#post-comment,.comments,#comments,.ai-chips,#' + PANEL_ID + ',#' + BTN_ID;
  // 同源 iframe 的正文（跨域的读不到就跳过），去掉里面的导航/页脚再取文字
  function frameText(root) {
    var res = [], fr = (root || document).querySelectorAll('iframe');
    for (var i = 0; i < fr.length; i++) {
      try {
        var d = fr[i].contentDocument;
        if (!d || !d.body || d.body === document.body) continue;
        var c = cleanClone(d.body);
        var s = trim(c.innerText || c.textContent || '');
        if (s.length > 20) res.push(s);
      } catch (e) { /* 跨域 iframe 拿不到，忽略 */ }
    }
    return res.join('\n\n');
  }

  function cleanClone(root) {
    var c = root.cloneNode(true);
    var kill = c.querySelectorAll(JUNK);
    for (var i = 0; i < kill.length; i++) { if (kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]); }
    return c;
  }
  function pageInfo() {
    var title = trim(document.title || '');
    var text = '', node = null;
    var sel = ['#article-container', '.post-content', '#article', '.article-container', '#post', '.post-body',
      '#page', '#archive', '#tag', '#category', '#board', '.page-content', '#content-inner'];
    for (var i = 0; i < sel.length; i++) {
      var n = qs(sel[i]);
      if (n && trim(n.innerText).length > 40) { text = trim(n.innerText); node = n; break; }
    }
    if (!text) {
      // 有些自定义页（例如「天文馆」）整页正文都在同源 iframe 里，innerText 看不到 —— 单独取一次
      var ft = frameText(document);
      if (ft.length > 60) {
        text = ft;
        node = qs('#article-container') || qs('#page') || qs('#content-inner') || document.body;
      }
    }
    if (!text) {
      var titles = [];
      var as = document.querySelectorAll('.recent-post-item .post-title a, .recent-post-info .post-title, #recent-posts .post-title');
      for (var j = 0; j < as.length && j < 40; j++) { if (trim(as[j].innerText)) titles.push(trim(as[j].innerText)); }
      if (titles.length) text = '本页是文章列表，标题有：' + titles.join('；');
      else {
        var clone = cleanClone(document.body);
        text = trim(clone.innerText || clone.textContent || '');
      }
    }
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    var max = px(CFG.max_page_chars, 32000);
    var rawLen = text.length;
    var trunc = rawLen > max;
    if (trunc) {
      // 长文别只留开头：开头 64% + 结尾 30%，中间给小节标题，模型才知道「后面还有什么」
      var headLen = Math.floor(max * 0.60), tailLen = Math.floor(max * 0.35);
      var head = text.slice(0, headLen);
      var tail = text.slice(rawLen - tailLen);
      var hb = Math.max(head.lastIndexOf('\n'), head.lastIndexOf('。'), head.lastIndexOf('！'), head.lastIndexOf('？'));
      if (hb > headLen * 0.7) head = head.slice(0, cutSafe(head, hb + 1));
      var tb = tail.search(/[。！？\n]/);
      if (tb >= 0 && tb < tailLen * 0.25) tail = tail.slice(cutSafe(tail, tb + 1));
      var hs = omittedHeads(node, text, head.length, rawLen - tail.length);
      text = head + '\n\n……（中间省略 ' + (rawLen - head.length - tail.length) + ' 字' +
        (hs.length ? '，省略的正文里包含这些小节：' + hs.join(' / ') : '') +
        '。如果用户问的刚好落在省略的部分，直接说明那部分正文你没看到，不要猜。）\n\n' + tail;
    }
    return { title: title, url: location.href, text: text, trunc: trunc, rawLen: rawLen };
  }

  // 截断时别把 emoji / 代理对劈成两半
  function cutSafe(s, at) {
    if (at <= 0 || at >= s.length) return Math.max(0, Math.min(at, s.length));
    if (s.charCodeAt(at - 1) >= 0xD800 && s.charCodeAt(at - 1) <= 0xDBFF) at--;
    return at;
  }
  // 被省略的那一段里有哪些小节标题
  function omittedHeads(node, text, from, to) {
    var out = [];
    if (!node || !node.querySelectorAll) return out;
    var hs = node.querySelectorAll('h2,h3,h4'), i, t, at;
    for (i = 0; i < hs.length && out.length < 16; i++) {
      t = trim(hs[i].innerText || hs[i].textContent || '');
      if (!t || out.indexOf(t) >= 0) continue;
      at = text.indexOf(t, Math.max(0, from - 40));
      if (at >= 0 && at < to + 600) out.push(t);
    }
    return out;
  }

  var lastPage = null;
  function sysMessage() {
    var p = pageInfo();
    lastPage = p;
    return String(CFG.system_prompt || '') +
      '\n\n【当前页面】\n标题：' + p.title +
      '\n地址：' + p.url +
      '\n正文：\n' + p.text;
  }

  /* ------------------------------------------------------------------ 上下文长度 / 面板尺寸 */
  function kfmt(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
  // 面板里显示的「上下文长度」：系统提示 + 本页正文 + 对话历史，按字符估算
  function ctxText() {
    var sys = sysMessage();
    var lp = lastPage;
    var hist = (state.busy && state.hist && state.hist.length) ? state.hist : histGet();
    var hc = 0, i;
    for (i = 0; i < hist.length; i++) hc += String(hist[i].c || '').length;
    var total = sys.length + hc;
    return {
      // 这一行必须能塞进一行：顺序 = 总量 → 本页 → 对话 → 最长的括注放最后
      //（窄面板放不下时先用省略号吃掉它，再用 CSS 把右边的「Enter 发送」收掉）
      text: '上下文 ≈ ' + kfmt(total) + ' 字 · 本页 ' + kfmt(sys.length) + ' 字' +
        (lp && lp.trunc ? '/' + kfmt(lp.rawLen) : '') +
        ' · 对话 ' + hist.length + ' 条' +
        (lp && lp.trunc ? '（取头尾）' : ''),
      title: '按字符估算（不是 token 数）：本页正文与系统提示 ' + sys.length + ' 字，历史对话 ' + hist.length + ' 条共 ' + hc + ' 字，合计 ' + total + ' 字' +
        (lp && lp.trunc ? '；本页正文全文 ' + lp.rawLen + ' 字，超过上限的部分只把小节标题给模型。' : '')
    };
  }
  function updateCtx() {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    paintSel(p);
    var el = qs('.ai-ctx', p);
    if (!el) return;
    var c = ctxText();
    el.textContent = c.text;
    el.title = c.title;
    fitHint();
  }

  // 底部那行提示：单行显示，宁可省略也不换行。先试着和右边的「Enter 发送」并排，
  // 放不下就把右边收掉（输入框占位符里本来就写着 Enter 发送），再放不下才用省略号。
  function fitHint() {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    var h = qs('.ai-hint', p);
    if (!h) return;
    var ctx = qs('.ai-ctx', p), en = qs('.ai-enter', p);
    if (!ctx || !en) return;
    h.classList.remove('ai-narrow');
    if (ctx.scrollWidth > ctx.clientWidth + 1) h.classList.add('ai-narrow');
  }

  // 面板缩放：右下 / 左下角手柄拖动，尺寸记在 localStorage，复位按钮一键回到默认
  var BOX_KEY = 'ai_chat_panel_box_v1';
  var MIN_W = 300, MIN_H = 300;
  function loadBox() {
    try { var b = JSON.parse(localStorage.getItem(BOX_KEY) || 'null'); if (b && b.w >= MIN_W && b.h >= MIN_H) return b; } catch (e) {}
    return null;
  }
  function saveBox(b) { try { if (b) localStorage.setItem(BOX_KEY, JSON.stringify(b)); else localStorage.removeItem(BOX_KEY); } catch (e) {} }
  function boxOf(p) {
    var r = p.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), r: Math.round(window.innerWidth - r.right), t: Math.round(r.top) };
  }
  function applyBox(box) {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    var rb = qs('.ai-reset', p);
    if (!box) {
      p.classList.remove('ai-free');
      p.style.top = '';
      p.style.width = px(CFG.panel_width, 460) + 'px';
      p.style.height = px(CFG.panel_height, 640) + 'px';
      p.style.right = px(CFG.panel_right, 88) + 'px';
      if (rb) rb.style.display = 'none';
      fitHint();
      return;
    }
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = Math.min(Math.max(MIN_W, box.w), Math.max(MIN_W, vw - 24));
    var h = Math.min(Math.max(MIN_H, box.h), Math.max(MIN_H, vh - 24));
    var r = Math.min(Math.max(8, box.r), Math.max(8, vw - w - 8));
    var tp = Math.min(Math.max(8, box.t), Math.max(8, vh - h - 8));
    p.classList.add('ai-free');
    p.style.width = w + 'px';
    p.style.height = h + 'px';
    p.style.right = r + 'px';
    p.style.top = tp + 'px';
    if (rb) rb.style.display = '';
    fitHint();
  }
  function resetBox() { saveBox(null); applyBox(null); }
  function startResize(e) {
    var grip = e.target && e.target.closest ? e.target.closest('.ai-grip') : null;
    if (!grip) return;
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    if (e.button != null && e.button > 0) return;
    e.preventDefault();
    if (!p.classList.contains('ai-free')) applyBox(boxOf(p));
    var isBR = String(grip.className).indexOf('ai-grip-br') >= 0;
    var sx = e.clientX, sy = e.clientY;
    var r1 = p.getBoundingClientRect();
    var w0 = r1.width, h0 = r1.height, top0 = r1.top;
    var right = Math.max(8, window.innerWidth - r1.right);
    var live = true;
    var pid = (e.pointerId == null ? null : e.pointerId);
    function move(ev) {
      if (!live) return;
      var dw = isBR ? (ev.clientX - sx) : (sx - ev.clientX);
      var maxW = Math.max(MIN_W, window.innerWidth - right - 16);
      var maxH = Math.max(MIN_H, window.innerHeight - top0 - 16);
      p.style.width = Math.round(Math.min(Math.max(MIN_W, w0 + dw), maxW)) + 'px';
      p.style.height = Math.round(Math.min(Math.max(MIN_H, h0 + (ev.clientY - sy)), maxH)) + 'px';
      fitHint();
    }
    function up() {
      if (!live) return;
      live = false;
      window.removeEventListener('pointermove', move, false);
      window.removeEventListener('pointerup', up, false);
      window.removeEventListener('pointercancel', up, false);
      window.removeEventListener('blur', up, false);
      document.removeEventListener('pointerup', up, false);
      try { if (pid != null && grip.releasePointerCapture) grip.releasePointerCapture(pid); } catch (e1) {}
      saveBox(boxOf(p));
      var rb = qs('.ai-reset', p);
      if (rb) rb.style.display = '';
    }
    /* 指针捕获 + pointercancel/blur 兜底：在窗口外松手、切窗口、触屏手势被系统接管时也能收尾。
       否则 move 一直挂在 window 上 —— 面板会黏着鼠标乱缩，下一次拖拽也会跟这个残留监听打架，看着像拖不动。 */
    try { if (pid != null && grip.setPointerCapture) grip.setPointerCapture(pid); } catch (e2) {}
    window.addEventListener('pointermove', move, false);
    window.addEventListener('pointerup', up, false);
    window.addEventListener('pointercancel', up, false);
    window.addEventListener('blur', up, false);
    document.addEventListener('pointerup', up, false);
  }
  function clampBox() {
    var p = document.getElementById(PANEL_ID);
    if (!p || !p.classList.contains('ai-free')) return;
    applyBox(boxOf(p));
  }

  /* ------------------------------------------------------------------ 消息渲染 */
  var state = { busy: false, ctrl: null, hist: [] };

  function bd() { var p = document.getElementById(PANEL_ID); return p ? qs('.ai-bd', p) : null; }
  function scrollBottom(force) {
    var b = bd();
    if (!b) return;
    var near = b.scrollHeight - b.scrollTop - b.clientHeight < 90;
    if (force || near) b.scrollTop = b.scrollHeight;
  }
  function addRow(role, content) {
    var b = bd();
    if (!b) return null;
    var row = mk('div', 'ai-row ' + (role === 'user' ? 'user' : (role === 'err' ? 'err' : 'ai')));
    if (role !== 'user') row.appendChild(mk('span', 'ai-av', role === 'err' ? '!' : WHALE));
    var bub = mk('div', 'ai-bub');
    if (role === 'user') bub.textContent = content;
    else if (content) bub.innerHTML = md(content);
    row.appendChild(bub);
    b.appendChild(row);
    scrollBottom(true);
    return bub;
  }
  function addTyping() {
    var bub = addRow('ai', '');
    if (bub) bub.innerHTML = '<span class="ai-wait">深度求索中<span class="ai-ell"><i>.</i><i>.</i><i>.</i></span></span>';
    return bub;
  }
  function setSendState(busy) {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    var s = qs('.ai-send', p);
    if (!s) return;
    if (busy) {
      s.classList.add('ai-stop'); s.innerHTML = ICON_STOP;
      s.title = '停止生成'; s.setAttribute('aria-label', '停止生成');
    } else {
      s.classList.remove('ai-stop'); s.innerHTML = ICON_SEND;
      s.title = '发送（Enter）'; s.setAttribute('aria-label', '发送');
    }
  }
  var TA_CAP = 132;
  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    var full = ta.scrollHeight + 2;              // border-box：scrollHeight 不含上下边框，+2 免得差 2px 就冒出滚动条
    ta.style.height = Math.min(full, TA_CAP) + 'px';
    ta.style.overflowY = full > TA_CAP ? 'auto' : 'hidden';   // 只有一行（或没到上限）时不要把滚动条摆出来
  }
  function apiUrl() {
    var b = String(CFG.api_base || 'https://api.deepseek.com').replace(/\/+$/, '');
    return /\/chat\/completions$/.test(b) ? b : b + '/chat/completions';
  }

  /* ------------------------------------------------------------------ 发送 / 流式接收 */
  function send(text) {
    var p = document.getElementById(PANEL_ID);
    if (!p || state.busy) return;
    text = String(text == null ? '' : text).trim();
    if (!text) return;

    addRow('user', text);
    var bub = addTyping();

    var key = String(CFG.api_key || '');
    if (!key) {
      if (bub) {
        bub.parentNode.className = 'ai-row err';
        bub.innerHTML = '还没配 API Key：打开 <code>_config.fomalhaut.yml</code>，在 <code>ai_chat</code> 段填 <code>api_key</code>；' +
          '或者把 Key 单独存到站点根目录的 <code>.ai-chat-key</code>（已在 .gitignore 里，不会进仓库）。改完重新生成一次站点即可。';
      }
      return;
    }

    var hist = histGet();
    hist.push({ r: 'user', c: text });
    state.hist = hist;
    updateCtx();

    var msgs = [{ role: 'system', content: sysMessage() }];
    var n = px(CFG.max_history, 12) * 2;
    hist.slice(-n).forEach(function (m) { msgs.push({ role: m.r === 'user' ? 'user' : 'assistant', content: String(m.c) }); });
    for (var mi = 0; mi < msgs.length; mi++) msgs[mi].content = cleanSurrogates(msgs[mi].content);

    state.busy = true;
    setSendState(true);
    state.ctrl = ('AbortController' in window) ? new AbortController() : null;
    var acc = '', done = false, gotFirst = false, gotThink = false, lastFinish = '';
    var timeoutMs = px(CFG.timeout_ms, 10000);
    // 超时保护：首字迟迟不来、或中途卡住不再吐字，都算超时（每收到一段就重新计时）
    var to = null;
    function armTo() {
      if (to) clearTimeout(to);
      to = setTimeout(function () {
        if (done) return;
        if (state.ctrl) state.ctrl.abort();
        finish(acc ? '__stall__' : '请求超时：' + Math.round(timeoutMs / 1000) + ' 秒没收到回复，稍后重试。');
      }, timeoutMs);
    }
    armTo();

    function finish(errText) {
      if (done) return;
      done = true;
      if (to) clearTimeout(to);
      state.busy = false;
      state.ctrl = null;
      setSendState(false);
      if (!bub) return;
      if (errText === '__stop__') {
        if (acc) { bub.innerHTML = md(acc); hist.push({ r: 'assistant', c: acc }); histSet(hist); updateCtx(); }
        else { bub.parentNode.className = 'ai-row err'; bub.innerHTML = '（已停止）'; }
        scrollBottom(false);
        return;
      }
      if (errText === '__stall__') {
        // 已经吐了一半就卡住：保留已收到的内容，只在后面补一句说明
        bub.innerHTML = md(acc) + '<div class="ai-note">（' + Math.round(timeoutMs / 1000) + ' 秒没有新内容，已停止接收，可以再问一次。）</div>';
        hist.push({ r: 'assistant', c: acc });
        histSet(hist);
        updateCtx();
        scrollBottom(false);
        return;
      }
      if (errText) {
        bub.parentNode.className = 'ai-row err';
        bub.innerHTML = errText;
        scrollBottom(false);
        return;
      }
      if (!acc) {
        bub.parentNode.className = 'ai-row err';
        // 思考型模型会先吐 reasoning_content：如果 max_tokens 被思考吃光，正文一个字都不会有
        // （流正常结束但 finish_reason=length）。这时别再说「模型没有返回内容」——它在想，只是没写完。
        bub.innerHTML = gotThink
          ? '这次只吐了思考过程、正文没写完就被截断了：当前 <code>max_tokens=' + px(CFG.max_tokens, 8192) + '</code> 不够用（思考的 token 也算在里面）。' +
            '把 <code>_config.fomalhaut.yml</code> 里 <code>ai_chat.max_tokens</code> 再调大，或者把 <code>model</code> 换成不思考的 <code>deepseek-chat</code>，' +
            '也可以把问题问得更具体些再试。'
          : '模型没有返回内容，稍后再试一次。';
        scrollBottom(false);
        return;
      }
      bub.innerHTML = md(acc) + (lastFinish === 'length' ? '<div class="ai-note">（回答达到 max_tokens 上限被截断，把问题拆小一点再问会更完整。）</div>' : '');
      scrollBottom(false);
      hist.push({ r: 'assistant', c: acc });
      histSet(hist);
      updateCtx();
    }

    function friendly(msg) {
      var m = String(msg || '').match(/^HTTP (\d+)(?:[:：])?(.*)$/);
      if (m) {
        var code = m[1], detail = (m[2] || '').trim();
        var tail = detail ? '<br><span style="opacity:.7">接口原文：' + esc(detail.slice(0, 300)) + '</span>' : '';
        if (code === '401') return 'API Key 无效或已失效。检查 <code>ai_chat.api_key</code> / <code>.ai-chat-key</code>，改完重新生成站点。' + tail;
        if (code === '402') return 'DeepSeek 账户余额不足，充值后再试。' + tail;
        if (code === '429') return '请求太频繁了，等几秒再发。' + tail;
        if (code === '400' && /model/i.test(detail)) return '模型名不可用：把 <code>ai_chat.model</code> 换成可用模型（如 <code>deepseek-chat</code>）。' + tail;
        if (code === '403') return '这个域名的 AI 代理没放行（403）：把域名加进 Vercel 环境变量 <code>AI_PROXY_ORIGINS</code> 再重新部署。' + tail;
        if (code === '502') return '代理连不上 DeepSeek（502）：过一会儿再试，或看 Vercel 函数的日志。' + tail;
        if (code === '500') return '服务端出错（500）：检查 Vercel 环境变量 <code>DEEPSEEK_API_KEY</code> 是否配好。' + tail;
        if (code === '404') return '接口地址不通（404）：检查 <code>ai_chat.api_base</code>。' + tail;
        return '请求失败（HTTP ' + code + '）。' + tail;
      }
      if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(String(msg))) {
        return '网络或跨域失败：确认 <code>ai_chat.api_base</code> 能直连，浏览器没被代理 / 插件拦。';
      }
      return '出错了：' + esc(String(msg || '未知错误'));
    }

    fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: CFG.model,
        messages: msgs,
        stream: true,
        temperature: Number(CFG.temperature) || 0.7,
        max_tokens: px(CFG.max_tokens, 2048)
      }),
      signal: state.ctrl ? state.ctrl.signal : undefined
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.text().then(function (t) {
          var m = '';
          try { m = (JSON.parse(t).error || {}).message || ''; } catch (e) { m = t; }
          throw new Error('HTTP ' + resp.status + (m ? '：' + m : ''));
        });
      }
      if (!resp.body || !resp.body.getReader) {
        return resp.json().then(function (j) {
          var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          acc = String(c || '');
          finish(null);
        });
      }
      var reader = resp.body.getReader(), dec = new TextDecoder('utf-8'), buf = '';
      // 这里不要清空气泡：清了的话「深度求索中…」会在首字到达前就消失，中间留一段空白气泡。
      // 第一个 content 分片会用 md(acc) 把它覆盖掉（见下面的 piece 分支）。
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { finish(null); return; }
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split('\n');
          buf = parts.pop();
          for (var i = 0; i < parts.length; i++) {
            var line = parts[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            var payload = line.slice(5).trim();
            if (payload === '[DONE]') { finish(null); return; }
            try {
              var j = JSON.parse(payload);
              var fr = j.choices && j.choices[0] && j.choices[0].finish_reason;
              if (fr) lastFinish = String(fr);
              var d = j.choices && j.choices[0] && (j.choices[0].delta || j.choices[0].message);
              // 思考型模型（deepseek-flash / reasoner）会先吐 reasoning_content。它不算正文，
              // 但必须算「还在动」——否则 10 秒超时会在模型思考到一半时把它掐死。
              if (d && d.reasoning_content) { gotThink = true; armTo(); }
              var piece = d && d.content ? d.content : '';
              if (piece) {
                gotFirst = true;
                armTo();
                acc += piece;
                if (bub) bub.innerHTML = md(acc) + '<span class="ai-cursor"></span>';
                scrollBottom(false);
              }
            } catch (e) {}
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      if (err && (err.name === 'AbortError' || /aborted/i.test(String(err.message)))) { finish('__stop__'); return; }
      finish(friendly(err && err.message ? err.message : err));
    });
  }

  /* ------------------------------------------------------------------ 打开面板时的历史恢复 */
  function renderWelcome() {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    qs('.ai-bd', p).innerHTML = '';
    p.setAttribute('data-page', pageKey());
    addRow('ai', CFG.welcome);
    updateCtx();
  }
  function restore() {
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    if (p.getAttribute('data-page') === pageKey()) return;
    p.setAttribute('data-page', pageKey());
    qs('.ai-bd', p).innerHTML = '';
    var hist = histGet();
    if (!hist.length) {
      addRow('ai', CFG.welcome);
      if (CFG.first_question) send(String(CFG.first_question));   // 首次打开：自动问「总结这个页面」
      return;
    }
    hist.forEach(function (m) { addRow(m.r === 'user' ? 'user' : 'ai', m.c); });
    setTimeout(function () { scrollBottom(true); }, 60);
  }

  /* ------------------------------------------------------------------ 事件（全部走事件委托，pjax 换掉按钮也不用重新绑定） */
  // 连点两下页面空白处 = 收起面板（点在链接 / 按钮 / 输入框这些「非空白」目标上不算）
  var lastBlank = 0;
  function blankClick(t) {
    if (!isOpen()) { lastBlank = 0; return; }
    if (t.closest && t.closest('a,button,input,textarea,select,label,summary,img,video,audio,[role="button"],[contenteditable="true"]')) { lastBlank = 0; return; }
    var now = Date.now();
    if (now - lastBlank < 700) { lastBlank = 0; closePanel(); return; }
    lastBlank = now;
  }
  function onDocClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#' + BTN_ID)) { e.preventDefault(); lastBlank = 0; togglePanel(); return; }
    var p = document.getElementById(PANEL_ID);
    if (!p || !p.contains(t)) { blankClick(t); return; }
    // 点了日夜模式按钮后，等主题把 data-theme 改完，再把选中配色跟着换一遍
    if (t.closest('#nightmode-button,[title*="浅色和深色"],[title*="夜间模式"]')) {
      var pn = document.getElementById(PANEL_ID);
      if (pn) setTimeout(function () { paintSel(pn); }, 450);
      return;
    }
    if (t.closest('.ai-reset')) { resetBox(); return; }
    if (t.closest('.ai-close')) { closePanel(); return; }
    if (t.closest('.ai-clear')) {
      if (state.busy) { if (state.ctrl) state.ctrl.abort(); }
      if (window.confirm('清空本页的对话记录？')) renderWelcome();
      return;
    }
    var chip = t.closest('.ai-chip');
    if (chip) { send(chip.getAttribute('data-q')); return; }
    if (t.closest('.ai-send')) {
      if (state.busy) { if (state.ctrl) state.ctrl.abort(); return; }
      var ta = qs('.ai-input', p);
      if (ta) { var v = ta.value; ta.value = ''; autoGrow(ta); send(v); }
    }
  }
  function onDocKey(e) {
    if (e.key === 'Escape' && isOpen()) { closePanel(); return; }
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('ai-input')) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      var v = t.value;
      t.value = '';
      autoGrow(t);
      send(v);
    }
  }
  function watchRightside() {
    var host = qs('#rightside');
    if (!host || !window.MutationObserver || host.__aiWatched) return;
    host.__aiWatched = true;
    new MutationObserver(function () { if (!document.getElementById(BTN_ID)) ensureButton(); })
      .observe(host, { childList: true, subtree: true });
  }

  function init() {
    ensureStyle();
    ensureButton();
    watchRightside();
    document.addEventListener('click', onDocClick, false);
    document.addEventListener('keydown', onDocKey, false);
    document.addEventListener('input', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('ai-input')) autoGrow(e.target);
    }, false);
    window.addEventListener('resize', function () { clampBox(); fitHint(); }, false);
    // 主题色/日夜模式都是运行时改的（主题把 --theme-color 写在 <html> 的 style 上）：
    // 盯住它，任何变化都重算一次面板里的主题色派生值（旧浏览器没有 color-mix 时靠这里兜底）
    try {
      new MutationObserver(function () {
        var pn = document.getElementById(PANEL_ID);
        if (pn) paintSel(pn);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme', 'class'] });
    } catch (e) {}
    // pjax：右侧部件被整体替换，重新挂按钮；面板挂在 body 上不受影响，但要切回新页面的历史
    if (window.jQuery) {
      window.jQuery(document).on('pjax:send', function () { closePanel(); });
      window.jQuery(document).on('pjax:complete', function () {
        closePanel();
        var p = document.getElementById(PANEL_ID);
        if (p) p.removeAttribute('data-page');
        ensureButton();
        watchRightside();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, false);
  else init();
})();
