/* ============================================================================
 * data/holidays.js —— 法定休息日判断（纯数据，无 DOM）
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 法定休息日判断（1601-1648）—— HOLIDAY_TABLE 内置 2024~2026 放假/调休表；2027 起从 holiday-cn CDN 拉取并缓存到 localStorage，失败则退回"周末即休息"
 * ----------------------------------------------------------------------------
 * 页脚"距离下次休息还有多久"要用。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 6 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     34  HOLIDAY_TABLE
 *     39  HOLIDAY_CDN
 *     40  HOLIDAY_TRIED
 *     41  holidayKey(d)
 *     46  ensureHolidayYear(year)
 *     64  isRestDay(d)
 * ========================================================================== */

/* ------------------------------ 法定休息日判断 ------------------------------ */
/* 原 fomal.js 1601-1648 行，原样搬运，未改逻辑 */
/* 法定休息日判断 start ------------------------------------------------------------
 * 依据国务院办公厅放假通知（数据同 holiday-cn / NateScarlet）：只记录"法定放假日"
 * 与"调休上班日"，其余日子按周末判断。
 * 2024~2026 已内置，离线也能正确判断；2027 及以后会自动从 CDN 拉取并缓存到
 * localStorage，拉取失败则退回"周末即休息日"。来年只需往 HOLIDAY_TABLE 里加一条
 * "年份": { off: "MM-DD,...", work: "MM-DD,..." } 即可。
 * ------------------------------------------------------------------------------ */
var HOLIDAY_TABLE = {
  "2024": { off: "01-01,02-10,02-11,02-12,02-13,02-14,02-15,02-16,02-17,04-04,04-05,04-06,05-01,05-02,05-03,05-04,05-05,06-10,09-15,09-16,09-17,10-01,10-02,10-03,10-04,10-05,10-06,10-07", work: "02-04,02-18,04-07,04-28,05-11,09-14,09-29,10-12" },
  "2025": { off: "01-01,01-28,01-29,01-30,01-31,02-01,02-02,02-03,02-04,04-04,04-05,04-06,05-01,05-02,05-03,05-04,05-05,05-31,06-01,06-02,10-01,10-02,10-03,10-04,10-05,10-06,10-07,10-08", work: "01-26,02-08,04-27,09-28,10-11" },
  "2026": { off: "01-01,01-02,01-03,02-15,02-16,02-17,02-18,02-19,02-20,02-21,02-22,02-23,04-04,04-05,04-06,05-01,05-02,05-03,05-04,05-05,06-19,06-20,06-21,09-25,09-26,09-27,10-01,10-02,10-03,10-04,10-05,10-06,10-07", work: "01-04,02-14,02-28,05-09,09-20,10-10" }
};
var HOLIDAY_CDN = "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/";
var HOLIDAY_TRIED = {}; // 防止每秒重复发起同一个请求
function holidayKey(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return (m < 10 ? "0" + m : "" + m) + "-" + (day < 10 ? "0" + day : "" + day);
}
// 只在"未知年份"时联网补齐，避免每次访问都发请求
function ensureHolidayYear(year) {
  if (HOLIDAY_TABLE[year] || HOLIDAY_TRIED[year]) return;
  HOLIDAY_TRIED[year] = true;
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem("holiday_" + year) || "null"); } catch (e) { cached = null; }
  if (cached && cached.off) { HOLIDAY_TABLE[year] = cached; return; }
  try {
    fetch(HOLIDAY_CDN + year + ".json").then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data.days || !data.days.length) return;
      var off = [], work = [];
      data.days.forEach(function (it) { (it.isOffDay ? off : work).push(it.date.slice(5)); });
      var t = { off: off.join(","), work: work.join(",") };
      HOLIDAY_TABLE[year] = t;
      try { localStorage.setItem("holiday_" + year, JSON.stringify(t)); } catch (e) {}
    }).catch(function () {});
  } catch (e) {}
}
// 法定休息日：调休上班日 → 否；法定放假日 → 是；其余按周末
function isRestDay(d) {
  ensureHolidayYear(d.getFullYear());
  var key = holidayKey(d), t = HOLIDAY_TABLE[d.getFullYear()];
  if (t) {
    if (t.work && t.work.split(",").indexOf(key) >= 0) return false;
    if (t.off && t.off.split(",").indexOf(key) >= 0) return true;
  }
  var w = d.getDay();
  return w === 0 || w === 6;
}
/* 法定休息日判断 end */
