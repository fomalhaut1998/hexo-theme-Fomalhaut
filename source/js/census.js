var start_date = '20200101' // 开始日期
var date = new Date();
var end_date = '' + date.getFullYear() + (date.getMonth() > 8 ? (date.getMonth() + 1) : ("0" + (date.getMonth() + 1))) + (date.getDate() > 9 ? date.getDate() : ("0" + date.getDate())); // 结束日期
// 更新链接 https://openapi.baidu.com/oauth/2.0/token?grant_type=refresh_token&refresh_token=<你的refresh_token>&client_id=<你的client_id>&client_secret=<你的client_secret>
// API Key：{ CLIENT_ID }
// Secret Key：{ CLIENT_SECRET }
// 要看API Key与Secret Key见 http://developer.baidu.com/console#app/27508680
// 如果前面的refresh token不行就用这个
// refresh_token: <你的 refresh_token>
var access_token = 'YOUR_BAIDU_ACCESS_TOKEN' // accessToken（2026-10-01 更新，有效期 30 天；refresh_token 一次性，刷新后须同步第 4/9 行）
var site_id = 'YOUR_BAIDU_SITE_ID' // 网址 id
var dataUrl = 'https://baidu-tongji.example.com/api?access_token=' + access_token + '&site_id=' + site_id
// var dataUrl = 'https://baidu-tongji.example.com/api?site_id=' + site_id
var metrics = 'pv_count' // 统计访问次数 PV 填写 'pv_count'，统计访客数 UV 填写 'visitor_count'，二选一
var metricsName = (metrics === 'pv_count' ? '访问次数' : (metrics === 'visitor_count' ? '访客数' : ''))
// 这里为了统一颜色选取的是“明暗模式”下的两种字体颜色，也可以自己定义
var color = document.documentElement.getAttribute('data-theme') === 'light' ? '#4c4948' : 'rgba(255,255,255,0.7)'

// —— 主题色读取与派生 ——
// 主题色由主题运行时写进 <style id="themeColor">，内容是 :root{--theme-color:rgb(57, 197, 187)}
// 取值来自 source/js/fomal.js 的 setColor()（默认 green），所以只能在运行时读取、不能写死。
function censusThemeRgb() {
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

function censusCss(rgb) {
  return 'rgb(' + rgb.join(', ') + ')'
}

// 与白色混合（ratio 越大越浅），生成同色系的浅色调
function censusTint(rgb, ratio) {
  return rgb.map(function (c) { return Math.round(c + (255 - c) * ratio) })
}

// 与黑色混合（ratio 越大越深），生成同色系的深色调
function censusShade(rgb, ratio) {
  return rgb.map(function (c) { return Math.round(c * (1 - ratio)) })
}

// 按背景亮度挑一个读得清的文字颜色
function censusReadable(rgb) {
  var l = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  return l > 0.6 ? '#2d2d2d' : '#ffffff'
}

// 当前是深色模式吗（主题把明/暗写在 <html data-theme> 上）
function censusIsDark() {
  return document.documentElement.getAttribute('data-theme') !== 'light'
}

// rgb -> hsl，用来围绕主题色相生成同色系序列
function censusRgbToHsl(rgb) {
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

function censusHsl(h, s, l) {
  return 'hsl(' + Math.round(((h % 360) + 360) % 360) + ', ' +
    Math.round(Math.min(92, Math.max(30, s))) + '%, ' +
    Math.round(Math.min(78, Math.max(30, l))) + '%)'
}

// 地图配色：主色 / 浅色调（低值） / 深色调（悬浮高亮） / 无数据省份底色
function censusMapPalette() {
  var rgb = censusThemeRgb()
  var hover = censusShade(rgb, 0.25)
  var dark = censusIsDark()
  return {
    strong: censusCss(rgb),
    pale: censusCss(censusTint(rgb, 0.65)),
    hover: censusCss(hover),
    hoverText: censusReadable(hover),
    // 没有数据的省份 / 省份描边，跟着明暗模式走（原来写死成浅灰，深色模式下会发白）
    none: dark ? '#1e1e1e' : 'rgb(230, 232, 234)',
    border: dark ? '#2b2b2b' : 'rgb(255, 255, 255)'
  }
}

// 卡片底色（环形图扇区间隙 / 描边用），读主题变量，读不到再按明暗兜底
function censusCardBg() {
  var v = ''
  try {
    v = (getComputedStyle(document.documentElement).getPropertyValue('--card-bg') || '').trim()
  } catch (e) { }
  return v || (censusIsDark() ? '#121212' : '#ffffff')
}

// 折线图 / 饼图统一用的主题色系
// 面积渐变：顶端用主题色本身（透明度 .34），底端收干净，比原来写死的绿→青更跟主题
function censusAreaGradient() {
  var rgb = censusThemeRgb()
  return {
    color: censusCss(rgb),
    top: 'rgba(' + rgb.join(',') + ', 0.34)',
    bottom: 'rgba(' + rgb.join(',') + ', 0.02)'
  }
}

// 把上面的渐变端点包成 echarts 的线性渐变对象（主题色变化时要重建）
function censusGradient(line) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: line.top },
    { offset: 1, color: line.bottom }
  ])
}

