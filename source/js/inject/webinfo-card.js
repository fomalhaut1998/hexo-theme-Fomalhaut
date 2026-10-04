/* ============================================================================
 * source/js/inject/webinfo-card.js —— 小站资讯卡：KPI 数字滚动 + 运行天数 + 站点更新时间
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.bottom 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1716-1780，原来是内联的 <script id="webinfoCardJs">。
 *   配置里仍是同步 <script src>（没有加 defer/async），执行时机与原来的内联写法完全一样。
 * ----------------------------------------------------------------------------
 * 2026-10-04 追加时间条第三项「更新」= 站点最后更新时间（最近一次部署时间）：
 *   · 第一版取 GitHub API（产物仓库最近一次提交），要吃不认证的 60 次/小时限流；
 *     当天改成下面的同源方案，API 那套已删。
 *   · 真实值：部署工作流在 gulp 之后写 public/deploy.json（见 .github/workflows/autodeploy.yml
 *     的「写入部署时间戳」步骤），里面的 at 就是本次部署成功时的构建时刻；
 *     元素的 data-deploy-api（模板里 url_for 出来的）指向它，同源小文件随便读。
 *   · 兜底值：模板构建时把本次 generate 时刻写进 data-deploy-build，先显示成 MM-DD；
 *     deploy.json 读不到（老产物、本地预览）时就用它，读到真值再换掉。
 *   · 结果存 localStorage 10 分钟，翻页不重复请求；只接受更新的时间，绝不把时间往回退。
 * ========================================================================== */

(function () {
  var ROOT = '.card-webinfo';

  /* ── 站点更新时间（部署产物里的 deploy.json）────────────────────────── */
  var DEPLOY_KEY = 'wi-deploy-at';
  var DEPLOY_TTL = 10 * 60 * 1000;   // 同源小文件随便读，10 分钟够省掉翻页时的重复请求
  var deployAt = null;
  var lastTry = 0;        // 上次发请求的时刻：失败时也别一分钟一请求

  function fmt(n, mode) {
    if (mode === 'k') return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n;
    if (mode !== 'w') return '' + n;
    return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + n);
  }
  function daysSince(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    if (isNaN(t)) return null;
    var d = Math.floor((Date.now() - t) / 86400000);
    return d < 0 ? 0 : d;
  }
  /* 相对时间：1 分钟内「刚刚」，其后 分钟/小时/天，超过 30 天直接给日期（简写，越早越短） */
  function agoText(t) {
    var s = (Date.now() - t) / 1000;
    if (!isFinite(s) || s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' 天前';
    var d = new Date(t), n = new Date();
    var md = (d.getMonth() + 1) + '-' + d.getDate();
    return d.getFullYear() === n.getFullYear() ? md : d.getFullYear() + '-' + md;
  }
  /* 优先级：已取到的真实部署时间 > 构建时刻兜底；两者都没有才写「—」 */
  function paintDeploy() {
    var el = document.querySelector(ROOT + ' .wi-deploy-v');
    if (!el) return;
    var t = deployAt;
    if (t == null) {
      var b = Date.parse(el.getAttribute('data-deploy-build') || '');
      t = isNaN(b) ? null : b;
    }
    el.textContent = t == null ? '—' : agoText(t);
  }
  function cacheGet() {
    try {
      var o = JSON.parse(localStorage.getItem(DEPLOY_KEY) || 'null');
      if (o && o.t) return o;
    } catch (e) {}
    return null;
  }
  function cacheSet(t) {
    try { localStorage.setItem(DEPLOY_KEY, JSON.stringify({ t: t, at: Date.now() })); } catch (e) {}
  }
  function deployFetch() {
    var el = document.querySelector(ROOT + ' .wi-deploy-v');
    if (!el || !window.fetch) return;
    var api = el.getAttribute('data-deploy-api');
    if (!api) return;
    lastTry = Date.now();
    var ctl = null, timer = null;
    var opt = { cache: 'no-store' };   // 别让浏览器缓存把旧时间喂回来
    try {
      ctl = new AbortController();
      opt.signal = ctl.signal;
      timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 8000);
    } catch (e) {}
    fetch(api, opt).then(function (r) {
      return r && r.ok ? r.json() : null;
    }).then(function (j) {
      if (timer) clearTimeout(timer);
      if (!j) return;
      var t = Date.parse(j.at || '');
      if (isNaN(t)) return;
      if (deployAt != null && t < deployAt) return;   // 只接受更新的时间，别把时间往回退
      deployAt = t;
      cacheSet(t);
      paintDeploy();
      lastTry = 0;
    })['catch'](function () { if (timer) clearTimeout(timer); });
  }
  function refresh() {
    var a = document.querySelector(ROOT + ' .wi-run');
    if (a) { var da = daysSince(a.getAttribute('data-run-since')); if (da !== null) a.textContent = da + ' 天'; }
    var b = document.querySelector(ROOT + ' .wi-last');
    if (b) { var db = daysSince(b.getAttribute('data-last-post')); if (db !== null) b.textContent = db + ' 天'; }
    paintDeploy();
    // 页面长时间开着时，缓存过期后再校正一次（10 分钟内不重复发请求）
    var c = cacheGet();
    if (c && (Date.now() - c.at) > DEPLOY_TTL && (Date.now() - lastTry) > 600000) deployFetch();
  }
  function countUp() {
    var nodes = document.querySelectorAll(ROOT + ' .wi-kpi-num[data-countup]');
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        if (el.getAttribute('data-cu') === '1') return;
        el.setAttribute('data-cu', '1');
        var target = parseInt(el.getAttribute('data-countup'), 10);
        if (isNaN(target)) target = 0;
        var mode = el.getAttribute('data-format') || '';
        if (reduce || target <= 0) { el.textContent = fmt(target, mode); return; }
        var t0 = 0;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = (ts - t0) / 900;
          if (p > 1) p = 1;
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.round(target * e), mode);
          if (p < 1) { requestAnimationFrame(step); } else { el.textContent = fmt(target, mode); }
        }
        requestAnimationFrame(step);
        setTimeout(function () { el.textContent = fmt(target, mode); }, 1400);
      })(nodes[i]);
    }
  }
  // 计数兜底：Vercount / 不蒜子的 span 若 6 秒后仍是空的或还在转圈，一律写「—」，
  // 免得统计服务再挂一次时读者一直看 spinner（卡片里的两格初始就是 —，这里主要管文章页）。
  function stampDash() {
    try {
      var ns = document.querySelectorAll('[id^="vercount_value_"],[id^="busuanzi_value_"]');
      for (var i = 0; i < ns.length; i++) {
        var el = ns[i], t = (el.textContent || '').replace(/\s/g, '');
        if (!t || t === '-' || t === '—' || el.querySelector('i.fa-spin')) { el.textContent = '—'; }
      }
    } catch (e) {}
  }
  function init() {
    var el = document.querySelector(ROOT + ' .wi-deploy-v');
    if (el) {
      var c = cacheGet();
      if (c) deployAt = c.t;
      paintDeploy();
      if (!c || (Date.now() - c.at) > DEPLOY_TTL) deployFetch();   // 过期就后台校正
    }
    refresh(); countUp(); setTimeout(stampDash, 6000);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  document.addEventListener('pjax:complete', init);
  window.addEventListener('load', function () { setTimeout(stampDash, 6000); });
  setInterval(refresh, 60000);
})();
