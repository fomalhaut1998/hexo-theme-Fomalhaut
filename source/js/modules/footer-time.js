/* ============================================================================
 * modules/footer-time.js —— 页脚计时器
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 页脚计时器（计时主体）（1650-1693）—— createtime()：每秒刷新页脚那行文字，含中国标准时间、休息日倒计时、旅行者1号距离
 * ----------------------------------------------------------------------------
 * 页脚那行"现在是 …，距离下次休息还有 …，旅行者1号离我们 … 公里"。依赖 data/voyager1.js 和 data/holidays.js。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 2 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     23  now
 *     24  createtime()
 * ========================================================================== */

/* ------------------------------ 页脚计时器（计时主体） ------------------------------ */
/* 原 fomal.js 1650-1693 行，原样搬运，未改逻辑 */
var now = new Date();
function createtime() {
  // 当前时间
  now.setTime(now.getTime() + 1000);
  // 旅行者1号距离：JPL Horizons 数据离线拟合模型（见文件中的 vgDist 模型块）
  var vgd = vgDist(Date.now());          // 几何距离（千米）
  var dis = vgFmt(vgd);                  // 千分位格式
  var unit = (vgd / vgAU).toFixed(6);    // 天文单位（1 AU = 149597870.7 km）
  var lt = vgLight(vgd);                 // 信号单程光行时
  // 网站诞生时间
  var grt = new Date("08/09/2022 00:00:00");
  // 年按“满周年”算：2022-08-09 → 2026-08-09 记 4 年，周年之后再数剩余的天/时/分/秒
  var years = now.getFullYear() - grt.getFullYear(),
    anniv = new Date(grt.getTime());
  anniv.setFullYear(grt.getFullYear() + years);
  if (anniv.getTime() > now.getTime()) {
    years--;
    anniv.setFullYear(grt.getFullYear() + years);
  }
  var ynum = years,
    rest = now.getTime() - anniv.getTime(); // 满周年之后经过的毫秒数
  var dnum = Math.floor(rest / 86400000),
    hnum = Math.floor(rest / 3600000) % 24;
  1 == String(hnum).length && (hnum = "0" + hnum);
  var mnum = Math.floor(rest / 60000) % 60;
  1 == String(mnum).length && (mnum = "0" + mnum);
  var snum = Math.floor(rest / 1000) % 60;
  1 == String(snum).length && (snum = "0" + snum);
  // 摸鱼牌子按"当天是否法定休息日"切换：休息日=放假摸鱼中，工作日=上班摸鱼中
  var boardBadge = isRestDay(new Date())
    ? `<img class='boardsign' src='/assets/badge/Fomalhaut-rest.svg' title='放假啦，光明正大地摸鱼~'>`
    : `<img class='boardsign' src='/assets/badge/Fomalhaut-work.svg' title='上班偷偷摸鱼，别被发现~'>`;
  let currentTimeHtml =
    boardBadge +
    `<br> <div style="font-size:13px;font-weight:bold">本站居然运行了 ${ynum} 年 ${dnum} 天 ${hnum} 小时 ${mnum} 分 ${snum} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${dis} 千米，约为 ${unit} 个天文单位（信号单程需 ${lt}）🚀</div>`;
  document.getElementById("workboard") &&
    (document.getElementById("workboard").innerHTML = currentTimeHtml);
}
// 设置重复执行函数，周期1000ms
setInterval(() => {
  createtime();
}, 1000);

/*页脚计时器 end */
