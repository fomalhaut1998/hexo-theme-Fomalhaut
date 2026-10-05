---
title: 朋友圈
date: 2022-09-05 18:00:00
comments: false
---

<!-- ============================================================
     朋友圈页面改版（方案 A · 网格卡）
     2026-10-03
     - 只改本页面：全部落在下面这段内联 style / script 里，未改 themes/ 任何主题源码
     - 【2026-10-04 修复·别改回去】本注释内禁止出现带尖括号的 style / script 标签名：
       gulp-htmlclean 会把注释里的标签名当成真的开始标签，与页面里真实的 style / script
       区块互相嵌套「保护」，还原失败后整页正文被整段丢弃 → 线上（跑过 gulp）只剩空白卡片，
       本地不跑 gulp 所以看不出问题。同类提醒见 viking 记忆「博客构建注意」。
     - 配色一律由 var(--theme-color) 派生（color-mix），站点换主题色会自动跟随，不覆盖 --heo-*
     - 圆形头像的「灰色残缺弧」用 clip-path 裁圆压掉；圆角、边框、阴影、hover 全部对齐主题卡片观感
     - 底部一小段 JS 负责：注入「来源域名 + favicon」角标、填充顶部统计数字（引擎不输出域名，纯 CSS 拿不到）
     - 回滚点：bak/2026-10-03-朋友圈改版/before/source__social__fcircle__index.md
     ============================================================ -->

