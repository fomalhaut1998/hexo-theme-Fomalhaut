/*!
 * pjax-guard.js —— 修 pjax 选择器不匹配导致的「换页退回整页刷新」与「加载遮罩一直转圈」
 *
 * 【问题】themes/fomalhaut/layout/includes/third-party/pjax.pug:6 的 pjaxSelectors 里写死了
 *   '#tag-echarts'、'#posts-echart'、'#categories-echarts'，而这三个 id 只存在于文章统计页（/tags/，由主题
 *   layout/includes/page/echarts.pug 渲染）。pjax 的 switches-selectors 在切换前会逐个比对「新文档 / 旧文档里
 *   该选择器的元素个数」，只要有一个不一致就 throw：
 *       DOM doesn’t look the same on new loaded page: ’#tag-echarts’ - new 0, old 1
 *   这个异常被 handle-response 捕获后：只触发 pjax:error（**不触发 pjax:complete**），并且调用
 *   latestChance(href) → window.location = href，也就是直接退回整页跳转。因此：
 *     ① 离开 /tags/（新旧文档里这三个 id 由 1 变 0）或进入 /tags/（由 0 变 1）都会被强制整页刷新；
 *     ② 遮罩在 pjax:send 里被 preloader.initLoading() 打开，而负责关闭它的 preloader.endLoading()
 *        是 pjax:complete 处理器的最后一句 —— complete 永远不来，遮罩就一直转（用户 2026-10-05 报的 bug）。
 *
 * 【本文件做两件事，都不需要改主题源码】
 *   1) 运行期把这三个选择器从 pjax 的 selectors 里摘掉 —— 图表脚本依旧会被 '#body-wrap' 这一项重执行，
 *      换页后图表照常重建，功能不受影响；
 *   2) 兜底层：pjax:send 后 6 秒仍未收到 pjax:complete、收到 pjax:error、以及页面从 bfcache 恢复时，
 *      都把加载遮罩关掉（preloader.endLoading()），保证任何意外都不会把读者困在加载动画里。
 * 回滚：删掉本文件，并去掉 _config.fomalhaut.yml 里引用它的那一行。
 */
