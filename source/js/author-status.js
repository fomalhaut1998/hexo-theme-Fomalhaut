/*!
 * author-status.js —— 侧栏个人信息卡片右上角「状态胶囊」随时间和节假日自动切换
 * ==================================================================
 * 模板里的表情与文字是写死的（card_author.pug 的 🎯 专注学习中），所以这里用 JS 覆盖。
 * 四种状态，第一命中即用：
 *   睡觉中zzz   😴   23:00–07:00（任何日子）
 *   放假摸鱼中  🏖️  周末 + 法定节假日（含调休放假，见 HOLIDAYS）
 *   上班摸鱼中  🐟   工作日 07:00–18:00
 *   下班玩耍中  🎮   工作日 18:00–23:00
 *
 * 依赖：无。页面里没有这张卡片时什么都不做；pjax 换页后重新应用；每 60 秒校准一次。
 * 维护：国务院办公厅每年 11 月左右公布次年放假安排，照 HOLIDAYS / WORKDAYS 的格式追加即可
 *       （HOLIDAYS = 放假的日子，WORKDAYS = 周末但要补班的日子，写成 YYYY-MM-DD）。
 *       年份没在表里的，只按「周末 = 放假」判断。
 * 调试：控制台 authorStatus.compute(new Date('2026-10-03T10:00:00')) 看某时刻会显示什么。
 */
(function (global) {
  'use strict';

  /* ── 放假的日子（法定节假日，含调休） ───────────────────────────── */
  var HOLIDAYS = [
    /* 2026（国办发明电〔2025〕，2025-11-04 公布） */
    '2026-01-01', '2026-01-02', '2026-01-03',                                       // 元旦 3 天
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
    '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',                         // 春节 9 天
    '2026-04-04', '2026-04-05', '2026-04-06',                                       // 清明 3 天
    '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',           // 劳动节 5 天
    '2026-06-19', '2026-06-20', '2026-06-21',                                       // 端午 3 天
    '2026-09-25', '2026-09-26', '2026-09-27',                                       // 中秋 3 天
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    '2026-10-05', '2026-10-06', '2026-10-07'                                        // 国庆 7 天
    /* 2027 年安排公布后照上面格式追加 */
  ];

  /* ── 周末但要点名上班（补班日），优先级高于「周末 = 放假」 ──────── */
  var WORKDAYS = [
    '2026-01-04',                       // 元旦补班
    '2026-02-14', '2026-02-28',         // 春节补班
    '2026-05-09',                       // 劳动节补班
    '2026-09-20', '2026-10-10'          // 中秋 / 国庆补班
  ];

  var TABLE = {};
  HOLIDAYS.forEach(function (d) { TABLE[d] = 'holiday'; });
  WORKDAYS.forEach(function (d) { TABLE[d] = 'workday'; });

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function isHoliday(d) {
    var t = TABLE[key(d)];
    if (t) return t === 'holiday';
    var w = d.getDay();
    return w === 0 || w === 6;
  }

  function compute(now) {
    var d = now || new Date();
    var h = d.getHours();
    if (h >= 23 || h < 7) return { emoji: '😴', text: '睡觉中zzz' };
    if (isHoliday(d)) return { emoji: '🏖️', text: '放假摸鱼中' };
    if (h >= 7 && h < 18) return { emoji: '🐟', text: '上班摸鱼中' };
    return { emoji: '🎮', text: '下班玩耍中' };
  }

  function apply(root) {
    var box = (root || document).querySelector('.card-info .author-status');
    if (!box) return null;
    var s = compute();
    var em = box.querySelector('g-emoji');
    var sp = box.querySelector('span');
    if (em && em.textContent.trim() !== s.emoji) em.textContent = s.emoji;
    if (sp && sp.textContent !== s.text) sp.textContent = s.text;
    return s;
  }

  global.authorStatus = { compute: compute, apply: apply, isHoliday: isHoliday, holidays: HOLIDAYS, workdays: WORKDAYS };

  function boot() {
    apply();
    document.addEventListener('pjax:complete', function () { apply(); });
    setInterval(apply, 60000);   // 跨过整点 / 换日自动切换
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
