// No dependencies or browser/build required: run node --test tools/tests/cursor-effects.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../../source/js/modules/cursor.js'), 'utf8');
const catSource = source.slice(source.indexOf('/* ------------------------------ 小猫咪'), source.indexOf('/* 小猫咪 end */'));
const cursorSource = source.slice(source.indexOf('var CURSOR;'));

function setup({ cats = true, cursors = true, scroll = 1000 } = {}) {
  const trace = [], frames = new Map(), intervals = [], observers = [];
  let nextFrame = 0, styleReads = 0, rectReads = 0, heightReads = 0, queries = 0;
  function emitter(target) {
    target.events = new Map();
    target.addEventListener = (name, fn) => {
      if (!target.events.has(name)) target.events.set(name, []);
      target.events.get(name).push(fn);
    };
    target.emit = (name, event = {}) => {
      for (const fn of target.events.get(name) || []) fn({ type: name, ...event });
    };
    return target;
  }
  class Element {
    constructor(tagName = 'div') {
      emitter(this);
      this.nodeType = 1;
      this.tagName = tagName.toUpperCase();
      this.parentElement = null;
      this.children = [];
      this.attrs = new Map();
      this.connected = false;
      this.computedCursor = 'auto';
      const classes = new Set();
      this.classList = {
        contains: name => classes.has(name),
        add: name => { if (!classes.has(name)) { classes.add(name); trace.push('write:class:' + name); } },
        remove: name => { if (classes.has(name)) { classes.delete(name); trace.push('write:class:' + name); } },
        toggle: (name, enabled) => enabled ? this.classList.add(name) : this.classList.remove(name)
      };
      Object.defineProperty(this, 'className', {
        get: () => [...classes].join(' '),
        set: value => { classes.clear(); for (const name of value.split(/\s+/)) if (name) classes.add(name); }
      });
      this.style = new Proxy({}, { set: (obj, name, value) => {
        trace.push('write:style:' + name);
        obj[name] = value;
        return true;
      } });
    }
    get isConnected() { return this.connected || !!(this.parentElement && this.parentElement.isConnected); }
    appendChild(child) {
      if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    append(child) { return this.appendChild(child); }
    remove() {
      if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
      this.parentElement = null;
      this.connected = false;
    }
    contains(child) { return child === this || this.children.some(el => el.contains(child)); }
    setAttribute(name, value) { this.attrs.set(name, value); trace.push('write:attr:' + name); }
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
    closest(selector) {
      for (let el = this; el; el = el.parentElement) {
        const tag = el.tagName;
        const role = el.getAttribute('role');
        if ((tag === 'A' && (el.getAttribute('href') !== null || selector.includes('a,'))) ||
          ['BUTTON', 'SUMMARY', 'LABEL'].includes(tag) ||
          (tag === 'INPUT' && (selector.includes('input,') || ['button', 'submit', 'reset'].includes(el.getAttribute('type')))) ||
          (['SELECT', 'TEXTAREA'].includes(tag) && selector.includes('textarea')) ||
          el.getAttribute('onclick') !== null || ['button', 'link'].includes(role) ||
          (selector.includes('#rightside') && ['rightside', 'myscoll'].includes(el.id))) return el;
      }
      return null;
    }
    getBoundingClientRect() {
      rectReads++;
      trace.push('read:rect');
      if (this.style.display !== 'block') return { left: 0, right: 0, top: 0, bottom: 0 };
      const top = parseFloat(this.style.top) || 0;
      return { left: 1112, right: 1176, top, bottom: top + 64 };
    }
  }
  const root = new Element('html'); root.connected = true;
  const body = root.appendChild(new Element('body')); body.clientWidth = 1200;
  let docHeight = 3000;
  Object.defineProperty(body, 'scrollHeight', { get: () => { heightReads++; trace.push('read:height'); return docHeight; } });
  const rope = body.appendChild(new Element()); rope.id = 'myscoll';
  const document = emitter({ body, documentElement: root, hidden: false, hit: body });
  document.createElement = name => new Element(name);
  document.querySelector = selector => {
    queries++;
    const walk = el => {
      if ((selector === '.neko' && el.classList.contains('neko')) || (selector[0] === '#' && el.id === selector.slice(1))) return el;
      for (const child of el.children) { const result = walk(child); if (result) return result; }
      return null;
    };
    return walk(root);
  };
  document.elementFromPoint = () => { trace.push('read:hit'); return document.hit; };
  document.getElementsByTagName = () => { throw new Error('Full-page traversal forbidden'); };
  const window = emitter({ innerHeight: 1000, scrollY: scroll });
  window.getComputedStyle = el => { styleReads++; trace.push('read:cursor'); return { cursor: el.computedCursor }; };
  const storage = new Map([['themeColor', 'green']]);
  const localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  function requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id, fn); return id; }
  function cancelAnimationFrame(id) { frames.delete(id); }
  const fn = {};
  function $(value) {
    const elements = typeof value === 'string' ? [document.querySelector(value)].filter(Boolean) : [value];
    const result = Object.create(fn);
    elements.forEach((el, i) => { result[i] = el; }); result.length = elements.length;
    result.height = () => window.innerHeight;
    result.scrollTop = () => window.scrollY;
    result.ready = callback => { callback(); return result; };
    result.css = styles => { for (const el of elements) for (const [key, value] of Object.entries(styles)) if (value !== undefined) el.style[key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = String(value); return result; };
    result.off = name => { for (const el of elements) el.events.set(name, []); return result; };
    result.on = (name, callback) => { for (const el of elements) el.addEventListener(name, callback); return result; };
    result.after = child => { for (const el of elements) el.parentElement.appendChild(child); return result; };
    result.closest = selector => { const found = elements[0] && elements[0].closest(selector); return { length: found ? 1 : 0 }; };
    result.animate = () => { window.scrollY = 0; };
    return result;
  }
  $.fn = fn; $.extend = Object.assign;
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
  }
  const ctx = vm.createContext({ window, document, localStorage, $, jQuery: $, requestAnimationFrame, cancelAnimationFrame,
    setInterval: callback => { intervals.push(callback); return intervals.length; }, MutationObserver, ResizeObserver,
    btf: { scrollToDest: () => { window.scrollY = 0; } } });
  window.btf = ctx.btf;
  if (cats) vm.runInContext(catSource, ctx);
  if (cursors) vm.runInContext(cursorSource, ctx);
  const tick = () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(); };
  const settle = () => { for (let i = 0; frames.size && i < 200; i++) tick(); assert.equal(frames.size, 0, 'Animation must settle'); };
  return { ctx, trace, frames, intervals, root, body, rope, document, window, $, Element, tick, settle,
    cursor: ctx.CURSOR, cat: () => document.querySelector('.neko'),
    mutation: records => observers.forEach(observer => observer.callback(records)),
    height: value => { docHeight = value; },
    metrics: () => ({ styleReads, rectReads, heightReads, queries }) };
}

