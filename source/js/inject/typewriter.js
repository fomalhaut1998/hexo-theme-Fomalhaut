/* ============================================================================
 * source/js/inject/typewriter.js —— 首页副标题打字机「丝滑版」
 * ----------------------------------------------------------------------------
 * 背景：主题 themes/fomalhaut/layout/includes/third-party/subtitle.pug 用的是
 *   Typed.js，参数是 typeSpeed:150 / backSpeed:50：逐字硬蹦、每字停 150ms，
 *   一句 30 字要打 4.5 秒，观感就是「一个字一个字往外挤」。
 *
 * 做法（不改 themes/ 源码）：
 *   主题那段脚本写的是 `typeof Typed === 'function' ? subtitleType() : getScript(typed.min.js)`，
 *   本文件在 <head> 里抢先定义 window.Typed（同名、同构造签名的类），于是：
 *     ① 主题命中 typeof === 'function'，直接调用本实现，不再去 CDN 拉 typed.min.js（省一个请求）；
 *     ② 主题传进来的 { strings, startDelay, typeSpeed, loop, backSpeed } 原样接收，
 *        调节奏只改下面的 TUNING；美化面板关掉打字效果（effect:false）时本文件完全不生效；
 *     ③ pjax 换页时主题会执行 typed.destroy()，所以 destroy() 必须存在且可重复调用。
 *
 * 丝滑点：
 *   ① 每个字符是一个 <span class="st-ch">，入场 .34s 缓动淡入 + 轻微上浮 + 消模糊，
 *      相邻字符的动画互相重叠 → 视觉上是一条「流」，而不是一个个跳出来；
 *   ② 打字间隔换算到 ~63ms 并带 ±14ms 随机抖动，去掉机械节拍；
 *   ③ 光标改成柔和呼吸（1.15s ease-in-out），不再是硬闪的方块；
 *   ④ 回退逐字淡出（.19s），不是瞬间消失；
 *   ⑤ 命中 prefers-reduced-motion 时直接显示整句，不做任何动画。
 *   外观全在 source/css/typewriter.css，本文件只负责节奏与 DOM。
 *
 * 回滚：删掉 _config.fomalhaut.yml inject.head 里的 <script src="/js/inject/typewriter.js?v=...">
 *       与 <link ... href="/css/typewriter.css?v=..."> 两行即可
 *       （配置备份 bak/20261004-typewriter-smooth/before/_config.fomalhaut.yml）。
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__stTypewriter) { return; }
  window.__stTypewriter = true;

  /* ── 可调参数 ─────────────────────────────────────────────────────────────
   * 单位都是毫秒。主题传的是 Typed.js 的「毫秒/字」，原生 Typed 没有入场动画，
   * 150ms 是它的正常档；本实现每字自带 .34s 动画，节奏必须更快才不显拖沓，
   * 所以按系数换算。想整体更快/更慢：只改 SPEED_SCALE / BACK_SCALE。 */
  var TUNING = {
    SPEED_SCALE: 0.42,   // 打字间隔 = 主题 typeSpeed x 该系数（150 -> 63ms）
    BACK_SCALE: 0.55,    // 退格间隔 = 主题 backSpeed x 该系数（50 -> 27ms）
    MIN_TYPE: 34, MAX_TYPE: 110,
    MIN_BACK: 14, MAX_BACK: 60,
    START_DELAY_CAP: 420, // 首字前停顿的上限
    BACK_DELAY: 1900,     // 整句打完后驻留多久才开始回退
    NEXT_DELAY: 240,      // 清空后、下一句开始前的间隙
    JITTER: 14            // 打字间隔随机抖动 ±ms
  };

  var reduceMotion = false;
  try {
    reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* 老浏览器：按有动画处理 */ }

  /* 按「字素簇」切分：中文与 emoji（🥝🤣🍭✦ 这类代理对 / 组合序列）都不会被切成半个 */
  function split(str) {
    str = String(str == null ? '' : str);
    try {
      if (window.Intl && window.Intl.Segmenter) {
        var seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        var out = [], iter = seg.segment(str)[Symbol.iterator](), r;
        while (!(r = iter.next()).done) { out.push(r.value.segment); }
        return out;
      }
    } catch (e) { /* 退回按码位切 */ }
    return Array.prototype.slice.call(str);
  }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function jitter(n) { return Math.round((Math.random() * 2 - 1) * n); }

  function Typed(el, opt) {
    opt = opt || {};
    this.dead = false;
    this.timer = null;
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    /* 元素不在（非首页 / 被 pjax 换掉）→ 留一个空壳实例，destroy() 依然安全 */
    if (!this.el) { return; }

    var raw = opt.strings || [];
    if (!raw.length) { raw = ['']; }
    var strings = [], i;
    for (i = 0; i < raw.length; i++) { strings.push(split(raw[i])); }
    this.strings = strings;

    this.typeSpeed = clamp(Math.round((opt.typeSpeed || 150) * TUNING.SPEED_SCALE), TUNING.MIN_TYPE, TUNING.MAX_TYPE);
    this.backSpeed = clamp(Math.round((opt.backSpeed || 50) * TUNING.BACK_SCALE), TUNING.MIN_BACK, TUNING.MAX_BACK);
    this.startDelay = Math.min(opt.startDelay || 0, TUNING.START_DELAY_CAP);
    this.loop = opt.loop !== false;

    this.idx = 0;    // 当前第几句
    this.pos = 0;    // 当前句已打出几个字
    this.nodes = []; // 与 pos 一一对应的字符节点（退格必须按它取，不能用 lastChild，见 back()）

    this.el.textContent = '';
    this.el.classList.add('st-type');
    this.text = document.createElement('span');
    this.text.className = 'st-text';
    this.cursor = document.createElement('span');
    this.cursor.className = 'st-cur';
    this.el.appendChild(this.text);
    this.el.appendChild(this.cursor);
    this.el.classList.add('st-run');

    if (reduceMotion) {                       // 无障碍：直接给整句，不做动画
      this.text.textContent = this.strings[0].join('');
      this.el.classList.add('st-done');
      return;
    }
    var self = this;
    this.timer = setTimeout(function () { self.step(); }, this.startDelay);
  }

  Typed.prototype._later = function (fn, ms) {
    var self = this;
    this.timer = setTimeout(function () { fn.call(self); }, ms);
  };

  Typed.prototype._put = function (ch) {
    var s = document.createElement('span');
    s.className = 'st-ch';
    s.textContent = ch;
    this.text.appendChild(s);
    this.nodes.push(s);
  };

  /* 打字阶段 */
  Typed.prototype.step = function () {
    if (this.dead) { return; }
    var chars = this.strings[this.idx];

    if (this.pos < chars.length) {
      this._put(chars[this.pos]);
      this.pos++;
      this._later(this.step, this.typeSpeed + jitter(TUNING.JITTER));
      return;
    }
    /* 本句打完 */
    var isLast = this.idx >= this.strings.length - 1;
    if (!this.loop && isLast) {               // 不循环：停在整句上，光标继续呼吸
      this.el.classList.add('st-done');
      return;
    }
    this.el.classList.add('st-done');
    this._later(this.back, TUNING.BACK_DELAY);
  };

  /* 退格阶段：逐字淡出
   *
   * 【2026-10-04 修 bug】这里原来用 this.text.lastChild 取要删的字符，但字符加了
   * .st-out 之后要等 200ms 才真正摘除，而退格间隔只有 27ms —— 这 200ms 内每次
   * lastChild 都指向同一个「已标记、还没摘掉」的节点，于是 pos 一路递减、DOM 却
   * 几乎没删，pos 提前归零就开了下一句，旧字符全留在原地，几轮下来越积越长。
   * 正解：节点存进数组，按 pos 精确取；并且切换句子前先确认幽灵节点走干净。 */
  Typed.prototype.back = function () {
    if (this.dead) { return; }
    this.el.classList.remove('st-done');

    if (this.pos <= 0) {                      // 当前句已删空
      if (this.text.children.length) {        // 还有淡出中、等着摘除的节点 → 等它们走完
        this._later(this.back, 60);
        return;
      }
      this.idx = (this.idx + 1) % this.strings.length;
      this.pos = 0;
      this.nodes.length = 0;
      this._later(this.step, TUNING.NEXT_DELAY);
      return;
    }
    this.pos--;
    var node = this.nodes.pop();              // 与 pos 一一对应，不受摘除延时影响
    if (node && node.parentNode === this.text) {
      node.classList.add('st-out');
      setTimeout(function () {               // 等淡出动画播完再摘节点
        if (node.parentNode) { node.parentNode.removeChild(node); }
      }, 200);
    }
    this._later(this.back, this.backSpeed);
  };

  /* 主题 pjax 换页时调用；可能被调用多次，必须幂等 */
  Typed.prototype.destroy = function () {
    this.dead = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.nodes.length = 0;
    if (this.el) {
      this.el.classList.remove('st-run', 'st-done');
    }
  };

  window.Typed = Typed;
})();
