/* ============================================================================
 * modules/cursor.js —— 鼠标相关：右键菜单 / 小猫咪 / 听话鼠标
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 小猫咪（529-752）—— 页面右下角跟着鼠标走的小猫 + 整点报时气泡（.neko）
 *   · 右键菜单（756-1063）—— 自定义右键菜单（rmf 对象是菜单项表，popupMenu 负责拼 HTML）
 *   · 听话鼠标（1337-1436）—— class Cursor：鼠标指针带缓动拖尾、hover 可点元素时变形
 * ----------------------------------------------------------------------------
 * 三个都跟"指针"有关，所以放一起；其实互相独立，可以单独删。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 12 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *    263  setMask()
 *    282  insertAtCursor(myField, myValue)
 *    314  rmf
 *    368  popupMenu()
 *    500  box
 *    502  addLongtabListener(target, callback)
 *    537  mouseMode
 *    538  changeMouseMode()
 *    574  CURSOR
 *    578  getStyle2
 *    588  map
 *    602  Cursor
 * ========================================================================== */

/* ------------------------------ 小猫咪 ------------------------------ */
/* 高频输入只记录最新值；统一在下一帧先读几何、再增量写入。 */
if (document.body.clientWidth > 992) {
  var nekoState = { raf: null, geometryDirty: true, rectDirty: true, pointer: null,
    cat: null, rope: null, rect: null, info: null, top: null, setting: null, styles: new WeakMap() };

  function getBasicInfo() {
    var ViewH = $(window).height();
    var DocH = document.body.scrollHeight;
    var ScrollTop = $(window).scrollTop();
    var S_V = Math.max(0, DocH - ViewH);
    return { ViewH: ViewH, DocH: DocH, ScrollTop: ScrollTop, S_V: S_V,
      Band_H: S_V > 0 ? Math.max(0, Math.min(100, ScrollTop / S_V * 100)) : 0 };
  }
  function nekoElement() {
    if (!nekoState.cat || !nekoState.cat.isConnected) {
      nekoState.cat = document.querySelector('.neko');
      nekoState.rect = null;
      nekoState.rectDirty = true;
    }
    return nekoState.cat;
  }
  function nekoStyle(el, name, value) {
    if (!el) return;
    var values = nekoState.styles.get(el);
    if (!values) { values = Object.create(null); nekoState.styles.set(el, values); }
    // CSSOM 会规范化小数和单位，缓存目标值而不是反复比较序列化后的 style。
    if (values[name] === value) return;
    if (el.style[name] !== value) el.style[name] = value;
    values[name] = value;
  }
  function nekoClass(el, name, enabled) {
    if (el && el.classList.contains(name) !== enabled) el.classList.toggle(name, enabled);
  }
  function show(basicInfo) {
    nekoStyle(nekoElement(), 'display', basicInfo.ScrollTop > 0.001 ? 'block' : 'none');
  }
  function nekoTimeMsg() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function nekoClockTick() {
    if (document.hidden) return;
    var cat = nekoElement(), msg = nekoTimeMsg();
    if (cat && cat.getAttribute('data-msg') !== msg) cat.setAttribute('data-msg', msg);
  }
  function nekoQueue(geometry, rect) {
    nekoState.geometryDirty = nekoState.geometryDirty || !!geometry;
    nekoState.rectDirty = nekoState.rectDirty || !!rect;
    if (nekoState.raf !== null || document.hidden) return;
    nekoState.raf = requestAnimationFrame(nekoFlush);
  }
  function nekoHoverTick(clientX, clientY) {
    nekoState.pointer = { x: clientX, y: clientY };
    nekoQueue(false, false);
  }
  function nekoFlush() {
    nekoState.raf = null;
    if (document.hidden) return;
    var cat = nekoElement(), setting = nekoState.setting;
    if (!cat || !setting) return;
    // 读阶段：mousemove 不重读 scrollHeight，也不每次重读猫咪矩形。
    var info = nekoState.geometryDirty || !nekoState.info ? getBasicInfo() : nekoState.info;
    var rect = nekoState.rect;
    if (nekoState.rectDirty && cat.style.display === 'block') {
      var measured = cat.getBoundingClientRect();
      rect = { left: measured.left, right: measured.right, top: measured.top, bottom: measured.bottom };
      nekoState.rectDirty = false;
    }
    var height = info.Band_H * setting.zoom * info.ViewH * 0.01;
    var top = height - 50;
    if (rect && nekoState.top !== null) {
      var delta = top - nekoState.top;
      rect = { left: rect.left, right: rect.right, top: rect.top + delta, bottom: rect.bottom + delta };
    }
    var visible = info.ScrollTop > 0.001;
    var p = nekoState.pointer;
    var hover = !!(visible && rect && p && p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom);
    // 写阶段：静态样式只在插件初始化时写，滚动仅更新高度、位置和状态。
    nekoStyle(nekoState.rope, 'height', height + 'px');
    nekoStyle(cat, 'top', top + 'px');
    show(info);
    nekoClass(cat, 'showMsg', visible && info.S_V > 0 && info.ScrollTop >= info.S_V - 1);
    nekoClass(cat, 'hoverOn', hover);
    if (hover) nekoClockTick();
    nekoState.info = info;
    nekoState.top = top;
    nekoState.rect = visible ? rect : null;
    nekoState.geometryDirty = false;
    // 从 display:none 恢复后的真实 CSS 矩形在下一帧读，避免强制同步布局。
    if (visible && !rect) nekoQueue(false, true);
  }
  if (!window.__nekoClockTimer) window.__nekoClockTimer = setInterval(nekoClockTick, 1000);
  document.addEventListener('mousemove', function (e) { nekoHoverTick(e.clientX, e.clientY); });
  window.addEventListener('scroll', function () { nekoQueue(true, false); }, { passive: true });
  window.addEventListener('resize', function () { nekoQueue(true, true); }, { passive: true });
  window.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) { nekoState.pointer = null; nekoQueue(false, false); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (nekoState.raf !== null) cancelAnimationFrame(nekoState.raf);
      nekoState.raf = null;
    } else { nekoClockTick(); nekoQueue(true, true); }
  });
  if (typeof ResizeObserver !== 'undefined') {
    nekoState.observer = new ResizeObserver(function () { nekoQueue(true, true); });
    nekoState.observer.observe(document.body);
  }
  // 猫咪不挡下方按钮；点击只有在下方没有控件时才回顶部。
  var nekoHitSelector = "a, button, input, select, textarea, label, summary, [onclick], [role='button'], [role='link'], #rightside, .search-mask, .search-dialog, #local-search, .neko, #myscoll";
  function nekoToTop() {
    if (window.btf && typeof btf.scrollToDest === 'function') btf.scrollToDest(0, 500);
    else $('html, body').animate({ scrollTop: 0 }, 500);
  }
  document.addEventListener('click', function (e) {
    var cat = nekoElement();
    if (!cat || cat.style.display !== 'block') return;
    var r = cat.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    var hit = document.elementFromPoint(e.clientX, e.clientY);
    if (hit && $(hit).closest(nekoHitSelector).length) return;
    nekoToTop();
  });
  (function ($) {
    $.fn.nekoScroll = function (option) {
      var setting = $.extend({ top: '0', scroWidth: '6px', z_index: 9999, zoom: 0.9,
        borderRadius: '5px', right: '55.6px',
        nekoImg: 'https://bu.dusays.com/2022/07/20/62d812db74be9.png' }, option);
      if (!this.length) return this;
      var cat = nekoElement();
      if (!cat) {
        cat = document.createElement('div');
        cat.className = 'neko';
        if (setting.nekoname) cat.id = setting.nekoname;
        cat.setAttribute('data-msg', nekoTimeMsg());
        this.after(cat);
      }
      nekoState.cat = cat;
      nekoState.rope = this[0];
      nekoState.setting = setting;
      nekoState.styles = new WeakMap();
      nekoState.top = Number.isFinite(parseFloat(cat.style.top)) ? parseFloat(cat.style.top) : null;
      nekoState.rect = null;
      this.css({ position: 'fixed', width: setting.scroWidth, top: setting.top,
        'z-index': setting.z_index, 'background-color': setting.bgcolor,
        'border-radius': setting.borderRadius, right: setting.right,
        'background-image': '-webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.1) 75%, transparent 75%, transparent)',
        'background-size': 'contain' });
      $(cat).css({ position: 'fixed', 'z-index': setting.z_index * 10,
        right: setting.right, 'background-image': 'url(' + setting.nekoImg + ')' });
      this.off('click.nekoScroll').on('click.nekoScroll', nekoToTop);
      $(cat).off('click.nekoScroll').on('click.nekoScroll', nekoToTop);
      nekoQueue(true, true);
      return this;
    };
  })(jQuery);
  $(document).ready(function () {
    $('#myscoll').nekoScroll({ bgcolor: 'rgb(0 0 0 / .5)', borderRadius: '2em', zoom: 0.9 });
    nekoClockTick();
  });
  document.addEventListener('pjax:complete', function () {
    $('#myscoll').nekoScroll(nekoState.setting || {});
    nekoClockTick();
    nekoQueue(true, true);
  });
}

