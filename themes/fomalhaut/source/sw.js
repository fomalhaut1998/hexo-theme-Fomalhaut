/*------------------------------------------------------------------
 * sw.js —— Fomalhaut CDN 分流器（2026-10-01 修订）
 *
 * 历史问题（2026-09-30 版）：else 分支的 catch 没有 return，respondWith(undefined)
 * 直接抛错；注册了两个 fetch 监听器且同一 event 上 respondWith 两次；对所有同源请求
 * 都介入，任何抖动都会让整片资源加载不出来。
 *
 * 上一版修掉了上面三条，但留下两个问题，本版一并处理：
 *   A. db.read('blog_version') 读出来后从未被使用，KV 里也从来没人写过，
 *      于是缓存是空的 —— 这个 SW 只起「换源」作用，没有「加速」，每次仍回源缤纷云。
 *   B. fullpath() 把查询串整个丢掉，?w=400&fmt=webp&q=73 这类缤纷云图片处理参数失效。
 *
 * 本版策略：
 *   - 只有 TARGET_HOSTS 内的域名才介入，其他请求一律不 respondWith（避免资源丢失）；
 *   - 查询串原样带到 S3（修 B）；
 *   - 站点版本 = index.html 内容的哈希，写进 KV 的 blog_version（修 A），
 *     版本一变就清空资源缓存，保证不会长期吃旧 CSS / 旧 JS；
 *   - HTML：回源优先（内容始终最新），回源失败再用缓存兜底；
 *   - 其余资源：缓存优先（真正省流加速），超过 TTL 后台静默校正一次；
 *   - 任何异常都回退到浏览器原始请求，绝不返回悬空结果。
 *----------------------------------------------------------------*/
const CACHE_NAME = 'ICDNCache-v2';         // 资源缓存
const META_CACHE = 'ICDNCache-meta';       // 元数据（版本号），单独存放，清资源缓存时不受牵连
/* 需要分流的域名白名单（不在名单里的域名一律不介入，保持各镜像线路独立）
   - example.com 主线（Vercel）
   - example.com / example.com 裸域：目前会 301 跳到 www，跳转还在时这段不生效；
     哪天去掉跳转，这两个域名立刻自动分流，不用再改代码
   - example.com example.com 镜像线
   注意：github./netlify.example.com、github.io 是刻意排除的独立备用线 */
const TARGET_HOSTS = ['example.com', 'www.example.com'];
const S3_ORIGIN = 'https://your-bucket.s3.example.com';
const VERSION_KEY = 'blog_version';
const TTL = 24 * 60 * 60 * 1000;           // 资源最长 24 小时后台校正一次

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  await self.clients.claim();
  const keys = await caches.keys();        // 清理旧版本残留的 ICDNCache*
  await Promise.all(keys
    .filter((k) => k.indexOf('ICDNCache') === 0 && k !== CACHE_NAME && k !== META_CACHE)
    .map((k) => caches.delete(k)));
})()));

/* 极简 KV 存储，用来记住站点版本号 */
const db = {
  read: (key) => caches.open(META_CACHE)
    .then((cache) => cache.match(new Request('https://LOCALCACHE/' + encodeURIComponent(key))))
    .then((res) => (res ? res.text() : null))
    .catch(() => null),
  write: (key, value) => caches.open(META_CACHE)
    .then((cache) => cache.put(new Request('https://LOCALCACHE/' + encodeURIComponent(key)), new Response(value)))
    .catch(() => {})
};
self.db = db;   // 保留全局引用，便于调试

/* 路径 → S3 key：目录补 index.html；无扩展名且不带查询串时补 .html */
const fullpath = (pathname, hasQuery) => {
  const path = pathname.split('?')[0].split('#')[0];
  if (path.match(/\/$/)) return path + 'index.html';
  if (!path.match(/\.[a-zA-Z]+$/) && !hasQuery) return path + '.html';
  return path;
};

