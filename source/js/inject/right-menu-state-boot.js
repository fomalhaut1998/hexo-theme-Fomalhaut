/* ============================================================================
 * source/js/inject/right-menu-state-boot.js —— 侧栏「右键模式」按钮状态同步
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.head 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1453-1485，原来是内联的 <script id="rightMenuStateBoot">。
 *   配置里仍是同步 <script src>（没有加 defer），所以执行时机与内联时完全一样。
 * ----------------------------------------------------------------------------
 * ========================================================================== */

(function () {
  function isOn() { try { return localStorage.getItem("mouse") !== "off"; } catch (e) { return true; } }
  function btn() {
    var list = document.querySelectorAll("#rightside button");
    for (var i = 0; i < list.length; i++) {
      if (list[i].querySelector("i.fa-mouse") || (list[i].getAttribute("title") || "").indexOf("右键模式") === 0) return list[i];
    }
    return null;
  }
  function apply() {
    var on = isOn();
    document.documentElement.setAttribute("data-rm", on ? "on" : "off");
    var b = btn();
    if (b) b.setAttribute("title", on ? "右键模式：站点自定义右键已开启（点击恢复系统默认）" : "右键模式：站点自定义右键已关闭（当前为系统默认右键，点击开启）");
  }
  apply();
  document.addEventListener("click", function (e) {
    var b = btn();
    if (b && (e.target === b || b.contains(e.target))) setTimeout(apply, 0);
  }, true);
  function wrap() {
    var orig = window.changeMouseMode;
    if (typeof orig !== "function" || orig.__rmStateWrapped) return;
    var w = function () { var r = orig.apply(this, arguments); apply(); return r; };
    w.__rmStateWrapped = true;
    window.changeMouseMode = w;
  }
  document.addEventListener("pjax:complete", function () { apply(); wrap(); });
  function boot() { wrap(); apply(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