function move(env, target, x = 100, y = 100) {
  env.document.hit = target;
  env.document.emit('mousemove', { target, clientX: x, clientY: y });
}

test('cursor uses no scan; nested span and SVG identify the real clickable ancestor', () => {
  const e = setup({ cats: false });
  assert.equal(e.metrics().styleReads, 0);
  assert.equal(e.frames.size, 0);
  const button = e.body.appendChild(new e.Element('button'));
  const svg = button.appendChild(new e.Element('svg'));
  const span = button.appendChild(new e.Element('span'));
  move(e, svg); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  e.trace.length = 0;
  e.document.emit('mouseout', { target: svg, relatedTarget: span });
  e.document.emit('mouseover', { target: span });
  move(e, span); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  assert.equal(e.trace.includes('write:class:hover'), false, 'moving between nested children must not flicker');
  const plain = e.body.appendChild(new e.Element('div'));
  // Identical markup cannot give a different element another element's cache identity.
  Object.defineProperty(plain, 'outerHTML', { get: () => { throw new Error('Markup comparison forbidden'); } });
  move(e, plain); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
});

test('cursor preserves centering, scale CSS, idle and one chain across repeated refresh', () => {
  const e = setup({ cats: false });
  move(e, e.body, 200, 300); e.settle();
  assert.equal(e.cursor.layer.style.transform, 'translate3d(192px, 292px, 0)');
  assert.equal(e.cursor.cursor.style.left, '0px');
  assert.equal(e.cursor.cursor.style.top, '0px');
  assert.equal(e.cursor.cursor.style.transform, undefined, 'CSS hover/active transform must stay independent');
  const rules = e.cursor.scr, css = rules.textContent;
  const listeners = e.document.events.get('mousemove').length;
  move(e, e.body, 400, 500);
  for (let i = 0; i < 30; i++) e.cursor.refresh();
  assert.equal(e.frames.size, 1);
  assert.equal(e.cursor.scr, rules);
  assert.equal(rules.isConnected, true);
  assert.equal(rules.textContent, css);
  assert.equal(e.document.events.get('mousemove').length, listeners);
  e.trace.length = 0; e.settle();
  assert.equal(e.cursor.layer.style.transform, 'translate3d(392px, 492px, 0)');
  assert.equal(e.trace.some(value => /^write:style:(left|top)$/.test(value)), false);
  const writes = e.trace.length;
  e.tick(); assert.equal(e.trace.length, writes, 'idle frame must do no work');
});

