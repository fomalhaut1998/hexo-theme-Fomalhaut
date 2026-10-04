/* ============================================================================
 * modules/shell.js —— 站点"外壳"行为（快捷键 / 夜间动画 / 标题恶搞 / 搜索框 / 手机滚动条）
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 禁用f12与按键防抖（204-266）—— 拦 F12/Ctrl+Shift+I 等开发者工具快捷键；同时给防抖工具函数
 *   · 夜间模式切换动画（1161-1233）—— 深浅色切换时的那层扩散/渐变过渡动画
 *   · 恶搞标题（1271-1305）—— 切走标签页时把标题改成花式文案，切回来恢复
 *   · 搜索框修复（1309-1322）—— 手机端 Algolia 搜索窗口最大高度自适应
 *   · 手机端自绘滚动条（2927-2978）—— 手机浏览器忽略 ::-webkit-scrollbar，这里自绘一条 #mscrollbar
 * ----------------------------------------------------------------------------
 * 不直接对应某个可见组件，属于"整个站点的行为策略"。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 7 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     34  TT
 *     36  debounce(fn, time)
 *     99  switchNightMode()
 *    178  OriginTitile
 *    179  PRANK_TITLES
 *    180  titleTime
 *    216  searchSize()
 * ========================================================================== */

/* ------------------------------ 禁用f12与按键防抖 ------------------------------ */
/* 原 fomal.js 204-266 行，原样搬运，未改逻辑 */
/* 禁用f12与按键防抖 start */
// 防抖全局计时器
let TT = null;    //time用来控制事件的触发
// 防抖函数:fn->逻辑 time->防抖时间
function debounce(fn, time) {
  if (TT !== null) clearTimeout(TT);
  TT = setTimeout(fn, time);
}

// 复制提醒
document.addEventListener("copy", function () {
  debounce(function () {
    fomalNotify({
          title: "哎嘿！复制成功🍬",
          message: "若要转载最好保留原文链接哦，给你一个大大的赞！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 5000
        })
  }, 300);
})

/* 禁用F12按键并提醒 */
// document.onkeydown = function () {
//     if (window.event && window.event.keyCode == 123) {
//         event.keyCode = 0;
//         event.returnValue = false;
//         new Vue({
//             data: function () {
//                 this.$notify({
//                     title: "喂喂，小伙子你在干嘛！",
//                     message: "你太坏了，这里可不允许查看源码哦！",
//                     position: 'top-left',
//                     offset: 50,
//                     showClose: false,
//                     type: "error"
//                 });
//                 return { visible: false }
//             }
//         })
//         return false;
//     }
// };

// f12提醒但不禁用
document.onkeydown = function (e) {
  if (123 == e.keyCode || (e.ctrlKey && e.shiftKey && (74 === e.keyCode || 73 === e.keyCode || 67 === e.keyCode)) || (e.ctrlKey && 85 === e.keyCode)) {
    debounce(function () {
      fomalNotify({
            title: "你已被发现😜",
            message: "小伙子，扒源记住要遵循GPL协议！",
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: "warning",
            duration: 5000
          })
    }, 300);
  }
};
/* 禁用f12与按键防抖 end */

/* ------------------------------ 夜间模式切换动画 ------------------------------ */
/* 原 fomal.js 1161-1233 行，原样搬运，未改逻辑 */
/* 夜间模式切换动画 start */
function switchNightMode() {
  // 先存取时间戳
  localStorage.setItem("lastTime", Date.now());

  document.querySelector('body').insertAdjacentHTML('beforeend', '<div class="Cuteen_DarkSky"><div class="Cuteen_DarkPlanet"><div id="sun"></div><div id="moon"></div></div></div>'),
    setTimeout(function () {
      document.querySelector('body').classList.contains('DarkMode') ? (document.querySelector('body').classList.remove('DarkMode'), localStorage.setItem('isDark', '0'), document.getElementById('modeicon').setAttribute('xlink:href', '#icon-moon')) : (document.querySelector('body').classList.add('DarkMode'), localStorage.setItem('isDark', '1'), document.getElementById('modeicon').setAttribute('xlink:href', '#icon-sun')),
        setTimeout(function () {
          document.getElementsByClassName('Cuteen_DarkSky')[0].style.transition = 'opacity 3s';
          document.getElementsByClassName('Cuteen_DarkSky')[0].style.opacity = '0';
          setTimeout(function () {
            document.getElementsByClassName('Cuteen_DarkSky')[0].remove();
          }, 1e3);
        }, 2e3)
    })
  const nowMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  if (nowMode === 'light') {
    // 先设置太阳月亮透明度
    document.getElementById("sun").style.opacity = "1";
    document.getElementById("moon").style.opacity = "0";
    setTimeout(function () {
      document.getElementById("sun").style.opacity = "0";
      document.getElementById("moon").style.opacity = "1";
    }, 1000);

    activateDarkMode()
    saveToLocal.set('theme', 'dark', 2)
    // GLOBAL_CONFIG.Snackbar !== undefined && btf.snackbarShow(GLOBAL_CONFIG.Snackbar.day_to_night)
    document.getElementById('modeicon').setAttribute('xlink:href', '#icon-sun')
    // 延时弹窗提醒
    setTimeout(() => {
      fomalNotify({
            title: "关灯啦🌙",
            message: "当前已成功切换至夜间模式！",
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: "success",
            duration: 5000
          })
    }, 2000)
  } else {
    // 先设置太阳月亮透明度
    document.getElementById("sun").style.opacity = "0";
    document.getElementById("moon").style.opacity = "1";
    setTimeout(function () {
      document.getElementById("sun").style.opacity = "1";
      document.getElementById("moon").style.opacity = "0";
    }, 1000);

    activateLightMode()
    saveToLocal.set('theme', 'light', 2)
    document.querySelector('body').classList.add('DarkMode'), document.getElementById('modeicon').setAttribute('xlink:href', '#icon-moon')
    setTimeout(() => {
      fomalNotify({
            title: "开灯啦🌞",
            message: "当前已成功切换至白天模式！",
            position: 'top-left',
            offset: 50,
            showClose: true,
            type: "success",
            duration: 5000
          })
    }, 2000)
  }
  // handle some cases
  typeof utterancesTheme === 'function' && utterancesTheme()
  typeof FB === 'object' && window.loadFBComment()
  window.DISQUS && document.getElementById('disqus_thread').children.length && setTimeout(() => window.disqusReset(), 200)
}

