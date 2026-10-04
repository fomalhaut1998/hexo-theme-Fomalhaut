/*!
 * 社交二维码点击 → 同页灯箱展示（不跳转、不下载）
 * 背景：二维码放在缤纷云 S4 默认域名上，返回 Content-Disposition: attachment，
 *      浏览器直接导航会变成下载；这里就地接管点击，用主题自带的 Fancybox 弹层显示。
 * 生效对象：a.social-icon[title="微信"] / [title="QQ"] / href 里带 QRCode 的社交图标。
 * 做法：文档级事件委托（capture 阶段）。不依赖“元素何时被绑定”，作者卡被 pjax
 *      或其它脚本重建后依然生效；脚本执行本身也留了 data-wechat-qr 标记便于排查。
 * 依赖：主题 fancybox: true（Fancybox v4，全局名 Fancybox）。未就绪时用自建遮罩兜底
 *      （不能用 window.open —— 缤纷云那个 attachment 响应头会让新标签页变下载）。
 * 回滚：删掉 _config.fomalhaut.yml inject.bottom 里的 <script defer src="/js/wechat-qr.js"></script> 以及本文件即可。
 */
(function () {
  'use strict';
  var SELECTOR = 'a.social-icon[title="微信"], a.social-icon[title="QQ"], a.social-icon[href*="QRCode"]';

  document.documentElement.setAttribute('data-wechat-qr', 'ready'); // 探针标记：脚本已执行

  function captionOf(el) {
    var t = el.getAttribute('title') || '';
    return (t ? t + ' · ' : '') + '扫码添加好友';
  }

  // 兜底：Fancybox 未就绪时自己铺一层遮罩，点任意处关闭
  function fallbackOverlay(src, caption) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:16px;max-width:min(420px,86vw);text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)';
    var img = document.createElement('img');
    img.src = src;
    img.alt = caption;
    img.style.cssText = 'display:block;width:100%;height:auto';
    var p = document.createElement('p');
    p.textContent = caption;
    p.style.cssText = 'margin:10px 0 0;color:#333;font-size:14px';
    box.appendChild(img);
    box.appendChild(p);
    wrap.appendChild(box);
    wrap.addEventListener('click', function () { wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function show(el, src) {
    if (window.Fancybox && typeof window.Fancybox.show === 'function') {
      window.Fancybox.show([{ src: src, type: 'image', caption: captionOf(el) }], {});
    } else {
      fallbackOverlay(src, captionOf(el));
    }
  }

  function onDocClick(ev) {
    var t = ev.target;
    var el = t && t.closest ? t.closest(SELECTOR) : null;
    if (!el) return;
    var src = el.getAttribute('href') || el.getAttribute('data-href');
    if (!src) return;
    ev.preventDefault();
    ev.stopPropagation();
    show(el, src);
  }

  // capture 阶段先手接管，避免被主题或其它脚本的默认“新标签页”行为抢先
  document.addEventListener('click', onDocClick, true);
})();
