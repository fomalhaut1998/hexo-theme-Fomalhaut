'use strict';
/**
 * api/chat/completions.js —— DeepSeek 请求代理（Vercel Serverless Function）
 * ---------------------------------------------------------------------------
 * 为什么需要它：AI 面板运行在「访客浏览器」里。如果把 DeepSeek 的 key 内联进页面，
 * 任何人 F12 / 查看源码就能拿走并刷你的余额。这个函数把真 key 留在服务端
 * （Vercel 环境变量 DEEPSEEK_API_KEY），浏览器只跟同源的 /api/chat/completions 说话。
 *
 * 前端怎么切过来：构建时若存在环境变量 DEEPSEEK_API_KEY，scripts/ai-chat-inject.js
 * 会把 window.AI_CHAT_CONFIG 的 api_base 改成 /api、api_key 改成占位符（见那里的
 * 「部署（Vercel）模式」）。本机不设这个变量 → 依旧直连 DeepSeek + 读 .ai-chat-key。
 *
 * 部署清单：
 *   1) Vercel → Settings → Environment Variables 加 DEEPSEEK_API_KEY（Production + Preview）
 *      可选：DEEPSEEK_MODEL（默认 deepseek-chat）
 *            AI_PROXY_ORIGINS（可选。默认已放行 example.com / example.com 全家族，通常不用配；
 *                               要额外域名才填，支持裸域名与 *.example.com，填 * 全放行）
 *            AI_PROXY_MAX_PER_HOUR（每 IP 每小时的请求上限，默认 120）
 *            DEEPSEEK_API_BASE（默认 https://api.deepseek.com，仅供本地测试改指）
 *   2) 部署后用浏览器打开 https://<你的域名>/api/chat/completions
 *      应看到 {"ok":true,"mode":"proxy","hasKey":true,...}；hasKey=false 就是变量没配好。
 *
 * 安全边界（实话实说）：代理地址是公开的，白名单挡的是「别的网站拿你的额度」，
 * 挡不住手写 curl 的人；所以还有每 IP 限流 + max_tokens 上限。要更硬就接 Upstash 之类做全局限流。
 */
const UPSTREAM = String(process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = String(process.env.DEEPSEEK_MODEL || 'deepseek-chat');
const DEFAULT_ORIGINS = 'https://example.com,https://www.example.com';
const MAX_BODY_BYTES = 400 * 1024;
const MAX_TOKENS_CAP = 8192;
const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 40000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = parseInt(process.env.AI_PROXY_MAX_PER_HOUR, 10) || 120;
const hits = new Map();

function sendJson(res, code, message, extra) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(Object.assign({ error: { message: message, type: 'proxy' } }, extra || {})));
}

function extraOriginsNode() { return extraOrigins(process.env); }
function allowSuffixesNode() { return allowSuffixes(process.env); }

/* ------------------------------------------------------------------ 来源白名单
 * 默认就放行 example.com / example.com 及其所有子域，所以正常情况下一个环境变量都不用加。
 *   AI_PROXY_ORIGINS         可选：要额外放行的域名，逗号分隔；裸域名自动补 https://，
 *                            支持 *.example.com 通配；填 * 表示全放行。
 *   AI_PROXY_ALLOW_SUFFIXES  可选：改默认域名后缀，默认 example.com,example.com
 * 另外始终放行：localhost / 127.0.0.1 / ::1 / *.local（本地调试）
 * 与 *.vercel.app / *.pages.dev（平台预览域名）。 */
const DEFAULT_SUFFIXES = 'example.com';

function normOrigin(s) {
  s = String(s == null ? '' : s).trim().replace(/\/+$/, '');
  if (!s) return '';
  if (s === '*') return '*';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.indexOf('*.') === 0) return s.toLowerCase();
  return 'https://' + s;
}
function extraOrigins(env) {
  return String((env && env.AI_PROXY_ORIGINS) || '').split(',').map(normOrigin).filter(Boolean);
}
function allowSuffixes(env) {
  return String((env && env.AI_PROXY_ALLOW_SUFFIXES) || DEFAULT_SUFFIXES)
    .split(',').map(function (s) { return String(s).trim().toLowerCase().replace(/^\.+/, ''); }).filter(Boolean);
}
function hostOk(host, env) {
  host = String(host || '').toLowerCase().replace(/:\d+$/, '');
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || /\.local$/.test(host)) return true;
  const extra = extraOrigins(env);
  if (extra.indexOf('*') >= 0) return true;
  for (let i = 0; i < extra.length; i++) {
    const h = extra[i].replace(/^https?:\/\//i, '');
    if (h.indexOf('*.') === 0) { const base = h.slice(2); if (host === base || host.endsWith('.' + base)) return true; }
    else if (host === h) return true;
  }
  if (/\.vercel\.app$/.test(host) || /\.pages\.dev$/.test(host)) return true;
  const suf = allowSuffixes(env);
  for (let i = 0; i < suf.length; i++) { if (host === suf[i] || host.endsWith('.' + suf[i])) return true; }
  return false;
}

