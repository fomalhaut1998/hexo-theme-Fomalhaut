/*!
 * ping-route.js —— 侧栏「公告栏」的线路延时徽标
 * ============================================================================
 * 【做什么】
 *   读公告栏里每条线路的 <a class="a-chip" href="https://..."> ，在胶囊后面挂一个
 *   <span class="a-ms"> 徽标，显示「本机 → 该线路」的一次网络往返耗时（例如 82ms）。
 *
 * 【怎么测的（为什么不是真的 ICMP ping）】
 *   浏览器里发不出 ICMP。这里用 fetch() 请求该线路域名根路径上的一个「带随机串」地址，
 *   取 Resource Timing 的 responseStart − startTime —— 也就是「发出请求 → 收到响应首字节」
 *   的时间，正好是一次 HTTP 往返。它包含 DNS/TCP/TLS（首次探测时），因此首轮数字会略
 *   高于稳态；这也是「从本机打开这条线路要等多久」的真实感受值。
 *
 * 【为什么不会拖慢页面】
 *   1. 全部在 window.load 之后、用 requestIdleCallback 才开跑，绝不进首屏关键路径；
 *   2. 四条线路不是齐发，而是每条错开 180ms 依次探测（默认配置里第一个还会再等 350ms）；
 *   3. 单次探测 8s 超时（AbortController），失败后 1.5s 重试一次，封顶两次；
 *   4. 探测请求走 no-cors + 随机查询串，不读响应体、不解析结果，命中不了站点 SW 缓存；
 *   5. 同一时刻只允许一波探测（busy 闸），pjax 换页后由 pjax:complete 事件重建徽标。
 *
 * 【可调参数】改调用处传入的 opts（见 inject/ping-route-boot.js）或这里的 DEFAULTS。
 *
 * 【回滚】删掉本文件，并去掉 _config.fomalhaut.yml 里引用 boot 脚本的那一行。
 * ============================================================================ */
