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
  let nextFrame = 0, styleReads = 0, rectReads = 0, heightReads = 0, queries = 0, hitReads = 0;
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
    contains(child) { for (let node = child; node; node = node.parentElement) if (node === this) return true; return false; }
    setAttribute(name, value) { this.attrs.set(name, value); trace.push('write:attr:' + name); }
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
    getAttributeNames() { return [...this.attrs.keys()]; }
    get childNodes() { return this.children; }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part.includes('>')) {
          const [parent, child] = part.split('>').map(value => value.trim());
          return this.matches(child) && !!this.parentElement && this.parentElement.matches(parent);
        }
        if (part[0] === '.') return this.classList.contains(part.slice(1));
        if (part[0] === '#') return this.id === part.slice(1);
        const match = /^([a-z]+)?(?:\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\])?$/i.exec(part);
        if (!match) throw new Error('Unsupported mock selector: ' + part);
        return (!match[1] || this.tagName === match[1].toUpperCase()) &&
          (!match[2] || (this.getAttribute(match[2]) !== null &&
            (match[3] === undefined || this.getAttribute(match[2]) === match[3])));
      });
    }
    closest(selector) {
      for (let el = this; el; el = el.parentElement) if (el.matches(selector)) return el;
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
  document.createTextNode = text => ({ nodeType: 3, nodeValue: text, parentElement: null });
  document.querySelector = selector => {
    queries++;
    const walk = el => {
      if (el.nodeType !== 1) return null;
      if ((selector === '.neko' && el.classList.contains('neko')) || (selector[0] === '#' && el.id === selector.slice(1))) return el;
      for (const child of el.children) { const result = walk(child); if (result) return result; }
      return null;
    };
    return walk(root);
  };
  document.elementFromPoint = () => { hitReads++; trace.push('read:hit'); return document.hit; };
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
    metrics: () => ({ styleReads, rectReads, heightReads, queries, hitReads }) };
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

// These cases run the actual cursorSource above, not a duplicate classifier.
for (const tag of ['button', 'label']) {
  test('cursor keeps ' + tag + ' child round trips semantic with zero fallback CSS reads', () => {
    const e = setup({ cats: false });
    const control = e.body.appendChild(new e.Element(tag));
    const first = control.appendChild(new e.Element('span'));
    const second = control.appendChild(new e.Element('svg'));
    move(e, first); e.settle();
    const cache = e.cursor.controlCache;
    e.trace.length = 0;
    for (let i = 0; i < 40; i++) {
      const from = i % 2 ? second : first, to = i % 2 ? first : second;
      e.document.emit('mouseout', { target: from, relatedTarget: to });
      e.document.emit('mouseover', { target: to, relatedTarget: from });
      move(e, to, 100 + i, 100); e.tick();
      assert.equal(e.cursor.cursor.classList.contains('hover'), true);
    }
    e.settle();
    assert.equal(e.metrics().styleReads, 0, 'semantic children must never use getComputedStyle');
    assert.equal(e.trace.includes('write:class:hover'), false, 'no hover class remove/readd');
    assert.equal(e.cursor.controlCache, cache, 'semantic round trips must preserve control identity cache');
    assert.equal(e.metrics().hitReads, 0, 'known pointer targets need no hit-test');
  });
}

test('cursor uses the wb-control direct span fast path but not class-name lookalikes', () => {
  const e = setup({ cats: false });
  const control = e.body.appendChild(new e.Element()); control.className = 'wb-control';
  const span = control.appendChild(new e.Element('span'));
  const nested = span.appendChild(new e.Element('svg'));
  move(e, span); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  move(e, nested); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  assert.equal(e.metrics().styleReads, 0, 'wb-control labels and their descendants are semantic');
  const lookalike = e.body.appendChild(new e.Element()); lookalike.className = 'wb-control-extra';
  move(e, lookalike.appendChild(new e.Element('span'))); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false, 'exact class only');
});

