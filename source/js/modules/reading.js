/* ============================================================================
 * modules/reading.js —— 阅读进度 + FPS 检测
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 阅读进度（1-33）—— 右下角 FPS 上方那条细进度条：随滚动条增长，回到顶部时淡出
 *   · fps检测（1698-1749）—— 右下角 FPS 计数器，用 requestAnimationFrame 统计真实帧率，写着玩的性能小玩具
 * ----------------------------------------------------------------------------
 * 页面读到哪里、浏览器跑多少帧，都在这。两个模块互不依赖，只是都属于"页面状态指示"。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 2 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     32  percent()
 *     61  startFps()
 * ========================================================================== */

/* ------------------------------ 阅读进度 ------------------------------ */
/* 原 fomal.js 1-33 行，原样搬运，未改逻辑 */
/* 阅读进度 start */
document.addEventListener('pjax:complete', function () {
  window.onscroll = percent;
  // pjax 会换掉 #rightside-container（#go-up 在其中），缓存的「已经写过什么」要作废
  __pctLast = -1; __pctTop = false;
});
document.addEventListener('DOMContentLoaded', function () {
  window.onscroll = percent;
});
/* ---- 2026-10-04 性能修复：滚动回调合流到一个帧一次 ----
 * percent() 原来直接挂在 window.onscroll 上：触控板一次滑动会在一帧里发几十个
 * scroll 事件，每个事件都跑一整轮「读 6 个布局值 → 写 style / innerHTML」，
 * 等于一帧里强制同步布局几十次 —— 滚动顿挫的主因之一。
 * 现在用 rAF 合流（一帧最多算一次），并且只在百分比数字真的变了才写 DOM。
 * __pctLast = -1 表示「还没写过」，-1 与 0~94 都不冲突。
 */
var __pctTick = 0;
var __pctLast = -1;
var __pctTop = false;

// 页面百分比
function percent() {
  if (__pctTick) return;
  __pctTick = window.requestAnimationFrame(function () {
    __pctTick = 0;
    percentUpdate();
  });
}

function percentUpdate() {

  // 先让菜单栏消失
  try {
    rmf.showRightMenu(false);
    $('.rmMask').attr('style', 'display: none');
  } catch (err) {

  }

  let a = document.documentElement.scrollTop, // 卷去高度
    b = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight) - document.documentElement.clientHeight, // 整个网页高度 减去 可视高度
    result = Math.round(a / b * 100), // 计算百分比
    btn = document.querySelector("#go-up"); // 获取按钮

  if (!btn || !btn.childNodes[0] || !btn.childNodes[1]) return; // pjax 换页中途可能不在

  if (result < 95) { // 如果阅读进度小于95% 就显示百分比
    if (!__pctTop && result === __pctLast) return; // 数字没变就别再写一遍 DOM
    btn.childNodes[0].style.display = 'none'
    btn.childNodes[1].style.display = 'block'
    btn.childNodes[1].innerHTML = result + '<span>%</span>';
    __pctLast = result;
    __pctTop = false;
  } else { // 如果大于95%就显示回到顶部图标
    if (__pctTop) return; // 已经切过回顶图标了
    btn.childNodes[1].style.display = 'none'
    btn.childNodes[0].style.display = 'block'
    __pctTop = true;
  }
}
/* 阅读进度 end */

/* ------------------------------ fps检测 ------------------------------ */
/* 原 fomal.js 1698-1749 行，原样搬运，未改逻辑 */
/* fps检测 start */
function startFps() {
  // 2026-10-04 性能修复：循环本身是常驻 rAF，只允许存在一条
  // （面板里重新打开帧率监测时会再调一次，靠这个标记避免叠加循环）
  if (window.__fpsRunning) return;
  window.__fpsRunning = true;
  var rAF = function () {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      }
    );
  }();
  var frame = 0;
  // var allFrameCount = 0;
  var lastTime = Date.now();
  var lastFameTime = Date.now();
  var loop = function () {
    var now = Date.now();
    var fs = (now - lastFameTime);
    var fps = Math.round(1000 / fs);

    lastFameTime = now;
    // 不置 0，在动画的开头及结尾记录此值的差值算出 FPS
    // allFrameCount++;
    frame++;

    // 采样窗口 500ms：刷新频率由 1s 一次提升到 0.5s 一次
    if (now > 500 + lastTime) {
      var fps = Math.round((frame * 1000) / (now - lastTime));
      if (fps <= 5) {
        var kd = `<span style="color:#bd0000">卡成ppt</span>`
      } else if (fps <= 15) {
        var kd = `<span style="color:red">电竞级帧率</span>`
      } else if (fps <= 25) {
        var kd = `<span style="color:orange">有点难受</span>`
      } else if (fps < 35) {
        var kd = `<span style="color:#9338e6">不太流畅</span>`
      } else if (fps <= 45) {
        var kd = `<span style="color:#08b7e4">还不错哦</span>`
      } else {
        var kd = `<span style="color:#39c5bb">十分流畅</span>`
      }
      document.getElementById("fps").innerHTML = `FPS:${fps} ${kd}`;
      frame = 0;
      lastTime = now;
    };

    rAF(loop);
  }

  loop();
}
/* fps检测 end */