// 来源饼图配色：围绕主题色相左右摆动 + 明度分层，保证相邻扇形能区分又同属一个色系
function censusSeriesPalette() {
  var hsl = censusRgbToHsl(censusThemeRgb())
  var dark = censusIsDark()
  var steps = [
    [0, 0], [-20, -11], [16, 9], [-34, 15], [30, -6], [8, -17], [-46, 5], [46, 19]
  ]
  return steps.map(function (st) {
    var l = dark ? hsl[2] + st[1] + 8 : hsl[2] + st[1]
    return censusHsl(hsl[0] + st[0], hsl[1] * 0.95, l)
  })
}

// —— 图表加载兜底 ——
// 百度统计接口异常时统一抛出可读错误（例如 token 过期会返回 error_code 111）
function censusResult(data) {
  if (!data || !data.result || !data.result.items) {
    var msg = (data && data.error_code) ? (data.error_code + ' ' + (data.error_msg || '')) : '返回数据格式异常'
    throw new Error('百度统计接口不可用：' + msg)
  }
  return data.result
}

// 图表容器内显示占位提示，避免接口异常时只剩一片空白
function showChartFallback(id, error) {
  var el = document.getElementById(id)
  if (!el || el.getAttribute('data-census-fallback') === '1') return
  el.setAttribute('data-census-fallback', '1')
  var detail = (error && error.message) ? String(error.message) : '网络请求失败'
  var tip = document.createElement('div')
  tip.className = 'census-fallback'
  tip.setAttribute('style', 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:220px;gap:6px;text-align:center;color:' + color + ';opacity:.75;')
  var t1 = document.createElement('div')
  t1.setAttribute('style', 'font-size:15px;')
  t1.textContent = '📉 统计服务暂不可用'
  var t2 = document.createElement('div')
  t2.setAttribute('style', 'font-size:12px;opacity:.8;max-width:90%;word-break:break-all;')
  t2.textContent = detail
  var t3 = document.createElement('div')
  t3.setAttribute('style', 'font-size:12px;opacity:.6;')
  t3.textContent = '数据来源：百度统计 · 稍后刷新重试'
  tip.appendChild(t1); tip.appendChild(t2); tip.appendChild(t3)
  el.appendChild(tip)
}

// 访问地图
function mapChart() {
  let script = document.createElement("script")
  // let paramUrl = '&start_date=' + start_date + '&end_date=' + end_date + '&metrics=' + metrics + '&method=visit/district/a'; // 更换请求地址
  let paramUrl = '&start_date=' + start_date + '&end_date=' + end_date + '&metrics=' + metrics + '&method=overview/getDistrictRpt';
  fetch(dataUrl + paramUrl).then(data => data.json()).then(data => {
    let result = censusResult(data)
    let mapName = result.items[0]
    let mapValue = result.items[1]
    let mapArr = []
    let max = mapValue[0][0]
    for (let i = 0; i < mapName.length; i++) {
      // mapArr.push({ name: mapName[i][0].name, value: mapValue[i][0] })
      mapArr.push({ name: mapName[i][0], value: mapValue[i][0] })
    }
    let mapArrJson = JSON.stringify(mapArr)
    let mapPalette = censusMapPalette()
    script.innerHTML = `
      var mapChart = echarts.init(document.getElementById('map-chart'), 'light');
      var mapOption = {
        title: {
          show: false, // 标题已移到 HTML 卡片头部（census.css），这里只留占位对象供 switchVisitChart 改色
          text: '网站访客地域分布图🌏',
          x: 'center',
          textStyle: {
            color: '${color}'
          }
        },
        tooltip: {
          trigger: 'item'
        },
        visualMap: {
          min: 0,
          max: ${max},
          left: 'left',
          top: 'bottom',
          text: ['多','少'],
          color: ['${mapPalette.strong}', '${mapPalette.pale}'],
          textStyle: {
            color: '${color}'
          },
          calculable: true
        },
        series: [{
          name: '${metricsName}',
          type: 'map',
          mapType: 'china',
          showLegendSymbol: false,
          label: {
            normal: {
              show: false
            },
            emphasis: {
              show: true,
              color: '${mapPalette.hoverText}'
            }
          },
          itemStyle: {
            normal: {
              areaColor: '${mapPalette.none}',
              borderColor: '${mapPalette.border}',
              borderWidth: 1
            },
            emphasis: {
              areaColor: '${mapPalette.hover}'
            }
          },
          data: ${mapArrJson}
        }]
      };
      mapChart.setOption(mapOption);
      window.addEventListener("resize", () => { 
        mapChart.resize();
      });`
    document.getElementById('map-chart').after(script);
  }).catch(function (error) {
    console.log('mapChart:', error);
    showChartFallback('map-chart', error);
  });
}

// 访问趋势
function trendsChart() {
  let script = document.createElement("script")
  let paramUrl = '&start_date=' + start_date + '&end_date=' + end_date + '&metrics=' + metrics + '&method=trend/time/a&gran=month'
  fetch(dataUrl + paramUrl).then(data => data.json()).then(data => {
    let monthArr = []
    let monthValueArr = []
    let result = censusResult(data)
    let monthName = result.items[0]
    let monthValue = result.items[1]
    for (let i = monthName.length - 1; i >= 0; i--) {
      monthArr.push(monthName[i][0].substring(0, 7).replace('/', '-'))
      monthValueArr.push(monthValue[i][0] !== '--' ? monthValue[i][0] : 0)
    }
    let monthArrJson = JSON.stringify(monthArr)
    let monthValueArrJson = JSON.stringify(monthValueArr)
    // 面积渐变跟随主题色（模板字符串在下面插值）
    let line = censusAreaGradient()
    script.innerHTML = `
      var trendsChart = echarts.init(document.getElementById('trends-chart'), 'light');
      var trendsOption = {
        title: {
          show: false, // 标题已移到 HTML 卡片头部
          text: '网站访客日期分布图📅',
          x: 'center',
          textStyle: {
            color: '${color}'
          }
        },
        // 没有 echarts 标题了，显式收一下绘图区，避免顶部留一大块空白
        grid: { top: 16, left: 8, right: 18, bottom: 6, containLabel: true },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          name: '日期',
          type: 'category',
          boundaryGap: false,
          nameTextStyle: {
            color: '${color}'
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: true,
            color: '${color}'
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '${color}'
            }
          },
          data: ${monthArrJson}
        },
        yAxis: {
          name: '${metricsName}',
          type: 'value',
          nameTextStyle: {
            color: '${color}'
          },
          splitLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: true,
            color: '${color}'
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '${color}'
            }
          }
        },
        series: [{
          name: '${metricsName}',
          type: 'line',
          smooth: true,
          // 底下铺色带，上面压一条同主题色的细线，比纯色块更像「趋势」
          lineStyle: {
            width: 2,
            color: '${line.color}'
          },
          showSymbol: false,
          itemStyle: {
            opacity: 1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
              offset: 0,
              color: '${line.top}'
            },
            {
              offset: 1,
              color: '${line.bottom}'
            }])
          },
          areaStyle: {
            opacity: 1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
              offset: 0,
              color: '${line.top}'
            }, {
              offset: 1,
              color: '${line.bottom}'
            }])
          },
          data: ${monthValueArrJson},
          markLine: {
            data: [{
              name: '平均值',
              type: 'average',
              label: {
                color: '${color}'
              }
            }]
          }
        }]
      };
      trendsChart.setOption(trendsOption);
      window.addEventListener("resize", () => { 
        trendsChart.resize();
      });`
    document.getElementById('trends-chart').after(script);
  }).catch(function (error) {
    console.log('trendsChart:', error);
    showChartFallback('trends-chart', error);
  });
}

// 访问来源
function sourcesChart() {
  let script = document.createElement("script")
  let paramUrl = '&start_date=' + start_date + '&end_date=' + end_date + '&metrics=' + metrics + '&method=source/all/a';
  fetch(dataUrl + paramUrl).then(data => data.json()).then(data => {
    let result = censusResult(data)
    let sourcesName = result.items[0]
    let sourcesValue = result.items[1]
    let sourcesArr = []
    for (let i = 0; i < sourcesName.length; i++) {
      sourcesArr.push({ name: sourcesName[i][0].name, value: sourcesValue[i][0] })
    }
    let sourcesArrJson = JSON.stringify(sourcesArr)
    // 饼图配色跟随主题色
    let sourcesPaletteJson = JSON.stringify(censusSeriesPalette())
    // 环形扇区之间的留白缝隙 = 卡片底色
    let sourcesBorder = censusCardBg()
    script.innerHTML = `
      var sourcesChart = echarts.init(document.getElementById('sources-chart'), 'light');
      var sourcesOption = {
        title: {
          show: false, // 标题已移到 HTML 卡片头部
          text: '网站访客来源分布图🎨',
          x: 'center',
          textStyle: {
            color: '${color}'
          }
        },
        color: ${sourcesPaletteJson},
        legend: {
          top: 'bottom',
          textStyle: {
            color: '${color}'
          }
        },
        tooltip: {
          trigger: 'item'
        },
        series: [{
          name: '${metricsName}',
          type: 'pie',
          // 原来是 radius [34,92] + roseType 'area'：扇形半径按数值缩放，而这份数据极度倾斜
          // （直接访问 86.7% / 外部链接 13% / 搜索引擎 0.25% / 自定义来源 0.01%），
          // 结果三个来源缩成看不见的细线、整张图只剩一把"扇子"。改成规整环形图，
          // 并用 minAngle 保住极小占比的可见性。
          radius: ['52%', '80%'],
          center: ['50%', '47%'],
          minAngle: 6,
          avoidLabelOverlap: true,
          label: {
            color: '${color}',
            formatter: "{b} : {c} ({d}%)"
          },
          labelLine: {
            lineStyle: {
              color: '${color}'
            }
          },
          data: ${sourcesArrJson},
          itemStyle: {
            borderColor: '${sourcesBorder}',
            borderWidth: 2,
            emphasis: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(255, 255, 255, 0.5)'
            }
          }
        }]
      };
      sourcesChart.setOption(sourcesOption);
      window.addEventListener("resize", () => { 
        sourcesChart.resize();
      });`
    document.getElementById('sources-chart').after(script);
  }).catch(function (error) {
    console.log('sourcesChart:', error);
    showChartFallback('sources-chart', error);
  });
}

function switchVisitChart() {
  // 这里为了统一颜色选取的是“明暗模式”下的两种字体颜色，也可以自己定义
  let color = document.documentElement.getAttribute('data-theme') === 'light' ? '#4c4948' : 'rgba(255,255,255,0.7)'
  if (document.getElementById('map-chart') && mapOption) {
    try {
      let mapOptionNew = mapOption
      mapOptionNew.title.textStyle.color = color
      mapOptionNew.visualMap.textStyle.color = color
      mapChart.setOption(mapOptionNew)
    } catch (error) {
      console.log(error)
    }
  }
  if (document.getElementById('trends-chart') && trendsOption) {
    try {
      let trendsOptionNew = trendsOption
      trendsOptionNew.title.textStyle.color = color
      trendsOptionNew.xAxis.nameTextStyle.color = color
      trendsOptionNew.yAxis.nameTextStyle.color = color
      trendsOptionNew.xAxis.axisLabel.color = color
      trendsOptionNew.yAxis.axisLabel.color = color
      trendsOptionNew.xAxis.axisLine.lineStyle.color = color
      trendsOptionNew.yAxis.axisLine.lineStyle.color = color
      trendsOptionNew.series[0].markLine.data[0].label.color = color
      trendsChart.setOption(trendsOptionNew)
    } catch (error) {
      console.log(error)
    }
  }
  if (document.getElementById('sources-chart') && sourcesOption) {
    try {
      let sourcesOptionNew = sourcesOption
      sourcesOptionNew.title.textStyle.color = color
      sourcesOptionNew.legend.textStyle.color = color
      sourcesOptionNew.series[0].label.color = color
      sourcesChart.setOption(sourcesOptionNew)
    } catch (error) {
      console.log(error)
    }
  }
  // 这个函数挂在 document 的 click 上，顺手当作「明暗模式变了没」的检测点：
  // 变了就整块重算配色（地图底色、折线渐变、饼图调色板都依赖明暗）
  var dark = censusIsDark()
  if (dark !== censusLastDark) {
    censusLastDark = dark
    applyCensusThemeColor()
  }
}

// 记录上一次渲染时的明暗模式（主题色切换由 MutationObserver 兜住）
var censusLastDark = censusIsDark()

// 主题色在运行时被切换时（设置面板里换色），重新给三张图绑定配色
// 注意：地图的底色/描边、折线的渐变、饼图的调色板都跟主题色和明暗模式有关，一起刷新
function applyCensusThemeColor() {
  try {
    if (typeof mapChart !== 'undefined' && mapChart && typeof mapChart.setOption === 'function' &&
      typeof mapOption !== 'undefined' && mapOption && mapOption.series) {
      var p = censusMapPalette()
      mapOption.visualMap.color = [p.strong, p.pale]
      mapOption.series[0].itemStyle.normal.areaColor = p.none
      mapOption.series[0].itemStyle.normal.borderColor = p.border
      mapOption.series[0].itemStyle.emphasis.areaColor = p.hover
      mapOption.series[0].label.emphasis.color = p.hoverText
      mapChart.setOption(mapOption)
    }
    if (typeof trendsChart !== 'undefined' && trendsChart && typeof trendsChart.setOption === 'function' &&
      typeof trendsOption !== 'undefined' && trendsOption && trendsOption.series) {
      var line = censusAreaGradient()
      trendsOption.series[0].lineStyle.color = line.color
      trendsOption.series[0].itemStyle.color = censusGradient(line)
      trendsOption.series[0].areaStyle.color = censusGradient(line)
      trendsChart.setOption(trendsOption)
    }
    if (typeof sourcesChart !== 'undefined' && sourcesChart && typeof sourcesChart.setOption === 'function' &&
      typeof sourcesOption !== 'undefined' && sourcesOption && sourcesOption.series) {
      sourcesOption.color = censusSeriesPalette()
      // 扇区缝隙用卡片底色，明暗切换后必须跟着换，否则深色下会留一圈白缝
      if (sourcesOption.series[0].itemStyle) {
        sourcesOption.series[0].itemStyle.borderColor = censusCardBg()
      }
      sourcesChart.setOption(sourcesOption)
    }
  } catch (error) {
    console.log('applyCensusThemeColor:', error)
  }
}

// 换主题色 = 改 <style id="themeColor"> 的文本，所以用 MutationObserver 跟着变
function watchCensusThemeColor() {
  var el = document.getElementById('themeColor')
  if (!el || !window.MutationObserver) return
  new window.MutationObserver(function () { applyCensusThemeColor() })
    .observe(el, { childList: true, characterData: true, subtree: true })
}
watchCensusThemeColor()

if (document.getElementById('map-chart')) mapChart()
if (document.getElementById('trends-chart')) trendsChart()
if (document.getElementById('sources-chart')) sourcesChart()

// 切换夜间模式字体颜色适应
var censusTimer;
try {
  document.addEventListener("click", function () {
    clearTimeout(censusTimer);
    censusTimer = setTimeout(switchVisitChart, 100);
  });
} catch (err) { }
