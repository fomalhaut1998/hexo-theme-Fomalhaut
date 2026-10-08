/*!
 * archive-page.js  —— 归档页卡片改版（站点独立脚本，不改主题源码）
 * ---------------------------------------------------------------------------
 * 作用页：/archives/ 与其分页 /archives/page/N/（同套样式对 /categories/*、/tags/* 也生效）。
 * 职责：只读主题渲染好的 .article-sort DOM，就地重排成
 *       概览统计条 + 年份吸顶跳转 + 年份章节（可折叠）+ 两列卡片栅格。
 *       不发起任何网络请求（每篇文章的阅读时长 / 分类由构建期写进页面的
 *       <script type="application/json" id="ar-index"> 提供，见 scripts/archive-index.js）。
 *
 * 守卫：确认「页面只有一个 .article-sort」且「至少有一篇文章」后才给容器加 .ar-ready；
 *       CSS 选择器全部以 .ar-ready 开头，所以任一环节不成立就整块失效、页面原样。
 * 幂等：容器上打 data-ar-archive，重复执行（pjax 往返）直接 return。
 * 降级：ar-index 缺失（脚本没生效 / 被过滤）时照常排版，只是卡片不显示分类与阅读时长。
 *
 * 卸载：删掉 _config.fomalhaut.yml inject.head 里的引入行即可，无其它依赖。
 * 仓库路径：source/js/inject/archive-page.js
 */

