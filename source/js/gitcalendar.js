/* GitHub 贡献日历的调色板：跟随站点主题色 --theme-color，不再写死一套绿色。
   [0] 是「没有提交」的格子（中性灰 + 透明度，白天/夜间都自动合适），
   [1]~[9] 是主题色由浅到深（用透明度叠加，不依赖 color-mix，老浏览器也能用）。
   读不到 --theme-color（或值不是 rgb/#hex）时返回 null，调用方继续用配置里那套颜色兜底。 */
function git_theme_palette() {
  try {
    var raw = (getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || '').trim();
    var r, g, b, m = raw.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
    if (m) {
      r = Math.round(+m[1]); g = Math.round(+m[2]); b = Math.round(+m[3]);
    } else {
      var h = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!h) return null;
      var v = h[1];
      if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      r = parseInt(v.slice(0, 2), 16); g = parseInt(v.slice(2, 4), 16); b = parseInt(v.slice(4, 6), 16);
    }
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return null;
    var base = r + ',' + g + ',' + b;
    var ramp = [0, .16, .28, .4, .52, .64, .76, .86, .94, 1];
    var out = ['rgba(128,134,140,.22)'];
    for (var i = 1; i < ramp.length; i++) out.push('rgba(' + base + ',' + ramp[i] + ')');
    out.push('rgba(' + base + ',1)');
    return out;
  } catch (e) { return null; }
}

/* 主题色变化后重画日历（美化面板里的 setColor 会调它）。
   调色板在 init 里实时推导，所以这里重新 init 一次即可拿到新颜色；
   但只有「主题色真的和画布上那份不一样」才动手，否则原地跳过。 */
function GitCalendarRefresh() {
  if (!window.__gitCalendarArgs) return false;
  var box = document.getElementById('git_container');
  if (!box) return false;
  var git_now = (getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || '').trim();
  if (!git_now || git_now === git_painted_theme) return false;
  box.innerHTML = '';
  box.removeAttribute('data-gitcalendar-fallback');
  GitCalendarInit(window.__gitCalendarArgs[0], window.__gitCalendarArgs[1], window.__gitCalendarArgs[2]);
  return true;
}

/* 每次初始化都会领一个递增的编号；旧的那次 fetch 回来时发现自己已经不是最新，就整段丢弃。
   这样「页面刚打开就切主题色」「连点两下颜色」这类并发都不会叠出两份画布。

   【编号必须挂在 window 上，不能只用文件级 var】本站是 pjax 换页，换页时是「先跑内联脚本、
   带 data-pjax 的 <script src> 才异步下载执行」：内联脚本里那句 GitCalendarInit 已经领了号、
   发出了 fetch，随后本文件被重新执行 —— 文件级 var 会被重置回 0，正在路上的那次 fetch 回来
   一比就不相等、整段丢弃，日历于是永远停在转圈（用户 2026-10-08 报的「点进网站统计页一直
   转圈、刷新一下就好」）。挂在 window 上，重复执行不会把序号清零，守卫照样拦得住旧的请求。 */
window.__gitInitSeq = window.__gitInitSeq || 0;

/* 画布当前（或正在路上）这一份所依据的主题色值。用它来判断「要不要重画」：
   和现在一样就什么都不做 —— 页面加载时那次 setColor 正是这种情况，插手会和首次渲染撞车；
   不一样才清空重画（换主题色、「恢复默认设置」都走这条路）。 */
var git_painted_theme = '';