/* 小猫咪 end */

/* ------------------------------ 右键菜单 ------------------------------ */
/* 原 fomal.js 756-1063 行，原样搬运，未改逻辑 */
/* 右键菜单 start */
function setMask() {
  //设置遮罩
  if (document.getElementsByClassName("rmMask")[0] != undefined)
    return document.getElementsByClassName("rmMask")[0];
  mask = document.createElement('div');
  mask.className = "rmMask";
  mask.style.width = window.innerWidth + 'px';
  mask.style.height = window.innerHeight + 'px';
  mask.style.background = '#fff';
  mask.style.opacity = '.0';
  mask.style.position = 'fixed';
  mask.style.top = '0';
  mask.style.left = '0';
  mask.style.zIndex = 998;
  document.body.appendChild(mask);
  document.getElementById("rightMenu").style.zIndex = 19198;
  return mask;
}

function insertAtCursor(myField, myValue) {

  //IE 浏览器
  if (document.selection) {
    myField.focus();
    sel = document.selection.createRange();
    sel.text = myValue;
    sel.select();
  }

  //FireFox、Chrome等
  else if (myField.selectionStart || myField.selectionStart == '0') {
    var startPos = myField.selectionStart;
    var endPos = myField.selectionEnd;

    // 保存滚动条
    var restoreTop = myField.scrollTop;
    myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);

    if (restoreTop > 0) {
      myField.scrollTop = restoreTop;
    }

    myField.focus();
    myField.selectionStart = startPos + myValue.length;
    myField.selectionEnd = startPos + myValue.length;
  } else {
    myField.value += myValue;
    myField.focus();
  }
}