const getFileType = (fileName) => {
  const suffix = String(fileName).split('.').pop().toLowerCase();
  const map = {
    html: 'text/html', htm: 'text/html', js: 'text/javascript', mjs: 'text/javascript',
    css: 'text/css', jpg: 'image/jpeg', jpeg: 'image/jpeg', ico: 'image/x-icon',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
    json: 'application/json', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf'
  };
  return map[suffix] || 'text/plain';
};

/* 站点版本：index.html 内容的轻量哈希（变了说明站点重新构建过） */
const hash = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

/* 统一构造返回体：补 Content-Type，并记下入库时间供 TTL 判断 */
const build = (body, name) => new Response(body, {
  status: 200,
  headers: {
    'Content-Type': getFileType(name) + ';charset=utf-8',
    'X-SW-TIME': String(Date.now())
  }
});

/* 竞速拉取：多个源里谁先返回 200 就用谁（当前只有一个 S3 源）
 * cache: 'no-cache' 让浏览器做条件请求（命中 304 就不重复下载正文） */
const lfetch = async (urls) => {
  const controller = new AbortController();
  return Promise.all(urls.map((u) =>
    fetch(u, { signal: controller.signal, cache: 'no-cache' }).then((res) =>
      res.arrayBuffer().then((buf) => {
        if (res.status !== 200) throw new Error('HTTP ' + res.status);
        controller.abort();
        return new Response(buf, { status: 200, headers: res.headers });
      })
    )
  )).then((list) => list[0]);
};

/* target → 文件名：必须先去查询串，否则 index.css?v=1 会判成 text/plain */
const nameOf = (target) => target.split('?')[0].split('#')[0].split('/').pop();

/* 回源一份并写入缓存 */
const fetchAndCache = async (cache, target) => {
  const res = await lfetch([target]);
  const buf = await res.arrayBuffer();
  const out = build(buf, nameOf(target));
  await cache.put(target, out.clone());
  return out;
};

/* TTL 到期的资源后台静默校正：失败就算了，不影响本次返回 */
const revalidate = (cache, target) => {
  lfetch([target])
    .then((res) => res.arrayBuffer())
    .then((buf) => cache.put(target, build(buf, nameOf(target))))
    .catch(() => {});
};

/* 只有目标域名才分流；处理失败必须回退，绝不让请求悬空 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (TARGET_HOSTS.indexOf(url.hostname) === -1) return;   // ★ 关键：非目标域名完全不介入

  const search = url.search || '';
  const path = fullpath(url.pathname, !!search);
  const name = path.split('/').pop();
  const target = S3_ORIGIN + path + search;                // ★ 查询串原样带上（修 B）
  const isHTML = /\.html$/.test(path) || req.mode === 'navigate';

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const hit = await cache.match(target);

      if (isHTML) {
        /* HTML 永远回源，保证内容最新；顺带用它的哈希刷新站点版本 */
        const res = await lfetch([target]);
        const buf = await res.arrayBuffer();
        const version = hash(new TextDecoder().decode(buf));
        const oldVersion = await db.read(VERSION_KEY);
        if (version !== oldVersion) {
          if (oldVersion) await caches.delete(CACHE_NAME); // 站点更新：整片资源缓存作废（首次安装无需清）
          await db.write(VERSION_KEY, version);
        }
        const out = build(buf, name);
        const fresh = await caches.open(CACHE_NAME);
        await fresh.put(target, out.clone());
        return out;
      }

      if (hit) {
        if (Date.now() - Number(hit.headers.get('X-SW-TIME') || 0) > TTL) revalidate(cache, target);
        return hit;                                        // ★ 命中缓存：真正的加速
      }
      return await fetchAndCache(cache, target);
    } catch (err) {
      console.warn('[sw] S3 分流失败，回退原始请求：', req.url, err && err.message);
      try {
        const cached = await cache.match(target);          // 回源失败时用缓存兜底
        if (cached) return cached;
      } catch (e) { /* 忽略 */ }
      try { return await fetch(req); }
      catch (e2) { return new Response('', { status: 504, statusText: 'Gateway Timeout' }); }
    }
  })());
});
