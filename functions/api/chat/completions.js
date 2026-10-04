/* Cloudflare Pages Function —— /api/chat/completions 的同源代理
 * ---------------------------------------------------------------------------
 * 为什么需要这一份：Vercel 会把仓库里的 api/chat/completions.js 当 Serverless 函数跑，
 * 但 Cloudflare Pages 不认这个约定 —— 它只把 api/chat/completions.js 当静态文件，
 * POST 过去直接被静态资源服务器挡掉（HTTP 405）。Pages 的函数约定是仓库根目录下的
 * functions/ 目录，文件名即路由，所以这里再放一份等价实现。
 *
 * 部署链路：scripts/vercel-api-copy.js 在 hexo generate 之后把本文件拷成
 *           public/functions/api/chat/completions.js，随 hexo d 进产物仓库；
 *           Cloudflare Pages 自动部署时读取根目录的 functions/ → 路由 /api/chat/completions。
 *           （Pages 里 Functions 的优先级高于同名静态文件，所以那边会跑到这里。）
 *
 * 环境变量（Cloudflare Pages → 项目 → 设置 → 变量和密钥）：
 *   DEEPSEEK_API_KEY       必填，真密钥（选「加密」类型）；只在服务端使用，不进页面
 *   AI_PROXY_ORIGINS       可选，默认已放行 example.com / example.com 全家族（含所有子域），
 *                          通常一个字都不用填；要额外域名才写，支持裸域名与 *.example.com，填 * 全放行
 *   AI_PROXY_ALLOW_SUFFIXES 可选，改默认域名后缀（默认 example.com,example.com）
 *   DEEPSEEK_MODEL         可选，默认 deepseek-chat
 *   DEEPSEEK_API_BASE      可选，默认 https://api.deepseek.com
 *   AI_PROXY_MAX_PER_HOUR  可选，默认 120（每个 isolate 内存计数，冷启动会重置，不是严格全局配额）
 */

const MAX_TOKENS_CAP = 8192;
const MAX_BODY_BYTES = 400 * 1024;
const MAX_MESSAGES = 24;
const MAX_CHARS_PER_MSG = 40000;

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function fail(status, message) { return json({ error: { message: message } }, status); }

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

function originAllowed(request, env) {
  const o = request.headers.get('origin') || '';
  const ref = request.headers.get('referer') || '';
  if (!o && !ref) return true;                    // curl / 健康检查这类没有来源的调用
  let host = '';
  try { host = new URL(o || ref).hostname; } catch (e) { return false; }
  return hostOk(host, env);
}

function clampNum(v, dflt, lo, hi) {
  const n = Number(v);
  if (!isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
function upstreamBase(env) {
  return String((env && env.DEEPSEEK_API_BASE) || 'https://api.deepseek.com').replace(/\/+$/, '');
}
function modelName(env) {
  return String((env && env.DEEPSEEK_MODEL) || 'deepseek-chat');
}
const hits = new Map();
function rateOk(env, request, ip) {
  const max = parseInt((env && env.AI_PROXY_MAX_PER_HOUR) || '', 10) || 120;
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  let rec = hits.get(ip);
  if (!rec || now - rec.t > 3600000) { rec = { t: now, n: 0 }; hits.set(ip, rec); }
  rec.n += 1;
  return rec.n <= max;
}

export function onRequestGet({ env }) {
  const has = !!String((env && env.DEEPSEEK_API_KEY) || '').trim();
  return json({ ok: has, mode: 'proxy-cf', model: modelName(env), hasKey: has, allowSuffixes: allowSuffixes(env), extraOrigins: extraOrigins(env) });
}
export function onRequestHead(ctx) { return onRequestGet(ctx); }
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { allow: 'POST, GET, HEAD, OPTIONS' } });
}
export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) {
    return fail(403, '来源不在白名单：' + (request.headers.get('origin') || request.headers.get('referer') || '(空)') +
      '。example.com / example.com 全家族本来就放行；别的域名要放行就加进 Cloudflare 环境变量 AI_PROXY_ORIGINS（逗号分隔，裸域名会自动补 https://）。');
  }
  const key = String((env && env.DEEPSEEK_API_KEY) || '').trim();
  if (!key) {
    return fail(500, '服务端没配 DEEPSEEK_API_KEY：Cloudflare → Workers 和 Pages → 你的项目 → 设置 → 变量和密钥，添加后重新部署。');
  }
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateOk(env, request, ip)) return fail(429, '请求太频繁了，过一会儿再试。');

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, '请求体太大。');
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return fail(400, '请求体不是合法 JSON。'); }

  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  if (!msgs.length) return fail(400, '缺少 messages。');
  const out = {
    model: modelName(env),
    stream: true,
    max_tokens: clampNum(body.max_tokens, 2048, 1, MAX_TOKENS_CAP),
    temperature: clampNum(body.temperature, 0.7, 0, 2),
    messages: msgs.map(function (m) {
      return {
        role: (m && (m.role === 'assistant' || m.role === 'system')) ? m.role : 'user',
        content: String((m && m.content) || '').slice(0, MAX_CHARS_PER_MSG)
      };
    })
  };

  let upstream;
  try {
    upstream = await fetch(upstreamBase(env) + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify(out),
      signal: request.signal
    });
  } catch (e) {
    return fail(502, '连不上上游接口：' + String((e && e.message) || e));
  }

  const ct = upstream.headers.get('content-type') || '';
  if (!upstream.ok || ct.indexOf('text/event-stream') < 0) {
    const text = await upstream.text();
    return new Response(text || JSON.stringify({ error: { message: '上游没有返回内容' } }), {
      status: upstream.status || 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no'
    }
  });
}
export function onRequest(ctx) {
  const m = ctx.request.method;
  if (m === 'GET' || m === 'HEAD') return onRequestGet(ctx);
  if (m === 'OPTIONS') return onRequestOptions();
  if (m === 'POST') return onRequestPost(ctx);
  return fail(405, '只接受 POST。');
}
