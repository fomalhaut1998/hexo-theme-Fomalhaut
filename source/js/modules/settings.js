/* ============================================================================
 * modules/settings.js —— 美化模块（站点设置面板 / Winbox）
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 美化模块（1753-2925）—— 包括：localStorage 设置读写、设置面板 HTML 拼装（createWinbox/winboxNeedSize/winResize/toggleWinbox）、各开关的实时生效逻辑、滑条增强等
 * ----------------------------------------------------------------------------
 * 整个站点最大的一块：点右下角齿轮弹出的设置面板，管背景图、字体、主题色、侧栏宽度等一大堆外观开关。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 62 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *    110  FONT_LIST
 *    111  FONT_DEFAULT
 *    112  CODE_FONT_LIST
 *    113  CODE_FONT_DEFAULT
 *    116  initItem()
 *    144  setFont(n)
 *    168  setCodeFont(n)
 *    176  setFontBorder()
 *    179  setCodeFontBorder()
 *    182  markFontBorder(prefix, curKey)
 *    208  setColor(c)
 *    229  setUniverse()
 *    244  setSnow()
 *    260  addNavClass()
 *    271  setNav()
 *    297  fpssw()
 *    308  reload()
 *    321  toggleRightside()
 *    341  setAside()
 *    360  setAsidePos()
 *    375  curTransNum
 *    376  curTransMini
 *    378  setTrans()
 *    392  curJumpRange
 *    393  rangeJumpReady
 *    396  rangeValueFromX(rangeEl, clientX)
 *    417  fireRangeInput(rangeEl)
 *    429  setRangeByX(rangeEl, clientX)
 *    437  bindRangeJump(rangeEl)
 *    459  initRangeJump()
 *    485  deltaSeconds
 *    512  defineColor
 *    513  changeBgColor()
 *    518  bingDayBg
 *    520  bingHistoryBg
 *    522  EEEDog
 *    524  seovx
 *    526  picsum
 *    530  waiBizhi
 *    532  btstu
 *    536  unsplash
 *    540  isValidBgVal(s)
 *    551  bgValToUrl(s)
 *    583  resetBg_()
 *    595  changeBg(s)
 *    621  setBg(s)
 *    633  getPicture()
 *    637  getPicture_()
 *    666  checkImgExists(imgurl)
 *    690  setLight()
 *    700  changeLight(flag)
 *    713  blurRadius
 *    717  strs
 *    722  saveBgFilter()
 *    770  setBgFilter()
 *    805  winbox
 *    807  createWinbox()
 *   1107  resetBg()
 *   1122  reset()
 *   1186  winboxNeedSize()
 *   1228  winResize()
 *   1246  toggleWinbox()
 * ========================================================================== */

/* ------------------------------ 美化模块 ------------------------------ */
/* 原 fomal.js 1753-2925 行，原样搬运，未改逻辑 */
/* 美化模块 start */

// 更新版本需要每个用户都恢复一次默认设置
if (localStorage.getItem("reset_8") == undefined) {
  localStorage.setItem("reset_8", "1");
  // 清空之前的标记值
  for (var i = 1; i <= 7; i++) {
    localStorage.removeItem("reset_" + i);
  }
  initItem();
  setTimeout(function () {
    fomalNotify({
          title: "提示🍒",
          message: " (｡･∀･)ﾉﾞ由于网站部分设置项更新，当前已为您重置所有设置，祝您愉快！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 8000
        })
  }, 1500);
}

/* ===== 字体设置（常规字体 / 代码块字体两组）=====
   family 名与 _custom/custom.css 里的 @font-face、面板按钮 id（swf_ / swfc_ + family）严格一一对应。
   localStorage.font / localStorage.codeFont 存的就是 family 名本身：常规字体直接当 --global-font 用，
   代码块字体当 --code-font 用（样式表里 pre/code 写的是 var(--code-font, JetBrainsMono)）。 */
var FONT_LIST = ["LXGW", "SourceHanSerif", "LXGWNeoXiHei", "default"];
var FONT_DEFAULT = "LXGW";
var CODE_FONT_LIST = ["JetBrainsMono", "FiraCode", "SourceCodePro"];
var CODE_FONT_DEFAULT = "JetBrainsMono";

// 恢复localStorage默认配置项
function initItem() {
  localStorage.setItem("blogbg", "default");
  localStorage.setItem("universe", "block");
  localStorage.setItem("fpson", "1");
  localStorage.setItem("transNum", "98");
  localStorage.setItem("font", FONT_DEFAULT);
  localStorage.setItem("codeFont", CODE_FONT_DEFAULT);
  localStorage.setItem("themeColor", "green");
  localStorage.setItem("rs", "block");
  localStorage.setItem("mouse", "on");
  localStorage.setItem("light", "true");
  localStorage.setItem("snow", "none");
  localStorage.setItem("aside", "1");
  localStorage.setItem("asidePos", "1");
  localStorage.setItem("nav", "1");
  localStorage.setItem("bgFilterOn", "1");
  var bgFilterValue = "blur(0px) saturate(108%) contrast(105%)";
  localStorage.setItem("bgFilterVal", bgFilterValue);
}


// 设置字体
// 用白名单校验而不是只判断 undefined：旧版面板留下的已下架字体（MiSans / YSHST）或其它脏值会被清掉，
// 回落到默认值，保证打开面板时永远有一项是高亮的。
if (FONT_LIST.indexOf(localStorage.getItem("font")) < 0) {
  localStorage.setItem("font", FONT_DEFAULT);
}
setFont(localStorage.getItem("font"));
function setFont(n) {
  localStorage.setItem("font", n)
  if (n == "default") {
    // 系统默认 = 完整系统字体栈。原来这里只写 '-apple-system'，而 Windows 不认这个关键字，
    // 于是 font-family 只写 var(--global-font) 的元素（左上角站点名 / 首页大标题 / 副标题 / 作者名）
    // 会直接掉到「浏览器默认字体」——用户把 Chrome 标准字体设成霞鹜文楷时，标题就变成楷体。
    // 完整栈里 -apple-system / BlinkMacSystemFont 在 Windows 上被跳过，自动落到 Segoe UI（中文落微软雅黑系）。
    // 同时不要把任何等宽字体混进正文栈里。
    var sysFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft JhengHei', 'Microsoft YaHei', sans-serif";
    document.documentElement.style.setProperty('--global-font', sysFontStack);
    document.body.style.fontFamily = sysFontStack;
  }
  else {
    document.documentElement.style.setProperty('--global-font', n);
    document.body.style.fontFamily = "var(--global-font),-apple-system, IBM Plex Mono ,monosapce,'微软雅黑', sans-serif";
  }
  try { setFontBorder(); } catch (err) { };
}

// 设置代码块字体：只改 --code-font 变量（样式表里 pre/code 已经写成 var(--code-font, JetBrainsMono)）
if (CODE_FONT_LIST.indexOf(localStorage.getItem("codeFont")) < 0) {
  localStorage.setItem("codeFont", CODE_FONT_DEFAULT);
}
setCodeFont(localStorage.getItem("codeFont"));
function setCodeFont(n) {
  localStorage.setItem("codeFont", n)
  document.documentElement.style.setProperty('--code-font', n);
  try { setCodeFontBorder(); } catch (err) { };
}

