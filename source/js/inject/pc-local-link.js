/* ============================================================================
 * source/js/inject/pc-local-link.js —— 版权卡「文章链接」显示当前域名
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.bottom 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1807-1825，原来是内联的 <script id="pcLocalLinkJs">。
 *   配置里仍是同步 <script src>（没有加 defer/async），执行时机与原来的内联写法完全一样。
 * ----------------------------------------------------------------------------
 * 
 * 文章版权卡片「文章链接」：把显示文字也换成本站完整网址（2026-10-03）
 * 静态产物里的 href 已被 scripts/post-copyright-local-link.js 改成站内相对路径（/posts/xxx.html）；
 * 这段只负责「好看」：在镜像线路 / 本地预览时，文字跟着当前访问域名走，
 * 不再永远显示写死的 https://example.com/... 。不需要就直接删掉这个注入项。
 * ========================================================================== */

(function () {
  function dec(s) { try { return decodeURI(s); } catch (e) { return s; } }
  function fix() {
    var links = document.querySelectorAll(".post-copyright__type a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var u;
      try { u = new URL(a.getAttribute("href") || "", location.href); } catch (e) { continue; }
      var p = u.pathname + u.search + u.hash;
      if (u.origin !== location.origin) a.setAttribute("href", p);
      var full = dec(location.origin + p);
      if (a.textContent.trim() !== full) a.textContent = full;
    }
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", fix); } else { fix(); }
  document.addEventListener("pjax:complete", fix);
})();
