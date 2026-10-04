/* ======================================================================
 * 文章统计页（/tags/，即 网站 › 文章统计）增强脚本
 * ----------------------------------------------------------------------
 * 这一页的正文由主题布局 themes/fomalhaut/layout/includes/page/echarts.pug 生成，
 * 图表配色也写死在主题助手 themes/fomalhaut/scripts/helpers/hexo_echarts.js 里
 * （#425aef 那套蓝，和站点主题色不是一家）。为了不改主题源码，这里在浏览器里
 * 做两件事：
 *   1) 把 <center><font size="4">标题📃</font></center> 拆成
 *      图标胶囊 + 标题 + 说明（外观见 /css/stats.css）；
 *   2) 拿到三张图的实例（postsChart / tagsChart / categoriesChart 是主题内联脚本
 *      里的全局 var），按主题色 --theme-color 重新 setOption，并把 canvas 背景
 *      置空、配色/网格线/图例跟着明暗模式走。
 * 触发时机：首屏 + pjax 换页（pjax:complete）+ 主题色/明暗模式变化。
 * 本文件对其它页面零影响：找不到 #posts-echart 就直接返回。
 * 回滚：删掉本文件与 /css/stats.css，并还原
 *      bak/20261005-stats-redesign/_config.fomalhaut.yml.bak。
 * ====================================================================== */
