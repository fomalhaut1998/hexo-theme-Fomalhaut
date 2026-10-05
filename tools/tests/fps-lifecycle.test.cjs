'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..', process.env.FPS_TEST_SOURCE_ROOT || '.');
const reading = fs.readFileSync(path.join(root, 'source/js/modules/reading.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'source/js/modules/settings.js'), 'utf8');
const fpsSource = reading.slice(reading.indexOf('/* fps检测 start */'), reading.indexOf('/* fps检测 end */'));
const settingsSource = settings.slice(settings.indexOf('// 帧率监测开关'), settings.indexOf('// 刷新窗口'));
function harness(mode = 'raf', stored = '1', hidden = false) {
  let now = 0, next = 1;
  const queue = new Map(), cancelled = [], listeners = new Map();
  const store = new Map([['fpson', stored]]);
  function node() { return { html: '', writes: 0, style: {}, checked: true,
    set innerHTML(value) { this.html = value; this.writes++; }, get innerHTML() { return this.html; } }; }
  let panel = node(); const toggle = node();
  const enqueue = fn => { const id = next++; queue.set(id, fn); return id; };
  const cancel = id => { cancelled.push(queue.get(id)); queue.delete(id); };
  const document = { hidden, addEventListener(type, fn) { listeners.set(type, fn); },
    getElementById(id) { return id === 'fps' ? panel : id === 'fpson' ? toggle : null; } };
  const window = { performance: { now: () => now }, setTimeout: enqueue, clearTimeout: cancel };
  if (mode === 'raf') Object.assign(window, { requestAnimationFrame: enqueue, cancelAnimationFrame: cancel });
  if (mode === 'webkit') Object.assign(window, { webkitRequestAnimationFrame: enqueue, webkitCancelAnimationFrame: cancel });
  class FakeDate extends Date { static now() { return now; } }
  const ctx = vm.createContext({ window, document, Date: FakeDate, localStorage: {
    getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) } });
  vm.runInContext(fpsSource, ctx);
  return { ctx, window, document, queue, cancelled, toggle, store, node,
    get panel() { return panel; }, set panel(n) { panel = n; },
    frame(ms = 16) { now += ms; const list = [...queue.values()]; queue.clear(); for (const fn of list) fn(now); },
    visibility(value) { document.hidden = value; listeners.get('visibilitychange')(); },
    initSettings() { vm.runInContext(settingsSource, ctx); },
    sample() { for (let i = 0; i < 66; i++) this.frame(); } };
}
test('FPS opens one loop and closing cancels all future work', () => {
  const h = harness(); h.ctx.startFps(); h.ctx.startFps(); assert.equal(h.queue.size, 1);
  h.sample(); assert.match(h.panel.html, /^FPS:63 /); const writes = h.panel.writes;
  h.ctx.stopFps(); assert.equal(h.queue.size, 0); assert.equal(h.window.__fpsRunning, false);
  h.frame(10000); assert.equal(h.panel.writes, writes);
});
test('late cancelled callbacks cannot revive or disturb a reopened loop', () => {
  const h = harness(); h.ctx.startFps(); h.ctx.stopFps(); h.ctx.startFps();
  h.cancelled[0](99999); assert.equal(h.queue.size, 1); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
});
test('background cancels sampling and foreground starts a fresh one-second window', () => {
  const h = harness(); h.ctx.startFps(); h.sample(); h.visibility(true);
  assert.equal(h.queue.size, 0); h.frame(60000); h.visibility(false);
  assert.equal(h.panel.html, 'FPS:采样中'); assert.equal(h.queue.size, 1);
  h.sample(); assert.match(h.panel.html, /^FPS:63 /);
});
test('disabled monitor stays stopped through background/foreground events', () => {
  const h = harness(); h.ctx.startFps(); h.visibility(true); h.ctx.stopFps(); h.visibility(false);
  assert.equal(h.queue.size, 0); h.ctx.startFps(); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
});
test('opening while hidden defers work until visible', () => {
  const h = harness('raf', '1', true); h.ctx.startFps(); assert.equal(h.queue.size, 0);
  h.visibility(false); assert.equal(h.queue.size, 1); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
});
test('missing/replaced FPS DOM is safe and same samples do not rewrite DOM', () => {
  const h = harness(); h.ctx.startFps(); h.panel = null; h.sample();
  h.panel = h.node(); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
  const writes = h.panel.writes; h.sample(); assert.equal(h.panel.writes, writes);
  h.panel = h.node(); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
});
for (const mode of ['timer', 'webkit']) test(mode + ' fallback is paired with its cancellation API', () => {
  const h = harness(mode); h.ctx.startFps(); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
  h.ctx.stopFps(); assert.equal(h.queue.size, 0);
});
test('settings toggle really stops, persists preference and restarts once', () => {
  const h = harness(); h.initSettings(); assert.equal(h.queue.size, 1);
  h.toggle.checked = false; h.ctx.fpssw(); assert.equal(h.queue.size, 0);
  assert.equal(h.store.get('fpson'), '0'); assert.equal(h.panel.style.display, 'none');
  h.toggle.checked = true; h.ctx.fpssw(); h.ctx.fpssw(); assert.equal(h.queue.size, 1);
  assert.equal(h.store.get('fpson'), '1'); assert.equal(h.panel.style.display, 'block');
});
test('missing display node cannot prevent settings initialization or closing the loop', () => {
  const h = harness(); h.panel = null; assert.doesNotThrow(() => h.initSettings());
  assert.equal(h.queue.size, 1); h.toggle.checked = false;
  assert.doesNotThrow(() => h.ctx.fpssw()); assert.equal(h.queue.size, 0);
  assert.equal(h.store.get('fpson'), '0'); assert.equal(h.window.__fpsRunning, false);
  h.visibility(true); h.visibility(false); assert.equal(h.queue.size, 0);
  h.toggle.checked = true; h.ctx.fpssw(); assert.equal(h.queue.size, 1);
  h.panel = h.node(); h.sample(); assert.match(h.panel.html, /^FPS:63 /);
  const off = harness('raf', '0'); off.panel = null;
  assert.doesNotThrow(() => off.initSettings()); assert.equal(off.queue.size, 0);
});
test('reset defaults executes the real reset function and resumes FPS after off', () => {
  const h = harness(); h.initSettings(); h.toggle.checked = false; h.ctx.fpssw();
  const originalGet = h.document.getElementById;
  const extra = new Map();
  h.document.getElementById = id => {
    const known = originalGet(id); if (known) return known;
    if (!extra.has(id)) extra.set(id, Object.assign(h.node(), { classList: { add() {}, remove() {} } }));
    return extra.get(id);
  };
  Object.assign(h.ctx, { FONT_DEFAULT: 'default', CODE_FONT_DEFAULT: 'default',
    initItem() { h.store.set('fpson', '1'); }, setFont() {}, setCodeFont() {}, setColor() {},
    resetBg_() {}, changeLight() {}, fomalNotify() {} });
  const resetSource = settings.slice(settings.indexOf('function reset() {'), settings.indexOf('// 量一次'));
  vm.runInContext(resetSource, h.ctx); h.ctx.reset();
  assert.equal(h.panel.style.display, 'block'); assert.equal(h.toggle.checked, true);
  assert.equal(h.store.get('fpson'), '1'); assert.equal(h.queue.size, 1);
  h.sample(); assert.match(h.panel.html, /^FPS:63 /);
  h.ctx.reset(); assert.equal(h.queue.size, 1);
});
test('initial saved off preference queues no FPS work', () => {
  const h = harness('raf', '0'); h.initSettings(); assert.equal(h.queue.size, 0);
  assert.equal(h.panel.style.display, 'none'); h.visibility(true); h.visibility(false); assert.equal(h.queue.size, 0);
});
