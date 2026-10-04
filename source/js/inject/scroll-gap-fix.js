/* ============================================================================
 * source/js/inject/scroll-gap-fix.js —— 锚点跳转补偿（常驻顶栏 70px）
 * ----------------------------------------------------------------------------
 * 本文件由 _config.fomalhaut.yml 的 inject.bottom 段抽出（2026-10-03 屎山重构）：
 *   原位置 _config.fomalhaut.yml:1590-1712，原来是内联的 <script id="scroll-gap-fix">。
 *   配置里仍是同步 <script src>（没有加 defer/async），执行时机与原来的内联写法完全一样。
 * ----------------------------------------------------------------------------
 * 修复：点目录跳转后标题被常驻顶栏遮住（主题 utils.js:123 只在向上跳时减 70px）。
 * v3 做法：① 在 document 捕获阶段接管所有「href 以 # 开头且目标存在」的点击（pjax 换页后依然有效），
 * 滚到「元素顶端 - 70px」，等滚动停下再实测位置，因懒加载图片/布局变动偏离就再校正（最多 3 次）；
 * ② 兜住 btf.scrollToDest，让回顶/直达底部等直调点也预留同样高度（经边界收敛后行为不变）；
 * ③ 解析锚点用 getElementById → getElementsByName → 百分号编码归一化比对，编码不一致也能命中。
 * 另有 CSS 兜底（inject.head 的 scroll-gap-css）：JS 不跑时原生跳转也留 70px。
 * ========================================================================== */

(function () {
  var VER = "v3";
  var GAP = 70; // 顶栏常驻高度约 58~60px，与主题向上跳预留的 70px 一致
  var MAX_TRY = 3;
  // 自查入口：控制台输入 __scrollGapFix 可见 {v, gap, hits, patched}，点一次目录 hits 就 +1
  window.__scrollGapFix = { v: VER, gap: GAP, hits: 0, patched: false };

  function maxScroll() {
    var doc = document.documentElement;
    return Math.max(0, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
  }
  function goto(top) {
    top = Math.min(Math.max(top, 0), maxScroll());
    if ("scrollBehavior" in document.documentElement.style) {
      window.scrollTo({ top: top, behavior: "smooth" });
    } else {
      var cur = window.pageYOffset, start = null, total = 300;
      window.requestAnimationFrame(function step(t) {
        start = !start ? t : start;
        var p = t - start;
        window.scrollTo(0, cur + (top - cur) * Math.min(p / total, 1));
        if (p < total) window.requestAnimationFrame(step); else window.scrollTo(0, top);
      });
    }
  }
  function targetTop(el) { return el.getBoundingClientRect().top + window.pageYOffset - GAP; }

  var userMoved = false;
  function armUserAbort() {
    userMoved = false;
    ["wheel", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, function () { userMoved = true; }, { once: true, passive: true });
    });
  }
  function settle(cb) {
    var last = window.pageYOffset, still = 0, t0 = Date.now();
    var iv = setInterval(function () {
      if (userMoved) { clearInterval(iv); return; }
      var y = window.pageYOffset;
      if (Math.abs(y - last) < 1) still++; else still = 0;
      last = y;
      if (still >= 2 || Date.now() - t0 > 2500) { clearInterval(iv); cb(); }
    }, 120);
  }
  // 滚到位后实测标题位置，偏离就再滚一次（懒加载图片、布局变动都能兜住）
  function alignTo(el, tries) {
    goto(targetTop(el));
    settle(function () {
      if (userMoved) return;
      var diff = Math.round(el.getBoundingClientRect().top) - GAP;
      if (tries > 1 && Math.abs(diff) > 2) alignTo(el, tries - 1);
    });
  }
  // 宽容解析目标锚点：id → name → 对 [id]/[name] 做百分号编码归一化比对
  function byId(id) {
    if (!id) return null;
    var el = document.getElementById(id);
    if (el) return el;
    var byName = document.getElementsByName(id);
    if (byName && byName.length) return byName[0];
    var enc = null;
    try { enc = encodeURIComponent(id); } catch (e1) { return null; }
    var all = document.querySelectorAll("[id],[name]");
    for (var i = 0; i < all.length; i++) {
      var v = all[i].getAttribute("id") || all[i].getAttribute("name");
      if (!v) continue;
      var e2 = null, d2 = null;
      try { e2 = encodeURIComponent(v); } catch (e3) {}
      try { d2 = decodeURIComponent(v); } catch (e4) {}
      if (v === id || e2 === enc || d2 === id) return all[i];
    }
    return null;
  }
  function candidates(a) {
    var raw = a.getAttribute("href") || "";
    if (raw.charAt(0) !== "#" || raw.length < 2) return [];
    var s = raw.slice(1), out = [s];
    try { out.push(decodeURIComponent(s)); } catch (e1) {}
    try { out.push(decodeURI(s)); } catch (e2) {}
    return out;
  }
  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    var a = t && t.closest ? t.closest('a[href^="#"]') : null;
    if (!a) return;
    var list = candidates(a), el = null;
    for (var i = 0; i < list.length && !el; i++) el = byId(list[i]);
    if (!el) return; // 解析不到就交给浏览器原生跳转，由 head 里的 scroll-padding-top 兜底
    e.preventDefault();
    e.stopPropagation(); // 压住主题绑在 .toc-content 上的老监听（它只在向上跳时减 70px）
    patchBtf();          // pjax 换页后 btf 若被重建，这里即时补一次
    armUserAbort();
    try { window.__scrollGapFix.hits++; } catch (e5) {}
    alignTo(el, MAX_TRY);
    if (window.innerWidth < 900 && window.mobileToc && window.mobileToc.close) window.mobileToc.close();
  }
  function patchBtf() {
    if (typeof btf === "undefined" || !btf || typeof btf.scrollToDest !== "function" || btf.__scrollGapFix) return;
    var orig = btf.scrollToDest;
    btf.scrollToDest = function (pos, time) {
      var top = Number(pos);
      if (!isFinite(top)) return orig.apply(this, arguments);
      goto(top - GAP);
    };
    btf.__scrollGapFix = true;
  }
  function init() {
    patchBtf();
    try { window.__scrollGapFix.patched = (typeof btf !== "undefined" && !!btf && btf.__scrollGapFix === true); } catch (e6) {}
  }
  // 捕获阶段 + document 级：pjax 换掉 #card-toc 后依然有效，无需反复重新绑定
  document.addEventListener("click", onClick, true);
  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  document.addEventListener("pjax:complete", init);
  document.addEventListener("pjax:success", init);
  console.log("%c[scroll-gap-fix] " + VER + " 已生效：目录跳转预留 " + GAP + "px（顶栏高度），自查可用 __scrollGapFix", "color:#00dab9;font-weight:bold");
})();
