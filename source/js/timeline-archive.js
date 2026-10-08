/* ======================================================================
 * timeline-archive.js —— 「旧时光」(/site/time/) 时间轴改版（行为层）
 * ----------------------------------------------------------------------
 * 外观在 /css/timeline-archive.css，两边都只认一个开关：timeline 上的
 * .tl-ready 类（本文件加）。不改主题源码：只读主题渲染好的 DOM，再插
 * 入自己的包装节点。
 *
 * 改版做四件事（都在浏览器里完成，markdown 源文件一个字没动）：
 *   1) .timeline-item.headline（"小站建设进程"）改造成头部：小标签 +
 *      标题 + 时间跨度统计（起止 / 历时 / 更新天数 / 记录条数 / 年份数）
 *      + 年份锚点胶囊（胶囊只写条数，底部细条＝该年条数占全部条数的比例）；
 *   2) 每个 .timeline-item 的日期 <p>2026-10-03</p> 拆成
 *      <span class="tl-y">2026</span><span class="tl-md">10-03</span>，
 *      并给条目挂 id="tl-YYYY-MM-DD"；
 *   3) 按年份插入 .tl-year 分隔器（大号年份 + 细线 + "M 条记录 · N 天"）；
 *   4) 最早一条（"诞生初期(部分记录缺失) 2022-08-09 ~ 2022-08-30"）不是
 *      规整日期：日期轨只放年份与起始月日，整段标题挪到卡片内侧。
 *
 * 两套计数别混（2026-10-08 修：原来头部把「日期卡数」直接写成了「记录条数」）：
 *   days  = .timeline-item 的个数 = 记下一次更新的日子；2022-08-09 那条其实
 *           是一段区间（标题里已注明「部分记录缺失」），也按 1 天算。
 *   items = 日期卡正文里 markdown 列表的条目数，这才是真正写下的「条记录」。
 *   span  = minD 与 maxD 的日期差（天）；跟出来的「约 X 年 Y 个月」＝天数 ÷ 30.4375
 *           四舍五入到月，只求体感，别当精确历法看。
 * 胶囊底部细条的分母是 items 的总和（542 条），不是 days。
 *
 * 生效范围（双保险，两道都过才动手）：
 *   a. #article-container 只包着这一条 .timeline —— 全站只有 /site/time/
 *      这一页符合（示例文章里那 3 条 timeline 所在的文章还有别的内容）；
 *   b. 条目数 ≥ 8。
 * 触发时机：首屏 + pjax 换页（pjax:complete / pjax:success / pjax:end）。
 * 幂等：靠 timeline 上的 data-tl-archive 标记，重复调用直接返回。
 * 回滚：删掉 _config.fomalhaut.yml 里引本文件的 <script> 一行即可。
 * ====================================================================== */
