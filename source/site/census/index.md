---
title: 网站统计
date: 2022-09-15 21:30:00
comments: false
description: 网站访客统计看板：51LA 实时访客数据、GitHub 贡献日历，以及百度统计的访客地域分布、访问趋势与来源构成。
---

<script defer data-pjax src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
<script defer data-pjax src="https://npm.elemecdn.com/echarts@4.9.0/map/js/china.js"></script>
<script defer data-pjax src="/js/census.js"></script>
<link rel="stylesheet" href="/css/census.css?v=20261004">

<div class="census">
<section class="census-sec">
<div class="census-sec__head">
<span class="census-sec__icon">📈</span>
<div class="census-sec__text">
<div class="census-sec__title">网站访客统计</div>
<div class="census-sec__desc"><i class="census-live"></i>51LA 实时数据 · <span id="census-updated">读取中…</span></div>
</div>
<a class="census-sec__link" href="https://v6.51.la/" target="_blank" rel="noopener">51LA<i>↗</i></a>
</div>
<div id="statistic" class="census-kpis" data-state="loading">
<div class="content">
<div class="census-kpi"><span class="census-kpi__icon">🔢</span><span class="census-kpi__label">总访问量</span><span class="census-kpi__num" data-census-field="6">--</span></div>
<div class="census-kpi"><span class="census-kpi__icon">🗓</span><span class="census-kpi__label">本月访问</span><span class="census-kpi__num" data-census-field="5">--</span></div>
<div class="census-kpi"><span class="census-kpi__icon">👥</span><span class="census-kpi__label">今日人数</span><span class="census-kpi__num" data-census-field="1">--</span></div>
<div class="census-kpi"><span class="census-kpi__icon">👣</span><span class="census-kpi__label">今日访问</span><span class="census-kpi__num" data-census-field="2">--</span></div>
<div class="census-kpi"><span class="census-kpi__icon">🧍</span><span class="census-kpi__label">昨日人数</span><span class="census-kpi__num" data-census-field="3">--</span></div>
<div class="census-kpi"><span class="census-kpi__icon">🕘</span><span class="census-kpi__label">昨日访问</span><span class="census-kpi__num" data-census-field="4">--</span></div>
</div>
</div>
</section>
<section class="census-sec">
<div class="census-sec__head">
<span class="census-sec__icon">📊</span>
<div class="census-sec__text">
<div class="census-sec__title">Github 贡献日历</div>
<div class="census-sec__desc">近一年的提交活跃度</div>
</div>
</div>
<div class="census-card census-card--git">
<div id="gitZone"></div>
</div>
</section>
<section class="census-sec">
<div class="census-sec__head">
<span class="census-sec__icon">🌏</span>
<div class="census-sec__text">
<div class="census-sec__title">访客地域分布</div>
<div class="census-sec__desc">按省份统计，颜色越深代表访问次数越多</div>
</div>
</div>
<div class="census-card">
<div id="map-chart" class="census-chart census-chart--map"></div>
</div>
</section>
<section class="census-sec">
<div class="census-sec__head">
<span class="census-sec__icon">📅</span>
<div class="census-sec__text">
<div class="census-sec__title">访客访问趋势</div>
<div class="census-sec__desc">按月汇总，虚线为历史平均值</div>
</div>
</div>
<div class="census-card">
<div id="trends-chart" class="census-chart census-chart--trends"></div>
</div>
</section>
<section class="census-sec">
<div class="census-sec__head">
<span class="census-sec__icon">🎨</span>
<div class="census-sec__text">
<div class="census-sec__title">访客来源构成</div>
<div class="census-sec__desc">按来源渠道拆分，扇形面积代表占比</div>
</div>
</div>
<div class="census-card">
<div id="sources-chart" class="census-chart census-chart--sources"></div>
</div>
</section>
<div class="census-note">
<span>📈 访客数据：<a href="https://v6.51.la/" target="_blank" rel="noopener">51LA</a></span>
<span>🌏 地域 / 趋势 / 来源：<a href="https://tongji.baidu.com/" target="_blank" rel="noopener">百度统计</a></span>
<span>📊 贡献日历：<a href="https://github.com/yourname" target="_blank" rel="noopener">GitHub</a></span>
</div>
</div>

<script>
(function () {
  var statistic = document.getElementById('statistic')
  if (!statistic) return
  var updated = document.getElementById('census-updated')
  // 字段编号沿用 51la quote.js 的顺序：0最近活跃访客 1今日人数 2今日访问 3昨日人数 4昨日访问 5本月访问 6总访问量
  var FIELDS = [1, 2, 3, 4, 5, 6]
  // 千分位：quote.js 只是被当纯文本抓回来，它自带的格式化函数不会执行，所以这里补一个
  var fmt = function (v) {
    return String(v == null || v === '' ? '--' : v).replace(/\d{1,3}(?=(\d{3})+$)/g, function (m) { return m + ',' })
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n }
  fetch('https://v6-widget.51.la/v6/YOUR_51LA_ID/quote.js?theme=#28D2C1,#333333,#484545,#D03E3E,#F4F8F7,#28D2C1,14&col=true&f=14&badge=icon_0&icon=center')
    .then(function (res) { return res.text() })
    .then(function (data) {
      var num = data.match(/(?<=<\/span><span>).*?(?=<\/span><\/p>)/g) || []
      FIELDS.forEach(function (i) {
        var el = statistic.querySelector('[data-census-field="' + i + '"]')
        if (el) el.textContent = fmt(num[i])
      })
      statistic.setAttribute('data-state', 'ready')
      if (updated) {
        var d = new Date()
        updated.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' 更新'
      }
    })
    .catch(function (error) {
      console.log('51la:', error)
      statistic.setAttribute('data-state', 'error')
      if (updated) updated.textContent = '统计数据暂时拿不到，稍后刷新试试'
    })
})()
</script>