// 设置字体选择框边界（当前选中项额外铺一层主题色系浅底，一眼就能看出选了哪个字体）
// 常规/代码两组共用一套高亮逻辑，prefix 区分：常规 = swf_ + family，代码 = swfc_ + family
function setFontBorder() {
  markFontBorder("swf_", localStorage.getItem("font"));
}
function setCodeFontBorder() {
  markFontBorder("swfc_", localStorage.getItem("codeFont"));
}
function markFontBorder(prefix, curKey) {
  var swfId = prefix + curKey;
  var cur = document.getElementById(swfId);
  // 面板还没打开时找不到节点，直接返回（原来这里会抛错，靠外层 try 兜住）
  if (!cur) return;
  // 先把同组其它项还原成默认样式：.swf 的白底由样式表给，内联值清空即恢复
  Array.prototype.forEach.call(document.getElementsByClassName("swf"), function (ee) {
    if (ee.id.indexOf(prefix) === 0 && ee.id != swfId) {
      ee.style.border = "2px solid var(--border-color)";
      ee.style.backgroundColor = "";
      ee.style.boxShadow = "";
    }
  });
  cur.style.border = "2px solid var(--theme-color)";
  // 主题色 32% 掺白 68% 的淡底：不管主题色是深是浅（13 色实测最低对比度 6.95:1），深色文字(#303030)都保持可读
  cur.style.backgroundColor = "color-mix(in srgb, var(--theme-color) 32%, #ffffff)";
  // 外圈再补一道同色柔光，暗色面板里也能和未选中项拉开差距
  cur.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--theme-color) 38%, transparent)";
}


// 设置主题色
if (localStorage.getItem("themeColor") == undefined) {
  localStorage.setItem("themeColor", "green");
}
setColor(localStorage.getItem("themeColor"));
function setColor(c) {
  document.getElementById("themeColor").innerText = `:root{--theme-color:` + map.get(c) + ` !important}`;
  localStorage.setItem("themeColor", c);
  /* 只有主题色变化才刷新鼠标颜色；Cursor.refresh 原地更新样式，
   * 按当前目标识别交互状态，不再遍历全页元素。 */
  if (window.__cursorColor !== c) {
    window.__cursorColor = c;
    CURSOR.refresh();
  }
  // 设置一个带有透明度的主题色，用于菜单栏的悬浮颜色
  var theme_color = map.get(c);
  var trans_theme_color = "rgba" + theme_color.substring(3, theme_color.length - 1) + ", 0.7)";
  var high_trans_color = "rgba" + theme_color.substring(3, theme_color.length - 1) + ", 0.5)";
  var hh_trans_color = "rgba" + theme_color.substring(3, theme_color.length - 1) + ", 0.1)";
  document.documentElement.style.setProperty("--text-bg-hover", trans_theme_color);
  document.documentElement.style.setProperty("--high-trans-color", high_trans_color);
  document.documentElement.style.setProperty("--hh-trans-color", hh_trans_color);
}


// 星空背景开关
if (localStorage.getItem("universe") == undefined) {
  localStorage.setItem("universe", "block");
}
document.getElementById("universe").style.display = localStorage.getItem("universe");
function setUniverse() {
  if (document.getElementById("universeSet").checked) {
    document.getElementById("universe").style.display = "block";
    localStorage.setItem("universe", "block");
  } else {
    document.getElementById("universe").style.display = "none";
    localStorage.setItem("universe", "none");
  }
}

// 雪花开关
if (localStorage.getItem("snow") == undefined) {
  localStorage.setItem("snow", "none");
}
document.getElementById("snow").style.display = localStorage.getItem("snow");
function setSnow() {
  if (document.getElementById("snowSet").checked) {
    document.getElementById("snow").style.display = "block";
    localStorage.setItem("snow", "block");
  } else {
    document.getElementById("snow").style.display = "none";
    localStorage.setItem("snow", "none");
  }
}

// 导航栏常驻开关
if (localStorage.getItem("nav") == undefined) {
  localStorage.setItem("nav", "1");
}
document.addEventListener('pjax:complete', addNavClass);
document.addEventListener('DOMContentLoaded', addNavClass);
function addNavClass() {
  if (localStorage.getItem("nav") == "1") {
    document.getElementById("nav").classList.add("nav_fixed");
    document.getElementById("nav").classList.remove("nav_visible");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;
  } else {
    document.getElementById("nav").classList.add("nav_visible");
    document.getElementById("nav").classList.remove("nav_fixed");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:inline-flex;--nav-fixed-display:none;}`;
  }
}
function setNav() {
  if (document.getElementById("navSet").checked) {
    document.getElementById("nav").classList.add("nav_fixed");
    document.getElementById("nav").classList.remove("nav_visible");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;
    localStorage.setItem("nav", "1");
  } else {
    document.getElementById("nav").classList.add("nav_visible");
    document.getElementById("nav").classList.remove("nav_fixed");
    document.getElementById("nav-display").innerText = `:root{--nav-visible-display:inline-flex;--nav-fixed-display:none;}`;
    localStorage.setItem("nav", "0");
  }
}

// 帧率监测开关
if (localStorage.getItem("fpson") == undefined) {
  localStorage.setItem("fpson", "1");
}
// 初始化
// 2026-10-04 性能修复：帧率计数本身是一条常驻 requestAnimationFrame 循环，
// 面板里把「帧率监测」关掉后不该还在跑 —— 改成开着才启动（fpssw 重新打开会补启动）。
var fpsPanel = document.getElementById("fps");
if (localStorage.getItem("fpson") == 1) {
  startFps();
  if (fpsPanel) fpsPanel.style.display = "block";
} else {
  stopFps();
  if (fpsPanel) fpsPanel.style.display = "none";
}
// 切换：显示节点暂时缺失也不能阻止取消采样和保存偏好。
function fpssw() {
  var toggle = document.getElementById("fpson");
  if (!toggle) return;
  var enabled = toggle.checked;
  localStorage.setItem("fpson", enabled ? "1" : "0");
  if (enabled) startFps();
  else stopFps();
  var panel = document.getElementById("fps");
  if (panel) panel.style.display = enabled ? "block" : "none";
}

// 刷新窗口
function reload() {
  window.location.reload();
}

// 侧边部件开关
if (localStorage.getItem("rs") == undefined) {
  localStorage.setItem("rs", "block");
}
if (localStorage.getItem("rs") == "block") {
  document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
} else {
  document.getElementById("rightSide").innerText = `:root{--rightside-display: none}`;
}
function toggleRightside() {
  // 先设置localStorage变量
  if (document.getElementById("rightSideSet").checked) {
    localStorage.setItem("rs", "block");
    document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
  } else {
    localStorage.setItem("rs", "none");
    document.getElementById("rightSide").innerText = `:root{--rightside-display: none}`;
  }
}

// 侧栏显隐
if (localStorage.getItem("aside") == undefined) {
  localStorage.setItem("aside", "1");
}
if (localStorage.getItem("aside") == "1") {
  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
} else {
  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: center; --aside-content-display: none;}`;
}
function setAside() {
  if (document.getElementById("asideSet").checked) {
    localStorage.setItem("aside", "1");
    document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
  } else {
    localStorage.setItem("aside", "0");
    document.getElementById("aside-show").innerText = `:root{--layout-justify-content: center; --aside-content-display: none;}`;
  }
}

