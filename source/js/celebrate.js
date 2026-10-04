/*!
 * celebrate.js —— 全屏礼炮 / 烟花（只给「喜庆节日」用）
 * ==================================================================
 * 平时根本不加载：festival.js 判断出喜庆节日命中的那一刻，才动态插入这个脚本，
 * 所以平常的日子一个字节都不下载。
 *
 * 用法（一般不用手写，festival.js 会自动调）：
 *   fomalCelebrate()                         默认暖色
 *   fomalCelebrate({ colors: ['#ff4d4f'] })  指定配色
 *   fomalCelebrate.stop()                    立即收工（调试用）
 *
 * 设计约束：
 *   · canvas 铺满全屏 + pointer-events:none，不挡任何点击
 *   · z-index 9998，排在通知卡片（9999）下面，卡片文字始终看得清
 *   · 同一时间只跑一段动画；画完自动移除 canvas、resize 监听
 *   · 像素比最高按 2 渲染，粒子上限约 500，低端机也不卡
 *   · 系统开了「减少动态效果」(prefers-reduced-motion) 时直接不播放
 */
(function (global) {
  'use strict';

  var Z = 9998;
  var ROCKETS = 8;        // 礼炮发数
  var SPLASH = 104;       // 每发爆炸的粒子数
  var TOTAL = 7600;       // 整段动画硬上限（毫秒）
  var GRAVITY = 900;      // px/s²（基准值，实际按视口高度换算）
  var DEFAULT_COLORS = ['#ffd166', '#ff6b6b', '#4dabf7', '#b197fc', '#69db7c', '#ffa94d'];
  var running = false;

  function now() {
    return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
  }

  function raf(cb) {
    return global.requestAnimationFrame ? global.requestAnimationFrame(cb) : global.setTimeout(cb, 16);
  }

  function unraf(id) {
    if (!id) return;
    if (global.cancelAnimationFrame) global.cancelAnimationFrame(id);
    else global.clearTimeout(id);
  }

  function motionOff() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function fire(opt) {
    if (running) return false;
    if (typeof document === 'undefined' || !document.createElement) return false;
    if (motionOff()) return false;
    var body = document.body || document.documentElement;
    if (!body) return false;

    var colors = (opt && opt.colors && opt.colors.length) ? opt.colors : DEFAULT_COLORS;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;' +
      'z-index:' + Z + ';opacity:1;transition:opacity .45s linear';
    body.appendChild(cv);
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) { body.removeChild(cv); return false; }

    running = true;
    var W = 0, H = 0;
    function resize() {
      W = cv.clientWidth || global.innerWidth || 0;
      H = cv.clientHeight || global.innerHeight || 0;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      gRocket = H * 1.0;          // 大屏上礼炮和粒子的速度、重力同比放大，观感一致
      gPart = H * 0.36;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
    }
    resize();

    var gRocket = GRAVITY, gPart = GRAVITY * 0.42;
    var start = now(), last = start, id = 0, stopped = false;
    var parts = [], rockets = [], i, k;

    function pick() { return colors[(Math.random() * colors.length) | 0]; }

    for (i = 0; i < ROCKETS; i++) {
      rockets.push({
        at: 100 + i * 540 + Math.random() * 300,
        x: W * (0.16 + Math.random() * 0.68),
        y: H + 6,
        vx: (Math.random() - 0.5) * W * 0.06,
        vy: -(H * (0.86 + Math.random() * 0.34)),
        color: pick()
      });
    }

    function burst(x, y, color) {
      var f = 0.42;
      parts.push({ flash: 1, x: x, y: y, life: f, max: f, r: 86, color: color });
      for (var n = 0; n < SPLASH; n++) {
        var a = Math.random() * Math.PI * 2;
        var sp = H * (0.16 + Math.random() * 0.5);
        var life = 1.5 + Math.random() * 0.9;
        parts.push({
          x: x, y: y, px: x, py: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.92,
          life: life, max: life,
          w: 1.9 + Math.random() * 1.7,
          color: Math.random() < 0.72 ? color : pick()
        });
      }
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      unraf(id);
      global.removeEventListener('resize', resize);
      cv.style.opacity = '0';
      global.setTimeout(function () {
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        running = false;
      }, 500);
    }
    fire.stop = stop;

    function frame() {
      var t = now();
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      var el = t - start;
      ctx.clearRect(0, 0, W, H);

      for (i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        if (el < r.at) continue;
        r.vy += gRocket * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(r.x - r.vx * 0.028, r.y - r.vy * 0.028);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (r.vy >= 0 || r.y <= H * 0.16) { burst(r.x, r.y, r.color); rockets.splice(i, 1); }
      }

      for (i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (p.flash) {
          var grow = 1 - p.life / p.max;
          var rad = p.r * (0.35 + grow);
          var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          grd.addColorStop(0, 'rgba(255,255,255,' + (0.6 * (1 - grow)).toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        var drag = Math.exp(-0.85 * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + gPart * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      if (el < TOTAL && (parts.length || rockets.length)) id = raf(frame);
      else stop();
    }

    global.addEventListener('resize', resize);
    id = raf(frame);
    return true;
  }

  global.fomalCelebrate = fire;
  if (typeof module !== 'undefined' && module.exports) module.exports = fire;
})(window);
