/* ==========================================================================
   关于页 · 线路实时延迟徽标  source/js/inject/about-route-probe.js
   --------------------------------------------------------------------------
   作用：在 /personal/about/ 的线路卡（.ab2 [data-route-url]）右下角挂一枚
         「实时延迟」徽标，显示「本机 → 该线路」一次网络往返耗时（ms）。
         点徽标可单独重测，点「重测全部」按钮可整组重测；页面静置时会静默复测。
   探测：fetch(mode:"no-cors", cache:"no-store") + AbortController 超时，
         优先取 Resource Timing 的 responseStart-startTime（跨域无 TAO 时该值为 0，
         自动退回 wall clock）。串行 + 错开，全部在 window.load 之后空转时才开跑，
         不进首屏关键路径；失败重试 1 次（1.5s 间隔）。
   生效范围：找不到 .ab2 线路卡时整段直接 return —— 别的页面零开销、零报错。
   可调参数：页面里在引入本文件之前写 window.__FOMAL_AB2_PROBE__ = {...} 覆盖。
   回滚：删掉 _config.fomalhaut.yml → inject.bottom 里那一行
         <script defer src="/js/inject/about-route-probe.js?v=20261004"></script>
         再删掉本文件即可（无需清 public/，但要重新 hexo g）。
   ========================================================================== */
(function () {
  "use strict";

  var DEFAULTS = {
    rootSel: ".ab2",              // 页面作用域
    cardSel: "[data-route-url]",  // 线路卡
    slotSel: ".ab2-probe",        // 徽标槽位
    allBtnSel: "[data-probe-all]",
    initialDelay: 1400,           // window.load 之后再等这么久
    stagger: 320,                 // 每条之间错开
    retryDelay: 1500,
    attempts: 2,
    timeout: 8000,
    refreshMs: 300000,            // 5 分钟静默复测一轮
    okMs: 400,                    // ≤ 该值显示为主题色
    slowMs: 1200                  // ≤ 该值显示为橙色，否则红色
  };

  var CFG = {};
  for (var dk in DEFAULTS) { if (Object.prototype.hasOwnProperty.call(DEFAULTS, dk)) CFG[dk] = DEFAULTS[dk]; }
  var userCfg = window.__FOMAL_AB2_PROBE__;
  if (userCfg && typeof userCfg === "object") {
    for (var uk in userCfg) { if (userCfg[uk] !== undefined && userCfg[uk] !== null) CFG[uk] = userCfg[uk]; }
  }

  var running = false;
  var loopTimer = null;

  function nowMs() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function idle(fn, delay) {
    var go = function () { setTimeout(fn, delay || 0); };
    if (window.requestIdleCallback) { requestIdleCallback(go, { timeout: 2500 }); } else { go(); }
  }

  function collect() {
    var nodes = document.querySelectorAll(CFG.rootSel + " " + CFG.cardSel);
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].getAttribute("data-route-url") || nodes[i].getAttribute("href");
      if (url) { out.push({ el: nodes[i], url: url }); }
    }
    return out;
  }

  function paint(slot, cls, text) {
    slot.className = "ab2-probe" + (cls ? " " + cls : "");
    slot.textContent = text;
  }

  function rtDuration(url) {
    if (!window.performance || !performance.getEntriesByName) { return 0; }
    var list = performance.getEntriesByName(url);
    if (!list || !list.length) { return 0; }
    var e = list[list.length - 1];
    var d = (e.responseStart > 0 && e.responseStart > e.startTime) ? (e.responseStart - e.startTime) : 0;
    if (!d) { d = e.duration || 0; }
    return d > 0 ? d : 0;
  }

  function oneShot(url) {
    return new Promise(function (resolve) {
      var bust = url + (url.indexOf("?") > -1 ? "&" : "?") + "__ab2=" + Math.random().toString(36).slice(2);
      var ac = (typeof AbortController === "function") ? new AbortController() : null;
      var settled = false;
      var finish = function (v) { if (settled) { return; } settled = true; clearTimeout(timer); resolve(v); };
      var timer = setTimeout(function () {
        if (ac) { try { ac.abort(); } catch (e) {} }
        finish(0);
      }, CFG.timeout);
      var t0 = nowMs();
      try {
        fetch(bust, {
          mode: "no-cors",
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          signal: ac ? ac.signal : undefined
        }).then(function () {
          var wall = nowMs() - t0;
          var rt = rtDuration(bust);
          finish(Math.round(rt > 0 ? rt : wall));
        }).catch(function () { finish(0); });
      } catch (e) { finish(0); }
    });
  }

  function measure(url, attempt) {
    return oneShot(url).then(function (ms) {
      if (ms > 0) { return ms; }
      if (attempt + 1 >= CFG.attempts) { return 0; }
      return new Promise(function (r) { setTimeout(r, CFG.retryDelay); }).then(function () {
        return measure(url, attempt + 1);
      });
    });
  }

  function judge(slot, ms) {
    if (!ms) { paint(slot, "is-fail", "实时延迟 · 超时"); return; }
    var cls = ms <= CFG.okMs ? "is-ok" : (ms <= CFG.slowMs ? "is-slow" : "is-fail");
    paint(slot, cls, "实时延迟 " + ms + " ms");
  }

  function ensureSlot(card) {
    var slot = card.el.querySelector(CFG.slotSel);
    if (!slot) {
      slot = document.createElement("span");
      slot.className = "ab2-probe";
      slot.textContent = "实时延迟 · 待测";
      (card.el.querySelector(".ab2-line-foot") || card.el).appendChild(slot);
    }
    if (!slot.getAttribute("data-bound")) {
      slot.setAttribute("data-bound", "1");
      slot.setAttribute("title", "点我重测这条线路");
      slot.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (slot.getAttribute("data-busy") === "1") { return; }
        slot.setAttribute("data-busy", "1");
        paint(slot, "is-loading", "实时延迟 · 测试中…");
        measure(card.url, 0).then(function (ms) {
          slot.removeAttribute("data-busy");
          judge(slot, ms);
        });
      });
    }
    return slot;
  }

  function run() {
    if (running) { return; }
    var list = collect();
    if (!list.length) { return; }
    running = true;
    var btn = document.querySelector(CFG.allBtnSel);
    if (btn) { btn.disabled = true; }
    var i = 0;
    (function next() {
      if (i >= list.length) {
        running = false;
        if (btn) { btn.disabled = false; }
        return;
      }
      var card = list[i++];
      var slot = ensureSlot(card);
      paint(slot, "is-loading", "实时延迟 · 测试中…");
      measure(card.url, 0).then(function (ms) {
        judge(slot, ms);
        setTimeout(next, CFG.stagger);
      });
    })();
  }

  function boot() {
    var list = collect();
    if (!list.length) { return; }
    for (var i = 0; i < list.length; i++) { ensureSlot(list[i]); }

    var btn = document.querySelector(CFG.allBtnSel);
    if (btn && !btn.getAttribute("data-bound")) {
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () { run(); });
    }

    idle(function () { run(); }, CFG.initialDelay);
    if (loopTimer) { clearInterval(loopTimer); }
    loopTimer = setInterval(function () { if (!document.hidden) { run(); } }, CFG.refreshMs);
  }

  window.__fomalAboutProbe = { run: run, config: CFG };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  document.addEventListener("pjax:complete", boot);
})();