function originAllowed(req) {
  const origin = String(req.headers.origin || '');
  const ref = String(req.headers.referer || '');
  if (!origin && !ref) return true;               // curl / 健康检查这类没有来源的调用
  let host = '';
  try { host = new URL(origin || ref).hostname; } catch (e) { return false; }
  return hostOk(host, process.env);
}


function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  return (fwd.split(',')[0] || req.headers['x-real-ip'] || 'unknown').trim();
}

function rateOk(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  if (arr.length >= MAX_PER_WINDOW) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}

function clampNum(v, dflt, lo, hi) {
  const n = Number(v);
  if (!isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      ok: !!String(process.env.DEEPSEEK_API_KEY || '').trim(),
      mode: 'proxy', model: MODEL, hasKey: !!String(process.env.DEEPSEEK_API_KEY || '').trim(),
      allowSuffixes: allowSuffixesNode(), extraOrigins: extraOriginsNode(), maxPerHour: MAX_PER_WINDOW
    }));
    return;
  }
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.setHeader('Allow', 'POST, GET, OPTIONS'); res.end(); return; }
  if (req.method !== 'POST') return sendJson(res, 405, '只接受 POST。');

  if (!originAllowed(req)) {
    return sendJson(res, 403, '来源不在白名单：' + (req.headers.origin || req.headers.referer || '(空)') +
      '。example.com / example.com 全家族本来就放行；别的域名要放行就加进 Vercel 环境变量 AI_PROXY_ORIGINS（逗号分隔）。');
  }

  const key = String(process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key) return sendJson(res, 500, '服务端没配 DEEPSEEK_API_KEY：Vercel → Settings → Environment Variables 添加后重新部署。');

  if (!rateOk(clientIp(req))) return sendJson(res, 429, '请求太频繁了（每小时 ' + MAX_PER_WINDOW + ' 次），过一会儿再试。');

  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) return sendJson(res, 413, '请求体太大。');
    try { body = JSON.parse(body); } catch (e) { return sendJson(res, 400, '请求体不是合法 JSON。'); }
  }
  body = body || {};
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : null;
  if (!msgs || !msgs.length) return sendJson(res, 400, '缺少 messages。');

  const payload = {
    model: MODEL,
    stream: true,
    temperature: clampNum(body.temperature, 0.7, 0, 2),
    max_tokens: clampNum(body.max_tokens, 2048, 1, MAX_TOKENS_CAP),
    messages: msgs.map(function (m) {
      const role = m && (m.role === 'assistant' || m.role === 'system') ? m.role : 'user';
      return { role: role, content: String((m && m.content) || '').slice(0, MAX_CONTENT_CHARS) };
    })
  };

  const ctrl = new AbortController();
  req.on('close', function () { try { ctrl.abort(); } catch (e) {} });

  let up;
  try {
    up = await fetch(UPSTREAM + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'Accept': 'text/event-stream' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
  } catch (e) {
    return sendJson(res, 502, '连不上 DeepSeek：' + String((e && e.message) || e).slice(0, 160));
  }

  if (!up.ok) {
    const txt = await up.text().catch(function () { return ''; });
    res.statusCode = up.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(txt || JSON.stringify({ error: { message: 'DeepSeek 返回 ' + up.status } }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': up.headers.get('content-type') || 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no'
  });
  if (typeof res.flushHeaders === 'function') { try { res.flushHeaders(); } catch (e) {} }

  try {
    const reader = up.body.getReader();
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      res.write(Buffer.from(r.value));
    }
  } catch (e) {
    /* 访客点了「停止生成」或断线：上游已 abort，静默收尾 */
  } finally {
    try { res.end(); } catch (e) {}
  }
};
module.exports.config = { maxDuration: 60 };
