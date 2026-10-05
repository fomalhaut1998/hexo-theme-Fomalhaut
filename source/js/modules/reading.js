/* ============================================================================
 * modules/reading.js —— 阅读进度 + FPS 检测
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 阅读进度（1-33）—— 右下角 FPS 上方那条细进度条：随滚动条增长，回到顶部时淡出
 *   · fps检测（1698-1749）—— 右下角 FPS 计数器，用 requestAnimationFrame 统计回调采样频率（非实际显示帧率），写着玩的性能小玩具
 * ----------------------------------------------------------------------------
 * 页面读到哪里、浏览器跑多少帧，都在这。两个模块互不依赖，只是都属于"页面状态指示"。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】按函数名搜索（行号随编辑漂移）
 *   percent() / percentUpdate()：阅读百分比
 *   startFps() / stopFps()：启动 / 停止 rAF 采样
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
/* rAF 回调采样玩具，不是屏幕实际呈现帧率或 GPU 性能基准。 */
/* fps检测 start */
var __fpsMonitor = (function () {
  var enabled = false;
  var pending = null;
  var generation = 0;
  var frame = 0;
  var lastTime = null;
  var lastOutput = '';
  var lastNode = null;
  // 请求与取消成对选择；旧浏览器的 timer 分支也能真正停止。
  var nativeRequest = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
  var nativeCancel = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame;
  var useRaf = !!(nativeRequest && nativeCancel);
  function request(callback) {
    return useRaf ? nativeRequest.call(window, callback) : window.setTimeout(function () {
      callback(window.performance && window.performance.now ? window.performance.now() : Date.now());
    }, 1000 / 60);
  }
  function cancel(id) {
    if (useRaf) nativeCancel.call(window, id);
    else window.clearTimeout(id);
  }
  function write(output) {
    var node = document.getElementById('fps');
    if (!node) { lastNode = null; return; }
    if (node !== lastNode || output !== lastOutput) {
      node.innerHTML = output;
      node.title = 'requestAnimationFrame 回调采样，不是屏幕实际显示帧率';
      lastNode = node;
      lastOutput = output;
    }
  }
  function reset() { frame = 0; lastTime = null; }
  function suspend() {
    generation++;
    if (pending !== null) cancel(pending);
    pending = null;
    window.__fpsRunning = false;
    reset();
  }
  function schedule() {
    if (!enabled || document.hidden || pending !== null) return;
    var token = generation;
    window.__fpsRunning = true;
    pending = request(function (now) {
      // 已取消的回调即使被浏览器交付，也不能清掉新循环的句柄或重新排队。
      if (token !== generation) return;
      pending = null;
      if (!enabled || document.hidden) { suspend(); return; }
      if (lastTime === null) lastTime = now;
      else {
        frame++;
        if (now - lastTime > 1000) {
          var fps = Math.round(frame * 1000 / (now - lastTime));
          var kd;
          if (fps <= 5) kd = '<span style="color:#bd0000">卡成ppt</span>';
          else if (fps <= 15) kd = '<span style="color:red">电竞级帧率</span>';
          else if (fps <= 25) kd = '<span style="color:orange">有点难受</span>';
          else if (fps < 35) kd = '<span style="color:#9338e6">不太流畅</span>';
          else if (fps <= 45) kd = '<span style="color:#08b7e4">还不错哦</span>';
          else kd = '<span style="color:#39c5bb">十分流畅</span>';
          write('FPS:' + fps + ' ' + kd);
          frame = 0;
          lastTime = now;
        }
      }
      schedule();
    });
  }
  document.addEventListener('visibilitychange', function () {
    suspend();
    if (enabled && !document.hidden) {
      write('FPS:采样中');
      schedule();
    }
  });
  return {
    start: function () {
      if (enabled) return;
      enabled = true;
      reset();
      write('FPS:采样中');
      schedule();
    },
    stop: function () {
      enabled = false;
      suspend();
    }
  };
})();
function startFps() { __fpsMonitor.start(); }
function stopFps() { __fpsMonitor.stop(); }
/* fps检测 end */