test('cursor caches custom pointer checks; mutations, PJAX and theme changes invalidate', () => {
  const e = setup({ cats: false });
  const custom = e.body.appendChild(new e.Element()); custom.computedCursor = 'pointer';
  move(e, custom); e.settle();
  const reads = e.metrics().styleReads;
  for (let i = 0; i < 50; i++) move(e, custom, 200 + i, 100);
  assert.equal(e.frames.size, 1);
  e.settle(); assert.equal(e.metrics().styleReads, reads);
  custom.computedCursor = 'auto';
  e.mutation([{ target: custom, type: 'attributes' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  custom.computedCursor = 'pointer';
  e.mutation([{ target: e.root, type: 'attributes' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true, 'theme/root changes invalidate cached targets');
  custom.computedCursor = 'auto';
  e.document.emit('load', { target: new e.Element('link') }); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false, 'late CSS loads invalidate cached targets');
  const dynamic = e.body.appendChild(new e.Element('button'));
  e.document.hit = dynamic;
  e.mutation([{ target: e.body, type: 'childList' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  dynamic.disabled = true;
  e.mutation([{ target: dynamic, type: 'attributes' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  e.document.hit = custom; custom.computedCursor = 'pointer';
  e.document.emit('pjax:complete'); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  const style = e.cursor.scr;
  e.ctx.localStorage.setItem('themeColor', 'pink');
  e.cursor.refresh(); e.settle();
  assert.equal(e.cursor.scr, style);
  assert.match(style.textContent, /237%2C%20112%2C%20155/);
  e.mutation([{ target: e.cursor.layer, type: 'attributes' }, { target: e.cursor.cursor, type: 'attributes' }]);
  assert.equal(e.frames.size, 0, 'own DOM writes cannot start an observer animation loop');
});

test('CSSOM normalization cannot cause identical cursor or cat style writes', () => {
  const e = setup(); e.settle(); move(e, e.body, 200, 300); e.settle();
  // Browsers serialize units and floating point numbers differently from input strings.
  e.cursor.layer.style.transform = 'translate3d(192px, 292px, 0px)';
  e.cat().style.top = '400.0px'; e.rope.style.height = '450.0px';
  e.trace.length = 0;
  move(e, e.body, 200, 300); e.window.emit('scroll'); e.settle();
  assert.equal(e.trace.some(value => /^write:style:(transform|top|height)$/.test(value)), false);
});

test('cursor pause cancels pending work and returns on the next pointer movement', () => {
  const e = setup({ cats: false });
  move(e, e.body); e.tick();
  move(e, e.body, 500, 500); assert.equal(e.frames.size, 1);
  e.document.hidden = true; e.document.emit('visibilitychange');
  assert.equal(e.frames.size, 0);
  assert.equal(e.cursor.cursor.classList.contains('hidden'), true);
  e.document.hidden = false;
  move(e, e.body, 600, 600); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hidden'), false);
  e.document.emit('mouseleave');
  assert.equal(e.frames.size, 0);
});

test('cat coalesces mouse+scroll bursts, uses latest coordinates and writes only changes', () => {
  const e = setup({ cursors: false }); e.settle();
  const cat = e.cat();
  assert.equal(cat.style.top, '400px');
  assert.equal(e.rope.style.height, '450px');
  const initial = e.metrics(); e.trace.length = 0;
  for (let i = 0; i < 100; i++) move(e, e.body, i, 100);
  move(e, e.body, 1140, 420);
  assert.equal(e.frames.size, 1);
  assert.equal(e.metrics().heightReads, initial.heightReads);
  assert.equal(e.metrics().rectReads, initial.rectReads);
  e.settle(); assert.equal(cat.classList.contains('hoverOn'), true);
  assert.equal(e.metrics().rectReads, initial.rectReads, 'mouse-only ticks reuse bounds');
  e.trace.length = 0;
  for (let i = 0; i < 100; i++) {
    e.window.scrollY = 1200 + i;
    e.window.emit('scroll');
    move(e, e.body, 1140, 560);
  }
  e.window.scrollY = 1400; e.window.emit('scroll');
  assert.equal(e.frames.size, 1);
  assert.equal(e.metrics().heightReads, initial.heightReads);
  e.tick();
  assert.equal(e.metrics().heightReads, initial.heightReads + 1);
  assert.equal(cat.style.top, '580px');
  assert.equal(cat.classList.contains('hoverOn'), false, 'latest scroll position changes the hover bounds');
  const lastRead = e.trace.map((value, index) => value.startsWith('read:') ? index : -1).reduce((a, b) => Math.max(a, b), -1);
  const firstWrite = e.trace.findIndex(value => value.startsWith('write:'));
  assert.ok(firstWrite > lastRead, 'all geometric reads must precede writes');
  e.trace.length = 0; e.window.emit('scroll'); e.tick();
  assert.equal(e.trace.some(value => value.startsWith('write:')), false);
  assert.equal(cat.style.transform, undefined, 'original CSS translateX(50%) stays intact');
});

test('cat keeps bottom clock, no-scroll boundary, resize, PJAX and click-through behavior', () => {
  const e = setup({ cursors: false }); e.settle();
  let cat = e.cat();
  e.window.scrollY = 2000; e.window.emit('scroll'); e.settle();
  assert.equal(cat.classList.contains('showMsg'), true);
  assert.match(cat.getAttribute('data-msg'), /^\d{2}:\d{2}:\d{2}$/);
  e.window.scrollY = 0; e.height(1000); e.window.emit('resize'); e.settle();
  assert.equal(cat.style.top, '-50px');
  assert.equal(e.rope.style.height, '0px');
  assert.equal(cat.style.display, 'none');
  assert.equal(cat.classList.contains('showMsg'), false);
  e.height(3000); e.window.scrollY = 1000; e.window.emit('resize'); e.settle();
  const button = e.body.appendChild(new e.Element('button'));
  e.document.hit = button;
  e.document.emit('click', { clientX: 1140, clientY: 420 });
  assert.equal(e.window.scrollY, 1000, 'covered button must keep its own click');
  e.document.hit = e.body;
  e.document.emit('click', { clientX: 1140, clientY: 420 });
  assert.equal(e.window.scrollY, 0);
  cat.remove(); e.rope.remove();
  const nextRope = e.body.appendChild(new e.Element()); nextRope.id = 'myscoll';
  e.window.scrollY = 1500;
  e.document.emit('pjax:complete'); e.settle(); cat = e.cat();
  assert.equal(nextRope.style.height, '675px');
  e.document.emit('pjax:complete'); e.settle();
  assert.equal(nextRope.events.get('click.nekoScroll').length, 1);
  assert.ok(cat.isConnected);
  assert.equal(cat.style.top, '625px');
  assert.equal(e.intervals.length, 1);
  e.window.emit('scroll'); e.document.hidden = true; e.document.emit('visibilitychange');
  assert.equal(e.frames.size, 0);
  e.document.hidden = false; e.document.emit('visibilitychange'); e.settle();
});