let rmf = {};
rmf.showRightMenu = function (isTrue, x = 0, y = 0) {
  let $rightMenu = $('#rightMenu');
  $rightMenu.css('top', x + 'px').css('left', y + 'px');

  if (isTrue) {
    $rightMenu.show();
  } else {
    $rightMenu.hide();
  }
}

rmf.copyWordsLink = function () {
  let url = window.location.href
  let txa = document.createElement("textarea");
  txa.value = url;
  document.body.appendChild(txa)
  txa.select();
  document.execCommand("Copy");
  document.body.removeChild(txa);
}
rmf.switchReadMode = function () {
  const $body = document.body
  $body.classList.add('read-mode')
  const newEle = document.createElement('button')
  newEle.type = 'button'
  newEle.className = 'fas fa-sign-out-alt exit-readmode'
  $body.appendChild(newEle)

  function clickFn() {
    $body.classList.remove('read-mode')
    newEle.remove()
    newEle.removeEventListener('click', clickFn)
  }

  newEle.addEventListener('click', clickFn)
}

//复制选中文字
rmf.copySelect = function () {
  document.execCommand('Copy', false, null);
}

//回到顶部
rmf.scrollToTop = function () {
  document.getElementsByClassName("menus_items")[1].setAttribute("style", "");
  document.getElementById("name-container").setAttribute("style", "display:none");
  btf.scrollToDest(0, 500);
}

document.body.addEventListener('touchmove', function () {

}, { passive: false });

