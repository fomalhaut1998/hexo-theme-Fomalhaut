/*!
 * footer-music.js —— 页脚「猜你想看」右下角空位补一条「听点音乐」→ /life/music/（八音盒）
 *
 * 【为什么走注入，而不是改主题源码】
 *   「猜你想看」这批链接是硬编码在 themes/fomalhaut/layout/includes/footer.pug:14-31 的 pug 静态标签；
 *   主题配置（themes/fomalhaut/_config.yml:406 的 footer:）只有 owner / custom_text / copyright，
 *   没有链接表；站点配置的 inject 通道也只有「注入到 <head> / body 末尾」，没有「注入进页脚内部」的位置。
 *   为了不动 themes/ 源码（用户 2026-10-01 定的规范），这里在运行期把这条链接补进去。
 *
 * 【为什么补进最后一个 li】
 *   custom.css:2974 的 `.ft-links li a { display:inline-block; width:50% }` 让每个 a 占半行，
 *   而最后一个 li 目前只有「网站统计」一条，右半边是空的（用户截图圈出的位置），补进去正好填满。
 *
 * 【pjax】
 *   页脚在 #body-wrap 内，换页会被整块替换，所以除首屏外还要在 pjax 事件里重补一次；
 *   用 data-ft-music 做幂等标记，重复触发不会长出第二条。
 */
(function () {
  var LABEL = '听点音乐';
  var HREF = '/life/music/';

  function add() {
    var list = document.querySelector('#footer .ft-links');
    if (!list || list.querySelector('a[data-ft-music]')) return;
    var lis = list.querySelectorAll('li');
    if (!lis.length) return;
    var last = lis[lis.length - 1];
    var a = document.createElement('a');
    a.href = HREF;
    a.textContent = LABEL;
    a.setAttribute('data-ft-music', '1');
    last.appendChild(a);
  }

  add();
  ['DOMContentLoaded', 'pjax:complete', 'pjax:success', 'pjax:end'].forEach(function (ev) {
    document.addEventListener(ev, add);
  });
})();
