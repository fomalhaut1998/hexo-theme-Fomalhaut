---
title: 天文馆
date: 2026-10-02 15:00:00
comments: false
---

<iframe id="voyager-frame" src="/box/astronomy/voyager.html?v=20261003d" title="旅行者号现在飞到了哪里 · 交互式太阳系星图" style="width:100%;height:1760px;border:0;display:block;background:transparent"></iframe>

<script>
(function () {
  var ID = "voyager-frame";
  function apply(h) {
    var f = document.getElementById(ID);
    if (f && h) { f.style.height = Math.round(h) + "px"; }
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (d && d.type === "voyager-height" && d.h) { apply(d.h); }
  });
  function ping() {
    var f = document.getElementById(ID);
    if (!f) { return; }
    try { f.contentWindow.postMessage({ type: "voyager-ping" }, "*"); } catch (err) {}
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", ping); } else { ping(); }
  window.addEventListener("load", ping);
  setTimeout(ping, 1500);
})();
</script>