(function () {
  'use strict'

  // ===== 主题色读取与派生（与 /js/census.js 同一套写法）=====

  // 主题色由主题运行时写进 <style id="themeColor">，只能运行时读、不能写死
  function statsThemeRgb() {
    var v = ''
    try {
      v = getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || ''
    } catch (err) { }
    v = v.trim()
    var m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v)
    if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
    var hex = /^#([0-9a-f]{6})$/i.exec(v)
    if (hex) {
      var n = parseInt(hex[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    return [57, 197, 187] // 主题默认色 green，取不到变量时兜底
  }

  function statsCss(rgb) {
    return 'rgb(' + rgb.join(', ') + ')'
  }

  function statsTint(rgb, ratio) { // 与白色混合，越大越浅
    return rgb.map(function (c) { return Math.round(c + (255 - c) * ratio) })
  }

  function statsShade(rgb, ratio) { // 与黑色混合，越大越深
    return rgb.map(function (c) { return Math.round(c * (1 - ratio)) })
  }

  function statsIsDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light'
  }

  function statsRgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255
    var max = Math.max(r, g, b), min = Math.min(r, g, b)
    var l = (max + min) / 2
    var d = max - min
    var h = 0, s = 0
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      h *= 60
    }
    return [h, s * 100, l * 100]
  }

  function statsHsl(h, s, l) {
    return 'hsl(' + Math.round(((h % 360) + 360) % 360) + ', ' +
      Math.round(Math.min(92, Math.max(30, s))) + '%, ' +
      Math.round(Math.min(78, Math.max(30, l))) + '%)'
  }

  // 饼图引线：用扇形自己的颜色（alpha 提高）——原来的 --stats-line 只有 16%~20% 不透明度，
  // 浅色卡片上几乎看不见（用户 2026-10-05 反馈"线条都快看不清"）
  function statsLineFromColor(color, alpha) {
    var m = /^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/.exec(String(color))
    if (m) return 'hsla(' + m[1] + ', ' + m[2] + '%, ' + m[3] + '%, ' + alpha + ')'
    return color
  }

  // 卡片底色（饼图扇区间隙 / 提示框底色），读主题变量，读不到再按明暗兜底
  function statsCardBg() {
    var v = ''
    try {
      v = (getComputedStyle(document.documentElement).getPropertyValue('--card-bg') || '').trim()
    } catch (e) { }
    return v || (statsIsDark() ? '#121212' : '#ffffff')
  }

  function statsText() {
    return statsIsDark() ? 'rgba(255, 255, 255, 0.88)' : '#1f2d3d'
  }

  function statsMuted() {
    return statsIsDark() ? 'rgba(255, 255, 255, 0.55)' : 'rgba(31, 45, 61, 0.55)'
  }

  function statsLine(strong) {
    var rgb = statsThemeRgb()
    var a = strong ? 0.42 : 0.20
    return 'rgba(' + rgb.join(',') + ', ' + a + ')'
  }

  function statsSoft(alpha) {
    var rgb = statsThemeRgb()
    return 'rgba(' + rgb.join(',') + ', ' + alpha + ')'
  }

  function statsAreaGradient() {
    var rgb = statsThemeRgb()
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: 'rgba(' + rgb.join(',') + ', 0.34)' },
      { offset: 1, color: 'rgba(' + rgb.join(',') + ', 0.02)' }
    ])
  }

  function statsBarGradient() {
    var rgb = statsThemeRgb()
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: statsCss(statsTint(rgb, 0.45)) },
      { offset: 1, color: statsCss(rgb) }
    ])
  }

  // 饼图配色：围绕主题色相左右摆动 + 明度分层，相邻扇形可区分又同属一个色系
  function statsPalette() {
    var hsl = statsRgbToHsl(statsThemeRgb())
    var dark = statsIsDark()
    var steps = [
      [0, 0], [-20, -11], [16, 9], [-34, 15], [30, -6], [8, -17], [-46, 5], [46, 19]
    ]
    return steps.map(function (st) {
      return statsHsl(hsl[0] + st[0], hsl[1], dark ? hsl[2] + st[1] + 8 : hsl[2] + st[1])
    })
  }

  // 提示框统一外观（跟着卡片底色，避免继承 echarts 深浅主题写死的配色）
  function statsTooltip(extra) {
    var tip = {
      confine: true,
      backgroundColor: statsCardBg(),
      borderColor: statsLine(true),
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: statsText(), fontSize: 12 },
      extraCssText: 'border-radius: 10px; box-shadow: 0 10px 26px -14px rgba(7, 17, 27, 0.45);'
    }
    for (var k in extra) { if (extra.hasOwnProperty(k)) tip[k] = extra[k] }
    return tip
  }

  // ===== 1) 分节标题：拆 emoji、补说明 =====

  // 标题尾巴上的 emoji（主题在标题里写了 📃 📌 📇）
  var STATS_EMOJI = /[\u2600-\u27BF\uFE0F\u200D\uD83C-\uDBFF\uDC00-\uDFFF]+$/

  // 说明文字：键＝去掉 emoji 后的标题，改成别的标题就在这里加一条
  var STATS_DESC = {
    '文章发布统计': '近一年每月发文量',
    'Top 10 标签统计图': '文章数最多的 10 个标签',
    '文章分类统计图': '扇形面积代表文章数占比'
  }

  function decorateHeadings() {
    var page = document.getElementById('page')
    if (!page) return
    var centers = page.querySelectorAll(':scope > center')
    Array.prototype.forEach.call(centers, function (center) {
      if (center.getAttribute('data-stats-head') === '1') return
      var font = center.querySelector('font')
      if (!font) return
      var raw = (font.textContent || '').trim()
      var m = raw.match(STATS_EMOJI)
      var ico = m ? m[0] : ''
      var title = raw.replace(STATS_EMOJI, '').trim()
      if (!title) return
      font.textContent = title

      if (ico) {
        var icon = document.createElement('span')
        icon.className = 'stats-ico'
        icon.setAttribute('aria-hidden', 'true')
        icon.textContent = ico
        center.insertBefore(icon, font)
      }

      var desc = STATS_DESC[title]
      if (desc && !center.querySelector('.stats-desc')) {
        var span = document.createElement('span')
        span.className = 'stats-desc'
        span.textContent = desc
        if (font.nextSibling) center.insertBefore(span, font.nextSibling)
        else center.appendChild(span)
      }

      center.setAttribute('data-stats-head', '1')
    })
  }

  // ===== 2) 三张图改成主题色 =====

  // 主题内联脚本里的全局 var：拿到实例才 setOption
  function statsChart(name) {
    var el = window[name]
    return (el && typeof el.setOption === 'function' && !el.isDisposed || el && typeof el.setOption === 'function') ? el : null
  }

  // pjax 重新进入本页时，主题内联脚本里的 \`let postsOption\` 会与上一次执行撞名，
  // 整个 script 被 SyntaxError 中止（"Identifier 'postsOption' has already been declared"）→
  // 文章发布统计图容器成了空壳。这里用旧实例的 option 把图表重建出来，
  // 配色随后由 restyleCharts() 接管；首屏（没有旧实例）交给主题脚本自己跑。
  function statsReviveCharts() {
    if (typeof echarts === 'undefined') return
    var pairs = [['posts-echart', 'postsChart'], ['tag-echarts', 'tagsChart'], ['categories-echarts', 'categoriesChart']]
    var dark = document.documentElement.getAttribute('data-theme') === 'dark'
    for (var i = 0; i < pairs.length; i++) {
      var el = document.getElementById(pairs[i][0])
      // 同名的 <script id="xxx"> 也在文档里，getElementById 取到的是靠前的 div，这里再排除一次
      if (!el || el.tagName === 'SCRIPT' || el.querySelector('canvas')) continue
      var old = window[pairs[i][1]]
      if (!old || typeof old.getOption !== 'function') continue
      var opt = null
      try { opt = old.getOption() } catch (err) { opt = null }
      if (!opt) continue
      try {
        var inst = echarts.init(el, dark ? 'dark' : 'light')
        inst.setOption(opt, true)
        window[pairs[i][1]] = inst
      } catch (err) { }
    }
  }

  function restyleCharts() {
    var accent = statsCss(statsThemeRgb())
    var line = statsLine(false)
    var muted = statsMuted()

    // —— 文章发布折线 ——
    var posts = statsChart('postsChart')
    if (posts) {
      posts.setOption({
        backgroundColor: 'transparent',
        color: [accent],
        tooltip: statsTooltip({
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: accent, width: 1, type: 'dashed' } }
        }),
        grid: { left: 6, right: 22, top: 34, bottom: 4, containLabel: true },
        xAxis: {
          boundaryGap: false,
          axisLine: { lineStyle: { color: line } },
          axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 11, hideOverlap: true }
        },
        yAxis: {
          name: '文章篇数',
          minInterval: 1, // 一年只有 1 篇时，别把刻度切成 0.2/0.4/0.6…
          nameTextStyle: { color: muted, fontSize: 11, align: 'left' },
          axisLine: { show: true, lineStyle: { color: line } },
          axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 11 },
          splitLine: { lineStyle: { color: line, type: 'dashed' } }
        },
        series: [{
          lineStyle: { color: accent, width: 2, shadowBlur: 12, shadowColor: statsSoft(0.35), shadowOffsetY: 6 },
          itemStyle: { color: accent },
          areaStyle: { color: statsAreaGradient() }
        }]
      })
    }

    // —— Top 10 标签柱状 ——
    var tags = statsChart('tagsChart')
    if (tags) {
      tags.setOption({
        backgroundColor: 'transparent',
        tooltip: statsTooltip({}),
        grid: { left: 6, right: 22, top: 34, bottom: 4, containLabel: true },
        xAxis: {
          axisLine: { lineStyle: { color: line } },
          axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 11, interval: 0, hideOverlap: true }
        },
        yAxis: {
          name: '文章篇数',
          nameTextStyle: { color: muted, fontSize: 11 },
          axisLine: { show: true, lineStyle: { color: line } },
          axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 11 },
          splitLine: { show: true, lineStyle: { color: line, type: 'dashed' } }
        },
        series: {
          barMaxWidth: 32,
          itemStyle: { color: statsBarGradient(), borderRadius: [6, 6, 0, 0] },
          emphasis: { itemStyle: { color: statsBarGradient() } },
          markPoint: {
            symbolSize: 40,
            itemStyle: { color: accent },
            label: { color: '#fff', fontSize: 11, fontWeight: 600 },
            // 主题里 markPoint 的两个点各自带 itemStyle.color:'#425aef'，series 级的
            // itemStyle 盖不住它们 → 必须把 data 整组重发、逐项指定颜色
            data: [
              { type: 'max', name: '最大值', itemStyle: { color: accent } },
              { type: 'min', name: '最小值', itemStyle: { color: accent } }
            ]
          },
          markLine: {
            symbol: 'none',
            lineStyle: { color: statsSoft(0.55), width: 1, type: 'dashed' },
            label: { color: muted, fontSize: 11, formatter: '平均 {c}' },
            data: [{
              type: 'average',
              name: '平均值',
              itemStyle: { color: statsSoft(0.55) },
              lineStyle: { color: statsSoft(0.55), type: 'dashed' }
            }]
          }
        }
      })
    }

    // —— 文章分类玫瑰 ——
    var cats = statsChart('categoriesChart')
    if (cats) {
      var palette = statsPalette()
      var pieSeries = {
        radius: ['20%', '66%'],
        center: ['50%', '45%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 6,
          borderColor: statsCardBg(),
          borderWidth: 2
        },
        label: { color: statsText(), fontSize: 12, formatter: '{b} {c}' },
        labelLine: { length: 10, length2: 12, lineStyle: { color: statsLine(true), width: 1.3 } },
        emphasis: { itemStyle: { shadowBlur: 18, shadowColor: statsSoft(0.45) } }
      }
      // echarts.init(el, themeMode) 把主题调色板烘进了每个数据项的视觉里，光改顶层
      // option.color 饼图不会重新上色 → 按原顺序把 data 逐项重发、显式给 itemStyle.color
      var pieData = statsPieData(cats, palette)
      if (pieData) pieSeries.data = pieData
      cats.setOption({
        backgroundColor: 'transparent',
        color: palette,
        tooltip: statsTooltip({ formatter: '{b}：{c} 篇（{d}%）' }),
        legend: {
          top: 'bottom',
          icon: 'circle',
          itemWidth: 9,
          itemHeight: 9,
          itemGap: 16,
          textStyle: { color: muted, fontSize: 12 },
          inactiveColor: line
        },
        series: [pieSeries]
      })
    }
  }

  // 玫瑰图按原顺序重新上色：返回 [{name, value, itemStyle:{color}}]，取不到数据时返回 null
  function statsPieData(chart, palette) {
    var opt = chart && chart.getOption ? chart.getOption() : null
    var src = opt && opt.series && opt.series[0] && opt.series[0].data
    if (!src || !src.length) return null
    return Array.prototype.map.call(src, function (d, i) {
      var color = palette[i % palette.length]
      return {
        name: d.name,
        value: d.value,
        itemStyle: { color: color },
        // 引线用扇形本色（0.72 不透明度）：既看得清，又能一眼把标签和扇形对上
        labelLine: { lineStyle: { color: statsLineFromColor(color, 0.72), width: 1.3 } }
      }
    })
  }

  // ===== 3) 触发时机 =====

  function statsPageReady() {
    return !!document.getElementById('posts-echart')
  }

  function run() {
    if (!statsPageReady()) return // 其它页面直接跳过
    statsReviveCharts()
    decorateHeadings()
    restyleCharts()
  }

  function schedule(delay) {
    window.setTimeout(run, delay || 0)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { schedule(30) })
  } else {
    schedule(30)
  }

  // pjax 换页：图表是换页后由主题内联脚本重建的，多打两枪防它慢一步
  document.addEventListener('pjax:complete', function () {
    schedule(120)
    schedule(700)
  })

  // 主题色（右上角调色盘）/ 明暗模式变化后重画
  function watchTheme() {
    if (!window.MutationObserver) return
    var holder = document.getElementById('themeColor')
    if (holder) {
      new MutationObserver(function () { schedule(0) })
        .observe(holder, { childList: true, characterData: true, subtree: true })
    }
    new MutationObserver(function () { schedule(60) })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchTheme)
  } else {
    watchTheme()
  }
})()