function popupMenu() {
  window.oncontextmenu = function (event) {
    // if (event.ctrlKey) return true;

    // 当关掉自定义右键时候直接返回
    if (mouseMode == "off") return true;

    $('.rightMenu-group.hide').hide();
    if (document.getSelection().toString()) {
      $('#menu-text').show();
    }
    if (document.getElementById('post')) {
      $('#menu-post').show();
    } else {
      if (document.getElementById('page')) {
        $('#menu-post').show();
      }
    }
    var el = window.document.body;
    el = event.target;
    var a = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+$/
    if (a.test(window.getSelection().toString()) && el.tagName != "A") {
      $('#menu-too').show()
    }
    if (el.tagName == 'A') {
      $('#menu-to').show()
      rmf.open = function () {
        if (el.href.indexOf("http://") == -1 && el.href.indexOf("https://") == -1 || el.href.indexOf("yisous.xyz") != -1) {
          pjax.loadUrl(el.href)
        }
        else {
          location.href = el.href
        }
      }
      rmf.openWithNewTab = function () {
        window.open(el.href);
        // window.location.reload();
      }
      rmf.copyLink = function () {
        let url = el.href
        let txa = document.createElement("textarea");
        txa.value = url;
        document.body.appendChild(txa)
        txa.select();
        document.execCommand("Copy");
        document.body.removeChild(txa);
      }
    } else if (el.tagName == 'IMG') {
      $('#menu-img').show()
      rmf.openWithNewTab = function () {
        window.open(el.src);
        // window.location.reload();
      }
      rmf.click = function () {
        el.click()
      }
      rmf.copyLink = function () {
        let url = el.src
        let txa = document.createElement("textarea");
        txa.value = url;
        document.body.appendChild(txa)
        txa.select();
        document.execCommand("Copy");
        document.body.removeChild(txa);
      }
      rmf.saveAs = function () {
        var a = document.createElement('a');
        var url = el.src;
        var filename = url.split("/")[-1];
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } else if (el.tagName == "TEXTAREA" || el.tagName == "INPUT") {
      $('#menu-paste').show();
      rmf.paste = function () {
        navigator.permissions
          .query({
            name: 'clipboard-read'
          })
          .then(result => {
            if (result.state == 'granted' || result.state == 'prompt') {
              //读取剪贴板
              navigator.clipboard.readText().then(text => {
                // console.log(text)
                insertAtCursor(el, text)
              })
            } else {
              Snackbar.show({
                text: '请允许读取剪贴板！',
                pos: 'top-center',
                showAction: false,
              })
            }
          })
      }
    }
    let pageX = event.clientX + 10;
    let pageY = event.clientY;
    let rmWidth = $('#rightMenu').width();
    let rmHeight = $('#rightMenu').height();
    if (pageX + rmWidth > window.innerWidth) {
      pageX -= rmWidth + 10;
    }
    if (pageY + rmHeight > window.innerHeight) {
      pageY -= pageY + rmHeight - window.innerHeight;
    }
    mask = setMask();
    // 滚动消失的代码和阅读进度有冲突，因此放到readPercent.js里面了
    $(".rightMenu-item").click(() => {
      $('.rmMask').attr('style', 'display: none');
    })
    $(window).resize(() => {
      rmf.showRightMenu(false);
      $('.rmMask').attr('style', 'display: none');
    })
    mask.onclick = () => {
      $('.rmMask').attr('style', 'display: none');
    }
    rmf.showRightMenu(true, pageY, pageX);
    $('.rmMask').attr('style', 'display: flex');
    return false;
  };

  window.addEventListener('click', function () {
    rmf.showRightMenu(false);
  });
}
if (!(navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
  popupMenu()
}
const box = document.documentElement

function addLongtabListener(target, callback) {
  let timer = 0 // 初始化timer

  target.ontouchstart = () => {
    timer = 0 // 重置timer
    timer = setTimeout(() => {
      callback();
      timer = 0
    }, 380) // 超时器能成功执行，说明是长按
  }

  target.ontouchmove = () => {
    clearTimeout(timer) // 如果来到这里，说明是滑动
    timer = 0
  }

  target.ontouchend = () => { // 到这里如果timer有值，说明此触摸时间不足380ms，是点击
    if (timer) {
      clearTimeout(timer)
    }
  }
}

addLongtabListener(box, popupMenu)

// 全屏
rmf.fullScreen = function () {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

// 右键开关
if (localStorage.getItem("mouse") == undefined) {
  localStorage.setItem("mouse", "on");
}
var mouseMode = localStorage.getItem("mouse");
function changeMouseMode() {
  if (localStorage.getItem("mouse") == "on") {
    mouseMode = "off";
    localStorage.setItem("mouse", "off");
    debounce(function () {
      fomalNotify({
            title: "切换右键模式成功🍔",
            message: "当前鼠标右键已恢复为系统默认！",
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: "success",
            duration: 5000
          })
    }, 300);
  } else {
    mouseMode = "on";
    localStorage.setItem("mouse", "on");
    debounce(function () {
      fomalNotify({
            title: "切换右键模式成功🍔",
            message: "当前鼠标右键已更换为网站指定样式！",
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: "success",
            duration: 5000
          })
    }, 300);
  }
}
/* 右键菜单 end */

/* ------------------------------ 听话鼠标 ------------------------------ */
/* 原 fomal.js 1337-1436 行；位移分层、目标按需识别、空闲停帧。 */
/* 听话鼠标 start */
var CURSOR;

Math.lerp = (a, b, n) => (1 - n) * a + n * b;

const getStyle2 = (el, attr) => {
  try {
    return window.getComputedStyle
      ? window.getComputedStyle(el)[attr]
      : el.currentStyle[attr];
  } catch (e) { }
  return "";
};

// 为了屏蔽异步加载导致无法读取颜色值，这里统一用哈希表预处理
const map = new Map();
map.set('red', "rgb(239, 90, 90)");
map.set('orange', "rgb(228, 149, 66)");
map.set('yellow', "rgb(194, 205, 90)")
map.set('purple', "rgb(205, 90, 195)");
map.set('purepurple', "rgb(147, 90, 205)");
map.set('blue', "rgb(102, 204, 255)");
map.set('puregreen', "rgb(90, 205, 130)");
map.set('green', "rgb(57, 197, 187)");
map.set('pink', "rgb(237, 112, 155)");
map.set('black', "rgb(45, 45, 45)");
map.set('darkblue', "rgb(97, 100, 159)");
map.set('heoblue', "rgb(66, 90, 239)");
map.set('gray', "rgb(150, 150, 150)");
class Cursor {
  constructor() {
    this.pos = { curr: null, prev: null };
    this.pointerCache = new WeakMap();
    this.__raf = null;
    this.__hoverDirty = false;
    this.create();
    this.init();
  }

  move(left, top) {
    const value = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    if (this.__transform !== value) {
      this.layer.style.transform = value;
      this.__transform = value;
    }
  }

  create() {
    if (!this.cursor) {
      // 位移与 #cursor.hover/active 的 scale 分层：保留原来的 16px 尺寸与 0.2s 缩放。
      this.layer = document.createElement('div');
      this.layer.id = 'cursor-position';
      Object.assign(this.layer.style, { position: 'fixed', left: '0px', top: '0px',
        width: '16px', height: '16px', pointerEvents: 'none', zIndex: '10086' });
      this.cursor = document.createElement('div');
      this.cursor.id = 'cursor';
      this.cursor.classList.add('hidden');
      this.cursor.style.left = '0px';
      this.cursor.style.top = '0px';
      this.layer.appendChild(this.cursor);
    }
    if (!this.layer.isConnected) document.body.appendChild(this.layer);
    if (!this.scr) this.scr = document.createElement('style');
    // 原地改样式，不移除；任何时候都不能露出文字区域的系统 I 形光标。
    if (!this.scr.isConnected) document.body.appendChild(this.scr);
    const color = map.get(localStorage.getItem('themeColor')) || map.get('green');
    if (this.color !== color) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8px" height="8px"><circle cx="4" cy="4" r="4" fill="' + color + '"/></svg>';
      this.scr.textContent = '* {cursor: url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 4 4, auto}';
      this.color = color;
    }
  }

  setClass(name, enabled) {
    if (this.cursor.classList.contains(name) !== enabled) this.cursor.classList.toggle(name, enabled);
  }

  isPointer(target) {
    if (target && target.nodeType !== 1) target = target.parentElement;
    if (!target || !target.isConnected) return false;
    if (this.pointerCache.has(target)) return this.pointerCache.get(target);
    // 实际元素身份而非 outerHTML：嵌套 span / SVG、异步按钮和同 HTML 的不同节点均可区分。
    const control = target.closest('a[href], button, summary, label, input[type="button"], input[type="submit"], input[type="reset"], [onclick], [role="button"], [role="link"]');
    let pointer = !!(control && !control.disabled);
    if (!control) {
      // 非语义可点元素只检查当前目标及祖先，不扫描全页。结果缓存到下一次 DOM/主题变化。
      for (let el = target; el; el = el.parentElement) {
        if (getStyle2(el, 'cursor') === 'pointer') { pointer = true; break; }
      }
    }
    this.pointerCache.set(target, pointer);
    return pointer;
  }

  invalidatePointer(hitTest) {
    this.pointerCache = new WeakMap();
    this.__hoverDirty = true;
    this.__hitTest = this.__hitTest || !!hitTest;
    if (this.pos.curr) this.start();
  }

  refresh() {
    this.create();
    this.setClass('active', false);
    this.invalidatePointer(true);
    // 不重绑事件、不重置位置、不创建第二条动画链；样式节点始终留在 DOM。
  }

  init() {
    if (this.__bound) return;
    this.__bound = true;
    const trackTarget = e => {
      if (this.target !== e.target) {
        this.target = e.target;
        this.__hoverDirty = true;
      }
    };
    document.addEventListener('mousemove', e => {
      trackTarget(e);
      this.pos.curr = { x: e.clientX - 8, y: e.clientY - 8 };
      this.setClass('hidden', false);
      this.start();
    }, { passive: true });
    document.addEventListener('mouseover', e => {
      trackTarget(e);
      // :hover 选择器可能改变 cursor；同一目标重新进入时也重新检查。
      if (e.target && e.target.nodeType === 1) this.pointerCache.delete(e.target);
      this.__hoverDirty = true;
      if (this.pos.curr) this.start();
    }, { passive: true });
    document.addEventListener('mouseout', e => {
      this.target = e.relatedTarget;
      this.__hoverDirty = true;
      if (this.pos.curr) this.start();
    }, { passive: true });
    document.addEventListener('mouseenter', () => { if (this.pos.curr) this.setClass('hidden', false); });
    document.addEventListener('mouseleave', () => this.pause());
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('mousedown', () => this.setClass('active', true));
    document.addEventListener('mouseup', () => this.setClass('active', false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    window.addEventListener('scroll', () => this.invalidatePointer(true), { passive: true });
    window.addEventListener('resize', () => this.invalidatePointer(true), { passive: true });
    document.addEventListener('pjax:complete', () => this.refresh());
    document.addEventListener('load', e => {
      if (e.target && e.target.tagName === 'LINK') this.invalidatePointer(true);
    }, true);
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(records => {
        // 自己的 transform/class/style 更新不触发下一帧，避免观察器自激循环。
        if (records.some(r => r.target !== this.scr && r.target !== this.layer &&
          !this.layer.contains(r.target))) this.invalidatePointer(true);
      });
      this.observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    }
  }

  pause() {
    if (this.__raf !== null) cancelAnimationFrame(this.__raf);
    this.__raf = null;
    this.setClass('hidden', true);
    this.setClass('active', false);
    this.setClass('hover', false);
    this.target = null;
  }

  start() {
    if (this.__raf !== null || document.hidden || !this.pos.curr || this.cursor.classList.contains('hidden')) return;
    this.__raf = requestAnimationFrame(() => { this.__raf = null; this.render(); });
  }

  render() {
    const curr = this.pos.curr;
    if (!curr || document.hidden) return;
    // 样式读取必须在 transform / class 写入之前完成，且每帧只处理最后一个目标。
    if (this.__hoverDirty) {
      if (this.__hitTest) this.target = document.elementFromPoint(curr.x + 8, curr.y + 8);
      const hover = this.isPointer(this.target);
      this.__hoverDirty = false;
      this.__hitTest = false;
      this.setClass('hover', hover);
    }
    if (!this.pos.prev) this.pos.prev = { x: curr.x, y: curr.y };
    const dx = curr.x - this.pos.prev.x, dy = curr.y - this.pos.prev.y;
    const moving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
    this.pos.prev.x = moving ? Math.lerp(this.pos.prev.x, curr.x, 0.15) : curr.x;
    this.pos.prev.y = moving ? Math.lerp(this.pos.prev.y, curr.y, 0.15) : curr.y;
    this.move(this.pos.prev.x, this.pos.prev.y);
    if (moving) this.start();
  }
}

(() => {
  CURSOR = new Cursor();
})();

/* 听话鼠标 end */