// 侧栏位置
if (localStorage.getItem("asidePos") == undefined) {
  localStorage.setItem("asidePos", "1");
}
if (localStorage.getItem("asidePos") == "1") {
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;
} else {
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 2; --recent-post-item-margin: 0px 0px 20px 1%;}`;
}
function setAsidePos() {
  if (document.getElementById("asidePosSet").checked) {
    localStorage.setItem("asidePos", "1");
    document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;
  } else {
    localStorage.setItem("asidePos", "0");
    document.getElementById("aside-pos").innerText = `:root{--first-child-order: 2; --recent-post-item-margin: 0px 0px 20px 1%;}`;
  }
}


// 透明度调节滑块
if (localStorage.getItem("transNum") == undefined) {
  localStorage.setItem("transNum", 98);
}
var curTransNum = localStorage.getItem("transNum");
var curTransMini = curTransNum * 0.95;
document.getElementById("transPercent").innerText = `:root{--trans-light: rgba(250, 250, 250, ${curTransNum}%) !important; --trans-dark: rgba(28, 28, 28, ${curTransNum}%) !important} `;
function setTrans() {
  var elem = document.getElementById("transSet");
  var newTransNum = elem.value;
  var target = document.querySelector('.transValue');
  target.innerHTML = `卡片透明度 (0%-100%): <span style="color:#eb5353">` + newTransNum + `%</span>`;
  localStorage.setItem("transNum", newTransNum);
  curTransMini = newTransNum * 0.95;
  curTransNum = newTransNum;  // 更新当前透明度
  document.querySelector('#rang_trans').style.width = curTransMini + "%";
  document.getElementById("transPercent").innerText = `:root{--trans-light: rgba(250, 250, 250, ${newTransNum}%) !important; --trans-dark: rgba(28, 28, 28, ${newTransNum}%) !important} `;
};


/* 滑条增强：拖动或者点击进度条任意位置都能跳转 start */
var curJumpRange = null;      // 当前正在拖动/点击的滑条
var rangeJumpReady = false;   // 全局的移动、松手监听是否已注册

// 把屏幕横坐标换算成滑条该取的值（扣掉滑块自身宽度，两端才准）
function rangeValueFromX(rangeEl, clientX) {
  var rect = rangeEl.getBoundingClientRect();
  var min = parseFloat(rangeEl.min);
  var max = parseFloat(rangeEl.max);
  var step = parseFloat(rangeEl.step);
  if (isNaN(min)) min = 0;
  if (isNaN(max)) max = 100;
  if (isNaN(step) || step <= 0) step = 1;
  if (!rect.width) return isNaN(parseFloat(rangeEl.value)) ? min : parseFloat(rangeEl.value);
  var thumb = 15;                          // 与 CSS 里 ::-webkit-slider-thumb 的宽度保持一致
  var usable = rect.width - thumb;         // 滑块圆心能走的总距离
  if (usable <= 0) usable = rect.width;
  var ratio = (clientX - rect.left - thumb / 2) / usable;
  ratio = ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
  var val = min + ratio * (max - min);
  val = Math.round(val / step) * step;     // 按 step 取整，和原生拖动保持一致
  val = Math.min(max, Math.max(min, val));
  return Math.round(val * 1000) / 1000;    // 去掉浮点误差尾巴
}

// 直接改 value 不会触发 oninput，这里手动补一次 input 事件，复用原有的 setTrans()
function fireRangeInput(rangeEl) {
  var evt;
  try {
    evt = new Event("input", { bubbles: true });
  } catch (err) {
    evt = document.createEvent("Event");
    evt.initEvent("input", true, true);
  }
  rangeEl.dispatchEvent(evt);
}

// 按坐标更新滑条的值
function setRangeByX(rangeEl, clientX) {
  var val = rangeValueFromX(rangeEl, clientX);
  if (parseFloat(rangeEl.value) === val) return;
  rangeEl.value = val;
  fireRangeInput(rangeEl);
}

// 绑定：按下即跳到该位置，按住拖动则一路跟随（含轨道左右的空白区域）
function bindRangeJump(rangeEl) {
  if (!rangeEl || rangeEl.rangeJumpBound) return;
  rangeEl.rangeJumpBound = true;
  var box = rangeEl.parentNode || rangeEl;
  var start = function (clientX) { curJumpRange = rangeEl; setRangeByX(rangeEl, clientX); };
  if (window.PointerEvent) {
    box.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;   // 只响应左键
      start(e.clientX);
    });
  } else {
    box.addEventListener("mousedown", function (e) {
      if (e.button) return;
      start(e.clientX);
    });
    box.addEventListener("touchstart", function (e) {
      if (e.touches && e.touches[0]) start(e.touches[0].clientX);
    }, { passive: true });
  }
}

// 全局监听只注册一次，避免反复开关小窗时重复绑定
function initRangeJump() {
  if (rangeJumpReady) return;
  rangeJumpReady = true;
  var move = function (clientX) { if (curJumpRange) setRangeByX(curJumpRange, clientX); };
  var end = function () { curJumpRange = null; };
  if (window.PointerEvent) {
    document.addEventListener("pointermove", function (e) { move(e.clientX); });
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  } else {
    document.addEventListener("mousemove", function (e) { move(e.clientX); });
    document.addEventListener("mouseup", end);
    document.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) move(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
  }
}
/* 滑条增强 end */


// 每12小时强制切换一次夜间模式
if (localStorage.getItem("lastTime") == undefined) {
  localStorage.setItem("lastTime", Date.now() - 8.1 * 60 * 60 * 1000);
}
let deltaSeconds = (Date.now() - localStorage.getItem("lastTime")) / 1000;
// 距离上次主动切换日夜模式超过8h，根据当前时间自动调节日夜模式
if (deltaSeconds > 60 * 60 * 8) {
  // 24小时后再生效
  localStorage.setItem("lastTime", Date.now());
  var curHour = new Date().getHours();
  var curMode = document.getElementsByTagName('html')[0].getAttribute('data-theme');
  // 是白天还是夜间：优先问 aside-calendar.js——它按访客当地真实日出日落算
  // （source/js/aside-calendar.js 的 isDayNow），拿不到才退回原来的早7晚7。
  // 它还会在解析期先把模式摆正，所以正常情况下下面两个分支根本不会进。
  var isDayNow = (window.fomalAsideCalendar && typeof window.fomalAsideCalendar.isDayNow === 'function')
    ? window.fomalAsideCalendar.isDayNow()
    : (curHour >= 7 && curHour < 19);
  // 模式不正确
  if (!isDayNow && curMode != "dark") {
    activateDarkMode();
    saveToLocal.set('theme', 'dark', 2);
    document.getElementById('modeicon').setAttribute('xlink:href', '#icon-sun');
  } else if (isDayNow && curMode != "light") {
    activateLightMode();
    saveToLocal.set('theme', 'light', 2);
    document.querySelector('body').classList.add('DarkMode'), document.getElementById('modeicon').setAttribute('xlink:href', '#icon-moon');
  }
}


// 切换自定义颜色
var defineColor = localStorage.getItem("blogbg") && localStorage.getItem("blogbg").charAt(0) == '#' ? localStorage.getItem("blogbg") : '#F4D88A';
function changeBgColor() {
  changeBg(document.querySelector("#define_colors").value);
}

// 必应每日壁纸API（2026-09-30 修复：原 bing.img.run 已全站失效）
let bingDayBg = "url(https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN)";
// 必应历史/随机壁纸API（2026-09-30 修复：原 bing.img.run 已全站失效）
let bingHistoryBg = "url(https://bing.biturl.top/?resolution=1920&format=image&index=random&mkt=zh-CN)";
// 二次元随机（2026-09-30 换到 loliapi；2026-10-06 改走同站横屏库 /acg/pc/ —— 原 /acg/ 每 3 次请求就有 1 次 404）
let EEEDog = "url(https://www.loliapi.com/acg/pc/)";
// 随机美图（2026-09-30 换到 api.dujin.org/pic/；2026-10-06 该接口开始返回 0 字节空图，改用 moe.jitsu.top 萌图）
let seovx = "url(https://moe.jitsu.top/api?sort=pc)";
// picsum随机
let picsum = "url(https://picsum.photos/id/1043/1920/1080.webp)";
// 小歪二次元
// let waiDongman = "url(https://api.ixiaowai.cn/api/api.php)";
// 高清壁纸（2026-09-30 修复：原 api.ixiaowai.cn 已失效）
let waiBizhi = "url(https://www.loliapi.com/bg/)";
// 手机竖屏二次元（2026-09-30 修复：原 api.btstu.cn 仅有 http，HTTPS 站会被浏览器按混合内容拦截）
let btstu = "url(https://t.mwm.moe/mp)";
// tuapi 动漫
// let tuapi = "url(https://tuapi.eees.cc/api.php?category=dongman)";
// 横屏二次元（2026-09-30 修复：原 source.unsplash.com 官方已停服）
let unsplash = "url(https://t.mwm.moe/pc)";


// 判断背景值是否合法（default / #颜色 / url(...) / 渐变 / http(s) 链接）
function isValidBgVal(s) {
  if (s == undefined || s == null) return false;
  s = String(s).trim();
  if (s == "" || s == "undefined" || s == "null") return false;
  if (s.charAt(0) == "#") return true;
  if (s.indexOf("url(") == 0) return true;
  if (s.indexOf("linear-gradient") == 0 || s.indexOf("radial-gradient") == 0) return true;
  if (s.indexOf("http://") == 0 || s.indexOf("https://") == 0) return true;
  return false;
}
// 从背景值里取出图片直链，取不到返回空串
function bgValToUrl(s) {
  if (!isValidBgVal(s)) return "";
  s = String(s).trim();
  var m = s.match(/^url\((["']?)(.*?)\1\)$/);
  if (m) s = m[2];
  return /^https?:\/\//.test(s) ? s.trim() : "";
}
// 更换背景(自己的代码)
(function initBg() {
  var el = document.getElementById("defineBg");
  if (!el) return;
  var saved = localStorage.getItem("blogbg");
  // 历史遗留的非法值（例如误写成的 "deafult"）自动纠正为默认背景
  if (saved != undefined && saved != "default" && !isValidBgVal(saved)) {
    saved = "default";
    localStorage.setItem("blogbg", "default");
  }
  if (saved == undefined || saved == "default") {
    resetBg_();
    if (localStorage.getItem("blogbg") == undefined) localStorage.setItem("blogbg", "default");
    return;
  }
  setBg(saved);
  // 自定义背景图取不到（死链/被墙）时自动回退默认背景
  var bgUrl = bgValToUrl(saved);
  if (!bgUrl) return;
  checkImgExists(bgUrl).catch(function () {
    localStorage.setItem("blogbg", "default");
    resetBg_();
  });
})();
// 默认背景
function resetBg_() {
  var el = document.getElementById("defineBg");
  if (!el) return;
  el.innerText = `:root{
    --default-bg: url(https://picsum.photos/id/1015/1920/1080);
    --darkmode-bg:url(https://picsum.photos/id/1044/1920/1080);
    --mobileday-bg: url(https://picsum.photos/id/1018/1920/1080);
    --mobilenight-bg: url(https://picsum.photos/id/1039/1920/1080);
  }`;
}

// 切换背景主函数
function changeBg(s) {
  // 自定义颜色框
  defineColor = s.charAt(0) == "#" ? s : '#F4D88A';
  var bgUrl = bgValToUrl(s);
  if (bgUrl) {
    // 图片背景先探测可用性，避免选到已失效的壁纸源导致背景空白
    checkImgExists(bgUrl).then(function () {
      setBg(s);
      localStorage.setItem("blogbg", s);
    }).catch(function () {
      fomalNotify({
        title: "这个壁纸源失效了🥲",
        message: "该背景图链接无法加载，已保持当前背景。换一个试试吧～",
        position: 'top-left',
        offset: 50,
        showClose: true,
        type: "warning",
        duration: 5000
      });
    });
    return;
  }
  setBg(s);
  localStorage.setItem("blogbg", s);
}
// 设置背景属性
function setBg(s) {
  var el = document.getElementById("defineBg");
  if (!el) return;
  el.innerText = `:root{
    --default-bg: ${s};
    --darkmode-bg: ${s};
    --mobileday-bg: ${s};
    --mobilenight-bg: ${s};
  }`;
}

// 切换链接对应的背景(加入了链接检验与防抖)
function getPicture() {
  debounce(getPicture_, 300);
}

function getPicture_() {
  checkImgExists(document.getElementById("pic-link").value).then(() => {
    // 有效的图片链接
    var link = "url(" + document.getElementById("pic-link").value + ")";
    changeBg(link);
    // 提示切换成功
    fomalNotify({
          title: "可以啦🍨",
          message: "切换自定义背景成功！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 5000
        })
  }).catch(() => {
    // 无效的图片链接，提示无效
    fomalNotify({
          title: "链接不对🤣",
          message: "请输入有效的图片链接！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "warning",
          duration: 5000
        })
  })
}
// 判断图片链接是否可用
function checkImgExists(imgurl) {
  return new Promise(function (resolve, reject) {
    var ImgObj = new Image();
    ImgObj.src = imgurl;
    ImgObj.onload = function (res) {
      resolve(res);
    }
    ImgObj.onerror = function (err) {
      reject(err);
    }
  })
}

// 黑夜霓虹灯开关
if (localStorage.getItem("light") == undefined) {
  localStorage.setItem("light", "true");
}
// 这里要适配Pjax
document.addEventListener('pjax:complete', function () {
  changeLight(localStorage.getItem("light") == "true" ? true : false)
});
document.addEventListener('DOMContentLoaded', function () {
  changeLight(localStorage.getItem("light") == "true" ? true : false)
});
function setLight() {
  if (document.getElementById("lightSet").checked) {
    changeLight(true);
    localStorage.setItem("light", "true");
  } else {
    changeLight(false);
    localStorage.setItem("light", "false");
  }
}
// 更换霓虹灯状态
function changeLight(flag) {
  if (document.getElementById("site-name"))
    document.getElementById("site-name").style.animation = flag ? "light_15px 10s linear infinite" : "none";
  if (document.getElementById("site-title"))
    document.getElementById("site-title").style.animation = flag ? "light_15px 10s linear infinite" : "none";
  if (document.getElementById("site-subtitle"))
    document.getElementById("site-subtitle").style.animation = flag ? "light_10px 10s linear infinite" : "none";
  if (document.getElementById("post-info"))
    document.getElementById("post-info").style.animation = flag ? "light_5px 10s linear infinite" : "none";
  document.getElementById("menu_shadow").innerText = flag ? `:root{--menu-shadow: 0 0 1px var(--theme-color);}` : `:root{--menu-shadow: none;}`;
}

// 设置背景滤镜参数
var blurRadius, saturate, contrast;
if (localStorage.getItem("bgFilterVal") == undefined) {
  localStorage.setItem("bgFilterVal", "blur(0px) saturate(108%) contrast(105%)");
}
var strs = localStorage.getItem("bgFilterVal").split(" ");
blurRadius = strs[0].substring(5, strs[0].length - 3);
saturate = strs[1].substring(9, strs[1].length - 2);
contrast = strs[2].substring(9, strs[2].length - 2);

function saveBgFilter() {
  if (document.getElementById("blurRad").value < 0 || document.getElementById("blurRad").value > 300 ||
    document.getElementById("saturation").value < 0 || document.getElementById("saturation").value > 200 ||
    document.getElementById("contrast").value < 0 || document.getElementById("contrast").value > 200) {
    fomalNotify({
          title: "警告💊",
          message: "背景滤镜参数不在合理范围内！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "warning",
          duration: 5000
        })
    return;
  }

  var bgFilterValue = `blur(` + document.getElementById("blurRad").value + `px) saturate(` + document.getElementById("saturation").value + `%) contrast(` + document.getElementById("contrast").value + `%)`;
  localStorage.setItem("bgFilterVal", bgFilterValue);
  if (localStorage.getItem("bgFilterOn") == "1") {
    document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:` + localStorage.getItem("bgFilterVal") + `;}`;
  }
  blurRadius = document.getElementById("blurRad").value;
  saturate = document.getElementById("saturation").value;
  contrast = document.getElementById("contrast").value;
  document.getElementById("bgFilterShow").innerHTML =
    `模糊半径: <span style="color:#eb5353">` + blurRadius + `px</span> | 饱和度: <span style="color:#eb5353">` + saturate + `%</span> | 对比度: <span style="color:#eb5353">` + contrast + `%</span>`;

  fomalNotify({
        title: "提示🍄",
        message: "设置背景滤镜参数成功！",
        position: 'top-left',
        offset: 50,
        showClose: true,
        type: "success",
        duration: 5000
      })
}

// 背景滤镜开关
if (localStorage.getItem("bgFilterOn") == undefined) {
  localStorage.setItem("bgFilterOn", "1");
}
if (localStorage.getItem("bgFilterOn") == "0") {
  document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:none;}`;
} else {
  document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:` + localStorage.getItem("bgFilterVal") + `;}`;
}

function setBgFilter() {
  if (document.getElementById("bgFilterSet").checked) {
    document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:` + localStorage.getItem("bgFilterVal") + `;}`;
    localStorage.setItem("bgFilterOn", "1");
  } else {
    document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:none;}`;
    localStorage.setItem("bgFilterOn", "0");
  }
}


