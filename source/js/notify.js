/*!
 * notify.js — 轻量通知组件（替代 Vue 2.6.14 + Element-UI 2.15.7）
 * ------------------------------------------------------------------
 * 背景：本站在 fomal.js 中有 14 处 \`new Vue({ data: function () { this.$notify({...}) } })\`，
 *       只为调用 Element-UI 的 $notify 弹出右下角提示。为此原先需要加载
 *       Vue(92KB) + Element-UI JS(577KB) + Element-UI CSS(236KB) = 905KB。
 *       本文件用约 4KB 复刻同样的通知外观（同尺寸/配色/动画/自动关闭/悬停暂停）。
 * 用法：fomalNotify({ title, message, type, position, offset, duration, showClose })
 *       type: success | warning | info | error（默认 info）
 *       position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'fomal-notify-style';

  var CSS = [
    '.fomal-notify-wrap{position:fixed;z-index:9999;display:flex;flex-direction:column;gap:16px;pointer-events:none}',
    '.fomal-notify-wrap.top-left{top:0;left:16px}',
    '.fomal-notify-wrap.top-right{top:0;right:16px}',
    '.fomal-notify-wrap.bottom-left{bottom:0;left:16px;flex-direction:column-reverse}',
    '.fomal-notify-wrap.bottom-right{bottom:0;right:16px;flex-direction:column-reverse}',
    '.fomal-notify{position:relative;display:flex;width:330px;padding:14px 26px 14px 13px;box-sizing:border-box;',
    'border:1px solid #ebeef5;border-radius:8px;background:#fff;box-shadow:0 2px 12px 0 rgba(0,0,0,.1);',
    'overflow:hidden;pointer-events:auto;transition:opacity .3s,transform .3s}',
    '.fomal-notify.is-enter{opacity:0;transform:translateX(-100%)}',
    '.fomal-notify-wrap.top-right .fomal-notify.is-enter,.fomal-notify-wrap.bottom-right .fomal-notify.is-enter{transform:translateX(100%)}',
    '.fomal-notify.is-leave{opacity:0;transform:translateX(-100%)}',
    '.fomal-notify-wrap.top-right .fomal-notify.is-leave,.fomal-notify-wrap.bottom-right .fomal-notify.is-leave{transform:translateX(100%)}',
    '.fomal-notify__icon{flex:0 0 24px;width:24px;height:24px;line-height:0}',
    '.fomal-notify__icon svg{width:24px;height:24px;display:block}',
    '.fomal-notify--success .fomal-notify__icon{color:#67c23a}',
    '.fomal-notify--warning .fomal-notify__icon{color:#e6a23c}',
    '.fomal-notify--error .fomal-notify__icon{color:#f56c6c}',
    '.fomal-notify--info .fomal-notify__icon{color:#909399}',
    '.fomal-notify__group{margin-left:13px;margin-right:8px;flex:1 1 auto;min-width:0}',
    '.fomal-notify__title{margin:0;font-size:16px;font-weight:700;color:#303133;line-height:1.4;word-break:break-word}',
    '.fomal-notify__content{margin:6px 0 0;font-size:14px;line-height:21px;color:#606266;text-align:justify;word-break:break-word;white-space:pre-line}',
    '.fomal-notify__close{position:absolute;top:15px;right:15px;cursor:pointer;color:#909399;line-height:0;font-size:0}',
    '.fomal-notify__close:hover{color:#303133}',
    '.fomal-notify__close svg{width:14px;height:14px;display:block}'
  ].join('');

  var ICONS = {
    success: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.2 12.4l3.1 3.1 6.4-6.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    warning: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 6.6v7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.35" fill="#fff"/>',
    error:   '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
    info:    '<circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="7.4" r="1.35" fill="#fff"/><path d="M12 10.6v7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
  };
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    (document.head || document.documentElement).appendChild(el);
  }

  var wraps = {};

  function getWrap(position, offset) {
    var key = position + '|' + offset;
    var wrap = wraps[key];
    if (wrap && wrap.isConnected) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'fomal-notify-wrap ' + position;
    if (position === 'bottom-left' || position === 'bottom-right') wrap.style.bottom = offset + 'px';
    else wrap.style.top = offset + 'px';
    document.body.appendChild(wrap);
    wraps[key] = wrap;
    return wrap;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * 与 Element-UI Notification 的 $notify 参数一一对应。
   * @param {Object} opt 选项对象
   *        字段: title / message / type(success|warning|info|error) / position / offset / duration / showClose
   */
  function fomalNotify(opt) {
    opt = opt || {};
    ensureStyle();

    var type = ICONS[opt.type] ? opt.type : 'info';
    var position = opt.position || 'top-right';
    var offset = typeof opt.offset === 'number' ? opt.offset : 16;
    var duration = typeof opt.duration === 'number' ? opt.duration : 4500;
    var showClose = opt.showClose !== false;

    var wrap = getWrap(position, offset);
    var box = document.createElement('div');
    box.className = 'fomal-notify fomal-notify--' + type + ' is-enter';
    box.setAttribute('role', 'alert');

    var html = '<div class="fomal-notify__icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[type] + '</svg></div>' +
      '<div class="fomal-notify__group">';
    if (opt.title) html += '<h2 class="fomal-notify__title">' + esc(opt.title) + '</h2>';
    if (opt.message) html += '<div class="fomal-notify__content">' + esc(opt.message) + '</div>';
    html += '</div>';
    if (showClose) html += '<div class="fomal-notify__close" role="button" aria-label="关闭">' + CLOSE_ICON + '</div>';
    box.innerHTML = html;
    wrap.appendChild(box);

    requestAnimationFrame(function () { box.classList.remove('is-enter'); });

    var timer = null, closed = false;
    function close() {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      box.classList.add('is-leave');
      setTimeout(function () {
        if (box.parentNode) box.parentNode.removeChild(box);
        if (wrap && wrap.childNodes.length === 0 && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 320);
    }
    function start() { if (duration > 0) timer = setTimeout(close, duration); }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }

    if (showClose) {
      var btn = box.querySelector('.fomal-notify__close');
      if (btn) btn.addEventListener('click', close);
    }
    box.addEventListener('mouseenter', stop);
    box.addEventListener('mouseleave', function () { if (!closed) start(); });
    start();

    return { close: close };
  }

  global.fomalNotify = fomalNotify;
  if (typeof module !== 'undefined' && module.exports) module.exports = fomalNotify;
})(typeof window !== 'undefined' ? window : this);