(function () {
  'use strict';

  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

  /* ---------------------------------------------------------------- 小工具 */

  /** 原图地址：主题的懒加载把它们放在 data-lazy-src 里（src 是 1×1 占位 gif）。 */
  function realSrc(img) {
    if (!img) return '';
    var lazy = img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || '';
    var src = lazy || img.getAttribute('src') || '';
    return src.indexOf('data:image') === 0 ? '' : src;
  }

  /** 把 href 收敛成站内路径，用作 ar-index 的键（去 origin / 去 query / 补前导 /）。 */
  function normPath(href) {
    if (!href) return '';
    var s = href;
    if (s.indexOf('://') > -1) {
      var a = document.createElement('a');
      a.href = href;
      s = a.pathname;
    }
    s = s.split('#')[0].split('?')[0];
    if (s.charAt(0) !== '/') s = '/' + s;
    if (s !== '/' && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    return s;
  }

  function getJSON(id) {
    try {
      var el = document.getElementById(id);
      if (!el) return null;
      return JSON.parse(el.textContent || el.innerHTML || 'null');
    } catch (e) {
      return null; // 解析失败按"没有数据"处理，排版照常
    }
  }

  /**
   * ar-index 里每篇文章用短键存（t 标题 / p 路径 / d 日期 / c 分类 / w 字数 / r 阅读分钟），
   * 这里统一成可读字段名，同时兼容长键，免得两边键名一改就静默失效。
   */
  function metaOf(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      title: String(m.t || m.title || ''),
      path: String(m.p || m.path || ''),
      date: String(m.d || m.date || ''),
      cat: String(m.c || m.cat || m.category || ''),
      words: Number(m.w || m.words || 0) || 0,
      read: Number(m.r || m.read || 0) || 0
    };
  }

  /** 当前页码：/archives/page/3/ → 3，/archives/ → 1。 */
  function pageNo() {
    var m = location.pathname.match(/\/page\/(\d+)\/?/);
    return m ? parseInt(m[1], 10) : 1;
  }

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  /* ---------------------------------------------------------------- 主流程 */

  function init() {
    var root = document.getElementById('archive') ||
      document.getElementById('category') ||
      document.getElementById('tag');
    if (!root || root.getAttribute('data-ar-archive') === '1') return;
    if (root.querySelectorAll('.article-sort').length !== 1) return;

    var list = root.querySelector('.article-sort');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('.article-sort-item'));
    var posts = items.filter(function (n) { return n.className.indexOf('year') === -1; });
    if (posts.length < 1) return;

    var index = (getJSON('ar-index') || {}).posts || {};
    root.setAttribute('data-ar-archive', '1');

    /** 吸顶偏移：主题导航栏是 fixed 时给它留出高度，sticky 的两个元素才不会压在它下面。 */
    function navH() {
      var nav = document.getElementById('nav');
      var h = 0;
      if (nav) {
        var st = window.getComputedStyle(nav);
        if (st && st.position === 'fixed') h = nav.offsetHeight || 0;
      }
      return h;
    }

    /* ---- 1. 逐条改造成卡片 ---- */
    var postPaths = [];
    posts.forEach(function (item) {
      var titleLink = item.querySelector('.article-sort-item-title');
      var imgLink = item.querySelector('.article-sort-item-img');
      var img = imgLink ? imgLink.querySelector('img') : null;
      var info = item.querySelector('.article-sort-item-info');
      var date = item.querySelector('time');
      if (!titleLink || !info) return;

      var url = normPath(titleLink.getAttribute('href') || (imgLink && imgLink.getAttribute('href')));
      var meta = metaOf(index[url]);
      postPaths.push(url);

      item.classList.add('ar-card');
      if (!imgLink) item.classList.add('ar-nocover');

      /** 无封面占位：首字 + 主题色光晕，复用 .ar-cover 样式 */
      function makePlaceholder() {
        var ph = el('div', 'ar-cover');
        ph.appendChild(el('span', 'ar-cover-char', (titleLink.textContent || '文').trim().charAt(0)));
        return ph;
      }
      /** 真图加载失败（离线 / 图床挂了）时退回占位，别让卡片顶部留一块空白 */
      function dropCover() {
        if (item.getAttribute('data-ar-ph') === '1') return;
        item.setAttribute('data-ar-ph', '1');
        item.classList.add('ar-nocover');
        var ph = makePlaceholder();
        if (imgLink && imgLink.parentNode) imgLink.parentNode.replaceChild(ph, imgLink);
        else item.insertBefore(ph, item.firstChild);
      }

      /* 封面：懒加载图（src 还是 1×1 占位）直接补上真图，避免依赖 LazyLoad 的扫描时机。
         封面必须是卡片的第一个子节点（CSS 用 > a.article-sort-item-img 选它）。 */
      if (imgLink) {
        if (img) {
          var real = realSrc(img);
          if (real) {
            img.setAttribute('src', real);
            img.setAttribute('loading', 'eager');
          }
          if (!real || /^data:image/.test(img.getAttribute('src') || '')) {
            item.classList.add('ar-nocover');
          } else {
            img.addEventListener('error', dropCover);
          }
        } else {
          item.classList.add('ar-nocover');
        }
        item.insertBefore(imgLink, item.firstChild);
        if (item.classList.contains('ar-nocover')) dropCover();
      } else {
        item.insertBefore(makePlaceholder(), item.firstChild);
      }

      /* 分类 + 标题一行 */
      var head = el('div', 'ar-head');
      if (meta && meta.cat) {
        var catA = el('a', 'ar-cat');
        catA.setAttribute('href', '/categories/' + encodeURIComponent(meta.cat) + '/');
        catA.setAttribute('title', '分类：' + meta.cat);
        catA.setAttribute('data-cat', meta.cat);
        catA.setAttribute('aria-label', '分类：' + meta.cat);
        head.appendChild(catA);
      }
      head.appendChild(titleLink);

      /* 日期 + 阅读时长一行 */
      var foot = el('div', 'ar-foot');
      if (date) {
        var timeBox = date.closest('.article-sort-item-time') || date.parentNode;
        foot.appendChild(timeBox);
      }
      if (meta && meta.read) foot.appendChild(el('span', 'ar-read', '约 ' + meta.read + ' 分钟'));

      info.appendChild(head);
      info.appendChild(foot);

      /* 整卡可点（标题 / 封面仍是独立链接，可新窗口打开、可被爬虫抓） */
      var hit = el('a', 'ar-hit');
      hit.setAttribute('href', titleLink.getAttribute('href') || url);
      hit.setAttribute('aria-label', (titleLink.textContent || '').trim());
      item.appendChild(hit);
    });

    /* ---- 2. 数据索引：优先用构建期写进页面的全站索引，退化为当前页 ---- */
    var byYear = {};
    var allMeta = Object.keys(index).map(function (k) { return metaOf(index[k]); });
    var yearsData = allMeta.length
      ? allMeta
      : postPaths.map(function (p) { return metaOf(index[p]); });

    yearsData.forEach(function (p) {
      var y = (p && p.date) ? String(p.date).slice(0, 4) : '';
      if (!/^\d{4}$/.test(y)) return;
      byYear[y] = (byYear[y] || 0) + 1;
    });

    /* 总数：优先页面标题里的全站篇数（'文章总览 - 50'），匹配不到就用当前页条数 */
    var titleEl = root.querySelector('.article-sort-title');
    var total = yearsData.length;
    if (titleEl) {
      var m = String(titleEl.textContent || '').match(/(\d[\d,]*)\s*$/);
      if (m) total = parseInt(m[1].replace(/,/g, ''), 10) || total;
    }

    /* ---- 3. 年度分布柱状图（替代原来的四格数字卡）---- */
    var yearKeys = Object.keys(byYear).sort();
    var longestYear = '';
    var longestCount = 0;
    yearKeys.forEach(function (y) {
      if (byYear[y] > longestCount) { longestCount = byYear[y]; longestYear = y; }
    });

    var dist = el('div', 'ar-dist');
    var head = el('div', 'ar-dist-head');
    head.appendChild(el('span', 'ar-dist-title', '年度分布'));
    var summary = '共 ' + total + ' 篇';
    if (yearKeys.length > 1) {
      summary += ' · ' + yearKeys[0] + '–' + yearKeys[yearKeys.length - 1] + ' · ' + longestYear +
        ' 年最多（' + longestCount + ' 篇）';
    }
    head.appendChild(el('span', 'ar-dist-sum', summary));
    dist.appendChild(head);

    if (yearKeys.length) {
      /* 跨年太多（>8 年）时只画有文章的年份，避免一整排空柱子 */
      var axis = [];
      var spanYears = Number(yearKeys[yearKeys.length - 1]) - Number(yearKeys[0]);
      if (spanYears >= 0 && spanYears <= 7) {
        for (var yi = 0; yi <= spanYears; yi++) axis.push(String(Number(yearKeys[0]) + yi));
      } else {
        axis = yearKeys.slice();
      }
      var bars = el('div', 'ar-bars');
      axis.forEach(function (y) {
        var n = byYear[y] || 0;
        var col = el('div', 'ar-bar-col' + (n ? '' : ' is-zero'));
        col.setAttribute('title', y + ' 年 · ' + n + ' 篇');
        var track = el('div', 'ar-bar-track');
        var bar = el('div', 'ar-bar');
        bar.style.height = (n ? Math.max(8, Math.round((n / longestCount) * 100)) : 3) + '%';
        track.appendChild(bar);
        col.appendChild(track);
        col.appendChild(el('span', 'ar-bar-n', String(n)));
        col.appendChild(el('span', 'ar-bar-y', y));
        bars.appendChild(col);
      });
      dist.appendChild(bars);
    }
    if (titleEl && titleEl.parentNode) titleEl.parentNode.insertBefore(dist, titleEl.nextSibling);

    /* ---- 4. 卡片按年份切段 ---- */
    var wrap = list.parentNode;             // #archive / #category / #tag
    var afterList = list.nextSibling;
    var sections = [];

    /** 造一个年份章节：吸顶标题（大号年份 + 条数 + 折叠按钮）+ 卡片栅格。 */
    function openSection(year, nodes) {
      var sec = el('section', 'ar-year');
      sec.id = (root.id || 'archive') + '-y' + year;
      sec.setAttribute('data-year', year);

      var label = el('div', 'ar-year-label');
      label.appendChild(el('span', 'ar-year-num', year));
      label.appendChild(el('span', 'ar-year-count', nodes.length + ' 篇'));
      label.appendChild(el('span', 'ar-year-rule'));

      var toggle = el('button', 'ar-year-toggle');
      toggle.type = 'button';
      toggle.innerHTML = CHEV + '收起';
      toggle.setAttribute('aria-label', '收起或展开 ' + year + ' 年的文章');
      label.appendChild(toggle);
      sec.appendChild(label);

      var collapse = el('div', 'ar-collapse');
      var cards = el('div', 'ar-cards');
      nodes.forEach(function (n) { cards.appendChild(n); });
      collapse.appendChild(cards);
      sec.appendChild(collapse);

      wrap.insertBefore(sec, afterList);

      var ref = { year: year, sec: sec, cards: cards, collapse: collapse, toggle: toggle };
      label.addEventListener('click', function (ev) {
        if (ev.target.closest && (ev.target.closest('.ar-year-toggle') || ev.target.closest('a'))) return;
        setCollapsed(ref, !ref.sec.classList.contains('collapsed'));
      });
      toggle.addEventListener('click', function () {
        setCollapsed(ref, !ref.sec.classList.contains('collapsed'));
      });
      sections.push(ref);
    }

    // 主题的年份分隔器已经不需要了（年份由章节标题承担），先摘掉
    items.forEach(function (node) {
      if (node.classList.contains('year') && node.parentNode) node.parentNode.removeChild(node);
    });

    // 按 DOM 顺序把卡片聚成年份分组
    var grouped = [];
    postPaths.forEach(function (url, i) {
      var node = posts[i];
      if (!node) return;
      var t = node.querySelector('time');
      var y = (t && t.getAttribute('datetime')) ? t.getAttribute('datetime').slice(0, 4) : '';
      if (!/^\d{4}$/.test(y)) {
        var rec = metaOf(index[url]);
        y = (rec && rec.date) ? String(rec.date).slice(0, 4) : '';
      }
      if (!/^\d{4}$/.test(y)) y = '全部';
      if (!grouped.length || grouped[grouped.length - 1].year !== y) grouped.push({ year: y, nodes: [] });
      grouped[grouped.length - 1].nodes.push(node);
    });
    grouped.forEach(function (g) { openSection(g.year, g.nodes); });

    // 卡片都搬走后，剩下的是空的 .article-sort，一并清掉
    if (list.parentNode && !list.querySelector('.article-sort-item')) {
      list.parentNode.removeChild(list);
    }

    /* ---- 5. 折叠状态（localStorage 记忆） ---- */
    var KEY = 'ar-collapsed-years';
    function readCollapsed() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; }
    }
    function writeCollapsed(arr) {
      try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 40))); } catch (e) {}
    }
    function setCollapsed(ref, on) {
      ref.sec.classList.toggle('collapsed', !!on);
      ref.toggle.innerHTML = CHEV + (on ? '展开' : '收起');
      var arr = readCollapsed().filter(function (y) { return y !== ref.year; });
      if (on) arr.push(ref.year);
      writeCollapsed(arr);
    }
    var saved = readCollapsed();
    sections.forEach(function (ref) {
      if (saved.indexOf(ref.year) !== -1) setCollapsed(ref, true);
    });

    /* ---- 6. 年份吸顶跳转 ---- */
    if (sections.length > 1) {
      var nav = el('div', 'ar-nav');
      nav.appendChild(el('span', 'ar-nav-label', '年份'));
      var track = el('div', 'ar-nav-track');
      nav.appendChild(track);
      var chips = {};
      sections.forEach(function (ref) {
        var a = el('a', 'ar-chip', ref.year);
        a.setAttribute('href', '#' + ref.sec.id);
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          lockUntil = Date.now() + 900;
          setActive(ref.year);
          var line = navH() + 56;
          var top = ref.sec.getBoundingClientRect().top + window.pageYOffset - line;
          try { window.scrollTo({ top: top, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, top); }
        });
        track.appendChild(a);
        chips[ref.year] = a;
      });
      if (dist.parentNode) dist.parentNode.insertBefore(nav, dist.nextSibling);

      var lockUntil = 0;
      var current = '';
      function setActive(year) {
        if (year === current) return;
        current = year;
        sections.forEach(function (ref) {
          if (chips[ref.year]) chips[ref.year].classList.toggle('on', ref.year === year);
        });
        var chip = chips[year];
        if (chip && chip.scrollIntoView) {
          try { chip.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
        }
      }
      function pick() {
        if (Date.now() < lockUntil) return;
        var line = navH() + 110;
        var found = sections[0].year;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].sec.getBoundingClientRect().top <= line) found = sections[i].year;
        }
        setActive(found);
      }
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { ticking = false; pick(); });
      }, { passive: true });
      setActive(sections[0].year);
    }

    root.classList.add('ar-ready');

    /* ---- 7. 细节 ---- */
    function applyNavH() {
      root.style.setProperty('--ar-nav-h', navH() + 'px');
    }
    applyNavH();
    window.addEventListener('resize', applyNavH);

    // 让 LazyLoad 重新登记封面（我们把 src 直接补成了真图）
    if (window.lazyLoadInstance && typeof window.lazyLoadInstance.update === 'function') {
      try { window.lazyLoadInstance.update(); } catch (e) {}
    }
  }

  /* 首屏 + pjax 往返（主题是 pjax 站内跳转），init 幂等 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  ['pjax:complete', 'pjax:success', 'pjax:end'].forEach(function (ev) {
    document.addEventListener(ev, function () { setTimeout(init, 0); });
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) init(); });
})();