// 解决开启Pjax的问题
// function whenDOMReady() {
//   try {
//     let data = loadData('blogbg', 1440)
//     if (data) changeBg_noWindow(data, 0)
//     else localStorage.removeItem('blogbg');
//   } catch (error) { localStorage.removeItem('blogbg'); }
// }
// whenDOMReady()
// document.addEventListener("pjax:success", whenDOMReady)

// 无弹窗提醒更换背景
// function changeBg_noWindow(s, flag) {
//   let bg = document.getElementById("web_bg");
//   if (s.charAt(0) == "#") {
//     bg.style.backgroundColor = s;
//     bg.style.backgroundImage = "none";
//   } else bg.style.backgroundImage = s;
//   if (!flag) {
//     saveData("blogbg", s);
//   }
// }

// 创建窗口
var winbox = "";

function createWinbox() {
  let div = document.createElement("div");
  document.body.appendChild(div);
  winbox = WinBox({
    id: "meihuaBox",
    index: 99,
    title: "美化设置",
    x: "left",
    y: "center",
    minwidth: "300px",
    height: "60%",
    // "#76c8f1"
    background: 'var(--theme-color)',
    onmaximize: () => {
      div.innerHTML = `<style>body::-webkit-scrollbar {display: none;} div#meihuaBox {width: 100% !important;}</style>`;
    },
    onrestore: () => {
      div.innerHTML = "";
    },
  });
  winResize();
  window.addEventListener("resize", winResize);

  // 面板 HTML。改这里的约定（样式全在 themes/fomalhaut/source/css/_custom/custom.css 的「美化面板」一节）：
  //  · 每段「文字 + 开关」用 <label class="opt"> 包住 —— 点文字也能切开关，窄屏换行时开关不会跟自己的文字分家；
  //  · 背景滤镜三个参数各自用 <label class="bgp"> 包住，数字框与单位不会被拆到两行；
  //  · 主题色那一行是 .colorRow：桌面一行铺开，手机端换成等宽网格（@media max-width:768px）。
  // 恢复默认背景按钮已删除（2026-10-04）：上面的「恢复默认设置」reset() 里已经会 resetBg_()，那个按钮是重复的。
  winbox.body.innerHTML = `
<div class="settings" style="display: block;">
<div id="article-container" style="padding:12px;">
<br>
<center><p><button id="reset_btn" type="button" onclick="debounce(reset, 300)" title="点击此按钮恢复美化模块默认设置"><i class="fa-solid fa-arrows-rotate" style="animation: fa-spin 8s linear infinite;"></i>&nbsp;恢复默认设置</button></p></center>

<h2>一、显示偏好</h2>

<div class="transValue" id="transVal" style="font-weight:bold;padding-left:10px">卡片透明度 (0%-100%): <span style="color:#eb5353">${curTransNum}%</span></div>
<div class="range">
  <input id="transSet" type="range" min="0" max="100" step="1" value=${curTransNum} oninput="setTrans()">
  <p class="rang_width" id="rang_trans" style="width:${curTransMini}%"></p>
</div>


<div style="padding-bottom:15px">
  <div class="content" style="display:flex">
  <label class="opt"><span class="content-text" style="font-weight:bold"> 背景滤镜 </span><input type="checkbox" id="bgFilterSet" onclick="setBgFilter()"></label>
  <div class="bgFilterValue" id="bgFilterShow" style="font-weight:bold;padding-left:10px">模糊半径: <span style="color:#eb5353">${blurRadius}px</span> | 饱和度: <span style="color:#eb5353">${saturate}%</span> | 对比度: <span style="color:#eb5353">${contrast}%</span></div>
  </div>
  <div class="content bgparams" style="display:flex;font-weight:bold;padding-left:10px">
  <label class="bgp"><span class="bgp-k">模糊半径</span><span class="bgp-v"><input type="number" id="blurRad" placeholder="0" min="0" max="300" step="1" title="背景模糊半径:0-300px"><span class="bgp-u">px</span></span></label>
  <label class="bgp"><span class="bgp-k">饱和度</span><span class="bgp-v"><input type="number" id="saturation" placeholder="108" min="0" max="200" step="1" title="背景饱和度:0-200%"><span class="bgp-u">%</span></span></label>
  <label class="bgp"><span class="bgp-k">对比度</span><span class="bgp-v"><input type="number" id="contrast" placeholder="105" min="0" max="200" step="1" title="背景对比度:0-200%"><span class="bgp-u">%</span></span></label>
  <button class="winbox_btn bgp-save" type="button" onclick="debounce(saveBgFilter,300)" title="点击保存背景滤镜参数">保存</button>
  </div>
</div>

<div class="content" style="display:flex">
  <label class="opt"><span class="content-text" style="font-weight:bold"> 星空特效 (夜间模式) </span><input type="checkbox" id="universeSet" onclick="setUniverse()"></label>
  <label class="opt"><span class="content-text" style="font-weight:bold"> 霓虹彩灯 (夜间模式) </span><input type="checkbox" id="lightSet" onclick="setLight()"></label>
</div>

<div class="content" style="display:flex">
  <label class="opt"><span class="content-text" style="font-weight:bold"> 帧率监测 (默认开启) </span><input type="checkbox" id="fpson" onclick="fpssw()"></label>
  <label class="opt"><span class="content-text" style="font-weight:bold"> 雪花特效 (白天模式) </span><input type="checkbox" id="snowSet" onclick="setSnow()"></label>
</div>

<div class="content" style="display:flex">
  <label class="opt"><span class="content-text" style="font-weight:bold"> 右侧部件 (默认开启) </span><input type="checkbox" id="rightSideSet" onclick="toggleRightside()"></label>
  <label class="opt"><span class="content-text" style="font-weight:bold"> 顶栏常驻 (默认开启) </span><input type="checkbox" id="navSet" onclick="setNav()"></label>
</div>

<div class="content" style="display:flex">
  <label class="opt"><span class="content-text" style="font-weight:bold"> 侧栏显隐 (默认显示) </span><input type="checkbox" id="asideSet" onclick="setAside()"></label>
  <label class="opt"><span class="content-text" style="font-weight:bold"> 侧栏位置 (默认右边) </span><input type="checkbox" id="asidePosSet" onclick="setAsidePos()"></label>
</div>

<h2>二、主题色设置</h2>
<div class="content colorRow">
  <input type="radio" id="red" name="colors" value=" " onclick="setColor('red')">
  <input type="radio" id="orange" name="colors" value=" " onclick="setColor('orange')">
  <input type="radio" id="yellow" name="colors" value=" " onclick="setColor('yellow')">
  <input type="radio" id="green" name="colors" value=" " onclick="setColor('green')">
  <input type="radio" id="puregreen" name="colors" value=" " onclick="setColor('puregreen')">
  <input type="radio" id="blue" name="colors" value=" " onclick="setColor('blue')">
  <input type="radio" id="heoblue" name="colors" value=" " onclick="setColor('heoblue')">
  <input type="radio" id="darkblue" name="colors" value=" " onclick="setColor('darkblue')">
  <input type="radio" id="purple" name="colors" value=" " onclick="setColor('purple')">
  <input type="radio" id="purepurple" name="colors" value=" " onclick="setColor('purepurple')">
  <input type="radio" id="pink" name="colors" value=" " onclick="setColor('pink')">
  <input type="radio" id="gray" name="colors" value=" " onclick="setColor('gray')">
  <input type="radio" id="black" name="colors" value=" " onclick="setColor('black')">
</div>

<h2>三、字体设置</h2>
{% note info modern %}下面都是开源可商用字体（SIL OFL），由 jsDelivr 上的 @fontsource 字体包提供，不依赖自建存储。{% endnote %}
<h3>1. 常规字体（没选过时默认：霞鹜文楷）</h3>
<p id="swfs">
<a class="swf" id="swf_LXGW" href="javascript:;" rel="noopener external nofollow" style="font-family:'LXGW'!important;color:#303030" onclick="setFont('LXGW')">霞鹜文楷</a>
<a class="swf" id="swf_SourceHanSerif" href="javascript:;" rel="noopener external nofollow" style="font-family:'SourceHanSerif'!important;color:#303030" onclick="setFont('SourceHanSerif')">思源宋体</a>
<a class="swf" id="swf_LXGWNeoXiHei" href="javascript:;" rel="noopener external nofollow" style="font-family:'LXGWNeoXiHei'!important;color:#303030" onclick="setFont('LXGWNeoXiHei')">霞鹜新晰黑</a>
<a class="swf" id="swf_default" href="javascript:;" rel="noopener external nofollow" style="font-family:-apple-system, IBM Plex Mono ,monosapce,'微软雅黑', sans-serif;!important;color:#303030" onclick="setFont('default')">系统默认</a>
</p>

<h3>2. 代码块字体（没选过时默认：JetBrains Mono）</h3>
<p id="swfs_code">
<a class="swf" id="swfc_JetBrainsMono" href="javascript:;" rel="noopener external nofollow" style="font-family:'JetBrainsMono'!important;color:#303030" onclick="setCodeFont('JetBrainsMono')">JetBrains Mono</a>
<a class="swf" id="swfc_FiraCode" href="javascript:;" rel="noopener external nofollow" style="font-family:'FiraCode'!important;color:#303030" onclick="setCodeFont('FiraCode')">Fira Code</a>
<a class="swf" id="swfc_SourceCodePro" href="javascript:;" rel="noopener external nofollow" style="font-family:'SourceCodePro'!important;color:#303030" onclick="setCodeFont('SourceCodePro')">Source Code Pro</a>
</p>

<h2>四、背景设置</h2>


<h3>1. 风景 · 山野</h3>
{% folding cyan, 查看二次元背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1041/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1041/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1016/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1016/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1043/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1043/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1044/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1044/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1016/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1016/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>

</div>
{% endfolding %}


<h3>2. 风景 · 水与森林</h3>

{% folding cyan, 查看风景背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1041/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1041/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1043/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1043/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1044/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1044/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1015/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1015/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1016/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1016/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1036/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1036/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1039/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1039/1920/1080)')"></a>

</div>
{% endfolding %}

<h3>3. 风景 · 更多</h3>

{% folding cyan, 查看萌宠背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1036/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1036/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1039/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1039/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1041/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1041/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1043/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1043/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1044/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1044/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1015/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1015/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1016/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1016/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="imgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
</div>
{% endfolding %}

<h3>4. 渐变色</h3>
{% folding cyan, 查看渐变色背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to right, #544a7d, #ffd452)" onclick="changeBg('linear-gradient(to right, #544a7d, #ffd452)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to bottom, #7f7fd5, #86a8e7, #91eae4)" onclick="changeBg('linear-gradient(to bottom, #7f7fd5, #86a8e7, #91eae4)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to left, #654ea3, #eaafc8)" onclick="changeBg('linear-gradient(to left, #654ea3, #eaafc8)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to top, #feac5e, #c779d0, #4bc0c8)" onclick="changeBg('linear-gradient(to top, #feac5e, #c779d0, #4bc0c8)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to top, #d3959b, #bfe6ba)" onclick="changeBg('linear-gradient(to top, #d3959b, #bfe6ba)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to top, #8360c3, #2ebf91)" onclick="changeBg('linear-gradient(to top, #8360c3, #2ebf91)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to top, #108dc7, #ef8e38)" onclick="changeBg('linear-gradient(to top, #108dc7, #ef8e38)')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: linear-gradient(to top, #355c7d, #6c5b7b, #c06c84)" onclick="changeBg('linear-gradient(to top, #355c7d, #6c5b7b, #c06c84)')"></a>
</div>
{% endfolding %}


<h3>5. 纯色</h3>
{% folding cyan, 查看纯色背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #ecb1b1" onclick="changeBg('#ecb1b1')"></a> 
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #d3ebac" onclick="changeBg('#d3ebac')"></a> 
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #ace9ce" onclick="changeBg('#ace9ce')"></a>
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #c1ebea" onclick="changeBg('#c1ebea')"></a> 
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #dee7f1" onclick="changeBg('#dee7f1')"></a> 
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #e9e3f2" onclick="changeBg('#e9e3f2')"></a> 
<a href="javascript:;" rel="noopener external nofollow" class="box" style="background: #f7eff5" onclick="changeBg('#f7eff5')"></a>  
<input type="color" id="define_colors" href="javascript:;" rel="noopener external nofollow" class="box" autocomplete="on" value="${defineColor}" oninput="changeBgColor()"></input>
</div>
{% endfolding %}



<h3>6. 适配手机</h3>
{% folding cyan, 查看适配手机的背景 %}
<div class="bgbox">
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1044/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1044/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1015/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1015/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1016/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1016/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1039/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1039/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1039/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1039/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1018/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1018/1920/1080)')"></a>
<a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://picsum.photos/id/1041/1920/1080)" class="pimgbox" onclick="changeBg('url(https://picsum.photos/id/1041/1920/1080)')"></a>
</div>
{% endfolding %}


<h3>7. 壁纸API</h3>
{% folding cyan, 查看壁纸API系列背景 %}
<div class="bgbox">
<a id="bingDayBox" rel="noopener external nofollow" style="background-image: ${bingDayBg}" class="box apiBox" onclick="changeBg('${bingDayBg}')"></a>
<a id="bingHistoryBox" rel="noopener external nofollow" style="background-image: ${bingHistoryBg}" class="box apiBox" onclick="changeBg('${bingHistoryBg}')"></a>
<a id="EEEDogBox" rel="noopener external nofollow" style="background-image: ${EEEDog}" class="box apiBox" onclick="changeBg('${EEEDog}')"></a>
<a id="seovxBox" rel="noopener external nofollow" style="background-image: ${seovx}" class="box apiBox" onclick="changeBg('${seovx}')"></a>
<a id="picsumBox" rel="noopener external nofollow" style="background-image: ${picsum}" class="box apiBox" onclick="changeBg('${picsum}')"></a>
<a id="waiBizhiBox" rel="noopener external nofollow" style="background-image: ${waiBizhi}" class="box apiBox" onclick="changeBg('${waiBizhi}')"></a>
<a id="btstuBox" rel="noopener external nofollow" style="background-image: ${btstu}" class="box apiBox" onclick="changeBg('${btstu}')"></a>
<a id="unsplashBox" rel="noopener external nofollow" style="background-image: ${unsplash}" class="box apiBox" onclick="changeBg('${unsplash}')"></a>
</div>
{% endfolding %}


<h3>8. 自定义背景</h3>
{% folding cyan, 设置自定义背景 %}
<p><center>
<input type="text" id="pic-link" size="70%" maxlength="1000" placeholder="请输入有效的图片链接，如 https://picsum.photos/id/1015/1920/1080">
</center></p>
<p><center>
<button class="winbox_btn picbtn" type="button" onclick="getPicture()" title="用上面填写的图片链接切换网站背景">切换背景</button>
</center></p>
{% endfolding %}

<br>
<center><div style="font-size:1.2em;color:var(--theme-color);font-weight:bold;">------ ( •̀ ω •́ )y 到底啦 ------</div></center>
<br>

</div>

</div>

`;

  // 滑条：点击或拖动轨道任意位置都能跳转（原来进度条盖住轨道，左侧点不动）
  initRangeJump();
  bindRangeJump(document.getElementById("transSet"));

  // 打开小窗时候初始化
  // $("#" + localStorage.getItem("themeColor")).attr("checked", true);
  document.getElementById(localStorage.getItem("themeColor")).checked = true;
  if (localStorage.getItem("bgFilterOn") == "1") {
    document.getElementById("bgFilterSet").checked = true;
  } else if (localStorage.getItem("bgFilterOn") == "0") {
    document.getElementById("bgFilterSet").checked = false;
  }
  document.getElementById("blurRad").value = blurRadius;
  document.getElementById("saturation").value = saturate;
  document.getElementById("contrast").value = contrast;

  if (localStorage.getItem("universe") == "block") {
    document.getElementById("universeSet").checked = true;
  } else if (localStorage.getItem("universe") == "none") {
    document.getElementById("universeSet").checked = false;
  }
  if (localStorage.getItem("fpson") == "1") {
    document.getElementById("fpson").checked = true;
  } else {
    document.getElementById("fpson").checked = false;
  }
  if (localStorage.getItem("rs") == "block") {
    document.getElementById("rightSideSet").checked = true;
  } else if (localStorage.getItem("rs") == "none") {
    document.getElementById("rightSideSet").checked = false;
  }
  if (localStorage.getItem("light") == "true") {
    document.getElementById("lightSet").checked = true;
  } else {
    document.getElementById("lightSet").checked = false;
  }
  setFontBorder();
  setCodeFontBorder();
  if (localStorage.getItem("snow") == "block") {
    document.getElementById("snowSet").checked = true;
  } else if (localStorage.getItem("snow") == "none") {
    document.getElementById("snowSet").checked = false;
  }
  if (localStorage.getItem("nav") == "1") {
    document.getElementById("navSet").checked = true;
  } else if (localStorage.getItem("nav") == "0") {
    document.getElementById("navSet").checked = false;
  }
  if (localStorage.getItem("aside") == "1") {
    document.getElementById("asideSet").checked = true;
  } else if (localStorage.getItem("aside") == "0") {
    document.getElementById("asideSet").checked = false;
  }
  if (localStorage.getItem("asidePos") == "1") {
    document.getElementById("asidePosSet").checked = true;
  } else if (localStorage.getItem("asidePos") == "0") {
    document.getElementById("asidePosSet").checked = false;
  }
}