for (const event of ['mouseover', 'mouseout']) {
  test('cursor rechecks non-semantic ancestor CSS across ' + event + ' boundaries', () => {
    const e = setup({ cats: false });
    const ancestor = e.body.appendChild(new e.Element()); ancestor.computedCursor = 'pointer';
    const first = ancestor.appendChild(new e.Element('span'));
    const second = ancestor.appendChild(new e.Element('span'));
    move(e, first); e.settle(); move(e, second); e.settle();
    const reads = e.metrics().styleReads;
    ancestor.computedCursor = 'auto'; // Models :hover without any mutation record.
    e.document.hit = first;
    e.document.emit(event, event === 'mouseover'
      ? { target: first, relatedTarget: second } : { target: second, relatedTarget: first });
    e.settle();
    assert.equal(e.cursor.cursor.classList.contains('hover'), false, 'old pointer answer cannot cross :hover');
    assert.ok(e.metrics().styleReads > reads, 'CSS fallback must refresh');
    ancestor.computedCursor = 'pointer';
    e.document.emit('mouseover', { target: first, relatedTarget: second }); e.settle();
    assert.equal(e.cursor.cursor.classList.contains('hover'), true, 'same element re-entry refreshes CSS too');
  });
}

function cachedCustom() {
  const e = setup({ cats: false });
  const custom = e.body.appendChild(new e.Element()); custom.computedCursor = 'pointer';
  move(e, custom); e.settle();
  return { e, custom };
}

for (const kind of ['own layer', 'own cursor', 'own style', 'own style text', 'fps title', 'neko data-msg']) {
  test('cursor ignores ' + kind + ' mutations without clearing cache or waking hit-test', () => {
    const { e, custom } = cachedCustom();
    const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
    const cat = e.body.appendChild(new e.Element()); cat.className = 'neko'; cat.style.position = 'fixed';
    const records = {
      'own layer': { target: e.cursor.layer, type: 'attributes', attributeName: 'style' },
      'own cursor': { target: e.cursor.cursor, type: 'attributes', attributeName: 'class' },
      'own style': { target: e.cursor.scr, type: 'childList' },
      'own style text': { target: { nodeType: 3, parentElement: e.cursor.scr }, type: 'characterData' },
      'fps title': { target: fps, type: 'attributes', attributeName: 'title' },
      'neko data-msg': { target: cat, type: 'attributes', attributeName: 'data-msg' }
    };
    const cache = e.cursor.pointerCache, metrics = e.metrics();
    for (let i = 0; i < 20; i++) e.mutation([records[kind]]);
    assert.equal(e.frames.size, 0, 'ignored mutations must leave cursor idle');
    assert.equal(e.cursor.pointerCache, cache);
    e.tick(); assert.equal(e.metrics().hitReads, metrics.hitReads);
    move(e, custom); e.settle();
    assert.equal(e.metrics().styleReads, metrics.styleReads, 'CSS identity must survive ignored batches');
  });
}

for (const kind of ['style', 'class', 'theme', 'other title', 'fps class', 'fps descendant title',
  'neko style', 'neko class', 'neko text', 'neko childList', 'other data-msg', 'neko lookalike', 'style text', 'childList']) {
  test('cursor conservatively invalidates ' + kind + ' and re-hit-tests at rest', () => {
    const { e, custom } = cachedCustom();
    const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
    const cat = e.body.appendChild(new e.Element()); cat.className = 'neko'; cat.style.position = 'fixed';
    const lookalike = e.body.appendChild(new e.Element()); lookalike.className = 'neko-extra';
    const style = e.body.appendChild(new e.Element('style'));
    const records = {
      'style': { target: custom, type: 'attributes', attributeName: 'style' },
      'class': { target: custom, type: 'attributes', attributeName: 'class' },
      'theme': { target: e.root, type: 'attributes', attributeName: 'data-theme' },
      'other title': { target: custom, type: 'attributes', attributeName: 'title' },
      'fps class': { target: fps, type: 'attributes', attributeName: 'class' },
      'fps descendant title': { target: fps.appendChild(new e.Element()), type: 'attributes', attributeName: 'title' },
      'neko style': { target: cat, type: 'attributes', attributeName: 'style' },
      'neko class': { target: cat, type: 'attributes', attributeName: 'class' },
      'neko text': { target: { nodeType: 3, parentElement: cat }, type: 'characterData' },
      'neko childList': { target: cat, type: 'childList' },
      'other data-msg': { target: custom, type: 'attributes', attributeName: 'data-msg' },
      'neko lookalike': { target: lookalike, type: 'attributes', attributeName: 'data-msg' },
      'style text': { target: { nodeType: 3, parentElement: style }, type: 'characterData' },
      'childList': { target: e.body, type: 'childList' }
    };
    const cache = e.cursor.pointerCache, metrics = e.metrics();
    custom.computedCursor = 'auto';
    e.mutation([records[kind]]);
    assert.equal(e.frames.size, 1, 'relevant mutations wake one frame');
    e.settle();
    assert.notEqual(e.cursor.pointerCache, cache, 'conservative invalidation replaces CSS cache');
    assert.ok(e.metrics().styleReads > metrics.styleReads);
    assert.equal(e.metrics().hitReads, metrics.hitReads + 1, 'stationary pointer needs fresh hit-test');
    assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  });
}

