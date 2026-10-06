/*------------------------------------------------------------------
 * sw.js —— Fomalhaut CDN 分流器（2026-10-01 修订）
 *
 * 历史问题（2026-09-30 版）：else 分支的 catch 没有 return，respondWith(undefined)
 * 直接抛错；注册了两个 fetch 监听器且同一 event 上 respondWith 两次；对所有同源请求
 * 都介入，任何抖动都会让整片资源加载不出来。
 *
 * 上一版修掉了上面三条，但留下两个问题，本版一并处理：
 *   A. db.read('blog_version') 读出来后从未被使用，KV 里也从来没人写过，
 *      于是缓存是空的 —— 这个 SW 只起「换源」作用，没有「加速」，每次仍回源对象存储。
 *   B. fullpath() 把查询串整个丢掉，?w=400&fmt=webp&q=73 这类对象存储图片处理参数失效。
 *
 * 本版策略：
 *   - 只有 TARGET_HOSTS 内的域名才介入，其他请求一律不 respondWith（避免资源丢失）；
 *   - 查询串原样带到 S3（修 B）；
 *   - 站点版本 = index.html 内容的哈希，写进 KV 的 blog_version（修 A），
 *     版本一变就清空资源缓存，保证不会长期吃旧 CSS / 旧 JS；
 *   - HTML：回源优先（内容始终最新），回源失败再用缓存兜底；
 *   - 其余资源：缓存优先（真正省流加速），超过 TTL 后台静默校正一次；
 *   - 任何异常都回退到浏览器原始请求，绝不返回悬空结果。
 *
 * 【2026-10-05 修订】
 *   C. 缓存失效只认 index.html 的哈希。如果某次发版只改了 JS/CSS 而 index.html
 *      字节没变（例如忘了同步改 ?v= 缓存戳），哈希不变 → 不清缓存 → 回访者会
 *      继续跑旧代码。现在把「文本资源」的 TTL 从 24 小时压到 10 分钟，这种情况
 *      最多撑 10 分钟就自我纠正；图片 / 字体 / 音视频仍是 24 小时。
 *   D. getFileType 的白名单只到 ttf，其余一律 text/plain。站内会走 SW 的还有
 *      自定义光标 .cur（source/assets/c*.cur）、atom.xml / sitemap.xml / search.xml、
 *      manifest、avif、otf/eot、音视频，已补齐。
 *   同时 CACHE_NAME 提到 v3：老访客 activate 时会整体丢掉 v2 的旧副本。
 *   E. ping-route.js 的线路探测是「站点自身域名 + 每次不同的随机串」，会被 SW 接住
 *      并写进 ICDNCache —— 每条约 98KB 且以后永远读不到，缓存会无限膨胀。
 *      现在带 __pr= 的请求只做「改写 + 回源」，不落地缓存。
 *----------------------------------------------------------------*/
const CACHE_NAME = 'ICDNCache-v3';         // 资源缓存（v3 = 2026-10-05 修订，升级即清掉旧的 v2 残留）
const META_CACHE = 'ICDNCache-meta';       // 元数据（版本号），单独存放，清资源缓存时不受牵连
/* 需要分流的域名白名单（不在名单里的域名一律不介入，保持各镜像线路独立）
   - example.com / www.example.com：主站。你自己部署时换成自己的域名，
     裸域与 www 都列上，两条都走同一套换源逻辑
   注意：备份线路（github.io、*.vercel.app 之类）刻意不列进来，
   它们本来就是「出了事才切」的独立线路 */
const TARGET_HOSTS = ['example.com', 'www.example.com'];
const S3_ORIGIN = 'https://your-bucket.s3.example.com';
const VERSION_KEY = 'blog_version';
const TTL_MEDIA = 24 * 60 * 60 * 1000;     // 图片 / 字体 / 音视频：24 小时后台校正一次（大文件，省流优先）
const TTL_TEXT = 10 * 60 * 1000;           // HTML / JS / CSS / JSON / XML 等文本资源：10 分钟

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
    json: 'application/json', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf',
    /* —— 2026-10-05 补齐 ——
       原来只列到 ttf，其余一律落到 text/plain。站内实际会走 SW 的还有：
       自定义光标 .cur（source/assets/c*.cur）、atom.xml / sitemap.xml / search.xml、
       manifest、avif、otf/eot、音视频。补上，免得浏览器拿到 text/plain 去猜。 */
    cur: 'image/x-icon', avif: 'image/avif', bmp: 'image/bmp', apng: 'image/apng',
    otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
    xml: 'application/xml', txt: 'text/plain', map: 'application/json',
    webmanifest: 'application/manifest+json', manifest: 'application/manifest+json',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm',
    pdf: 'application/pdf', wasm: 'application/wasm'
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

/* 哪些扩展名算「文本资源」→ 用短 TTL。判据与 getFileType 的键保持一致。 */
const TEXT_EXT = ['html', 'htm', 'js', 'mjs', 'css', 'json', 'xml', 'txt', 'map', 'webmanifest', 'manifest', 'svg'];
const ttlOf = (name) => (TEXT_EXT.indexOf(String(name).split('.').pop().toLowerCase()) === -1 ? TTL_MEDIA : TTL_TEXT);

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
  /* 线路探测：ping-route.js 请求「站点自身域名 + /?__pr=随机串」，会被这里接住。
     随机串每次都不同 → 缓存键每次都不同 → 写进去的条目以后永远读不到，只会让
     ICDNCache 无限膨胀（每条约 98KB；页面加载 / 每次 pjax / 每 5 分钟各来一轮）。 */
  const isProbe = /[?&]__pr=/.test(search);

  event.respondWith((async () => {
    /* 探测请求只改写回源、不落地缓存：量到的仍然是「本机 → 对象存储」的往返，
       侧栏线路徽标的数字不变，只是不再往 CacheStorage 里堆永远读不到的垃圾。 */
    if (isProbe) {
      try {
        return build(await (await lfetch([target])).arrayBuffer(), name);
      } catch (err) {
        console.warn('[sw] 探测回源失败，回退原始请求：', req.url, err && err.message);
        try { return await fetch(req); } catch (e2) { return new Response('', { status: 504, statusText: 'Gateway Timeout' }); }
      }
    }
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
        /* 文本资源用短 TTL：万一下次发版忘了改 ?v= 缓存戳，URL 不变、缓存键也不变，
           旧副本最多再撑 10 分钟就自我纠正，而不是 24 小时。
           图片 / 字体 / 音视频仍旧 24 小时，省流的大头不受影响。 */
        if (Date.now() - Number(hit.headers.get('X-SW-TIME') || 0) > ttlOf(name)) revalidate(cache, target);
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