/* 夜间模式切换动画 end */

/* ------------------------------ 恶搞标题 ------------------------------ */
/* 原 fomal.js 1271-1305 行，原样搬运，未改逻辑 */
/* 恶搞标题 start */
//动态标题
// OriginTitile 不能只在加载时抓一次：本站是 pjax 换页，换页后 document.title 已经是新页面的标题，
// 这份「原始标题」不跟着更新的话，切走标签再切回来，两秒后会把标签改回【上一个页面】的标题（偶现）。
var OriginTitile = document.title;
var PRANK_TITLES = ['👀跑哪里去了~', '🐖抓到你啦～'];
var titleTime;
(function keepRealTitle() {
  function note() {
    var t = document.title;
    if (PRANK_TITLES.indexOf(t) < 0) OriginTitile = t; // 只记真标题，不记恶搞标题
  }
  var el = document.querySelector('title');
  if (el && window.MutationObserver) {
    new MutationObserver(note).observe(el, { childList: true, characterData: true, subtree: true });
  }
  // MutationObserver 万一没兜住（老浏览器、或 pjax 手写 title），换页后再补一道
  document.addEventListener('pjax:complete', function () { setTimeout(note, 0); });
})();
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    //离开当前页面时标签显示内容
    document.title = '👀跑哪里去了~';
    clearTimeout(titleTime);
  } else {
    //返回当前页面时标签显示内容
    document.title = '🐖抓到你啦～';
    //两秒后变回正常标题
    titleTime = setTimeout(function () {
      titleTime = null;
      document.title = OriginTitile;
    }, 2000);
  }
});
/* 恶搞标题 end */

/* ------------------------------ 搜索框修复 ------------------------------ */
/* 原 fomal.js 1309-1322 行，原样搬运，未改逻辑 */
/* 搜索框修复 start */
searchSize();
window.addEventListener('resize', searchSize)
// 搜索窗口自适应
function searchSize() {
  // 只需要适应手机端
  if (document.body.clientWidth > 768) return
  let div = document.querySelector('#algolia-hits')
  // 监听插入，如果有插入则根据可视高度动态设置最大高度
  div.addEventListener('DOMNodeInserted', () => {
    div.children[0].style.maxHeight = (document.documentElement.clientHeight - 210) + 'px'
  })
}
/* 搜索框修复 ennd */

/* ------------------------------ 手机端自绘滚动条 ------------------------------ */
/* 原 fomal.js 2927-2978 行，原样搬运，未改逻辑 */
/* 手机端自绘滚动条 start
   手机浏览器用的是系统 overlay 滚动条，会完全忽略 ::-webkit-scrollbar，
   电脑端那条主题色斜条纹在手机宽度下不会出现，所以这里画一条一样的：
   固定在右边缘、长度按可视比例、位置随滚动进度走；只要页面能滚就一直显示，
   与电脑端“滚动条不隐藏”的取舍保持一致（样式见 custom.css 的 #mscrollbar）。 */
(function () {
  var TRACK_ID = "mscrollbar", THUMB_ID = "mscrollbar-thumb";
  var MIN_THUMB = 30;
  var track = null, thumb = null;

  function ensure() {
    if (track && document.body && document.body.contains(track)) return true;
    if (!document.body) return false;
    track = document.getElementById(TRACK_ID);
    if (!track) {
      track = document.createElement("div");
      track.id = TRACK_ID;
      document.body.appendChild(track);
    }
    thumb = document.getElementById(THUMB_ID);
    if (!thumb) {
      thumb = document.createElement("div");
      thumb.id = THUMB_ID;
      track.appendChild(thumb);
    }
    return true;
  }

  function update() {
    if (!ensure()) return;
    var doc = document.documentElement;
    var vh = window.innerHeight || doc.clientHeight;
    var total = Math.max(document.body.scrollHeight, doc.scrollHeight, document.body.offsetHeight, doc.offsetHeight);
    if (window.innerWidth > 768 || total <= vh + 1) {
      track.classList.remove("mscrollbar-on");
      return;
    }
    var h = Math.max(MIN_THUMB, Math.round(vh * vh / total));
    var ratio = (window.pageYOffset || doc.scrollTop || 0) / (total - vh);
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    thumb.style.height = h + "px";
    thumb.style.transform = "translateY(" + Math.round(ratio * (vh - h)) + "px)";
    track.classList.add("mscrollbar-on");
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  document.addEventListener("DOMContentLoaded", update);
  document.addEventListener("pjax:complete", update);
})();
/* 手机端自绘滚动条 end */
