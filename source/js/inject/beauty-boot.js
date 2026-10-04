/* ============================================================================
 * source/js/inject/beauty-boot.js —— 美化模块首屏预置脚本
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.head 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1383-1434，原来是内联的 <script id="beautyBoot">。
 *   配置里仍是同步 <script src>（没有加 defer），所以执行时机与内联时完全一样。
 * ----------------------------------------------------------------------------
 * 首屏预置脚本：内联在 head 里同步执行（早于 body 解析、早于首帧），把 localStorage 里的美化设置
 * 提前写进上面这些 style 标签，消除「刷新时先闪默认壁纸 / 默认字体，再跳成自定义」的一帧闪烁。
 * 取值与 source/js/fomal.js 的初始化逐字一致（键缺失时用 fomal.js 的应用默认值）。
 * ========================================================================== */

(function () {
  var d = document.documentElement;
  function ls(k) {
    try {
      var s = (typeof localStorage !== "undefined" && localStorage) ? localStorage : ((typeof window !== "undefined" && window.localStorage) ? window.localStorage : null);
      return s ? s.getItem(k) : null;
    } catch (e) { return null; }
  }
  function def(v, dv) { return (v == null || v === "" || v === "undefined" || v === "null") ? dv : v; }
  function tag(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  var SAME = ";--darkmode-bg:";
  // 1) 自定义壁纸
  var bg = def(ls("blogbg"), "default").replace(/^\s+|\s+$/g, "");
  if (bg !== "default" && /^(#|url\(|linear-gradient|radial-gradient|https?:)/.test(bg)) {
    tag("defineBg", ":root{--default-bg:" + bg + SAME + bg + ";--mobileday-bg:" + bg + ";--mobilenight-bg:" + bg + ";}");
  }
  // 2) 卡片透明度
  tag("transPercent", ":root{--trans-light: rgba(250, 250, 250, " + def(ls("transNum"), "98") + "%) !important; --trans-dark: rgba(28, 28, 28, " + def(ls("transNum"), "98") + "%) !important} ");
  // 3) 背景滤镜
  if (def(ls("bgFilterOn"), "1") === "0") { tag("bgFilterParam", ":root{--bg-filter:none;}"); }
  else { var bfv = ls("bgFilterVal"); if (bfv) { tag("bgFilterParam", ":root{--bg-filter:" + bfv + ";}"); } }
  // 4) 主题色
  var cmap = { red: "rgb(239, 90, 90)", orange: "rgb(228, 149, 66)", yellow: "rgb(194, 205, 90)", purple: "rgb(205, 90, 195)", purepurple: "rgb(147, 90, 205)", blue: "rgb(102, 204, 255)", puregreen: "rgb(90, 205, 130)", green: "rgb(57, 197, 187)", pink: "rgb(237, 112, 155)", black: "rgb(45, 45, 45)", darkblue: "rgb(97, 100, 159)", heoblue: "rgb(66, 90, 239)", gray: "rgb(150, 150, 150)" };
  var tc = def(ls("themeColor"), "green");
  if (cmap[tc]) { tag("themeColor", ":root{--theme-color:" + cmap[tc] + " !important}"); }
  // 5) 字体
  var ft = def(ls("font"), "LXGW");
  if (ft === "default") {
    // 系统默认字体栈：与 source/js/fomal.js 的 setFont 逐字一致。原来只写 -apple-system，
    // 这个关键字在 Windows 上不存在，会让只声明 var(--global-font) 的标题掉到浏览器默认字体。
    var sysStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft JhengHei', 'Microsoft YaHei', sans-serif";
    d.style.setProperty("--global-font", sysStack);
    var st = document.createElement("style");
    st.textContent = "body{font-family:" + sysStack + "}";
    (document.head || document.getElementsByTagName("head")[0]).appendChild(st);
  } else { d.style.setProperty("--global-font", ft); }
  // 6) 侧边部件 / 侧栏显隐 / 侧栏位置 / 顶栏常驻 / 霓虹灯 / 帧率
  if (def(ls("rs"), "block") === "none") { tag("rightSide", ":root{--rightside-display: none}"); }
  else { tag("rightSide", ":root{--rightside-display: block}"); }
  if (def(ls("aside"), "1") === "0") { tag("aside-show", ":root{--layout-justify-content: center; --aside-content-display: none;}"); }
  else { tag("aside-show", ":root{--layout-justify-content: unset; --aside-content-display: block;}"); }
  if (def(ls("asidePos"), "1") === "0") { tag("aside-pos", ":root{--first-child-order: 2; --recent-post-item-margin: 0px 0px 20px 1%;}"); }
  else { tag("aside-pos", ":root{--first-child-order: 0; --recent-post-item-margin: 0px 1% 20px 0px;}"); }
  if (def(ls("nav"), "1") === "0") { tag("nav-display", ":root{--nav-visible-display:inline-flex;--nav-fixed-display:none;}"); }
  else { tag("nav-display", ":root{--nav-visible-display:none;--nav-fixed-display:inline-flex;}"); }
  if (def(ls("light"), "true") === "false") { tag("menu_shadow", ":root{--menu-shadow: none;}"); }
  else { tag("menu_shadow", ":root{--menu-shadow: 0 0 1px var(--theme-color);}"); }
  var fp = document.getElementById("fps");
  if (fp) fp.style.display = (def(ls("fpson"), "1") == 1) ? "block" : "none";
})();