(function () {
  'use strict';

  var boot = window.__FOMAL_PING_ROUTE__ || {};
  var DEFAULTS = {
    root: '.card-announcement .anno2',
    linkSel: '.a-chip[href]',
    badgeClass: 'a-ms',
    initialDelay: 350,
    stagger: 180,
    retryDelay: 1500,
    attempts: 2,
    slowAt: 400,
    badAt: 1000
  };
  var cfg = {};
  var k;
  for (k in DEFAULTS) { if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) cfg[k] = DEFAULTS[k]; }
  for (k in boot) { if (Object.prototype.hasOwnProperty.call(boot, k)) cfg[k] = boot[k]; }

  var isDebug = /[?&]debug=1(&|$)/.test(location.search)
    || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  function log() {
    if (!isDebug || !window.console || !console.log) return;
    var a = Array.prototype.slice.call(arguments);
    a.unshift('[ping-route]');
    console.log.apply(console, a);
  }

  /* 探测地址：根路径 + 随机串。随机串是为了绕过浏览器缓存与站点 SW 缓存，
     每次量到的都是真实网络往返，而不是「0ms 的缓存命中」。
     （sw.js 那边对带 __pr= 的请求只改写回源、不写 CacheStorage，
       否则每个随机串都会在 ICDNCache 里留下一条约 98KB、永远读不到的记录。） */
  function probeUrl(href, tag) {
    var u;
    try { u = new URL(href); } catch (e) { return null; }
    return u.origin + '/?__pr=' + Date.now().toString(36) + '-' + tag;
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* 让出主线程：优先空闲时段，不支持就退回 setTimeout(0) */
  function idle() {
    return new Promise(function (r) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(function () { r(); }, { timeout: 600 });
      } else {
        setTimeout(r, 0);
      }
    });
  }

  /* 一次探测：返回 {ms, status} 或 null。ms 是「请求发出 → 响应首字节」的毫秒数。 */
  function once(url, timeoutMs) {
    if (typeof window.performance === 'undefined' || typeof performance.now !== 'function') {
      return Promise.resolve(null);
    }
    var t0 = performance.now();
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs);
    return fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      var ms = performance.now() - t0;
      var status = 0;
      /* Resource Timing 的 responseStart 更贴近「首字节」，优先用它；拿不到就退回 wall clock。
         真实用户的设备上两者通常只差几毫秒（执行完 then 就取数），所以这个兜底是安全的。 */
      try {
        if (typeof performance.getEntriesByName === 'function') {
          var list = performance.getEntriesByName(url);
          var e = list && list[list.length - 1];
          if (e && typeof e.responseStart === 'number' && e.responseStart > 0 && e.startTime >= 0) {
            ms = e.responseStart - e.startTime;
            status = e.responseStatus || 0;
          }
        }
      } catch (err) { /* Resource Timing 不可用就用 wall clock */ }
      try { if (res && res.body && typeof res.body.cancel === 'function') res.body.cancel(); } catch (err) { }
      return { ms: ms, status: status };
    }).catch(function (err) {
      clearTimeout(timer);
      log('probe failed', url, err && err.message);
      return null;
    });
  }

  function measure(url) {
    var best = null;
    var n = 0;
    function step() {
      n += 1;
      return once(url, 8000).then(function (r) {
        if (r) {
          if (best === null || r.ms < best.ms) best = r;
          return best;                       /* 第一次成功就不再补测，省一次请求 */
        }
        if (n >= cfg.attempts) return null;
        return delay(cfg.retryDelay).then(step);
      });
    }
    return step();
  }

  function paint(el, state, text, title) {
    el.setAttribute('data-state', state);
    el.setAttribute('data-raw', text);
    el.textContent = text;
    if (title) el.setAttribute('title', title);
  }

  /* 毫秒 → 徽标文字：<1s 显示 82ms；≥1s 显示 1.5s / 12s（避免四位数毫秒把徽标撑宽） */
  function fmt(ms) {
    if (ms < 1000) return Math.round(ms) + 'ms';
    if (ms < 10000) return (ms / 1000).toFixed(1) + 's';
    return Math.round(ms / 1000) + 's';
  }

  /* 把毫秒数映射成「状态 + 徽标文字 + 悬浮说明」：
     正常 ok（主题色）／偏慢 slow ≥400ms（琥珀）／很慢 bad ≥1000ms（红）／失败 fail（—） */
  function classify(badge, ms) {
    var state = ms >= cfg.badAt ? 'bad' : (ms >= cfg.slowAt ? 'slow' : 'ok');
    var text = fmt(ms);
    var tip = '本机 → 该线路一次网络往返约 ' + text
      + (state === 'bad' ? '（很慢）' : state === 'slow' ? '（偏慢）' : '') + '；点击徽标可重测';
    paint(badge, state, text, tip);
  }

  var busy = false;

  function run() {
    if (navigator.onLine === false) { log('offline, skip'); return; }
    var root = document.querySelector(cfg.root);
    if (!root) { log('no announcement card, skip'); return; }
    var links = root.querySelectorAll(cfg.linkSel);
    if (!links.length) { log('no route links, skip'); return; }

    var i;
    for (i = 0; i < links.length; i++) {
      var a = links[i];
      a.__prSeq = i;
      a.__prUrl = probeUrl(a.getAttribute('href'), i);
      if (!a.__prBadge) {
        var b = document.createElement('span');
        b.className = cfg.badgeClass;
        b.textContent = '—';
        b.setAttribute('data-state', 'wait');
        b.setAttribute('title', '本机 → 该线路的一次网络往返（鼠标点一下可重测）');
        a.insertAdjacentElement('afterend', b);
        a.__prBadge = b;
        /* 点一下徽标 = 只重测这一条，不刷新页面 */
        b.__prLink = a;
        b.addEventListener('click', function () {
          var link = this.__prLink;
          if (!link || !link.__prUrl) return;
          var badge = link.__prBadge;
          paint(badge, 'load', '···', '正在重测…');
          measure(link.__prUrl).then(function (r) {
            if (!r) { paint(badge, 'fail', '—', '探测失败（超时或被拦截）'); return; }
            classify(badge, Math.round(r.ms));
          });
        });
      }
      if (!a.__prUrl) { paint(a.__prBadge, 'fail', '—', '链接无法解析'); }
    }

    if (busy) { log('probe wave already in flight; badges rebuilt, skip probing'); return; }

    /* 串行 + 错开：一次只有一个探测在飞，主线程和带宽都不被抢占 */
    busy = true;
    var seq = Promise.resolve();
    for (i = 0; i < links.length; i++) {
      (function (a, idx) {
        seq = seq.then(function () {
          return idle().then(function () {
            if (!a.__prUrl) return;
            paint(a.__prBadge, 'load', '···', '正在探测…');
            return delay(cfg.initialDelay + idx * cfg.stagger).then(function () {
              return measure(a.__prUrl).then(function (r) {
                if (!r) { paint(a.__prBadge, 'fail', '—', '探测失败（超时或被拦截）'); return; }
                var ms = Math.round(r.ms);
                classify(a.__prBadge, ms);
                log(a.hostname || a.getAttribute('href'), ms + 'ms');
              });
            });
          });
        });
      })(links[i], i);
    }
    return seq.then(function () { busy = false; }, function () { busy = false; });
  }

  var started = false;
  var timer = null;
  var lastPjax = 0;

  /* 主题用 pjax 换页：侧栏（公告栏）会被替换成新文档里那份「没有徽标」的 HTML，
     而 inject.head 里的脚本不会被 pjax 重跑，所以这里必须自己接住换页事件重建。
     两个事件都监听（djax/pjax 各种实现命名不同），400ms 去抖避免连点重复触发。 */
  function onPjax() {
    var now = Date.now();
    if (now - lastPjax < 400) return;
    lastPjax = now;
    setTimeout(function () { run(); }, 600);
  }
  document.addEventListener('pjax:complete', onPjax);
  document.addEventListener('pjax:end', onPjax);

  function start() {
    if (started) return;
    started = true;
    run();
    /* 5 分钟后悄悄复测一轮；页面在后台标签页时跳过，切回来再测 */
    timer = setInterval(function () {
      if (document.hidden) return;
      run();
    }, 5 * 60 * 1000);
  }

  /* 侧栏公告栏是随 DOM 直出的，但等 load 再跑能确保不与首屏资源抢带宽 */
  function arm() {
    if (document.readyState === 'complete') { setTimeout(start, cfg.initialDelay); }
    else { window.addEventListener('load', function () { setTimeout(start, cfg.initialDelay); }, { once: true }); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }

  /* pjax 换页（主题会在切页后重跑注入脚本）不会重建侧栏，但若公告栏被重绘过，
     started 标记会挡住第二次初始化，这里暴露一个手动入口以便排查。 */
  window.__fomalRoutePing = { run: run, onPjax: onPjax, start: function () { started = false; start(); }, stop: function () { if (timer) clearInterval(timer); timer = null; started = false; } };
})();
