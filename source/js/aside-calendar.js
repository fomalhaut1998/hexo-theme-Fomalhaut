/*!
 * aside-calendar.js —— 侧栏「日历卡 + 倒计时卡」
 * ==================================================================
 * 两张卡片，分别渲染进 source/_data/widget.yml 里 id 为 aside-calendar /
 * aside-countdown 的两个空壳容器（html 里只有占位文字，内容全由本文件生成）：
 *
 *   1) 日历卡    第39周 周四   |  日 一 二 三 四 五 六
 *                01          |  4  5  6  7  8  9 10
 *                2026年10月 第274天 | 11 12 13 14 15 16 17 …（当月迷你月历，今天高亮）
 *                丙午马年 八月廿一
 *
 *   2) 倒计时卡  距离春节 / 128 / 2027-02-06
 *                本年 [======= 75.06% =======] 还剩 91 天
 *                本月 [= 3.55%                ] 还剩 30 天
 *                本周 [====== 56.65% ======   ] 还剩 3 天
 *
 * 依赖：lunar.js 暴露的全局 solar2lunar() 与 calendarFormatter.lunar2solar()（必须在本文件之前加载，
 *       加载顺序见 _config.fomalhaut.yml 的 inject.bottom；缺了也能跑，只是没有农历那行）
 * 样式：source/css/aside-calendar.css
 *
 * 要改东西？看下面 CONFIG 一段就够了：
 *   weekStart      一周从哪天开始（1 = 周一起算，进度条「本周」用它）0 = 周日
 *   gridWeekStart  月历表头第一列（0 = 日一二三四五六，与截图一致）
 *   target         倒计时目标，农历写 lunarMonth/lunarDay，公历写 solar: [月, 日]
 *
 * 调试：控制台 fomalAsideCalendar.compute()          看今天算出来的全部数字
 *       fomalAsideCalendar.setNow(new Date(2026, 9, 1, 21, 0, 0))  假造时间看效果
 *       fomalAsideCalendar.renderAll()               手动重绘
 * 刷新：脚本每 60 秒自己重算一次（进度条会缓慢往前走），跨零点自动换日 / 换月历，
 *       所以页面挂着不关也不会显示过期日期。
 */