function GitCalendarInit(git_gitapiurl, git_color, git_user) {
  if (document.getElementById('git_container')) {
    /* 记住原始参数，主题色变了才好在原地重画（见 GitCalendarRefresh） */
    window.__gitCalendarArgs = [git_gitapiurl, git_color, git_user];
    var git_themecolor = git_theme_palette();
    if (git_themecolor) git_color = git_themecolor;
    git_painted_theme = (getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || '').trim();
    var git_seq = ++window.__gitInitSeq;
    var git_canlendar = (git_user, git_gitapiurl, git_color) => {
      var git_fixed = 'fixed';
      var git_px = 'px';
      var git_month = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
      var git_monthchange = [];
      var git_oneyearbeforeday = '';
      var git_thisday = '';
      var git_amonthago = '';
      var git_aweekago = '';
      var git_weekdatacore = 0;
      var git_datacore = 0;
      var git_total = 0;
      var git_datadate = '';
      var git_git_data = [];
      var git_positionplusdata = [];
      var git_firstweek = [];
      var git_lastweek = [];
      var git_beforeweek = [];
      var git_thisweekdatacore = 0;
      var git_mounthbeforeday = 0;
      var git_mounthfirstindex = 0;
      var git_crispedges = 'crispedges';
      var git_thisdayindex = 0;
      var git_amonthagoindex = 0;
      var git_amonthagoweek = [];
      var git_firstdate = [];
      var git_first2date = [];
      var git_montharrbefore = [];
      var git_monthindex = 0;

      var retinaCanvas = (canvas, context, ratio) => {
        if (ratio > 1) {
          var canvasWidth = canvas.width;
          var canvasHeight = canvas.height;
          canvas.width = canvasWidth * ratio;
          canvas.height = canvasHeight * ratio;
          canvas.style.width = '100%';
          canvas.style.height = canvasHeight + 'px';
          context.scale(ratio, ratio);
        }
      }

      // 圆角矩形填充（arcTo 手写路径，兼容不支持 ctx.roundRect 的浏览器）
      var git_fillroundrect = (ctx, x, y, w, h, r) => {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
      }

      var responsiveChart = () => {
        if (document.getElementById("gitcanvas")) {
          var git_tooltip_container = document.getElementById('git_tooltip_container');
          var ratio = window.devicePixelRatio || 1
          var git_x = '';
          var git_y = '';
          var git_span1 = '';
          var git_span2 = '';
          var git_calendar_c = document.getElementById("gitcanvas");
          git_calendar_c.style.width = '100%';
          git_calendar_c.style.height = '';
          var cmessage = document.getElementById("gitmessage");
          var git_calendar_ctx = git_calendar_c.getContext("2d");
          width = git_calendar_c.width = document.getElementById("gitcalendarcanvasbox").offsetWidth;
          height = git_calendar_c.height = 9 * 0.96 * git_calendar_c.width / git_data.length;
          retinaCanvas(git_calendar_c, git_calendar_ctx, ratio)
          var linemaxwitdh = height / 9;
          var lineminwitdh = 0.8 * linemaxwitdh;
          var setposition = {
            x: 0.02 * width,
            y: 0.025 * width
          };
          for (var week in git_data) {
            weekdata = git_data[week];
            for (var day in weekdata) {
              var dataitem = {
                date: "",
                count: "",
                x: 0,
                y: 0
              };
              git_positionplusdata.push(dataitem);
              git_calendar_ctx.fillStyle = git_thiscolor(git_color, weekdata[day].count);
              setposition.y = Math.round(setposition.y * 100) / 100;
              dataitem.date = weekdata[day].date;
              dataitem.count = weekdata[day].count;
              dataitem.x = setposition.x;
              dataitem.y = setposition.y;
              // 圆角小方块：半径 = 边长 30%（上限半边长），小方块自动退化
              git_fillroundrect(git_calendar_ctx, setposition.x, setposition.y, lineminwitdh, lineminwitdh, lineminwitdh * 0.3);
              setposition.y = setposition.y + linemaxwitdh
            }
            setposition.y = 0.025 * width;
            setposition.x = setposition.x + linemaxwitdh;
          }
          if (document.body.clientWidth > 700) {
            git_calendar_ctx.font = "600  Arial";
            git_calendar_ctx.fillStyle = '#aaa';
            git_calendar_ctx.fillText("日", 0, 1.9 * linemaxwitdh);
            git_calendar_ctx.fillText("二", 0, 3.9 * linemaxwitdh);
            git_calendar_ctx.fillText("四", 0, 5.9 * linemaxwitdh);
            git_calendar_ctx.fillText("六", 0, 7.9 * linemaxwitdh);
            var monthindexlist = git_calendar_c.width / 24;
            for (var index in git_monthchange) {
              git_calendar_ctx.fillText(git_monthchange[index], monthindexlist, 0.7 * linemaxwitdh);
              monthindexlist = monthindexlist + git_calendar_c.width / 12
            }
          }
          git_calendar_c.onmousemove = function(event) {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = ""
            }
            getMousePos(git_calendar_c, event)
          };
          git_tooltip_container.onmousemove = function(event) {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = ""
            }
          };

          var getMousePos = (canvas, event) => {
            var rect = canvas.getBoundingClientRect();
            var x = event.clientX - rect.left * (canvas.width / rect.width);
            var y = event.clientY - rect.top * (canvas.height / rect.height);
            for (var item of git_positionplusdata) {
              var lenthx = x - item.x;
              var lenthy = y - item.y;
              if (0 < lenthx && lenthx < lineminwitdh) {
                if (0 < lenthy && lenthy < lineminwitdh) {
                  git_span1 = item.date;
                  git_span2 = item.count;
                  git_x = event.clientX - 100;
                  git_y = event.clientY - 60;
                  html = tooltip_html(git_x, git_y, git_span1, git_span2);
                  append_div_gitcalendar(git_tooltip_container, html)
                }
              }
            }
          }
        }
      }

      var addlastmonth = () => {
        if (git_thisdayindex === 0) {
          thisweekcore(52);
          thisweekcore(51);
          thisweekcore(50);
          thisweekcore(49);
          thisweekcore(48);
          git_thisweekdatacore += git_firstdate[6].count;
          git_amonthago = git_firstdate[6].date
        } else {
          thisweekcore(52);
          thisweekcore(51);
          thisweekcore(50);
          thisweekcore(49);
          thisweek2core();
          git_amonthago = git_first2date[git_thisdayindex - 1].date
        }
      }

      var thisweek2core = () => {
        for (var i = git_thisdayindex - 1; i < git_first2date.length; i++) {
          git_thisweekdatacore += git_first2date[i].count
        }
      }

      var thisweekcore = (index) => {
        for (var item of git_data[index]) {
          git_thisweekdatacore += item.count
        }
      }

      var addlastweek = () => {
        for (var item of git_lastweek) {
          git_weekdatacore += item.count
        }
      }

      var addbeforeweek = () => {
        for (var i = git_thisdayindex; i < git_beforeweek.length; i++) {
          git_weekdatacore += git_beforeweek[i].count
        }
      }

      var addweek = (data) => {
        if (git_thisdayindex === 6) {
          git_aweekago = git_lastweek[0].date;
          addlastweek()
        } else {
          lastweek = data.contributions[51];
          git_aweekago = lastweek[git_thisdayindex + 1].date;
          addlastweek();
          addbeforeweek()
        }
      }

      fetch(git_gitapiurl).then(data => data.json()).then(data => {
        if (git_seq !== window.__gitInitSeq) { return }  // 已经被更新的一次初始化取代，丢弃这次结果
        if (document.getElementById('git_loading')) {
          document.getElementById('git_loading').remove()
        };
        git_data = data.contributions;
        git_total = data.total;
        git_first2date = git_data[48];
        git_firstdate = git_data[47];
        git_firstweek = data.contributions[0];
        git_lastweek = data.contributions[52];
        git_beforeweek = data.contributions[51];
        git_thisdayindex = git_lastweek.length - 1;
        git_thisday = git_lastweek[git_thisdayindex].date;
        git_oneyearbeforeday = git_firstweek[0].date;
        git_monthindex = git_thisday.substring(5, 7) * 1;
        git_montharrbefore = git_month.splice(git_monthindex, 12 - git_monthindex);
        git_monthchange = git_montharrbefore.concat(git_month);
        addweek(data);
        addlastmonth();
        var html = git_main_box(git_monthchange, git_data, git_user, git_color, git_total, git_thisweekdatacore, git_weekdatacore, git_oneyearbeforeday, git_thisday, git_aweekago, git_amonthago);
        git_container.innerHTML = '';  // 只保留这一份渲染结果，重复初始化时不会叠出两份画布
        append_div_gitcalendar(git_container, html);
        responsiveChart()
      }).catch(function(error) {
        if (git_seq !== window.__gitInitSeq) { return }  // 同上：别让旧的失败结果盖住新的渲染
        // —— 本站补丁（2026-10-01）——
        // 原版只在这里 console.log，加载动画 #git_loading 永远不会被摘掉，页面会一直转圈。
        // 任何失败（接口 500、返回的不是 JSON、数据形状不对）都必须收尾：摘掉转圈 + 原地给出提示。
        console.log('GitCalendar:', error);
        var git_loading_el = document.getElementById('git_loading');
        if (git_loading_el) { git_loading_el.remove() }
        var git_fallback_box = document.getElementById('git_container') || git_container;
        if (git_fallback_box && !git_fallback_box.getAttribute('data-gitcalendar-fallback')) {
          git_fallback_box.setAttribute('data-gitcalendar-fallback', '1');
          git_fallback_box.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:220px;gap:6px;text-align:center;opacity:.75;">'
            + '<div style="font-size:15px;">📅 贡献日历暂不可用</div>'
            + '<div style="font-size:12px;opacity:.8;">数据来源：GitHub · 稍后刷新重试</div>'
            + '</div>'
        }
      });
      window.onresize = function() {
        responsiveChart()
      };
      window.onscroll = function() {
        if (document.querySelector('.gitmessage')) {
          git_tooltip_container.innerHTML = ""
        }
      };
      var git_thiscolor = (color, x) => {
        if (x === 0) {
          var i = parseInt(x / 2);
          return color[0]
        } else if (x < 2) {
          return color[1]
        } else if (x < 20) {
          var i = parseInt(x / 2);
          return color[i]
        } else {
          return color[9]
        }
      };
      var tooltip_html = (x, y, span1, span2) => {
        var html = '';
        html += `<div class="gitmessage" style="top:${y}px;left: ${x}px;position: fixed;z-index:9999">
                          <div class="angle-wrapper" style="display:block;">
                            <span>${span1}&nbsp;</span>
                            <span>${span2}次上传</span>
                          </div>
                        </div>`;
        return html
      };
      var git_canvas_box = () => {
        var html = `<div id="gitcalendarcanvasbox">
                              <canvas id="gitcanvas" style="animation: none;">
                              </canvas>
                            </div>`;
        return html
      };
      var git_info_box = (user, color) => {
        var html = '';
        html += `<div id="git_tooltip_container"></div>
                        <div class="contrib-footer clearfix mt-1 mx-3 px-3 pb-1">
                          <div class="float-left text-gray">数据来源
                            <a href="https://github.com/${user}" target="blank">@${user}</a>
                          </div>
                          <div class="contrib-legend text-gray">Less
                            <ul class="legend">
                            <li style="background-color:${color[0]}"></li>
                            <li style="background-color:${color[2]}"></li>
                            <li style="background-color:${color[4]}"></li>
                            <li style="background-color:${color[6]}"></li>
                            <li style="background-color:${color[8]}"></li>
                            </ul>More
                          </div>
                        </div>`;
        return html
      };
      var git_main_box = (monthchange, git_data, user, color, total, thisweekdatacore, weekdatacore, oneyearbeforeday, thisday, aweekago, amonthago) => {
        var html = '';
        var canvasbox = git_canvas_box();
        var infobox = git_info_box(user, color);
        html += `<div class="position-relative">
                          <div class="border py-2 graph-before-activity-overview">
                            <div class="js-gitcalendar-graph mx-md-2 mx-3 d-flex flex-column flex-items-end flex-xl-items-center overflow-hidden pt-1 is-graph-loading graph-canvas gitcalendar-graph height-full text-center">
                              ${canvasbox}
                            </div>
                            ${infobox}
                          </div>
                        </div>`;

        html += `<div style="display:flex;width:100%">
                          <div class="contrib-column contrib-column-first table-column">
                            <span class="text-muted">过去一年提交</span>
                            <span class="contrib-number">${total}</span>
                            <span class="text-muted">${oneyearbeforeday}&nbsp;-&nbsp;${thisday}</span>
                          </div>
                          <div class="contrib-column table-column">
                            <span class="text-muted">最近一月提交</span>
                            <span class="contrib-number">${thisweekdatacore}</span>
                            <span class="text-muted">${amonthago}&nbsp;-&nbsp;${thisday}</span>
                          </div>
                          <div class="contrib-column table-column">
                            <span class="text-muted">最近一周提交</span>
                            <span class="contrib-number">${weekdatacore}</span>
                            <span class="text-muted">${aweekago}&nbsp;-&nbsp;${thisday}</span>
                          </div>
                        </div>`;
        return html
      };
    };
    var append_div_gitcalendar = (parent, text) => {
      if (typeof text === 'string') {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        var frag = document.createDocumentFragment();
        while (temp.firstChild) {
          frag.appendChild(temp.firstChild)
        }
        parent.appendChild(frag)
      } else {
        parent.appendChild(text)
      }
    };
    var git_container = document.getElementById('git_container');
    var git_loading = document.getElementById('git_loading');
    git_canlendar(git_user, git_gitapiurl, git_color)
  }
}