// 恢复默认背景
function resetBg() {
  localStorage.setItem("blogbg", "default");
  resetBg_();
  fomalNotify({
        title: "提示🌰",
        message: "当前已经恢复为默认背景！",
        position: 'top-left',
        offset: 50,
        showClose: true,
        type: "success",
        duration: 5000
      })
}

// 恢复默认设置(不刷新页面)
function reset() {
  initItem();

  setFont(FONT_DEFAULT);
  setCodeFont(CODE_FONT_DEFAULT);
  setColor("green");
  document.getElementById("universe").style.display = "block";
  document.getElementById("snow").style.display = "none";

  document.getElementById("aside-show").innerText = `:root{--layout-justify-content: unset; --aside-content-display: block;}`;
  document.getElementById("aside-pos").innerText = `:root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}`;

  document.getElementById("nav").classList.add("nav_fixed");
  document.getElementById("nav").classList.remove("nav_visible");
  document.getElementById("nav-display").innerText = `:root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}`;

  document.getElementById("rightSide").innerText = `:root{--rightside-display: block}`;
  document.getElementById("fps").style.display = "block";
  startFps(); // 恢复默认也恢复被真正停止的采样循环。

  curTransNum = 98;
  curTransMini = curTransNum * 0.95;
  document.getElementById("transPercent").innerText = `:root{--trans-light: rgba(250, 250, 250, ${curTransNum}%) !important; --trans-dark: rgba(28, 28, 28, ${curTransNum}%) !important} `;


  resetBg_();
  changeLight(true);

  document.getElementById("green").checked = true;
  document.getElementById("universeSet").checked = true;
  document.getElementById("fpson").checked = true;
  document.getElementById("rightSideSet").checked = true;
  document.getElementById("lightSet").checked = true;
  document.getElementById("snowSet").checked = false;
  document.getElementById("navSet").checked = true;
  document.getElementById("asideSet").checked = true;
  document.getElementById("asidePosSet").checked = true;

  document.getElementById("bgFilterSet").checked = true;
  document.getElementById("blurRad").value = 0;
  document.getElementById("saturation").value = 108;
  document.getElementById("contrast").value = 105;
  document.getElementById("bgFilterShow").innerHTML =
    `模糊半径: <span style="color:#eb5353">` + 0 + `px</span> | 饱和度: <span style="color:#eb5353">` + 108 + `%</span> | 对比度: <span style="color:#eb5353">` + 105 + `%</span>`;
  document.getElementById("bgFilterParam").innerText = `:root{--bg-filter:` + localStorage.getItem("bgFilterVal") + `;}`;

  document.getElementById("transVal").innerHTML = `卡片透明度 (0%-100%): <span style="color:#eb5353">` + curTransNum + `%</span>`;
  document.getElementById("transSet").value = `${curTransNum}`;
  document.getElementById("rang_trans").style = `width:${curTransMini}%`;


  fomalNotify({
        title: "提示🍅",
        message: "当前已经恢复为默认设置！",
        position: 'top-left',
        offset: 50,
        showClose: true,
        type: "success",
        duration: 5000
      })
}

