// 标签统计柱状图
hexo.extend.helper.register('tag_ranking_bar', function (options) {
    const { type, id, topNum, title, color, yAxisName, seriesName } = options
    // id 和 type 必须指定
    if (!id || !type) return
    // 获取 tags 标签页信息
    const tagArr = []
    hexo.locals.get('tags').map(function (tag) {
        tagArr.push([tag.name, tag.length])
    })
    // 对数组进行排序，然后取  top 10
    tagArr.sort((x, y) => { return y[0] - x[0] })
    const echarts_obj = {
        tag: tagArr.slice(0, topNum)
    }
    return `
    <script type="text/javascript" id="${id}">
    var themeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    var tagsChart = echarts.init(document.getElementById("${id}"),themeMode);

    // 指定图表的配置项和数据
    var tagsOption = {
        color: "${color}",
        backgroundColor: '',
        title: {
            text: "${title}",
            x: 'center'
        },
        dataset: [
            {
                dimensions: ['name', 'count'],
                source: ${JSON.stringify(echarts_obj[type])}
            },
            {
                transform: {
                    type: 'sort',
                    config: { dimension: 'count', order: 'desc' }
                }
            }
        ],
        tooltip: {},
        xAxis: {
            type: 'category'
        },
        yAxis: {
            name: "${yAxisName}",
            type: 'value',
            splitLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            axisLine: {
                show: true
            }
        },
        series: {
            name: "${seriesName}",
            type: 'bar',
            encode: { x: 'name', y: 'count' },
            datasetIndex: 1,
            itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#2378f7' },
            { offset: 0.7, color: '#2378f7' },
            { offset: 1, color: '#83bff6' }
          ])
        }
      },
            markPoint: {
                symbolSize: 45,
                data: [
                    {
                        type: 'max',
                        itemStyle: { color: '#425aef' },
                        name: '最大值'
                    },
                    {
                        type: 'min',
                        itemStyle: { color: '#425aef' },
                        name: '最小值'
                    }
                ]
            },
            markLine: {
                itemStyle: { color: '#425aef' },
                data: [{ type: 'average', name: '平均值' }]
            }
        }
    };
    // 使用刚指定的配置项和数据显示图表。
    tagsChart.setOption(tagsOption);
    window.addEventListener("resize", () => {
        tagsChart.resize();
    });
    </script>`
})


hexo.extend.helper.register('categories_pic', function (options) {
    const { id, title, seriesName } = options
    // id  必须指定
    if (!id) return
    const categoryArr = []
    hexo.locals.get('categories').map(function (category) {
        categoryArr.push({ name: category.name, value: category.length })
    })
    return `
    <script type="text/javascript" id="${id}">
    var themeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    var categoriesChart = echarts.init(document.getElementById("${id}"),themeMode);
    // 指定图表的配置项和数据
    var categoriesOption = {
        backgroundColor:'',
        title:{
            text:'${title}',
            x:'center'
        },
        tooltip:{
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
            icon: "circle",
            top: 'bottom'
        },
        series: [
            {
            name: '${seriesName}',
            type: 'pie',
            radius: [40, 150],
            center: ['50%', '48%'],
            roseType: 'area',
            itemStyle: {
                borderRadius: 8
            },
            label: {
                formatter: "{b} : {c} ({d}%)"
            },
            data: ${JSON.stringify(categoryArr)}
            }
        ]
        };
    // 使用刚指定的配置项和数据显示图表。
    categoriesChart.setOption(categoriesOption);
    window.addEventListener("resize", () => {
        categoriesChart.resize();
    });
    </script>`
})


hexo.extend.helper.register('posts_echarts', function (options) {
    let { title, id, seriesName } = options
    var moment = require('moment');
    const startDate = moment().subtract(1, 'years').startOf('month')
    const endDate = moment().endOf('month')

    const monthMap = new Map()
    const dayTime = 3600 * 24 * 1000
    for (let time = startDate; time <= endDate; time += dayTime) {
        const month = moment(time).format('YYYY-MM')
        if (!monthMap.has(month)) {
            monthMap.set(month, 0)
        }
    }
    hexo.locals.get('posts').forEach(function (post) {
        const month = post.date.format('YYYY-MM')
        if (monthMap.has(month)) {
            monthMap.set(month, monthMap.get(month) + 1)
        }
    })
    let postsArr = [...monthMap.entries()]
    return `
  <script type="text/javascript" id="${id}">
    var themeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    var postsChart = echarts.init(document.getElementById("${id}"),themeMode);
    let postsOption = {
        color: ['#425aef'],
        title:{
          text:'${title}',
          x:'center'
        },
        tooltip:{
            trigger: 'axis',
               axisPointer: {
                   type: 'shadow',
                   shadowStyle:{
                     color:'rgba(66,90,239,0.3)'
                   }
               },
         },
        xAxis: {
          type: 'category',
          boundaryGap: false
        },
        yAxis: {
          name:'${seriesName}',
          axisLine: {
            show: true
          }
        },
        series: [
          {
            name:'${seriesName}',
            type: 'line',
            smooth:true,
            symbol: 'none',
            lineStyle: {
              color: '#425aef',
              width: 1
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                      offset: 0,
                      color: '#425aef',
                  }, {
                      offset: 1,
                      color: '#FFFFFF'
                  }])
            },
            data: ${JSON.stringify(postsArr)}
          }
        ]
      };
    postsChart.setOption(postsOption);
    window.addEventListener("resize", () => { 
        postsChart.resize();
      });
    </script>`
})