(function () {
  'use strict'

  var MIN_ITEMS = 8

  function pad2(n) {
    n = String(n)
    return n.length < 2 ? '0' + n : n
  }

  // 把条目的日期文字解析成 { year, md, date, annotated }；完全不是日期就返回 null 系列。
  // annotated = 匹配到日期，但标题里还带别的字（"诞生初期(部分记录缺失) 2022-08-09 ~ 2022-08-30"）：
  // 这种条目日期轨照给，但原文必须留在卡片里，不能像纯日期那样被清掉。
  function parseTitle(raw) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw)
    if (m) {
      return { year: m[1], md: pad2(m[2]) + '-' + pad2(m[3]), date: m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]), annotated: false }
    }
    var m2 = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw)
    if (m2) {
      return { year: m2[1], md: pad2(m2[2]) + '-' + pad2(m2[3]), date: m2[1] + '-' + pad2(m2[2]) + '-' + pad2(m2[3]), annotated: true }
    }
    return { year: null, md: null, date: null, annotated: false }
  }

  function span(cls, text) {
    var el = document.createElement('span')
    el.className = cls
    el.textContent = text
    return el
  }

  // 一条日期卡里的「正文条目」数：卡片正文 markdown 列表的 <li>。
  // 结构意外（没有列表 / 不是列表）就退回 0，宁可少数不瞎猜。
  function countEntries(el) {
    var content = el.querySelector('.timeline-item-content')
    if (!content) return 0
    var top = content.querySelectorAll(':scope > ol > li, :scope > ul > li')
    if (top.length) return top.length
    return content.querySelectorAll('li').length
  }

  function build() {
    var container = document.getElementById('article-container')
    if (!container) return

    // 守卫 a：正文容器里只有这一条 timeline
    var kids = container.children
    if (kids.length !== 1 || !kids[0] || kids[0].className.indexOf('timeline') < 0) return
    var tl = kids[0]
    if (tl.getAttribute('data-tl-archive') === '1') return

    // 拆 headline 与普通条目
    var all = tl.querySelectorAll(':scope > .timeline-item')
    var head = null
    var items = []
    for (var i = 0; i < all.length; i++) {
      if (all[i].className.indexOf('headline') >= 0) {
        if (!head) head = all[i]
      } else {
        items.push(all[i])
      }
    }
    // 守卫 b：长档案页才改（示例文章里的 timeline 只有几条）
    if (items.length < MIN_ITEMS) return

    // 逐条解析
    var rows = []
    for (var j = 0; j < items.length; j++) {
      var el = items[j]
      var p = el.querySelector('.timeline-item-title .item-circle > p') || el.querySelector('.timeline-item-title p')
      var raw = p ? String(p.textContent || '').replace(/\s+/g, ' ').trim() : ''
      var info = parseTitle(raw)
      rows.push({ el: el, p: p, raw: raw, year: info.year, md: info.md, date: info.date, annotated: info.annotated, cnt: countEntries(el) })
    }

    // 按出现顺序（新 → 旧）分组年份
    var order = []
    var byYear = {}
    for (var k = 0; k < rows.length; k++) {
      var y = rows[k].year
      if (!y) continue
      if (!byYear[y]) { byYear[y] = []; order.push(y) }
      byYear[y].push(rows[k])
    }
    if (order.length < 2) return

    // days 与 items 分开算：年份分隔器与年份胶囊两个数都要用
    var totalItems = 0
    for (var t = 0; t < rows.length; t++) totalItems += rows[t].cnt
    var itemsByYear = {}
    for (var yy in byYear) {
      if (!Object.prototype.hasOwnProperty.call(byYear, yy)) continue
      var sum = 0
      for (var q = 0; q < byYear[yy].length; q++) sum += byYear[yy][q].cnt
      itemsByYear[yy] = sum
    }

    var dates = []
    for (var d = 0; d < rows.length; d++) if (rows[d].date) dates.push(rows[d].date)
    dates.sort()
    var minD = dates[0] || ''
    var maxD = dates[dates.length - 1] || ''

    // 相距多少天（日期差，不是首尾各算一天的口径）+ 给人看的「约 X 年 Y 个月」
    var spanDays = 0
    if (minD && maxD) {
      var t0 = Date.parse(minD + 'T00:00:00')
      var t1 = Date.parse(maxD + 'T00:00:00')
      if (!isNaN(t0) && !isNaN(t1) && t1 > t0) spanDays = Math.round((t1 - t0) / 86400000)
    }
    var spanHuman = ''
    if (spanDays > 0) {
      var spanMons = Math.round(spanDays / 30.4375)
      var spanY = Math.floor(spanMons / 12)
      var spanM = spanMons % 12
      spanHuman = spanY > 0 ? spanY + ' 年' + (spanM > 0 ? ' ' + spanM + ' 个月' : '') : spanM + ' 个月'
    }

    // 1) 条目本身：类名 / id / 日期拆分
    for (var n = 0; n < rows.length; n++) {
      var r = rows[n]
      r.el.className += ' tl-item'
      if (r.date) {
        var id = 'tl-' + r.date
        if (document.getElementById(id)) id = id + '-' + n
        r.el.id = id
      }
      // 没有日期、或标题里除日期外还有说明文字的，都走“里程碑”样式
      if (!r.date || r.annotated) r.el.className += ' tl-item--mile'
      if (r.p && r.year) {
        r.p.textContent = ''
        r.p.appendChild(span('tl-y', r.year))
        r.p.appendChild(span('tl-md', r.md))
      }
      // 说明文字不能丢：整段原文搬到卡片顶部（日期轨只有一列，放不下）
      if (r.annotated && r.raw) {
        var content = r.el.querySelector('.timeline-item-content')
        if (content) {
          var note = document.createElement('p')
          note.className = 'tl-mile-title'
          note.textContent = r.raw
          content.insertBefore(note, content.firstChild)
        }
      }
    }
    rows[0].el.className += ' tl-item--latest'

    // 2) 年份分隔器
    for (var g = 0; g < order.length; g++) {
      var yr = order[g]
      var div = document.createElement('div')
      div.className = 'tl-year' + (g === 0 ? ' tl-year--now' : '')
      div.id = 'tl-year-' + yr
      var num = document.createElement('span')
      num.className = 'tl-year-num'
      num.textContent = yr
      var line = document.createElement('span')
      line.className = 'tl-year-line'
      line.appendChild(document.createElement('i'))
      var label = document.createElement('em')
      label.textContent = itemsByYear[yr] + ' 条记录 · ' + byYear[yr].length + ' 天'
      line.appendChild(label)
      div.appendChild(num)
      div.appendChild(line)
      tl.insertBefore(div, byYear[yr][0].el)
    }

    // 3) 头部
    if (head) {
      var titleText = ''
      var hp = head.querySelector('.item-circle > p') || head.querySelector('p')
      if (hp) titleText = String(hp.textContent || '').trim()
      while (head.firstChild) head.removeChild(head.firstChild)

      var hero = document.createElement('div')
      hero.className = 'tl-head'

      var kicker = document.createElement('p')
      kicker.className = 'tl-head-kicker'
      kicker.textContent = 'SITE CHANGELOG'

      var title = document.createElement('div')
      title.className = 'tl-head-title'
      title.textContent = titleText || '小站建设进程'

      var sub = document.createElement('p')
      sub.className = 'tl-head-sub'
      // 各就各位：起止 / 历时（天数 + 约数年月）/ 更新天数（日期卡数）/ 记录条数（正文条目数）+ 年份数
      sub.innerHTML = '从 <b>' + minD + '</b> 记到 <b>' + maxD + '</b>　·　' +
        (spanHuman ? '历时 <b>' + spanDays + '</b> 天（约 <b>' + spanHuman + '</b>）　·　' : '') +
        '更新 <b>' + rows.length + '</b> 天　·　共 <b>' + totalItems + '</b> 条记录　·　横跨 <b>' + order.length + '</b> 个年份'

      var chips = document.createElement('nav')
      chips.className = 'tl-head-chips'
      for (var c = 0; c < order.length; c++) {
        var a = document.createElement('a')
        a.className = 'tl-chip' + (c === 0 ? ' tl-chip--new' : '')
        a.setAttribute('href', '#tl-year-' + order[c])
        var chipYr = order[c]
        var chipDays = byYear[chipYr].length
        var chipItems = itemsByYear[chipYr]
        // 细条的分母是全部条数：三条加起来正好是整页 542 条
        var pct = totalItems ? Math.round(chipItems / totalItems * 1000) / 10 : 0
        var b = document.createElement('b')
        b.textContent = chipYr
        var s = document.createElement('span')
        s.textContent = chipItems + ' 条'
        var track = document.createElement('i')
        track.className = 'tl-chip-track'
        track.setAttribute('aria-hidden', 'true')
        var bar = document.createElement('i')
        bar.className = 'tl-chip-bar'
        bar.style.width = pct + '%'
        track.appendChild(bar)
        // 天数不再进胶囊，但别丢：悬停时给一行完整的
        a.title = chipYr + ' 年 · 更新 ' + chipDays + ' 天 · ' + chipItems + ' 条记录（占全部 ' +
          totalItems + ' 条的 ' + Math.round(pct) + '%）'
        a.appendChild(b)
        a.appendChild(s)
        a.appendChild(track)
        chips.appendChild(a)
      }

      hero.appendChild(kicker)
      hero.appendChild(title)
      hero.appendChild(sub)
      hero.appendChild(chips)
      head.appendChild(hero)
    }

    // 4) 轨道线的起止点：从第一条年份分隔器起，到最后一条的圆点止。
    //    头部高度随内容变，纯 CSS 量不出来，这里量一次换到自定义属性上。
    function setRail() {
      try {
        // pjax 把 DOM 换掉之后，定时器还在跑，此时量的是游离节点（全 0），直接放弃
        if (!document.contains(tl)) return
        var tlRect = tl.getBoundingClientRect()
        var firstYear = tl.querySelector('.tl-year')
        if (firstYear) {
          var yr = firstYear.getBoundingClientRect()
          tl.style.setProperty('--tl-rail-top', Math.round(yr.top + yr.height / 2 - tlRect.top) + 'px')
        }
        var lastEl = items[items.length - 1]
        var lastTitle = lastEl.querySelector('.timeline-item-title') || lastEl
        var lt = lastTitle.getBoundingClientRect()
        tl.style.setProperty('--tl-rail-bottom', Math.round(tlRect.bottom - lt.top - 22) + 'px')
      } catch (err) {}
    }
    setRail()
    if (tl.getAttribute('data-tl-rail') !== '1') {
      tl.setAttribute('data-tl-rail', '1')
      // 初次量的时候 web 字体往往还没换完，头部还会再长高一截，
      // 所以等字体就绪、页面 load 之后再各量一次（多量几次无副作用，只是改两个自定义属性）
      setTimeout(setRail, 400)
      setTimeout(setRail, 1500)
      try {
        if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
          document.fonts.ready.then(function () { setRail() })
        }
      } catch (err) {}
      window.addEventListener('load', setRail)
      var railTimer = null
      window.addEventListener('resize', function () {
        if (railTimer) clearTimeout(railTimer)
        railTimer = setTimeout(setRail, 200)
      })
    }

    // 5) 年份胶囊：平滑滚动 + 改地址栏 hash（不新增一条历史记录）
    tl.addEventListener('click', function (e) {
      var t = e.target
      while (t && t !== tl && !(t.className && String(t.className).indexOf('tl-chip') >= 0)) t = t.parentNode
      if (!t || t === tl || !t.getAttribute) return
      var href = t.getAttribute('href') || ''
      if (href.charAt(0) !== '#') return
      var target = document.getElementById(href.slice(1))
      if (!target) return
      e.preventDefault()
      var top = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0) - 76
      try {
        window.scrollTo({ top: top, behavior: 'smooth' })
      } catch (err) {
        window.scrollTo(0, top)
      }
      if (window.history && history.replaceState) history.replaceState(null, '', href)
    })

    tl.setAttribute('data-tl-archive', '1')
    tl.className += ' tl-ready'
  }

  function boot() {
    try {
      build()
    } catch (err) {
      if (window.console && console.warn) console.warn('[timeline-archive]', err)
    }
  }

  function later() {
    setTimeout(boot, 30)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
  // pjax 换页：DOM 会被整块换掉，多听几个事件 + 让主题内联脚本先跑完
  document.addEventListener('pjax:complete', later)
  document.addEventListener('pjax:success', later)
  document.addEventListener('pjax:end', later)
})()