test('cursor keeps relevant mutations in mixed ignored batches and follows replaced structure', () => {
  const { e, custom } = cachedCustom();
  const replacement = e.body.appendChild(new e.Element('button'));
  const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
  custom.remove(); e.document.hit = replacement;
  e.mutation([{ target: e.cursor.layer, type: 'attributes', attributeName: 'style' },
    { target: fps, type: 'attributes', attributeName: 'title' },
    { target: e.body, type: 'childList', removedNodes: [custom], addedNodes: [replacement] }]);
  e.settle();
  assert.equal(e.cursor.target, replacement);
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  replacement.disabled = true;
  e.mutation([{ target: replacement, type: 'attributes', attributeName: 'disabled' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  replacement.disabled = false;
  e.mutation([{ target: replacement, type: 'attributes', attributeName: 'disabled' }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
});

test('cursor batches many invalidations into exactly one WeakMap rebuild per rendered frame', () => {
  const { e, custom } = cachedCustom();
  let cache = e.cursor.pointerCache, swaps = 0;
  Object.defineProperty(e.cursor, 'pointerCache', {
    get: () => cache, set: value => { if (value !== cache) swaps++; cache = value; }
  });
  const before = cache, reads = e.metrics().styleReads, hits = e.metrics().hitReads;
  custom.computedCursor = 'auto';
  for (let i = 0; i < 30; i++) {
    e.mutation([{ target: custom, type: 'attributes', attributeName: 'style' }]);
    e.window.emit('scroll'); e.window.emit('resize');
  }
  assert.equal(swaps, 0, 'invalidation only marks pending work, not synchronous map allocation');
  assert.equal(cache, before);
  assert.equal(e.metrics().styleReads, reads, 'no eager CSS reads in event handlers');
  assert.equal(e.frames.size, 1);
  e.tick();
  assert.equal(swaps, 1);
  assert.notEqual(cache, before);
  assert.equal(e.metrics().hitReads, hits + 1);
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  e.settle(); assert.equal(swaps, 1, 'animation continuation must not repeat invalidation');
  e.mutation([{ target: custom, type: 'attributes', attributeName: 'class' }]); e.settle();
  assert.equal(swaps, 2, 'next rendered batch gets its own rebuild');
});

test('cursor hit-test alone updates target without clearing cached CSS classification', () => {
  const { e, custom } = cachedCustom();
  const cache = e.cursor.pointerCache, metrics = e.metrics();
  e.document.hit = custom;
  // Deliberately distinguish geometric hit testing from CSS/DOM invalidation.
  e.cursor.invalidatePointer(true, false); e.settle();
  assert.equal(e.cursor.target, custom);
  assert.equal(e.cursor.pointerCache, cache);
  assert.equal(e.metrics().styleReads, metrics.styleReads);
  assert.equal(e.metrics().hitReads, metrics.hitReads + 1);
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
});

for (const type of ['childList', 'characterData']) {
  test('cursor FPS ' + type + ' re-hit-tests without clearing same-target CSS cache', () => {
    const { e, custom } = cachedCustom();
    const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
    const text = fps.appendChild(e.document.createTextNode('FPS: 60'));
    const target = type === 'characterData' ? text : fps;
    const record = type === 'childList'
      ? { target, type, addedNodes: [text], removedNodes: [e.document.createTextNode('FPS: 59')] }
      : { target, type };
    const cache = e.cursor.pointerCache, metrics = e.metrics();
    for (let i = 0; i < 20; i++) e.mutation([record]);
    assert.equal(e.frames.size, 1);
    assert.equal(e.cursor.pointerCache, cache, 'no eager allocation');
    e.settle();
    assert.equal(e.cursor.target, custom);
    assert.equal(e.metrics().hitReads, metrics.hitReads + 1);
    assert.equal(e.cursor.pointerCache, cache, 'pure FPS layout invalidation leaves CSS version intact');
    assert.equal(e.metrics().styleReads, metrics.styleReads);
    assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  });
}

function fpsSpan(e, color) {
  const span = new e.Element('span');
  span.setAttribute('style', 'color: ' + color + ';');
  span.appendChild(e.document.createTextNode('60'));
  return span;
}

for (const color of ['#bd0000', 'red', 'orange', '#9338e6', '#08b7e4', '#39c5bb']) {
  for (const type of ['childList', 'characterData']) {
    test('cursor FPS pure text ' + color + ' span ' + type + ' preserves same-target CSS cache', () => {
      const { e, custom } = cachedCustom();
      const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
      const old = fps.appendChild(e.document.createTextNode('FPS: 59'));
      fps.children.splice(fps.children.indexOf(old), 1); old.parentElement = null;
      const span = fps.appendChild(fpsSpan(e, color));
      const record = type === 'childList'
        ? { target: fps, type, addedNodes: [span], removedNodes: [old] }
        : { target: span.childNodes[0], type };
      const cache = e.cursor.pointerCache, controls = e.cursor.controlCache, metrics = e.metrics();
      for (let i = 0; i < 20; i++) e.mutation([record]);
      assert.equal(e.frames.size, 1);
      e.settle();
      assert.equal(e.cursor.target, custom);
      assert.equal(e.metrics().hitReads, metrics.hitReads + 1);
      assert.equal(e.cursor.pointerCache, cache);
      assert.equal(e.cursor.controlCache, controls);
      assert.equal(e.metrics().styleReads, metrics.styleReads);
      assert.equal(e.cursor.cursor.classList.contains('hover'), true);
    });
  }
}

for (const kind of ['unknown node lists', 'mixed button', 'extra class', 'extra aria', 'unknown color',
  'extra cursor style', 'element child', 'nested text', 'span childList', 'button text']) {
  test('cursor FPS ' + kind + ' is structural and conservatively clears semantic cache', () => {
    const { e, custom } = cachedCustom();
    const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
    const span = fps.appendChild(fpsSpan(e, '#39c5bb'));
    const button = new e.Element('button');
    let record = { target: fps, type: 'childList', addedNodes: [span], removedNodes: [] };
    if (kind === 'unknown node lists') record = { target: fps, type: 'childList' };
    if (kind === 'mixed button') { fps.appendChild(button); record.addedNodes = [e.document.createTextNode('FPS:'), button]; }
    if (kind === 'extra class') span.setAttribute('class', 'clickable');
    if (kind === 'extra aria') span.setAttribute('aria-label', 'FPS');
    if (kind === 'unknown color') span.setAttribute('style', 'color: blue;');
    if (kind === 'extra cursor style') span.setAttribute('style', 'color: #39c5bb; cursor: pointer;');
    if (kind === 'element child') span.appendChild(new e.Element('button'));
    if (kind === 'nested text') {
      const inner = span.appendChild(fpsSpan(e, '#39c5bb'));
      record = { target: inner.childNodes[0], type: 'characterData' };
    }
    if (kind === 'span childList') record = { target: span, type: 'childList', addedNodes: [e.document.createTextNode('61')], removedNodes: [] };
    if (kind === 'button text') {
      fps.appendChild(button);
      const text = button.appendChild(e.document.createTextNode('click'));
      record = { target: text, type: 'characterData' };
    }
    const cache = e.cursor.pointerCache, controls = e.cursor.controlCache, metrics = e.metrics();
    custom.computedCursor = 'auto';
    e.mutation([record]); e.settle();
    assert.notEqual(e.cursor.pointerCache, cache);
    assert.notEqual(e.cursor.controlCache, controls, 'unknown structure cannot preserve null semantic identity');
    assert.equal(e.metrics().hitReads, metrics.hitReads + 1);
    assert.ok(e.metrics().styleReads > metrics.styleReads);
    assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  });
}

test('cursor FPS span reparented into and out of an internal button clears cached semantic identity', () => {
  const e = setup({ cats: false });
  const fps = e.body.appendChild(new e.Element()); fps.id = 'fps';
  const span = fps.appendChild(fpsSpan(e, '#39c5bb'));
  const button = fps.appendChild(new e.Element('button'));
  move(e, span); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  const cache = e.cursor.controlCache;
  button.appendChild(span);
  // Real subtree MO delivery includes both parents; target remains the exact same span.
  e.mutation([{ target: fps, type: 'childList', addedNodes: [], removedNodes: [span] },
    { target: button, type: 'childList', addedNodes: [span], removedNodes: [] }]); e.settle();
  assert.equal(e.cursor.target, span);
  assert.notEqual(e.cursor.controlCache, cache, 'null control cache must be cleared on FPS internal reparent');
  assert.equal(e.cursor.cursor.classList.contains('hover'), true, 'new button ancestor is semantic');
  fps.appendChild(span);
  e.mutation([{ target: button, type: 'childList', addedNodes: [], removedNodes: [span] },
    { target: fps, type: 'childList', addedNodes: [span], removedNodes: [] }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false, 'removed button ancestor cannot stay cached');
});

test('cursor hit-only layout change refreshes CSS when position resolves a different target', () => {
  const { e, custom } = cachedCustom();
  const other = e.body.appendChild(new e.Element()); other.computedCursor = 'pointer';
  move(e, other); e.settle(); move(e, custom); e.settle();
  const cache = e.cursor.pointerCache, metrics = e.metrics();
  other.computedCursor = 'auto'; // Simulates a different :hover/style context after layout shifts.
  e.document.hit = other;
  e.cursor.invalidatePointer(true, false); e.settle();
  assert.equal(e.cursor.target, other);
  assert.equal(e.metrics().hitReads, metrics.hitReads + 1);
  assert.notEqual(e.cursor.pointerCache, cache, 'changed hit target starts a fresh hover CSS version');
  assert.ok(e.metrics().styleReads > metrics.styleReads);
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
});

test('cursor semantic control reads disabled live even after cached child identity', () => {
  const e = setup({ cats: false });
  const button = e.body.appendChild(new e.Element('button'));
  const span = button.appendChild(new e.Element('span'));
  assert.equal(e.cursor.isPointer(span), true);
  button.disabled = true;
  assert.equal(e.cursor.isPointer(span), false);
  button.disabled = false;
  assert.equal(e.cursor.isPointer(span), true);
  assert.equal(e.metrics().styleReads, 0, 'disabled never falls back to CSS');
});

test('cursor shares non-semantic ancestor CSS only within the same hover version', () => {
  const e = setup({ cats: false });
  const ancestor = e.body.appendChild(new e.Element()); ancestor.computedCursor = 'pointer';
  const first = ancestor.appendChild(new e.Element('span'));
  const second = ancestor.appendChild(new e.Element('span'));
  assert.equal(e.cursor.isPointer(first), true);
  const reads = e.metrics().styleReads;
  assert.equal(e.cursor.isPointer(second), true);
  assert.equal(e.metrics().styleReads, reads + 1, 'sibling reads own cursor, reuses ancestor chain in same version');
});

for (const kind of ['href', 'role']) {
  test('cursor invalidates cached semantic identity after ' + kind + ' add/remove', () => {
    const { e, custom } = cachedCustom();
    custom.computedCursor = 'auto';
    if (kind === 'href') custom.tagName = 'A';
    custom.setAttribute(kind, kind === 'href' ? '/test' : 'button');
    e.mutation([{ target: custom, type: 'attributes', attributeName: kind }]); e.settle();
    assert.equal(e.cursor.cursor.classList.contains('hover'), true, 'adding semantic attribute replaces cached null');
    custom.attrs.delete(kind);
    e.mutation([{ target: custom, type: 'attributes', attributeName: kind }]); e.settle();
    assert.equal(e.cursor.cursor.classList.contains('hover'), false, 'removed semantic identity cannot stay cached');
  });
}

test('cursor structural reparenting invalidates cached semantic ancestor identity', () => {
  const e = setup({ cats: false });
  const button = e.body.appendChild(new e.Element('button'));
  const span = button.appendChild(new e.Element('span'));
  move(e, span); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  e.body.appendChild(span);
  e.mutation([{ target: button, type: 'childList', removedNodes: [span] },
    { target: e.body, type: 'childList', addedNodes: [span] }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
  button.appendChild(span);
  e.mutation([{ target: button, type: 'childList', addedNodes: [span] }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
});

test('cursor handles detached and text-node targets without stale semantic hover', () => {
  const e = setup({ cats: false });
  const button = e.body.appendChild(new e.Element('button'));
  const text = { nodeType: 3, parentElement: button };
  move(e, text); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), true);
  assert.equal(e.metrics().styleReads, 0);
  button.remove(); move(e, text); e.settle();
  // Same target identity can be detached by DOM changes without another mouseover.
  e.mutation([{ target: e.body, type: 'childList', removedNodes: [button] }]); e.settle();
  assert.equal(e.cursor.cursor.classList.contains('hover'), false);
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
