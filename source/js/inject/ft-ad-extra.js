/* ============================================================================
 * source/js/inject/ft-ad-extra.js —— 页脚友链补「广告位招租」
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.bottom 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1786-1800，原来是内联的 <script id="ft-ad-extra">。
 *   配置里仍是同步 <script src>（没有加 defer/async），执行时机与原来的内联写法完全一样。
 * ----------------------------------------------------------------------------
 * 
 * 页脚「推荐友链⌛」补一个「广告位招租」（2026-10-03）
 * 该列表硬编码在 themes/fomalhaut/layout/includes/footer.pug:33-58，配置里没有加项的入口；
 * 这里把已有的「广告位招租」项复制一份补到末尾，隐藏掉本站自己后仍是 4 + 4 两排。
 * ========================================================================== */

(function () {
  function addAd() {
    var group = document.querySelector(".ft-img-group");
    if (!group || group.getAttribute("data-ad-extra") === "1") return;
    var ads = group.querySelectorAll('.img-group-item > a[title="广告位招租"]');
    if (!ads.length) return;
    group.appendChild(ads[ads.length - 1].parentNode.cloneNode(true));
    group.setAttribute("data-ad-extra", "1");
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", addAd); } else { addAd(); }
  window.addEventListener("load", addAd);
  document.addEventListener("pjax:complete", addAd);
})();
