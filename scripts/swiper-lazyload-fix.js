/*!
 * swiper-lazyload-fix.js  —— 站点级脚本（不改 themes/ 与 node_modules/）
 * ---------------------------------------------------------------------------
 * 症状：首页顶部轮播（hexo-butterfly-swiper 注入的那张大卡片）在站内 pjax 往返
 *      回到首页后，轮播绕回的那一下图片区域是空白的（"有时候轮播着图出不来"）。
 *
 * 原因链（全部实测确认）：
 *  1) 主题开了图片懒加载：_config.fomalhaut.yml:1131-1135 lazyload.field: site，
 *     themes/fomalhaut/scripts/filters/post_lazyload.js 会把页面里所有
 *     `<img ... src=...>` 改写成 src=1x1 占位 gif + data-lazy-src=真图。
 *  2) 真正把真图填回去的是 vanilla-lazyload 实例：
 *     themes/fomalhaut/source/js/main.js:716-722
 *       const lazyloadImg = () => { window.lazyLoadInstance = new LazyLoad({
 *         elements_selector: 'img', threshold: 0, data_src: 'lazy-src' }) }
 *     它只在构造时登记当时的 <img>；之后新插入 DOM 的元素必须 update() 才会被登记。
 *  3) pjax 跳转完成时 themes/fomalhaut/layout/includes/third-party/pjax.pug:53-64
 *     先重新注入并【异步】执行所有 <script data-pjax>（swiper_init.js 就在其中），
 *     紧接着【同步】调用 window.lazyLoadInstance.update()。
 *     而 swiper_init.js 的 new Swiper({effect:'fade', loop:true}) 稍后才会克隆出
 *     .swiper-slide-duplicate 节点 —— 克隆比 update() 更晚，于是永远停在 1x1 占位图。
 *  4) 轮播循环到克隆位（也就是"绕回"那一下）时图片就是空的。
 *     直接刷新首页不复现（defer 脚本先于 main.js 的 LazyLoad 构造执行，克隆已被登记），
 *     只有站内 pjax 往返后才复现 —— 所以是"有时候"。
 *
 * 修法：在 页面加载完成 / pjax 完成 / Swiper 重建循环克隆（MutationObserver 监听
 *      .blog-slider__wrp 子节点增删）之后，补一次 window.lazyLoadInstance.update()，
 *      把后来插入的 <img> 登记进 LazyLoad。
 *
 * 卸载：删除本文件即可，不产生任何其它构建产物依赖。
 */
'use strict';

const SWIPER_LAZY_FIX_SCRIPT = `<script id="swiper-lazyload-fix">
(function () {
  if (window.__swiperLazyFix) return;
  window.__swiperLazyFix = true;

  function sync () {
    try {
      var inst = window.lazyLoadInstance;
      if (inst && typeof inst.update === 'function') inst.update();
    } catch (e) {}
  }

  function burst () {
    [0, 120, 300, 700, 1500, 2600].forEach(function (d) { setTimeout(sync, d); });
  }

  // 1) 首次加载 + 站内 pjax 返回后：等异步的 data-pjax 脚本（swiper_init.js）跑完再补登记
  document.addEventListener('pjax:complete', burst);
  window.addEventListener('load', burst);
  if (document.readyState !== 'loading') burst();
  else document.addEventListener('DOMContentLoaded', burst);

  // 2) Swiper 重建循环克隆时会增删 .blog-slider__wrp 的子节点（pjax 换页后容器会被替换，故持续重挂）
  setTimeout(function watchWrp () {
    var wrp = document.querySelector('.blog-slider__wrp');
    if (wrp && wrp !== window.__swiperLazyWrp) {
      try { if (window.__swiperLazyMo) window.__swiperLazyMo.disconnect(); } catch (e) {}
      window.__swiperLazyWrp = wrp;
      try {
        window.__swiperLazyMo = new MutationObserver(function () {
          clearTimeout(window.__swiperLazyTimer);
          window.__swiperLazyTimer = setTimeout(sync, 100);
        });
        window.__swiperLazyMo.observe(wrp, { childList: true });
      } catch (e) {}
    }
    setTimeout(watchWrp, 800);
  }, 800);
})();
</script>`;

hexo.extend.injector.register('body_end', SWIPER_LAZY_FIX_SCRIPT, 'default');