<style>
  /* ---------- 1. 变量：跟随站点主题色，另给一层兜底值 ---------- */
  /* 变量挂在 :root 上：顶部仪表盘是 #cf-container 的兄弟节点，写死在容器里仪表盘就取不到值 */
  :root,
  #cf-container {
    --cf-accent: var(--theme-color, #39c5bb);
    --cf-06: color-mix(in srgb, var(--cf-accent) 6%, transparent);
    --cf-12: color-mix(in srgb, var(--cf-accent) 12%, transparent);
    --cf-22: color-mix(in srgb, var(--cf-accent) 22%, transparent);
    --cf-42: color-mix(in srgb, var(--cf-accent) 42%, transparent);
    --cf-soft: color-mix(in srgb, var(--cf-accent) 9%, transparent);
  }
  #cf-container { background: transparent !important; }

  /* ---------- 2. 顶部统计仪表盘 ---------- */
  .cf-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 22px;
    width: 100%;
    padding: 20px 24px;
    margin-bottom: 18px;
    border-radius: 18px;
    border: 1px solid var(--heo-card-border, #e3e8f7);
    background: linear-gradient(120deg, var(--cf-soft), transparent 62%);
    background-color: var(--heo-card-bg, #fff);
    box-shadow: var(--heo-shadow-border, 0 8px 16px -4px #2c2d300c);
    animation: cfMetaIn .45s ease both;
  }
  @keyframes cfMetaIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  .cf-meta-main { display: flex; align-items: center; gap: 13px; }
  .cf-meta-badge {
    width: 46px; height: 46px;
    border-radius: 14px;
    display: grid; place-items: center;
    font-size: 21px; line-height: 1;
    color: #fff;
    background: var(--cf-accent);
    box-shadow: 0 6px 16px -4px var(--cf-42);
  }
  .cf-meta-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--heo-fontcolor, #363636);
  }
  .cf-meta-sub {
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--heo-secondtext, rgba(60, 60, 67, .6));
  }
  .cf-meta-sub b { color: var(--cf-accent); font-weight: 700; }
  .cf-kpis { display: flex; align-items: center; gap: 10px; margin-left: auto; }
  .cf-kpi {
    min-width: 84px;
    padding: 8px 15px;
    border-radius: 13px;
    text-align: center;
    border: 1px solid var(--cf-12);
    background: var(--cf-06);
  }
  .cf-kpi-n {
    font-size: 21px;
    font-weight: 800;
    line-height: 1.15;
    color: var(--cf-accent);
    font-variant-numeric: tabular-nums;
  }
  .cf-kpi-l { margin-top: 2px; font-size: 11px; color: var(--heo-secondtext, rgba(60, 60, 67, .6)); }
  .cf-meta-time {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--heo-secondtext, rgba(60, 60, 67, .6));
  }
  .cf-meta-time::before {
    content: "";
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--cf-accent);
    opacity: .5;
    flex: none;
  }

  /* ---------- 3. 卡片：圆角 / 边框 / 阴影 / 上浮，全部对齐主题观感 ---------- */
  .cf-article-item { display: flex !important; }
  .cf-article {
    flex: 1 1 auto !important;
    width: 100% !important;
    min-height: 148px !important;
    height: auto !important;
    margin: 9px !important;
    padding: 16px 16px 14px !important;
    border-radius: 16px !important;
    border: 1px solid var(--heo-card-border, #e3e8f7) !important;
    background: var(--heo-card-bg, #fff) !important;
    box-shadow: var(--heo-shadow-border, 0 8px 16px -4px #2c2d300c) !important;
    transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease !important;
    overflow: hidden !important;
  }
  .cf-article:hover {
    transform: translateY(-3px) !important;
    border-color: var(--cf-42) !important;
    box-shadow: 0 10px 22px -8px var(--cf-42) !important;
  }
  /* 顶部主题色细条，仅 hover 出现 */
  .cf-article::after {
    content: "" !important;
    position: absolute !important;
    top: 0 !important; left: 0 !important; right: 0 !important;
    height: 3px !important;
    border-radius: 16px 16px 0 0 !important;
    background: linear-gradient(90deg, var(--cf-accent), var(--cf-22)) !important;
    opacity: 0 !important;
    transition: opacity .28s ease !important;
    pointer-events: none !important;
  }
  .cf-article:hover::after { opacity: 1 !important; }
  /* 楼层序号：从 3rem 大字改成小胶囊 */
  .cf-article-floor {
    top: 13px !important;
    right: 13px !important;
    font-size: 11px !important;
    line-height: 1.5 !important;
    font-weight: 700 !important;
    padding: 2px 8px !important;
    border-radius: 8px !important;
    background: var(--cf-soft) !important;
    color: var(--cf-accent) !important;
    opacity: .85 !important;
  }
  .cf-article:hover .cf-article-floor { opacity: 1 !important; }
  /* 标题：40px 行高 → 15px/1.6，给两行 */
  #cf-container .cf-article-title {
    font-size: 15px !important;
    line-height: 1.6 !important;
    font-weight: 600 !important;
    letter-spacing: .4px !important;
    margin: 0 0 10px !important;
    -webkit-line-clamp: 2 !important;
    /* 标题用正文色（白天近黑 / 夜晚自动转浅），不用站点链接紫 */
    color: var(--heo-fontcolor, #363636) !important;
    transition: color .28s ease !important;
  }
  /* 悬停：主题的 #article-container a:not(...):hover 特异性 (1,2,1)，会把标题刷成
     白字 + 主题色底 → 白天完全看不清。下面选择器带 #cf-container 且三个 class，
     特异性 (1,3,*) 稳压它，并把主题那条的背景/内边距/阴影一起清掉 */
  #cf-container .cf-article:hover .cf-article-title,
  #cf-container .cf-article a.cf-article-title:hover {
    color: var(--cf-accent) !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }
  /* 底部元信息两行：第一行 头像 + 作者 + 日期（右），第二行 来源域名 + favicon
     —— 卡片在 4 列网格里内容宽只有 ~200px，一行塞不下四样，索性分行 */
  .cf-article-avatar {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 6px 7px !important;
    margin-top: auto !important;
    padding-top: 10px !important;
    border-top: 1px dashed var(--heo-card-border, #e3e8f7) !important;
  }
  /* 头像从「绝对定位 + opacity .1 的装饰水印」改回行内元素 */
  .cf-img-avatar {
    order: 1 !important;
    position: static !important;
    flex: none !important;
    align-self: center !important;
    width: 26px !important;
    height: 26px !important;
    margin: 0 !important;
    opacity: 1 !important;
    border-radius: 50% !important;
    object-fit: cover !important;
    clip-path: none !important;
    mix-blend-mode: normal !important;
    background: var(--heo-secondbg, #f1f3f8) !important;
    pointer-events: none !important;
  }
  .cf-article-author {
    order: 2 !important;
    flex: 0 1 auto !important;
    min-width: 0 !important;
    max-width: 45% !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    padding: 4px 9px !important;
    border-radius: 8px !important;
    line-height: 1.4 !important;
    background-color: var(--cf-soft) !important;
    color: var(--cf-accent) !important;
  }
  .cf-article-author:hover {
    background: var(--cf-accent) !important;
    color: #fff !important;
  }
  /* 日期：去掉引擎的日历图标（占宽），换成主题色圆点 */
  .cf-article-time {
    order: 3 !important;
    flex: none !important;
    margin-left: auto !important;
    font-size: 11px !important;
    color: var(--heo-secondtext, rgba(60, 60, 67, .6)) !important;
    font-variant-numeric: tabular-nums !important;
    white-space: nowrap !important;
  }
  .cf-article-time i { display: none !important; }
  .cf-article-time::before {
    content: "" !important;
    display: inline-block !important;
    width: 5px !important;
    height: 5px !important;
    margin-right: 5px !important;
    border-radius: 50% !important;
    background: var(--cf-accent) !important;
    vertical-align: 1px !important;
  }

  /* ---------- 4. 来源域名 + favicon 角标 ---------- */
  .cf-badge {
    order: 4 !important;
    flex: 1 1 100% !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
    min-width: 0 !important;
    max-width: 100% !important;
    font-size: 10.5px !important;
    line-height: 1.4 !important;
    font-weight: 600 !important;
    color: var(--cf-accent) !important;
    opacity: .85 !important;
    white-space: nowrap !important;
  }
  .cf-badge img {
    width: 12px; height: 12px;
    border-radius: 3px;
    flex: none;
    margin: 0 !important;
  }
  .cf-badge span { overflow: hidden; text-overflow: ellipsis; }
  .cf-article-avatar .cf-badge { margin-right: 0 !important; }

  /* ---------- 5. 底部：加载更多 / 排序 / 页脚 ---------- */
  #cf-change {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
    padding: 16px 0 6px !important;
    font-size: 12px !important;
    color: var(--heo-secondtext, rgba(60, 60, 67, .6)) !important;
  }
  #cf-change .cf-sort-on {
    padding: 4px 13px !important;
    margin-left: 8px !important;
    border-radius: 9px !important;
    font-weight: 700 !important;
    color: var(--cf-accent) !important;
    background: var(--cf-12) !important;
  }
  #cf-more {
    margin-top: 14px !important;
    height: 38px !important;
    border-radius: 12px !important;
    border: 1px solid var(--heo-card-border, #e3e8f7) !important;
    box-shadow: var(--heo-shadow-border, 0 8px 16px -4px #2c2d300c) !important;
    letter-spacing: 1px !important;
  }
  #cf-more:hover {
    background: var(--cf-accent) !important;
    border-color: transparent !important;
    color: #fff !important;
  }
  #cf-state {
    display: none !important;
  }
  #cf-footer {
    margin-top: 16px !important;
    font-size: 12px !important;
    color: var(--heo-secondtext, rgba(60, 60, 67, .6)) !important;
  }
  #cf-footer a { color: var(--cf-accent) !important; }
  /* 文章弹窗里的链接同样会被主题的白字 + 色底压掉，用同样思路覆盖 */
  #cf-container .cf-overshow a:hover {
    color: var(--cf-accent) !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  ::selection {
    background: var(--theme-color) !important;
    color: #f4f4f4 !important;
  }

  /* ---------- 6. 响应式 ---------- */
  @media (max-width: 1200px) {
    .cf-kpi { min-width: 72px; padding: 7px 12px; }
    .cf-kpi-n { font-size: 19px; }
    .cf-article { min-height: 144px !important; }
  }
  @media (max-width: 768px) {
    .cf-meta { padding: 16px 18px; gap: 10px 14px; }
    .cf-meta-badge { width: 40px; height: 40px; font-size: 18px; border-radius: 12px; }
    .cf-meta-title { font-size: 18px; }
    .cf-kpis { margin-left: 0; width: 100%; }
    .cf-kpi { flex: 1; min-width: 0; }
    .cf-meta-time { font-size: 11.5px; }
    .cf-badge { max-width: 100% !important; }
  }
