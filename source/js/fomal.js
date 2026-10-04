/* ============================================================================
 * source/js/fomal.js —— 站点主引导（bootstrap）
 * ----------------------------------------------------------------------------
 * 【这个文件是干什么的】
 *   原来近 3000 行的 fomal.js，在 2026-10-03 的屎山重构里被拆成了下面这些文件。
 *   本文件只留三样东西：① 一份模块地图；② 全局小工具；③ 控制台策略。
 *   具体功能都在 modules/ 和 data/ 里，改功能请去对应文件，别往这里堆代码。
 *
 * 【模块地图】（都在 _config.fomalhaut.yml 的 inject.bottom 里按顺序加载）
 *   /js/data/voyager1.js        旅行者1号距离模型（JPL Horizons 离线拟合，纯计算）
 *   /js/data/holidays.js        法定休息日判断（2024~2026 内置 + 2027 起 CDN 拉取）
 *   /js/modules/console-art.js  控制台字符画
 *   /js/modules/shell.js        快捷键拦截 / 夜间模式动画 / 恶搞标题 / 搜索框修复 / 手机滚动条
 *   /js/modules/effects.js      雪花 / 星空 / 表情放大
 *   /js/modules/reading.js      阅读进度条 / FPS 计数
 *   /js/modules/nav.js          导航栏标题 / 首屏欢迎语 / 随便逛逛 / 分享按钮
 *   /js/modules/cursor.js       小猫咪 / 右键菜单 / 听话鼠标
 *   /js/modules/footer-time.js  页脚计时器（依赖上面两个 data/ 文件）
 *   /js/modules/settings.js     美化模块：右下角齿轮设置面板（最大的一块，约 1200 行）
 *   另有 /js/lunar.js、/js/festival.js、/js/notify.js、/js/stats.js 等更早就拆出去的同级文件。
 *
 * 【为什么模块里都不套 IIFE】
 *   主题 pug 模板里有大量内联 onclick="xxx()"，还有别的脚本直接调全局函数，
 *   所以拆出去的文件里所有函数/变量都必须留在全局作用域（顶层 var / function）。
 *   下面这些全局入口被模板或配置直接引用，重构时不能改名、不能删除：
 *     changeMouseMode / share / switchNightMode / toggleRightside / toggleWinbox
 *       —— themes/fomalhaut/layout/includes/rightside.pug
 *     scrollToTop / switchNightMode / toggleWinbox
 *       —— themes/fomalhaut/layout/includes/header/nav.pug
 *     randomPost / switchNightMode / toggleWinbox
 *       —— themes/fomalhaut/layout/includes/rightmenu.pug
 *     share        —— themes/fomalhaut/layout/includes/third-party/share/share-js.pug
 *     setColor     —— source/js/census.js 会调它
 *     randomPost   —— _config.fomalhaut.yml 里以字符串形式引用
 *   注意：btf.scrollToDest(...) 是主题自带 main.js 上的方法，不是本项目的全局函数。
 *
 * 【改这里之前】
 *   1. 想看调试日志：给地址加 ?debug=1（原理见下面的控制台策略）。
 *   2. 改完全量重建：删掉 db.json 和 public/ 再 hexo generate，光 hexo clean 不够。
 *   3. 回滚点：bak/2026-10-03-屎山重构/before/
 *   4. 自检：控制台执行 __fomal.check()，会列出上面那些全局入口有没有丢。
 * ========================================================================== */

/* ------------------------------ 全局小工具 ------------------------------ */

/* 线性插值。挂在 Math 上是历史遗留写法（原 fomal.js 1334 行），
   modules/cursor.js 的鼠标拖尾缓动会用到；要改成局部函数得连那边一起改。 */
Math.lerp = (a, b, n) => (1 - n) * a + n * b;

/* ------------------------------ 控制台策略 ------------------------------ */

/* 只静音 console.log，永远保留 console.error / console.warn。
   为什么不能连 error / warn 一起关：关掉之后站内任何 JS 异常（尤其是 pjax 换页失败）
   都会彻底静默，出问题时连一条线索都拿不到。想恢复 log 就给地址加 ?debug=1。
   （原实现把三个一起置空了，2026-10-03 重构改回，见 bak/ 里的旧版。）
   注：modules/console-art.js 里的字符画是先前 bind 好的 bound function，不受这里影响。 */
var FOMAL_DEBUG = /[?&]debug=1(&|$)/.test(location.search)
  || location.hostname === "localhost" || location.hostname === "127.0.0.1";
if (!FOMAL_DEBUG) {
  console.log = function () { };
}

/* --------------------------- 运行时自检 & 模块地图 --------------------------- */

/* 别的地方要判断"现在是不是调试模式"，读 FOMAL_DEBUG 或 __fomal.debug 就行。
   想确认拆分后有没有把模板要用的全局函数弄丢：控制台敲 __fomal.check()。 */
window.__fomal = {
  version: "2026-10-03 拆分版",
  debug: FOMAL_DEBUG,
  // 主题 pug 内联 onclick / 其它脚本 / 配置文件会直接调用的全局入口
  entries: ["changeMouseMode", "share", "switchNightMode", "toggleRightside", "toggleWinbox",
    "scrollToTop", "randomPost", "setColor"],
  // 拆分后各模块应该提供的代表性全局名，用来粗查"某个文件是不是没加载"
  modules: {
    "console-art.js": ["createtime2"],
    "shell.js": ["debounce"],
    "effects.js": ["owoBig"],
    "reading.js": ["startFps"],
    "nav.js": ["showWelcome", "randomPost", "share"],
    "cursor.js": ["popupMenu", "CURSOR"],
    "footer-time.js": ["createtime"],
    "settings.js": ["createWinbox", "winboxNeedSize"],
    "voyager1.js": ["vgDist"],
    "holidays.js": ["isRestDay"]
  },
  // 返回一个报告：missing 非空就说明有文件没加载或函数被改名了
  check: function () {
    var miss = [], e = this.entries, m = this.modules;
    for (var i = 0; i < e.length; i++) { if (typeof window[e[i]] === "undefined") miss.push("入口 " + e[i]); }
    for (var k in m) { for (var j = 0; j < m[k].length; j++) { if (typeof window[m[k][j]] === "undefined") miss.push(k + " → " + m[k][j]); } }
    return { version: this.version, ok: miss.length === 0, missing: miss };
  }
};

/* 启动时只在 ?debug=1 下自检一次，正常访问不打扰用户，也顺便验证模块加载顺序对不对。 */
window.addEventListener("load", function () {
  if (!FOMAL_DEBUG) return;
  var r = window.__fomal.check();
  if (r.ok) {
    console.log("%c[fomal] 站点脚本自检通过 " + r.version, "color:#4f90d9");
  } else {
    console.error("[fomal] 自检发现缺失（说明有文件没加载或被改名）：", r.missing);
  }
});