(function () {
  'use strict';
  var BAD_SELECTORS = ['#tag-echarts', '#posts-echart', '#categories-echarts'];

  function filterSelectors(options) {
    if (options && Object.prototype.toString.call(options.selectors) === '[object Array]') {
      options.selectors = options.selectors.filter(function (s) { return BAD_SELECTORS.indexOf(s) === -1; });
    }
    return options;
  }

  /* 1) 换页后主题会重新执行 pjax.pug，重新 new 一个 Pjax 实例并覆盖 window.Pjax；
        用访问器把「任何一次给 window.Pjax 赋值」都接住并包一层滤镜，这样实例永远拿不到坏选择器。 */
  function installCtorGuard() {
    var current = window.Pjax;
    if (!current || current.__pjaxGuardWrapped) return;
    function wrap(Ctor) {
      if (typeof Ctor !== 'function' || Ctor.__pjaxGuardWrapped) return Ctor;
      function Guarded(options) { return new Ctor(filterSelectors(options)); }
      Guarded.__pjaxGuardWrapped = true;
      Guarded.prototype = Ctor.prototype;
      for (var k in Ctor) { if (Object.prototype.hasOwnProperty.call(Ctor, k)) { try { Guarded[k] = Ctor[k]; } catch (e) {} } }
      return Guarded;
    }
    current = wrap(current);
    try {
      Object.defineProperty(window, 'Pjax', {
        configurable: true,
        get: function () { return current; },
        set: function (v) { current = wrap(v); }
      });
    } catch (e) { window.Pjax = current; }
  }

  /* 主题的文章发布统计图内联脚本用 \`let postsOption\`（另两张图是 var）。pjax 换页会重执行同一段
     脚本，而 \`let\` 的全局词法绑定不可重复声明（改成 var 也一样冲突：
     "Identifier 'postsOption' has already been declared"）→ 整段脚本以 SyntaxError 中止，折线图容器成空壳。
     若本文档已经跑过一次该脚本（typeof postsOption / window.xxxChart 判断），就把 \`let\` 声明降级成一次
     属性写入 —— 后面的 postsChart.setOption(postsOption) 仍读第一次执行留下的那份数据，脚本从此可以安全地
     重复执行、由主题脚本自己重建折线图；首次进入本页时不做任何改写，保证首屏走主题原路径。
     stats.js 里的 statsReviveCharts() 是兜底（万一主题改了写法也能把图重建出来）。 */
  function hasPostsOptionBinding() {
    try {
      if (typeof postsOption !== 'undefined') return true;
    } catch (e) { }
    return !!(window.postsChart || window.tagsChart || window.categoriesChart);
  }

  /* echarts.min.js 只写在文章统计页的正文里（主题 layout/includes/page/echarts.pug），其它页面没有。
     而 pjax 切换时是先插 DOM/跑内联脚本、外部 <script src> 才异步下载 —— 于是从别的页面点导航进
     /tags/ 时内联脚本会 "Uncaught ReferenceError: echarts is not defined"，三张图全空白。
     这里在切换前先把图表库载好（同一个 URL，浏览器缓存），再继续这次切换。 */
  var ECHARTS_SRC_RE = /<script[^>]+src=["']([^"']*echarts[^"']*\.js)["']/i;

  function preloadEcharts(url, next) {
    var pending = window.__pjaxGuardEcharts
    if (pending) { pending.push(next); return }
    pending = window.__pjaxGuardEcharts = [next]
    var done = function () {
      window.__pjaxGuardEcharts = null
      for (var i = 0; i < pending.length; i++) { try { pending[i]() } catch (e) { } }
    }
    var s = document.createElement('script')
    s.src = url
    s.onload = done
    s.onerror = done
    document.head.appendChild(s)
  }

  function patchContentSanitizer() {
    try {
      var proto = window.Pjax && window.Pjax.prototype;
      if (!proto || proto.__pjaxGuardSanitize || typeof proto.loadContent !== 'function') return;
      proto.__pjaxGuardSanitize = true;
      var orig = proto.loadContent;
      proto.loadContent = function (html) {
        if (typeof html !== 'string') return orig.apply(this, arguments);
        var args = Array.prototype.slice.call(arguments);
        // ① 目标页要 echarts 但当前文档还没有 → 先把库载好再继续切换
        if (typeof window.echarts === 'undefined') {
          var hit = ECHARTS_SRC_RE.exec(html);
          if (hit) {
            var self = this;
            preloadEcharts(hit[1], function () { orig.apply(self, args) });
            return;
          }
        }
        // ② 重复执行 let 声明的兜底改写
        if (html.indexOf('let postsOption') !== -1 && hasPostsOptionBinding()) {
          args[0] = html.replace(/let(\s+postsOption\b)/g, 'window.__pjaxPostsOption');
        }
        return orig.apply(this, args);
      };
    } catch (e) {}
  }

  function patchInstance() {
    try { if (window.pjax && window.pjax.options) filterSelectors(window.pjax.options); } catch (e) {}
  }

  installCtorGuard();
  patchContentSanitizer();
  patchInstance();
  document.addEventListener('pjax:complete', function () { installCtorGuard(); patchContentSanitizer(); patchInstance(); });
  document.addEventListener('pjax:success', function () { installCtorGuard(); patchContentSanitizer(); patchInstance(); });

  /* 2) 遮罩兜底 */
  function endLoading(reason) {
    try {
      if (typeof preloader === 'object' && preloader && typeof preloader.endLoading === 'function') preloader.endLoading();
    } catch (e) {}
  }
  var timer = null;
  document.addEventListener('pjax:send', function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; endLoading('timeout'); }, 6000);
  });
  document.addEventListener('pjax:complete', function () { if (timer) { clearTimeout(timer); timer = null; } });
  document.addEventListener('pjax:error', function () { if (timer) { clearTimeout(timer); timer = null; } endLoading('error'); });
  window.addEventListener('pageshow', function (e) { if (e && e.persisted) endLoading('bfcache'); });
})();