</style>

<div class="cf-meta">
  <div class="cf-meta-main">
    <div class="cf-meta-badge">✿</div>
    <div>
      <h1 class="cf-meta-title">朋友圈</h1>
      <div class="cf-meta-sub">友链 <b data-cf="friends">—</b> 位 · 其中 <b data-cf="active">—</b> 位还在更新</div>
    </div>
  </div>
  <div class="cf-kpis">
    <div class="cf-kpi"><div class="cf-kpi-n" data-cf="friends">—</div><div class="cf-kpi-l">订阅</div></div>
    <div class="cf-kpi"><div class="cf-kpi-n" data-cf="active">—</div><div class="cf-kpi-l">活跃</div></div>
    <div class="cf-kpi"><div class="cf-kpi-n" data-cf="article">—</div><div class="cf-kpi-l">新文章</div></div>
  </div>
  <div class="cf-meta-time" data-cf="time">数据同步中…</div>
</div>

<div id="hexo-circle-of-friends-root"></div>
<script>
    let UserConfig = {
        // 数据源：仓库里的静态 data.json（由 GitHub Action 每 6 小时生成，经 jsDelivr 国内 CDN 分发）
        private_api_url: 'https://cdn.jsdmirror.com/gh/yourname/hexo-circle-of-friends@main/data.json?',
        // 点击加载更多时，一次最多加载几篇文章，默认10
        page_turning_number: 12,
        // 头像加载失败时，默认头像地址
        error_img: '/img/friend_404.gif',
        // 进入页面时第一次的排序规则
        sort_rule: 'created'
    }
