/*!
 * festival.js —— 节日提醒卡片（左上角通知）
 * ==================================================================
 * 以前：fomal.js 里 20 多个 if 块 + SweetAlert2 居中弹窗，必须手动点「确定」。
 * 现在：与「哎嘿！复制成功🍬」同款的左上角卡片，10 秒后自动收起，也能手动关。
 *
 * 想增删节日？只改下面 FESTIVALS 这一张表，其余代码不用动。
 * 生效条件（四选一，写多个则满足任一即触发）：
 *   solar: [[10, 1], [10, 2]]    公历：月, 日
 *   term:  [4, 7]                节气：4 月的第 7 个节气 = 清明（按年自动算，不用每年手改）
 *   lunar: [['八月', '十五']]     农历：农历月, 农历日（写法与页面上的农历一致）
 *   week:  [5, 0, 2]             5 月第 2 个星期日（0=周日 … 6=周六）
 * 文案占位符：
 *   {year}            当前年份
 *   {since:1949}      距 1949 年多少年 →「祝祖国77岁生日快乐！」
 *   pick: ['a', 'b']  正文从这里随机取一条（愚人节的用法）
 * 字段：
 *   id        唯一标识，预览时用 fomalFestival.preview('这个 id')
 *   title     卡片标题      message   正文
 *   type      success | warning | info | error（决定左侧图标与配色）
 *   duration  显示毫秒数，默认 10000
 *   celebrate 置 true 时，弹卡片的同时放一段全屏礼炮（按需加载 /js/celebrate.js，平时零流量）
 *   colors    礼炮配色数组，可选（不写就用默认暖色）
 *
 * 依赖：lunar.js（农历/节气换算）、notify.js（fomalNotify 通知卡片）
 * 调试：控制台输入 fomalFestival.list 查看全部节日；
 *       fomalFestival.preview('national') 强制弹出某个卡片（不占用当天的去重名额）；
 *       或者在任意页面地址后加 #festival=national（换成表里的 id）直接看那张卡片。
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'fomal-festival-shown'; // 本次会话只弹一次
  var DEFAULT_DURATION = 10000;

  /* ============================================================
   *  节日表 —— 要增删节日改这里就行
   * ============================================================ */
  var FESTIVALS = [

    /* ── 公历节日 ──────────────────────────────────────────── */
    {
      id: 'new-year',
      title: '元旦',
      message: '{year}年元旦快乐，新的一年开始了。',
      type: 'success',
      celebrate: true,
      colors: ["#ffd166", "#ff6b6b", "#ffd700", "#fff1a8"],
      solar: [[1, 1]]
    },
    {
      id: 'valentine',
      title: '情人节',
      message: '今天是情人节\n愿真心都不被辜负。',
      type: 'success',
      celebrate: true,
      colors: ["#ff7eb6", "#ff5c8a", "#ffc2dd", "#fff0f6"],
      solar: [[2, 14]]
    },
    {
      id: 'womens-day',
      title: '妇女节',
      message: '今天是妇女节\n祝大家节日愉快。',
      type: 'success',
      solar: [[3, 8]]
    },
    {
      id: 'april-fool',
      title: '愚人节',
      type: 'warning',
      solar: [[4, 1]],
      pick: [
        '非常抱歉，因为一些不可控的原因，博客可能要停更三天。',
        '友情提示：今天遇到的消息，建议都先怀疑一下。',
        '据说今天许的愿都不作数，明天再许一次吧。',
        '刚刚那条更新日志说错了，其实什么也没改。',
        '本条通知不承担任何法律责任。',
        '原计划今天发布新文章，后来想想还是算了。',
        '今天的烦恼，一句「开玩笑的」就能化解。',
        '愚人节最早的玩笑，大概是把日期写错。'
      ]
    },
    {
      id: 'labour-day',
      title: '劳动节',
      message: '劳动节快乐\n向每一位认真生活的人致敬。',
      type: 'success',
      celebrate: true,
      solar: [[5, 1]]
    },
    {
      id: 'youth-day',
      title: '青年节',
      message: '青年节快乐\n青春不是回忆逝去，而是把握现在。',
      type: 'success',
      solar: [[5, 4]]
    },
    {
      id: 'valentine-520',
      title: '520 情人节',
      message: '今天是 520\n愿你有想见的人，也有想去的地方。',
      type: 'success',
      celebrate: true,
      colors: ["#ff7eb6", "#ff5c8a", "#ffc2dd", "#fff0f6"],
      solar: [[5, 20]]
    },
    {
      id: 'childrens-day',
      title: '儿童节',
      message: '儿童节快乐\n愿你心里那个小孩一直没有走远。',
      type: 'success',
      celebrate: true,
      solar: [[6, 1]]
    },
    {
      id: 'party-day',
      title: '建党节',
      message: '祝中国共产党{since:1921}岁生日快乐。',
      type: 'success',
      celebrate: true,
      solar: [[7, 1]]
    },
    {
      id: 'army-day',
      title: '建军节',
      message: '八一建军节\n向守卫安宁的人致敬。',
      type: 'success',
      celebrate: true,
      solar: [[8, 1]]
    },
    {
      id: 'surrender',
      title: '日本投降纪念日',
      message: '今天是日本宣布无条件投降{since:1945}周年。',
      type: 'info',
      solar: [[8, 15]]
    },
    {
      id: 'teachers-day',
      title: '教师节',
      message: '教师节快乐\n感谢每一位认真教书的人。',
      type: 'success',
      solar: [[9, 10]]
    },
    {
      id: 'national',
      title: '国庆节',
      message: '祝祖国{since:1949}岁生日快乐！',
      type: 'success',
      celebrate: true,
      colors: ["#ffd166", "#ff6b6b", "#ffd700", "#fff1a8"],
      solar: [[10, 1], [10, 2], [10, 3]]
    },
    {
      id: 'christmas-eve',
      title: '平安夜',
      message: '平安夜\n愿平安与你同行。',
      type: 'info',
      celebrate: true,
      colors: ["#a5d8ff", "#74c0fc", "#e9ecef", "#ffd166"],
      solar: [[12, 24]]
    },
    {
      id: 'christmas',
      title: '圣诞节',
      message: '圣诞节快乐\n愿你这个冬天顺利。',
      type: 'success',
      celebrate: true,
      colors: ["#a5d8ff", "#74c0fc", "#e9ecef", "#ffd166"],
      solar: [[12, 25]]
    },

    /* ── 按「第几个星期几」算的节日 ────────────────────────── */
    {
      id: 'mothers-day',
      title: '母亲节',
      message: '母亲节\n如果有空，记得跟妈妈说句话。',
      type: 'success',
      week: [5, 0, 2] // 5 月第 2 个星期日
    },
    {
      id: 'fathers-day',
      title: '父亲节',
      message: '父亲节\n如果有空，记得陪爸爸说说话。',
      type: 'success',
      week: [6, 0, 3] // 6 月第 3 个星期日
    },
    {
      id: 'thanksgiving',
      title: '感恩节',
      message: '感恩节\n谢谢你还在这里。',
      type: 'info',
      week: [11, 4, 4] // 11 月第 4 个星期四
    },

    /* ── 站长的私房日子 ────────────────────────────────────── */
    {
      id: 'fomal-birthday',
      title: '站长生日',
      message: '今天是站长的生日，{since:1998} 岁\n谢谢每一位来访的朋友。',
      type: 'success',
      celebrate: true,
      solar: [[8, 11]]
    },

    /* ── 节气（按年自动计算） ──────────────────────────────── */
    {
      id: 'qingming',
      title: '清明',
      message: '今日清明\n春和景明，记得问候远方的亲人。',
      type: 'info',
      term: [4, 7] // 4 月的第 7 个节气
    },
    {
      id: 'dongzhi',
      title: '冬至',
      message: '今日冬至\n记得吃一碗热汤圆或饺子。',
      type: 'info',
      term: [12, 24] // 12 月的第 24 个节气
    },

    /* ── 农历节日 ──────────────────────────────────────────── */
    {
      id: 'spring-festival',
      title: '春节',
      // 本来就只算大年三十到初六，但有时除夕是大年二十九，所以也加上了
      message: '{year}年新春快乐\n愿你心想事成，诸事顺利。',
      type: 'success',
      celebrate: true,
      colors: ["#ff4d4f", "#ffd166", "#ffa940", "#fff1a8"],
      lunar: [['腊月', '廿九'], ['腊月', '三十'], ['正月', '初一'], ['正月', '初二'], ['正月', '初三'],
              ['正月', '初四'], ['正月', '初五'], ['正月', '初六']]
    },
    {
      id: 'lantern',
      title: '元宵节',
      message: '元宵节快乐\n愿灯火可亲，所愿皆成。',
      type: 'success',
      celebrate: true,
      colors: ["#ff4d4f", "#ffd166", "#ffa940", "#fff1a8"],
      lunar: [['正月', '十五']]
    },
    {
      id: 'dragon-boat',
      title: '端午节',
      message: '端午安康\n记得吃一只粽子。',
      type: 'success',
      celebrate: true,
      lunar: [['五月', '初五']]
    },
    {
      id: 'qixi',
      title: '七夕节',
      message: '又到七夕\n黄昏后，柳梢头，人间自有相逢。',
      type: 'success',
      celebrate: true,
      colors: ["#ff7eb6", "#ff5c8a", "#ffc2dd", "#fff0f6"],
      lunar: [['七月', '初七']]
    },
    {
      id: 'mid-autumn',
      title: '中秋节',
      message: '中秋快乐\n愿你与牵挂的人共此一轮月。',
      type: 'success',
      celebrate: true,
      lunar: [['八月', '十五']]
    },
    {
      id: 'chongyang',
      title: '重阳节',
      message: '重阳\n天高秋深，宜登高，也宜问候家里的长辈。',
      type: 'success',
      lunar: [['九月', '初九']]
    },
    {
      id: 'laba',
      title: '腊八节',
      message: '腊八节\n记得喝一碗腊八粥。',
      type: 'success',
      lunar: [['腊月', '初八']]
    }

    /* 切换主题提醒（已停用的例子，需要时照这个格式加回去）
    {
      id: 'winter-theme',
      title: '冬日限定',
      message: '网站换成冬日限定主题啦',
      type: 'info',
      solar: [[12, 18], [12, 19], [12, 20]]
    }
    */
  ];

  /* ============================================================
   *  以下为逻辑，一般不用改
   * ============================================================ */

  function today() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  /* 某月第 n 个星期 weekday 是几号（weekday: 0=周日 … 6=周六） */
  function nthWeekday(year, month, weekday, nth) {
    var first = new Date(year, month - 1, 1).getDay();
    var day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
    return day <= new Date(year, month, 0).getDate() ? day : -1;
  }

  /* 第 n 个节气的公历日（依赖 lunar.js 的 getTerm） */
  function termDay(year, n) {
    return typeof getTerm === 'function' ? getTerm(year, n) : -1;
  }

  /* 今天的农历对象（依赖 lunar.js 的 solar2lunar），失败返回 null */
  function lunarToday() {
    if (typeof solar2lunar !== 'function') return null;
    try {
      return solar2lunar();
    } catch (e) {
      return null;
    }
  }

  /* 判断某个节日今天是否命中 */
  function isToday(f, ctx, lunar) {
    var i;
    if (f.solar) {
      for (i = 0; i < f.solar.length; i++) {
        if (f.solar[i][0] === ctx.m && f.solar[i][1] === ctx.d) return true;
      }
    }
    if (f.term && f.term[0] === ctx.m && termDay(ctx.y, f.term[1]) === ctx.d) return true;
    if (f.week && f.week[0] === ctx.m &&
        nthWeekday(ctx.y, f.week[0], f.week[1], f.week[2]) === ctx.d) return true;
    if (f.lunar && lunar) {
      for (i = 0; i < f.lunar.length; i++) {
        if (f.lunar[i][0] === lunar.IMonthCn && f.lunar[i][1] === lunar.IDayCn) return true;
      }
    }
    return false;
  }

  /* 替换 {year} / {since:1949} */
  function fill(text, ctx) {
    if (text == null) return '';
    return String(text)
      .replace(/\{year\}/g, ctx.y)
      .replace(/\{since:(\d{4})\}/g, function (whole, since) {
        return Math.max(0, ctx.y - Number(since));
      });
  }

  /* 取正文：有 pick 就随机抽一条 */
  function bodyOf(f, ctx) {
    if (f.pick && f.pick.length) {
      return fill(f.pick[Math.floor(Math.random() * f.pick.length)], ctx);
    }
    return fill(f.message, ctx);
  }

  function push(f, ctx) {
    if (typeof fomalNotify !== 'function') return false;
    fomalNotify({
      title: fill(f.title, ctx),
      message: bodyOf(f, ctx),
      type: f.type || 'success',
      position: 'top-left',
      offset: 50,
      duration: typeof f.duration === 'number' ? f.duration : DEFAULT_DURATION,
      showClose: true
    });
    return true;
  }

  /* 喜庆节日的全屏礼炮：命中后才去加载 /js/celebrate.js，平时不下载 */
  var FX_SRC = '/js/celebrate.js';
  var fxLoading = false;

  function loadFx(done) {
    if (typeof global.fomalCelebrate === 'function') return done();
    if (fxLoading || typeof document === 'undefined') return;
    fxLoading = true;
    var s = document.createElement('script');
    s.src = FX_SRC;
    s.async = true;
    s.onload = function () { fxLoading = false; if (typeof global.fomalCelebrate === 'function') done(); };
    s.onerror = function () { fxLoading = false; };
    (document.head || document.documentElement).appendChild(s);
  }

  function fireworks(f) {
    if (!f || !f.celebrate) return;
    loadFx(function () { global.fomalCelebrate({ colors: f.colors }); });
  }

  function shown() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {
      /* 隐身模式下 sessionStorage 可能不可用，忽略即可 */
    }
  }

  /* 今天的人话描述，方便排查 */
  function describe(f) {
    if (f.solar) return f.solar.map(function (x) { return x[0] + ' 月 ' + x[1] + ' 日'; }).join('、');
    if (f.term) return f.term[0] + ' 月第 ' + f.term[1] + ' 个节气';
    if (f.lunar) return f.lunar.map(function (x) { return '农历' + x[0] + x[1]; }).join('、');
    if (f.week) return f.week[0] + ' 月第 ' + f.week[2] + ' 个星期' + '日一二三四五六'.charAt(f.week[1]);
    return '未设置条件';
  }

  function check() {
    var ctx = today();
    var lunar = lunarToday();
    var hit = null;
    var i, f;
    for (i = 0; i < FESTIVALS.length; i++) {
      f = FESTIVALS[i];
      if (!isToday(f, ctx, lunar)) continue;
      if (!hit) hit = f;
    }
    if (hit && !shown() && push(hit, ctx)) {
      markShown();
      fireworks(hit);
    }
    return hit || null;
  }

  /* 调试用：fomalFestival.preview('national') 或 preview(0) */
  function preview(which) {
    var ctx = today();
    var i, f = null;
    for (i = 0; i < FESTIVALS.length; i++) {
      if (FESTIVALS[i].id === which || i === which) { f = FESTIVALS[i]; break; }
    }
    if (!f) {
      console.table(FESTIVALS.map(function (x, n) {
        return { 序号: n, id: x.id, 标题: x.title, 什么时候弹: describe(x) };
      }));
      return null;
    }
    push(f, ctx);
    fireworks(f);
    return f;
  }

  /* 预览：地址后加 #festival=mid-autumn（换成表里的 id）就能看到那张卡片 */
  function previewFromHash() {
    var hash = String((global.location && global.location.hash) || '');
    var m = /festival=([\w-]+)/.exec(hash);
    if (!m) return;
    for (var i = 0; i < FESTIVALS.length; i++) {
      if (FESTIVALS[i].id === m[1]) { push(FESTIVALS[i], today()); fireworks(FESTIVALS[i]); return; }
    }
  }

  global.fomalFestival = {
    list: FESTIVALS,
    check: check,
    preview: preview,
    describe: describe
  };

  previewFromHash();
  check();

})(window);
