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
/* 原 fomal.js 529-752 行，原样搬运，未改逻辑 */
/* 小猫咪 start */
if (document.body.clientWidth > 992) {
  function getBasicInfo() {
    /* 窗口高度 */
    var ViewH = $(window).height();
    /* document高度 */
    var DocH = $("body")[0].scrollHeight;
    /* 滚动的高度 */
    var ScrollTop = $(window).scrollTop();
    /* 可滚动的高度 */
    var S_V = DocH - ViewH;
    var Band_H = ScrollTop / (DocH - ViewH) * 100;
    return {
      ViewH: ViewH,
      DocH: DocH,
      ScrollTop: ScrollTop,
      Band_H: Band_H,
      S_V: S_V
    }
  };
  function show(basicInfo) {
    if (basicInfo.ScrollTop > 0.001) {
      $(".neko").css('display', 'block');
    } else {
      $(".neko").css('display', 'none');
    }
  }
  /* 报时 start */
  // 当前时间 HH:MM:SS：小猫咪是「报时猫」，气泡文字由 .neko::after 的 content: attr(data-msg) 渲染
  function nekoTimeMsg() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  // 写时间进 data-msg：悬停 / 滚到底部（showMsg）显示的都是它，每秒刷新一次即可走秒
  function nekoClockTick() {
    var $neko = $(".neko");
    if (!$neko.length || document.hidden) return;
    var msg = nekoTimeMsg();
    if ($neko.attr("data-msg") !== msg) $neko.attr("data-msg", msg);
  }
  // window 上留标记，脚本若被重复执行也不会叠加多个定时器
  if (!window.__nekoClockTimer) {
    window.__nekoClockTimer = setInterval(nekoClockTick, 1000);
  }
  // 猫咪在 CSS 里是 pointer-events:none（这样压在它下面的图标/按钮/链接才能正常点），代价是 :hover 不再触发。
  // 这里用 mousemove 自己算指针有没有落在猫咪身上：命中就加 .hoverOn 亮出报时气泡，离开就摘掉。
  function nekoHoverTick(clientX, clientY) {
    var $neko = $(".neko");
    if (!$neko.length) return;
    var el = $neko[0];
    if (el.style.display === "none") {
      $neko.removeClass("hoverOn");
      return;
    }
    var r = el.getBoundingClientRect();
    var inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    if (inside) {
      nekoClockTick();
      $neko.addClass("hoverOn");
    } else {
      $neko.removeClass("hoverOn");
    }
  }
  // mousemove 频率很高，用 rAF 合流：一帧最多判定一次
  var __nekoHoverQueued = false;
  $(document).on("mousemove", function (e) {
    if (__nekoHoverQueued) return;
    __nekoHoverQueued = true;
    var x = e.clientX, y = e.clientY;
    window.requestAnimationFrame(function () {
      __nekoHoverQueued = false;
      nekoHoverTick(x, y);
    });
  });
  // 指针移出整个窗口后不会再有 mousemove，补一个兜底把气泡收起来
  window.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget) $(".neko").removeClass("hoverOn");
  });
  // 点猫回顶部：猫咪 pointer-events:none，click 落不到它身上，所以在 document 上兜底判断。
  // 只在这个位置「底下没有可点控件」时才回顶部 —— 被猫咪压住的图标/链接/按钮优先响应它们自己。
  var nekoHitSelector = "a, button, input, select, textarea, label, summary, [onclick], [role='button'], [role='link'], #rightside, .search-mask, .search-dialog, #local-search, .neko, #myscoll";
  $(document).on("click", function (e) {
    var $neko = $(".neko");
    if (!$neko.length) return;
    var el = $neko[0];
    if (el.style.display === "none") return;
    var r = el.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    var hit = document.elementFromPoint(e.clientX, e.clientY);
    if (hit && $(hit).closest(nekoHitSelector).length) return;
    if (window.btf && typeof btf.scrollToDest === "function") {
      btf.scrollToDest(0, 500);
    } else {
      $("html, body").animate({ scrollTop: 0 }, 500);
    }
  });
  /* 报时 end */

  (function ($) {
    $.fn.nekoScroll = function (option) {
      var defaultSetting = {
        top: '0',
        scroWidth: 6 + 'px',
        z_index: 9999,
        zoom: 0.9,
        borderRadius: 5 + 'px',
        right: 55.6 + 'px',
        nekoImg: "https://bu.dusays.com/2022/07/20/62d812db74be9.png",
        // 报时：气泡文字不再写死，由 nekoClockTick() 每秒写入当前时间，这里只作兜底
        hoverMsg: "报时中…",
        color: "var(--theme-color)",
        during: 500,
        blog_body: "body",
      };
      var setting = $.extend(defaultSetting, option);
      var getThis = this.prop("className") !== "" ? "." + this.prop("className") : this.prop("id") !== "" ? "#" +
        this.prop("id") : this.prop("nodeName");
      if ($(".neko").length == 0) {
        this.after("<div class=\"neko\" id=" + setting.nekoname + " data-msg=\"" + nekoTimeMsg() + "\"></div>");
      }
      let basicInfo = getBasicInfo();
      $(getThis)
        .css({
          'position': 'fixed',
          'width': setting.scroWidth,
          'top': setting.top,
          'height': basicInfo.Band_H * setting.zoom * basicInfo.ViewH * 0.01 + 'px',
          'z-index': setting.z_index,
          'background-color': setting.bgcolor,
          "border-radius": setting.borderRadius,
          'right': setting.right,
          'background-image': 'url(' + setting.scImg + ')',
          'background-image': '-webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.1) 75%, transparent 75%, transparent)', 'border-radius': '2em',
          'background-size': 'contain'
        });
      $("#" + setting.nekoname)
        .css({
          'position': 'fixed',
          'top': basicInfo.Band_H * setting.zoom * basicInfo.ViewH * 0.01 - 50 + 'px',
          'z-index': setting.z_index * 10,
          'right': setting.right,
          'background-image': 'url(' + setting.nekoImg + ')',
        });
      show(getBasicInfo());
      $(window)
        .scroll(function () {
          let basicInfo = getBasicInfo();
          show(basicInfo);
          $(getThis)
            .css({
              'position': 'fixed',
              'width': setting.scroWidth,
              'top': setting.top,
              'height': basicInfo.Band_H * setting.zoom * basicInfo.ViewH * 0.01 + 'px',
              'z-index': setting.z_index,
              'background-color': setting.bgcolor,
              "border-radius": setting.borderRadius,
              'right': setting.right,
              'background-image': 'url(' + setting.scImg + ')',
              'background-image': '-webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.1) 75%, transparent 75%, transparent)', 'border-radius': '2em',
              'background-size': 'contain'
            });
          $("#" + setting.nekoname)
            .css({
              'position': 'fixed',
              'top': basicInfo.Band_H * setting.zoom * basicInfo.ViewH * 0.01 - 50 + 'px',
              'z-index': setting.z_index * 10,
              'right': setting.right,
              'background-image': 'url(' + setting.nekoImg + ')',
            });
          if (basicInfo.ScrollTop == basicInfo.S_V) {
            $("#" + setting.nekoname)
              .addClass("showMsg")
          } else {
            $("#" + setting.nekoname)
              .removeClass("showMsg");
            $("#" + setting.nekoname)
              .attr("data-msg", nekoTimeMsg());
          }
        });
      this.click(function (e) {
        btf.scrollToDest(0, 500)
      });
      $("#" + setting.nekoname)
        .click(function () {
          btf.scrollToDest(0, 500)
        });
      return this;
    }
  })(jQuery);

  $(document).ready(function () {
    //部分自定义
    $("#myscoll").nekoScroll({
      bgcolor: 'rgb(0 0 0 / .5)', //背景颜色，没有绳子背景图片时有效
      borderRadius: '2em',
      zoom: 0.9
    }
    );
    // 立即写一次时间；悬停由上面的 mousemove 判定处理（猫咪是 pointer-events:none，收不到 mouseenter）
    nekoClockTick();
    //自定义（去掉以下注释，并注释掉其他的查看效果）
    /*
    $("#myscoll").nekoScroll({
        nekoname:'neko1', //nekoname，相当于id
        nekoImg:'img/猫咪.png', //neko的背景图片
        scImg:"img/绳1.png", //绳子的背景图片
        bgcolor:'#1e90ff', //背景颜色，没有绳子背景图片时有效
        zoom:0.9, //绳子长度的缩放值
        hoverMsg:'你好~喵', //鼠标浮动到neko上方的对话框信息
        right:'100px', //距离页面右边的距离
        fontFamily:'楷体', //对话框字体
        fontSize:'14px', //对话框字体的大小
        color:'#1e90ff', //对话框字体颜色
        scroWidth:'8px', //绳子的宽度
        z_index:100, //不用解释了吧
        during:1200, //从顶部到底部滑动的时长
    });
    */
  })
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
/* 原 fomal.js 1337-1436 行，原样搬运，未改逻辑 */
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
    this.pt = [];
    this.create();
    this.init();
    this.start();
  }

  move(left, top) {
    this.cursor.style["left"] = `${left}px`;
    this.cursor.style["top"] = `${top}px`;
  }

  create() {
    if (!this.cursor) {
      this.cursor = document.createElement("div");
      this.cursor.id = "cursor";
      this.cursor.classList.add("hidden");
      document.body.append(this.cursor);
    }
    // 【2026-10-04 修「鼠标处闪出打字机光标」】光标样式必须在下面这次全元素
    // 扫描之前就挂上。getStyle2 就是 getComputedStyle，关于页 3000+ 元素实测
    // 一次扫描 ~37ms；旧顺序是「先扫描、再 append 样式」，这 37ms 内浏览器没有
    // 自定义光标规则，会退回系统光标——鼠标停在文字上就是 I 形「打字机」光标，
    // 而 #cursor 粉点是 DOM 元素、照旧可见，看起来就像鼠标那儿多闪出一个光标。
    var colorVal = map.get(localStorage.getItem("themeColor")) || map.get("green");
    if (!this.scr) document.body.appendChild((this.scr = document.createElement("style")));
    this.scr.innerHTML = `* {cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' width='8px' height='8px'><circle cx='4' cy='4' r='4' opacity='1.0' fill='` + colorVal + `'/></svg>") 4 4, auto}`;
    var el = document.getElementsByTagName('*');
    for (let i = 0; i < el.length; i++)
      if (getStyle2(el[i], "cursor") == "pointer")
        this.pt.push(el[i].outerHTML);
  }

  refresh() {
    // 【2026-10-04 修「鼠标处闪出打字机光标」】这里原本是 this.scr.remove()：
    // 删掉样式到 create() 重新 append 之间隔着一整次全页扫描（实测 ~37ms），
    // 窗口内浏览器用系统光标（文字上就是「打字机」I 形光标）而粉点还在 = 闪一下。
    // 改成原地改写同一个 <style> 的内容：样式永远在场，顺带保证扫描中途万一抛错
    // 也不会让自定义光标永久丢失。
    this.cursor.classList.remove("hover");
    this.cursor.classList.remove("active");
    this.pos = { curr: null, prev: null };
    this.pt = [];

    this.create();
    this.init();
    this.start();
  }

  init() {
    document.onmouseover = e => this.pt.includes(e.target.outerHTML) && this.cursor.classList.add("hover");
    document.onmouseout = e => this.pt.includes(e.target.outerHTML) && this.cursor.classList.remove("hover");
    document.onmousemove = e => { (this.pos.curr == null) && this.move(e.clientX - 8, e.clientY - 8); this.pos.curr = { x: e.clientX - 8, y: e.clientY - 8 }; this.cursor.classList.remove("hidden"); this.start(); };
    document.onmouseenter = e => this.cursor.classList.remove("hidden");
    document.onmouseleave = e => this.cursor.classList.add("hidden");
    document.onmousedown = e => this.cursor.classList.add("active");
    document.onmouseup = e => this.cursor.classList.remove("active");
  }

  /* ---- 2026-10-04 性能修复：指针停住就停掉 rAF ----
   * 原来 render() 每帧无条件 requestAnimationFrame 递归下去：鼠标不动时也在写
   * #cursor 的 left/top，页面永远进不了空闲状态（风扇转、发烫、滚动发涩都跟它有关）。
   * 现在按「剩余距离」判停：缓动追上（< 0.1px）就退出循环，mousemove / refresh 再唤醒。
   * 阈值 0.1px 远低于视觉可辨，拖尾手感与原实现一致。
   */
  start() {
    if (this.__raf) return;
    this.__raf = requestAnimationFrame(() => { this.__raf = null; this.render(); });
  }

  render() {
    const curr = this.pos.curr;
    if (curr == null) return; // 指针还没进来过：不空转，等 init() 的 mousemove 唤醒
    if (this.pos.prev == null) {
      // 第一次对齐（原逻辑就是 prev = curr），不必缓动
      this.pos.prev = { x: curr.x, y: curr.y };
      this.move(this.pos.prev.x, this.pos.prev.y);
      return;
    }
    // 跟踪速度调节
    const dx = curr.x - this.pos.prev.x;
    const dy = curr.y - this.pos.prev.y;
    this.pos.prev.x = Math.lerp(this.pos.prev.x, curr.x, 0.15);
    this.pos.prev.y = Math.lerp(this.pos.prev.y, curr.y, 0.15);
    this.move(this.pos.prev.x, this.pos.prev.y);
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) this.start();
  }
}

(() => {
  CURSOR = new Cursor();
  // 需要重新获取列表时，使用 CURSOR.refresh()
})();

/* 听话鼠标 end */