</script>
<link rel="stylesheet" href="https://cdn.jsdmirror.com/gh/zhheo/JS-Heo@master/mainColor/heoMainColor.css">
<script type="text/javascript" src="https://cdn.jsdmirror.com/gh/zhheo/JS-Heo@master/moments5/app.min.js"></script>
<script type="text/javascript" src="https://cdn.jsdmirror.com/gh/zhheo/JS-Heo@master/moments5/bundle.js"></script>

<script>
/* ==========================================================
   朋友圈改版 · 方案 A 的配套脚本
   只做两件引擎做不到的事：
     1) 给每张卡注入「来源域名 + favicon」角标（引擎只输出标题/作者/日期/头像，不输出域名）
     2) 把 data.json 里的统计数字填进顶部仪表盘
   不接管、不重排引擎的卡片结构，纯附加；任何一步失败都静默跳过，不影响页面本身。
   ========================================================== */
window.__cfDash = function () {
  var URLS = "https://cdn.jsdmirror.com/gh/yourname/hexo-circle-of-friends@main/data.json?";
  var CF = { keys: {}, keysByFloor: {}, textByFloor: {} };

  function hostname(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); }
    catch (e) { return ""; }
  }
  function faviconURL(u) {
    var h = hostname(u);
    return h ? "https://api.favicon.im/" + encodeURIComponent(h) + "?size=32" : "";
  }
  function injectData(list) {
    var i, d, h;
    for (i = 0; i < list.length; i++) {
      d = list[i];
      h = hostname(d.link);
      if (!h) continue;
      var key = "cfb-" + h.replace(/[^a-z0-9]/gi, "-");
      CF.keys[d.title] = key;
      CF.keysByFloor[String(d.floor)] = key;
      CF.textByFloor[String(d.floor)] = h;
    }
  }
  function buildBadge(card) {
    if (!card || card.querySelector(".cf-badge")) return;
    var box = card.querySelector(".cf-article-avatar");
    if (!box) return;
    var key = "", tEl = card.querySelector(".cf-article-title");
    var floorEl = card.querySelector(".cf-article-floor");
    var title = tEl ? (tEl.textContent || "").replace(/\s+/g, " ").trim() : "";
    if (CF.keys[title]) key = CF.keys[title];
    else if (floorEl && CF.keysByFloor[(floorEl.textContent || "").trim()]) key = CF.keysByFloor[(floorEl.textContent || "").trim()];
    var url = "";
    var a = card.querySelector(".cf-article-title");
    var href = "";
    if (a && a.closest) { var lk = a.closest("a"); if (lk) href = lk.getAttribute("href") || ""; }
    if (!href && a && a.getAttribute) href = a.getAttribute("href") || "";
    url = href;
    var h = hostname(url);
    if (!h && key) {
      var f = floorEl ? (floorEl.textContent || "").trim() : "";
      if (CF.textByFloor[f]) h = CF.textByFloor[f];
    }
    if (!h && !key) return;
    var s = document.createElement("span");
    s.className = "cf-badge";
    if (key) s.setAttribute("data-cf-d", key);
    if (h) {
      var img = document.createElement("img");
      img.src = faviconURL("https://" + h);
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () { img.style.display = "none"; };
      var t = document.createElement("span");
      t.textContent = h;
      s.appendChild(img);
      s.appendChild(t);
    }
    box.appendChild(s);
  }
  function build() {
    var cards = document.querySelectorAll(".cf-article");
    for (var i = 0; i < cards.length; i++) buildBadge(cards[i]);
  }
  function debounce(fn, ms) {
    var tm = 0;
    return function () { clearTimeout(tm); tm = setTimeout(fn, ms); };
  }

  /* 引擎自己的页脚会再刷一遍「订阅 / 活跃 / 日志 + 更新于」，
     和顶部仪表盘口径不一致（还会显示缓存的旧时间），按文本收掉这一组，
     只保留 Powered by / Design by / 设置。找不到就什么都不做。 */
  function tidyFooter() {
    var f = document.getElementById("cf-footer");
    if (!f) return;
    var keep = /设置|Powered by|Design by/;
    var nodes = f.querySelectorAll("*"), hiddenLabel = false, i, el, tx, par;
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      if (el.children.length) continue;
      tx = (el.textContent || "").trim();
      if (/^更新于/.test(tx)) { el.style.display = "none"; hiddenLabel = true; continue; }
      if (!/^(订阅|活跃|日志)/.test(tx)) continue;
      par = el.parentElement;
      if (!par || par === f || par === document.body) continue;
      if (keep.test(par.textContent || "")) continue;
      par.style.display = "none";
      hiddenLabel = true;
    }
    if (!hiddenLabel) return;
    /* 标签和数字是并列兄弟时，把剩下的孤零零数字也收掉 */
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      if (el.children.length || el.offsetParent === null) continue;
      if (!/^\d{1,4}$/.test((el.textContent || "").trim())) continue;
      if (el.closest("a,button")) continue;
      el.style.display = "none";
    }
  }

  var rebuild = debounce(function () { build(); tidyFooter(); }, 120);

  function fillDash(sd) {
    if (!sd) return;
    var a = document.querySelectorAll('[data-cf="friends"]');
    var b = document.querySelectorAll('[data-cf="active"]');
    var c = document.querySelectorAll('[data-cf="article"]');
    var t = document.querySelector('[data-cf="time"]');
    var i;
    for (i = 0; i < a.length; i++) a[i].textContent = sd.friends_num;
    for (i = 0; i < b.length; i++) b[i].textContent = sd.active_num;
    for (i = 0; i < c.length; i++) c[i].textContent = sd.article_num;
    var lu = sd.last_updated_time || sd.last_updated || "";
    if (t) t.textContent = lu ? ("数据更新于 " + lu) : "数据已同步";
  }

  function start() {
    try {
      // 只盯住引擎挂载点，避免主题自身的 DOM 频繁变动白白触发重建
      var host = document.getElementById("hexo-circle-of-friends-root") || document.body;
      var ob = new MutationObserver(rebuild);
      ob.observe(host, { childList: true, subtree: true });
    } catch (e) { /* 老浏览器没有 MutationObserver 也不致命 */ }
    build();
    tidyFooter();
    fillDash(window.__cfData && window.__cfData.statistical_data);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  fetch(URLS + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (j) {
      window.__cfData = j;
      injectData(j.article_data || []);
      build();
      tidyFooter();
      fillDash(j.statistical_data);
    })
    .catch(function () { /* 拿不到数据时角标只是不出现，页面照常 */ });
};
window.__cfDash();
</script>