// 量一次「内容真正需要多大的面板」：
// 宽度刚好放下「三、字体设置」常规字体那一行的 5 个按钮（最后一个不换行就说明宽度够了），
// 高度刚好完整显示第一节「一、显示偏好」——比这更大只会弹出一块又宽又空的大板子
function winboxNeedSize() {
  var fallback = { w: 780, h: 540 };
  var box = document.getElementById("meihuaBox");
  var ac = box ? box.querySelector("#article-container") : null;
  if (!ac) return fallback;
  try {
    var pr = box.getBoundingClientRect();
    var acr = ac.getBoundingClientRect();
    var cs = getComputedStyle(ac);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var padB = parseFloat(cs.paddingBottom) || 0;
    var chromeW = pr.width - acr.width; // 面板边框 + body 内边距占掉的宽度
    // ① 宽度：字体设置第一行要能排下前 5 个按钮
    var swfs = ac.querySelectorAll("#swfs > .swf");
    var n = Math.min(swfs.length, 5);
    var rowW = 0;
    for (var i = 0; i < n; i++) {
      var scs = getComputedStyle(swfs[i]);
      rowW += swfs[i].offsetWidth + (parseFloat(scs.marginLeft) || 0) + (parseFloat(scs.marginRight) || 0);
    }
    var indent = n ? swfs[0].getBoundingClientRect().left - acr.left - padL : 0;
    var lastMr = n ? (parseFloat(getComputedStyle(swfs[n - 1]).marginRight) || 0) : 0;
    var needW = Math.ceil(indent + rowW - lastMr + padL + padR + chromeW) + 10;
    // ② 高度：第一节最后一行开关（侧栏位置）完整可见即可
    var needH = fallback.h;
    var lastTog = ac.querySelector("#asidePosSet");
    if (lastTog) {
      var lr = lastTog.getBoundingClientRect();
      var rowR = lastTog.parentElement.getBoundingClientRect();
      needH = Math.ceil(Math.max(lr.bottom, rowR.bottom) - pr.top + padB) + 6;
    }
    return {
      w: Math.max(620, Math.min(needW, Math.round(document.documentElement.clientWidth * 0.95))),
      h: Math.max(420, Math.min(needH, Math.round(document.documentElement.clientHeight * 0.92)))
    };
  } catch (err) {
    return fallback;
  }
}

// 适应窗口大小
function winResize() {
  try {
    var offsetWid = document.documentElement.clientWidth;
    if (offsetWid <= 768) {
      winbox.resize(offsetWid * 0.95 + "px", "90%").move("center", "center");
    } else {
      // 桌面端：宽度刚好放下字体设置第一行、高度刚好显示完第一节，不再按百分比撑满
      var first = winboxNeedSize();
      winbox.resize(first.w + "px", first.h + "px");
      var final = winboxNeedSize(); // 宽度定下来后，行是否折行才是最终布局，再量一次高度
      winbox.resize(final.w + "px", final.h + "px").move("center", "center");
    }
  } catch (err) {
    // console.log("Pjax毒瘤抽风运行winResize方法🙄🙄🙄");
  }
}

// 切换状态，窗口已创建则控制窗口显示和隐藏，没窗口则创建窗口
function toggleWinbox() {
  if (document.querySelector("#meihuaBox")) {
    winbox.toggleClass("hide");
  } else {
    createWinbox();
    winResize(); // 面板内容写完了，按内容再量一次尺寸
  };
}

/* 美化模块 end */