(function (global) {
  'use strict';

  /* ============================================================
   *  配置
   * ============================================================ */
  var CONFIG = {
    todayEl: 'aside-calendar',      // 日历卡容器 id（见 source/_data/widget.yml）
    countdownEl: 'aside-countdown', // 倒计时卡容器 id
    weekStart: 1,                   // 1 = 周一是一周开头（「本周」进度按它算）；0 = 周日
    gridWeekStart: 0,               // 月历表头第一列：0 = 日 一 二 三 四 五 六
    weekCn: ['日', '一', '二', '三', '四', '五', '六'],
    // 「第几周」怎么算：'iso' = ISO-8601（含当年第一个周四的那一周算第 1 周，本站默认）
    //                  'doy' = 1 月 1 日起每 7 天算一周（参考 APP 是这种算法）
    weekMode: 'iso',
    // 倒计时目标：农历正月初一 = 春节。想换成元旦就写 { label: '元旦', solar: [1, 1] }
    target: { label: '春节', lunarMonth: 1, lunarDay: 1, unit: '天' },
    // 日出日落 / 节气那一行用的坐标。latLng 写了就用它（[纬度, 经度]），
    // 留 null = 用访客 IP 定位（fomal.js 已经请求了腾讯的位置接口），拿不到就按
    // fallbackLat + 访客时区推出的经度估算，够显示用。
    sun: { latLng: null, fallbackLat: 22.5319 },
    // 访客自己没选过深浅色时，按当天真实日出日落决定日间 / 夜间（详见 applyDayNight）
    dayNight: { enable: true, themeKey: 'theme' },
    tickMs: 60000                   // 自动重算间隔，0 = 关掉
  };

  /* ============================================================
   *  纯计算层（不碰 DOM，方便单独调试 / 复用）
   * ============================================================ */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function startOfDay(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
  }

  // m: 1-12，返回该月天数
  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function daysInYear(y) {
    return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
  }

  function dayOfYear(d) {
    return Math.round((startOfDay(d) - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1;
  }

  // 今天已经过去了几分之几天（含时分秒），进度条用它让数字慢慢动
  function dayFrac(d) {
    return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  }

  // ISO-8601 周序号：第 1 周 = 含当年第一个周四的那一周
  function isoWeek(d) {
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + 3);   // 移到本周周四
    var isoYear = t.getFullYear();
    var jan4 = new Date(isoYear, 0, 4);
    var week1Thu = new Date(isoYear, 0, 4 - ((jan4.getDay() + 6) % 7) + 3);
    return 1 + Math.round((t - week1Thu) / 604800000);
  }

  function weekdayCn(d) {
    return '周' + CONFIG.weekCn[d.getDay()];
  }

  // 「第几周」：默认 ISO-8601；改成 CONFIG.weekMode = 'doy' 就跟着参考 APP 那套走
  function weekNumber(d) {
    if (CONFIG.weekMode === 'doy') return Math.max(1, Math.floor(dayOfYear(d) / 7));
    return isoWeek(d);
  }

  // 农历信息（solar2lunar 来自 lunar.js）；拿不到返回 null
  function lunarInfo(d) {
    if (typeof global.solar2lunar !== 'function') return null;
    try {
      var o = global.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return (o && o.IMonthCn) ? o : null;
    } catch (e) {
      return null;
    }
  }

  // 农历 → 公历：lunar.js 里 lunar2solar 只挂在全局 calendarFormatter 上
  // （solar2lunar 才是独立全局函数），这里两个位置都找一遍，别写死。
  function lunarToSolar(y, m, d, isLeapMonth) {
    var cf = global.calendarFormatter;
    if (cf && typeof cf.lunar2solar === 'function') {
      return cf.lunar2solar(y, m, d, !!isLeapMonth);
    }
    if (typeof global.lunar2solar === 'function') {
      return global.lunar2solar(y, m, d, !!isLeapMonth);
    }
    return null;
  }

  // 下一个倒计时目标：农历日子要按「农历年」逐年试，公历直接算今年/明年
  function nextTarget(from) {
    var t = CONFIG.target;
    var base = startOfDay(from);
    var i, o, date;
    if (t.solar) {
      for (i = 0; i < 2; i++) {
        date = new Date(from.getFullYear() + i, t.solar[0] - 1, t.solar[1]);
        if (date >= base) return pack(date, base, null);
      }
      return null;
    }
    var lu = lunarInfo(from);
    var lYear = (lu && lu.lYear) ? lu.lYear : from.getFullYear();
    for (i = 0; i < 3; i++) {
      try {
        o = lunarToSolar(lYear + i, t.lunarMonth, t.lunarDay, false);
      } catch (e) {
        o = null;
      }
      if (o && typeof o === 'object' && o.cYear) {
        date = new Date(o.cYear, o.cMonth - 1, o.cDay);
        if (date >= base) return pack(date, base, o);
      }
    }
    return null;
  }

  function pack(date, base, lunar) {
    return {
      date: date,
      offset: Math.round((date - base) / 86400000),
      year: date.getFullYear(),
      text: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
      gzYear: lunar ? lunar.gzYear : '',
      animal: lunar ? lunar.Animal : ''
    };
  }

  // 本年 / 本月 / 本周：已完成百分比 + 还剩几天（还剩 = 今天之后还没过完的整天数）
  function progress(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var dom = d.getDate();
    var doy = dayOfYear(d);
    var diy = daysInYear(y);
    var dim = daysInMonth(y, m);
    var f = dayFrac(d);
    var widx = (d.getDay() - CONFIG.weekStart + 7) % 7;   // 本周第几天（0 起）
    return [
      { label: '本年', pct: (doy - 1 + f) / diy, remain: diy - doy },
      { label: '本月', pct: (dom - 1 + f) / dim, remain: dim - dom },
      { label: '本周', pct: (widx + f) / 7, remain: 6 - widx }
    ];
  }

  // 一次性把两个卡片要的数字都算出来（调试 / 单测用）
  function compute(d) {
    d = d || new Date();
    var lu = lunarInfo(d);
    return {
      now: d,
      solar: { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() },
      week: { no: weekNumber(d), iso: isoWeek(d), weekdayCn: weekdayCn(d) },
      dayOfYear: dayOfYear(d),
      daysInYear: daysInYear(d),
      daysInMonth: daysInMonth(d.getFullYear(), d.getMonth() + 1),
      lunar: lu ? { year: lu.gzYear + lu.Animal + '年', month: lu.IMonthCn, day: lu.IDayCn, text: lu.gzYear + lu.Animal + '年 ' + lu.IMonthCn + lu.IDayCn } : null,
      target: nextTarget(d),
      progress: progress(d)
    };
  }

  /* ============================================================
   *  日出日落 / 二十四节气
   *  —— 日历卡底部那一行「x天后是<节气>  ☀️xx:xx 🌙xx:xx」，
   *     以及「访客自己没选过深浅色时，按当天日出日落定日间 / 夜间」
   * ============================================================ */
  // 24 节气名：优先用 lunar.js 暴露的全局 solarTerm（source/js/lunar.js:148），取不到就用这份
  var TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

  function termNames() {
    var a = global.solarTerm;
    return (Object.prototype.toString.call(a) === '[object Array]' && a.length === 24) ? a : TERM_NAMES;
  }

  // 第 n 个节气在公历 y 年的日期（n = 1 小寒 … 24 冬至）。
  // lunar.js 的 getTerm(y, n) 只返回「日」（lunar.js:552），月份靠 n 推：
  // n=1,2 → 1 月，n=3,4 → 2 月 …… 也就是 Math.ceil(n / 2)。
  function termDate(y, n) {
    if (typeof global.getTerm !== 'function') return null;
    var day = global.getTerm(y, n);
    if (!(day > 0)) return null;
    var m = Math.ceil(n / 2);
    while (m < 12 && day > daysInMonth(y, m)) { day -= daysInMonth(y, m); m += 1; }   // 差一天的兜底
    return new Date(y, m - 1, day);
  }

  // 下一个节气：{ name, date, days }，days = 0 就是今天
  function nextTerm(from) {
    var names = termNames();
    var base = startOfDay(from);
    var pass, n, d;
    for (pass = 0; pass < 2; pass++) {
      for (n = 1; n <= 24; n++) {
        d = termDate(from.getFullYear() + pass, n);
        if (d && d >= base) {
          return { name: names[n - 1], date: d, days: Math.round((d - base) / 86400000) };
        }
      }
    }
    return null;
  }

  /* ---- 日出 / 日落：Sunrise equation（Wikipedia）那套简化式，误差 1 分钟上下 ---- */
  function sinDeg(x) { return Math.sin(x * Math.PI / 180); }

  function fromJulian(j) { return new Date((j - 2440587.5) * 86400000); }

  // 返回访客本机时区的 { rise, set }；极昼极夜返回 null
  function sunTimes(date, lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return null;
    // n = 自 J2000（2000-01-01 12:00 UT）起的天数。取当天 00:00 UT 再向上取整，
    // 用 floor 会整体早一天（踩过这个坑）
    var n = Math.ceil((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(2000, 0, 1, 12)) / 86400000 + 0.0008);
    var Jstar = n - lng / 360;
    var M = (357.5291 + 0.98560028 * Jstar) % 360;
    var C = 1.9148 * sinDeg(M) + 0.02 * sinDeg(2 * M) + 0.0003 * sinDeg(3 * M);
    var lambda = (M + C + 180 + 102.9372) % 360;
    var transit = 2451545 + Jstar + 0.0053 * sinDeg(M) - 0.0069 * sinDeg(2 * lambda);
    var sinDec = sinDeg(lambda) * sinDeg(23.44);
    var cosDec = Math.sqrt(1 - sinDec * sinDec);
    var cosLat = Math.cos(lat * Math.PI / 180);
    var cosOmega = (sinDeg(-0.833) - sinDeg(lat) * sinDec) / (cosLat * cosDec);
    if (!isFinite(cosOmega) || cosOmega > 1 || cosOmega < -1) return null;
    var omega = Math.acos(cosOmega) * 180 / Math.PI;
    return {
      rise: fromJulian(transit - omega / 360),
      set: fromJulian(transit + omega / 360)
    };
  }

  function hm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

  /* ---- 访客坐标：IP 定位 > 缓存 > 兜底 ---- */
  var GEO_KEY = 'asideCalGeo';       // 把腾讯 IP 接口给的经纬度缓存下来，下次进站一开就有准坐标

  function readGeo() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(GEO_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && isFinite(o.lat) && isFinite(o.lng)) return { lat: +o.lat, lng: +o.lng, src: 'cache' };
    } catch (e) { }
    return null;
  }

  function saveGeo(o) {
    try {
      global.localStorage && global.localStorage.setItem(GEO_KEY, JSON.stringify({ lat: o.lat, lng: o.lng }));
    } catch (e) { }
  }

  // fomal.js:81 把腾讯位置接口的结果放在全局 ipLoacation 上
  function geoFromIp() {
    var r = global.ipLoacation;
    var loc = r && r.result && r.result.location;
    if (loc && isFinite(loc.lat) && isFinite(loc.lng)) return { lat: +loc.lat, lng: +loc.lng, src: 'ip' };
    return null;
  }

  // 没有定位时按访客时区估经度：UTC+8 → 东经 120°
  function timezoneLng() { return -new Date().getTimezoneOffset() / 4; }

  function geo() {
    var c = CONFIG.sun.latLng;
    if (c && isFinite(c[0]) && isFinite(c[1])) return { lat: +c[0], lng: +c[1], src: 'config' };
    return geoFromIp() || readGeo() || { lat: CONFIG.sun.fallbackLat, lng: timezoneLng(), src: 'tz' };
  }

  /* ---- 日间 / 夜间 ---- */
  // 访客自己选过没有？判据与主题 head 脚本一致：saveToLocal('theme')。
  // fomal.js 手动切换时写的是 saveToLocal.set('theme', …, 2)（2 天有效期，见 fomal.js:1182/1207），
  // 过期就当作没选过、自动模式重新接管；'isDark' 那个键是手动切换时永久写的标记，全站没人读它，
  // 所以不拿它当判据（否则自动模式再也回不来）。
  function hasThemeChoice() {
    var ls = global.localStorage;
    if (!ls) return false;
    try {
      var raw = ls.getItem(CONFIG.dayNight.themeKey);
      if (!raw || raw === 'null' || raw === 'undefined') return false;
      var o = null;
      try { o = JSON.parse(raw); } catch (e) { }
      if (o && typeof o === 'object' && o.expiry && Date.now() > o.expiry) {
        ls.removeItem(CONFIG.dayNight.themeKey);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // 换主题模式：data-theme 和 body 上的 DarkMode 必须一起改。
  // fomal.js:1172 用 data-theme 决定切换方向、:1162 用 body.DarkMode 决定加减类，
  // 少写一个访客第一次点月亮按钮就会「没反应」。
  function setMode(isDark) {
    var doc = global.document;
    if (!doc) return;
    if (isDark && typeof global.activateDarkMode === 'function') global.activateDarkMode();
    else if (!isDark && typeof global.activateLightMode === 'function') global.activateLightMode();
    else if (doc.documentElement) doc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (doc.body && doc.body.classList) doc.body.classList[isDark ? 'add' : 'remove']('DarkMode');
    var icon = doc.getElementById && doc.getElementById('modeicon');
    if (icon) icon.setAttribute('xlink:href', isDark ? '#icon-sun' : '#icon-moon');
  }

  // 访客没缓存过深浅色 → 按当天真实日出日落定（有缓存就完全不动，尊重访客的选择）
  function applyDayNight(d) {
    if (!CONFIG.dayNight.enable) return null;
    d = d || now || new Date();
    if (hasThemeChoice()) return null;
    var g = geo();
    var t = sunTimes(d, g.lat, g.lng);
    if (!t) return null;                                  // 极昼极夜就不折腾了
    var isDay = d >= t.rise && d < t.set;
    setMode(!isDay);
    return isDay;
  }

  // 给 fomal.js 那段「8 小时自动切换日夜」用：白天 true / 夜间 false
  function isDayNow() {
    var d = now || new Date();
    var g = geo();
    var t = sunTimes(d, g.lat, g.lng);
    if (!t) return d.getHours() >= 7 && d.getHours() < 19;   // 算不出来就退回原来的早 7 晚 7
    return d >= t.rise && d < t.set;
  }

  // 腾讯位置接口通常比本脚本晚（fomal.js 是 defer 之后才发请求），到了就重算 + 缓存坐标
  function watchGeo() {
    if (CONFIG.sun.latLng) return;
    var tries = 0;
    var timer = global.setInterval(function () {
      tries += 1;
      var ip = geoFromIp();
      if (ip) {
        global.clearInterval(timer);
        saveGeo(ip);
        renderAll();
        applyDayNight();
      } else if (tries >= 45) {
        global.clearInterval(timer);                       // 最多看 45 秒
      }
    }, 1000);
  }

  // 日历卡底部那一行：x 天后是<节气> + ☀️日出 🌙日落
  function extraHTML(d) {
    var t = nextTerm(d);
    var term = '';
    if (t) {
      term = (t.days === 0)
        ? '今天就是<em class="cal-term">' + t.name + '</em>'
        : t.days + '天后是<em class="cal-term">' + t.name + '</em>';
    }
    var g = geo();
    var s = sunTimes(d, g.lat, g.lng);
    var sun = s ? ('<span class="cal-rise">☀️' + hm(s.rise) + '</span>' +
      '<span class="cal-set">🌙' + hm(s.set) + '</span>') : '';
    if (!term && !sun) return '';
    return '<div class="cal-extra">' +
      (term ? '<span class="cal-extra-term">' + term + '</span>' : '') +
      (sun ? '<span class="cal-extra-sun">' + sun + '</span>' : '') +
      '</div>';
  }

  /* ============================================================
   *  渲染层
   * ============================================================ */
  // 把渲染结果塞进卡片里的一个【挂载节点】，而不是清空整个卡片。
  // 原因：widget.yml 的 html 里带着 <link rel=stylesheet> 和 <script>，它们都是
  // .item-content 的子节点；一旦用 innerHTML 覆盖容器，<link> 会从 DOM 里被移除，
  // 按 HTML 规范它的样式表随之失效 —— 这正是之前 CSS 完全不生效的原因。
  // 查找顺序：占位节点 .cal-skeleton（首次渲染）→ 上次渲染出来的 [data-cal-mount]（后续刷新），
  // 两个都没有才退到「追加一个新盒子」，同样不清空容器，保住 link/script。
  function mount(el, html) {
    if (!el.querySelector) { el.innerHTML = html; return el; }
    var node = el.querySelector('.cal-skeleton') || el.querySelector('[data-cal-mount]');
    if (node) { node.outerHTML = html; return el; }
    var host = el.querySelector('.item-content') || el;
    var box = global.document.createElement('div');
    box.setAttribute('data-cal-mount', '');
    box.innerHTML = html;
    host.appendChild(box);
    return el;
  }

  function gridHTML(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var dim = daysInMonth(y, m);
    var lead = (new Date(y, m - 1, 1).getDay() - CONFIG.gridWeekStart + 7) % 7;
    var out = '<div class="cal-grid">';
    var i;
    for (i = 0; i < 7; i++) {
      out += '<span class="cal-hd">' + CONFIG.weekCn[(CONFIG.gridWeekStart + i) % 7] + '</span>';
    }
    for (i = 0; i < lead; i++) out += '<span class="cal-cell is-empty"></span>';
    for (i = 1; i <= dim; i++) {
      var today = (i === d.getDate());
      out += '<span class="cal-cell' + (today ? ' is-today' : '') + '"' +
        (today ? ' aria-current="date" title="今天"' : '') + '>' + i + '</span>';
    }
    return out + '</div>';
  }

  function renderToday(d) {
    var el = global.document && global.document.getElementById(CONFIG.todayEl);
    if (!el) return false;
    var lu = lunarInfo(d);
    mount(el,
      // 整段套一个 .cal-wrap 作为唯一挂载根：mount() 每次只替换这一个节点，
      // 否则 .cal-extra 会被下一次重绘重复插一份（踩过这个坑）
      '<div class="cal-wrap" data-cal-mount>' +
      '<div class="cal-main">' +
        '<div class="cal-left">' +
          '<div class="cal-week">第' + weekNumber(d) + '周 ' + weekdayCn(d) + '</div>' +
          '<div class="cal-daynum">' + pad2(d.getDate()) + '</div>' +
          '<div class="cal-solar">' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月 第' + dayOfYear(d) + '天</div>' +
          (lu ? '<div class="cal-lunar">' + lu.gzYear + lu.Animal + '年 ' + lu.IMonthCn + lu.IDayCn + '</div>' : '') +
        '</div>' +
        gridHTML(d) +
      '</div>' +
      extraHTML(d) +
      '</div>');
    el.title = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      '星期' + CONFIG.weekCn[d.getDay()] + (lu ? ' · 农历' + lu.IMonthCn + lu.IDayCn : '');   // 例：2026年10月1日 星期四 · 农历八月廿一
    return true;
  }

  function renderCountdown(d) {
    var el = global.document && global.document.getElementById(CONFIG.countdownEl);
    if (!el) return false;
    var t = nextTarget(d);
    var rows = progress(d).map(function (p) {
      var pct = (Math.round(p.pct * 10000) / 100).toFixed(2);
      return '<div class="cd-row">' +
        '<span class="cd-label">' + p.label + '</span>' +
        '<span class="cd-bar">' +
          '<i style="width:' + pct + '%"></i>' +
          '<em>' + pct + '%</em>' +
          '<b>还剩 ' + p.remain + ' 天</b>' +
        '</span>' +
      '</div>';
    }).join('');
    var num = t ? t.offset : '--';
    var unit = (t && t.offset > 0) ? '<span class="cd-unit">' + CONFIG.target.unit + '</span>' : '';
    var sub = t ? (t.offset === 0 ? '就是今天' : t.text) : '日期算不出来';
    el.title = t ? ('农历' + CONFIG.target.label + '：' + t.text + (t.gzYear ? ' · ' + t.gzYear + '年 ' + t.animal : '')) : '';
    mount(el,
      '<div class="cd" data-cal-mount>' +
        '<div class="cd-left">' +
          '<div class="cd-title">距离' + CONFIG.target.label + '</div>' +
          '<div class="cd-num">' + num + unit + '</div>' +
          '<div class="cd-date">' + sub + '</div>' +
        '</div>' +
        '<div class="cd-rows">' + rows + '</div>' +
      '</div>');
    return true;
  }

  /* ============================================================
   *  卡片上移：把这张自定义卡挪到公告栏上方
   *  为什么用 JS 而不是改主题模板：运行中的 hexo server 不会重新读取
   *  themes/ 下 layout 里的 pug —— 实测把 index.pug 里两行顺序对调并塞入
   *  <--PUGMARKER--> 注释，9 秒后页面里既没有注释也没有顺序变化；而同一主题
   *  source/ 目录下 css 的改动 8 秒内就生效并被 stylus 重编译。所以「顺序」
   *  这件事必须在 source/ 侧解决，才能对用户正在浏览的页面立刻生效。
   *  这段脚本执行时机 = 解析期（<script> 就在卡片自己的 html 里），此时公告栏
   *  早已解析完，可直接 insertBefore；不像 DOMContentLoaded 再挪会让公告栏
   *  先渲染再下移（可见的布局跳动）。模板顺序本来就对时自动跳过，不重复搬。
   * ============================================================ */
  function cardOf(id) {
    var doc = global.document;
    if (!doc || typeof doc.getElementById !== 'function') return null;
    var el = doc.getElementById(id);
    if (!el || typeof el.closest !== 'function') return null;
    return el.closest('.card-widget');
  }

  function hoistCard(id) {
    var doc = global.document;
    if (!doc || typeof doc.getElementById !== 'function') return false;
    var el = doc.getElementById(id);
    if (!el || typeof el.closest !== 'function') return false;
    var card = el.closest('.card-widget');
    if (!card || !card.parentElement) return false;
    var parent = card.parentElement;
    var ann = doc.querySelector('#aside-content > .card-announcement') ||
      (parent.querySelector ? parent.querySelector(':scope > .card-announcement') : null);
    if (!ann || ann === card || ann.parentElement !== parent) return false;
    // ann.compareDocumentPosition(card) 返回的是「card 相对 ann」的位置，
    // 只有 card 确实排在 ann 后面（FOLLOWING = 4）才需要搬。
    if (!(ann.compareDocumentPosition(card) & 4)) return false;
    parent.insertBefore(card, ann);
    return true;
  }

  /* ============================================================
   *  两张卡的整体版式：日历在前、倒计时在后，都紧贴公告栏上方
   *  为什么不能只各自调 hoistCard：hoistCard 是「插到公告栏前面」，
   *  两次调用就变成「谁最后搬谁在上」。pjax 换页时整个 #body-wrap 被替换，
   *  倒计时卡里那段内联脚本可能比本文件（外部 <script>，pjax 插入后要等
   *  异步加载）先执行，于是倒计时先插、日历后插 → 顺序颠倒（用户 2026-10-02 报的 bug）。
   *  所以这里先把两卡的相对顺序摆正，再整体上移；函数幂等，随便谁什么时候调。
   * ============================================================ */
  function layoutCards() {
    var moved = false;
    var cal = cardOf(CONFIG.todayEl);
    var cd = cardOf(CONFIG.countdownEl);
    if (cal && cd && cal.parentElement && cal.parentElement === cd.parentElement) {
      // FOLLOWING(4) 表示「日历卡排在倒计时卡后面」→ 顺序确实反了，把日历挪到它前面
      if (cd.compareDocumentPosition(cal) & 4) {
        cd.parentElement.insertBefore(cal, cd);
        moved = true;
      }
    }
    if (hoistCard(CONFIG.todayEl)) moved = true;
    if (hoistCard(CONFIG.countdownEl)) moved = true;
    return moved;
  }

  /* ============================================================
   *  启动 / 定时刷新
   * ============================================================ */
  var now = null;   // 调试时可以 setNow() 假造时间

  function renderAll() {
    var d = now || new Date();
    var a = renderToday(d);
    var b = renderCountdown(d);
    return a || b;
  }

  function start() {
    if (!global.document || typeof global.document.getElementById !== 'function') return;
    renderAll();
    applyDayNight();
    // 本文件是解析期执行，而 lunar.js（getTerm 的来源）在页面底部，
    // 所以第一次渲染可能还拿不到节气；等它到位再补渲染一次（最多等 2 秒）
    if (typeof global.getTerm !== 'function') {
      var waits = 0;
      var waitTerm = global.setInterval(function () {
        waits += 1;
        if (typeof global.getTerm === 'function' || waits >= 20) {
          global.clearInterval(waitTerm);
          if (typeof global.getTerm === 'function') renderAll();
        }
      }, 100);
    }
    // 兜底 + 摆正顺序：内联脚本没跑到、或 pjax 换页把两卡顺序弄反时，这里修
    layoutCards();
    // pjax 换页会把本文件再执行一遍，定时器只挂一份（重绘照样每次都做）
    if (global.__fomalAsideCalendarTimer) return;
    global.__fomalAsideCalendarTimer = true;
    watchGeo();
    if (CONFIG.tickMs) {
      global.setInterval(function () {
        // 标签页在后台就不白算（回到前台时立刻补一次）
        if (global.document.visibilityState === 'hidden') return;
        renderAll();
        applyDayNight();          // 页面挂着不动，也能在日出 / 日落那一刻自己换模式
      }, CONFIG.tickMs);
    }
    global.document.addEventListener('visibilitychange', function () {
      if (global.document.visibilityState !== 'hidden') { renderAll(); applyDayNight(); }
    });
    // pjax 换页后：重绘 + 摆正卡片顺序 + 重新判定日夜。
    // 不同 pjax 版本发的事件名不一样（complete / success / end），多挂几个没坏处：
    // renderAll / layoutCards / applyDayNight 全是幂等的。
    ['pjax:complete', 'pjax:success', 'pjax:end'].forEach(function (ev) {
      global.document.addEventListener(ev, function () { renderAll(); layoutCards(); applyDayNight(); });
    });
  }

  global.fomalAsideCalendar = {
    config: CONFIG,
    compute: compute,
    renderAll: renderAll,
    hoistCard: hoistCard,
    layoutCards: layoutCards,
    nextTerm: nextTerm,
    sunTimes: sunTimes,
    geo: geo,
    isDayNow: isDayNow,
    applyDayNight: applyDayNight,
    setNow: function (d) { now = d ? new Date(d) : null; renderAll(); applyDayNight(); }
  };

  // 解析期就把两卡排好（本文件的 <script> 就在日历卡里，此刻公告栏已存在）
  layoutCards();

  // 深浅色也尽早定：本文件是解析期执行（比 defer 的 fomal.js 早），先把模式摆正，
  // fomal.js 那段「8 小时自动切换」看到模式已经对了就不会再改它（它只在模式不对时才动手）。
  applyDayNight();

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
