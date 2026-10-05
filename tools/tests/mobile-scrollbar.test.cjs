'use strict'

// Run: node --test tools/tests/mobile-scrollbar.test.cjs
// Baseline: $env:MOBILE_SCROLLBAR_SOURCE_ROOT='bak/animation-lifecycle-20261005/before'; node --test tools/tests/mobile-scrollbar.test.cjs
// VM-only DOM/rAF fixtures: no browser, build, network, or dependencies.
const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '../..', process.env.MOBILE_SCROLLBAR_SOURCE_ROOT || '.')
const source = fs.readFileSync(path.join(root, 'source/js/modules/shell.js'), 'utf8')
const start = source.indexOf('/* 手机端自绘滚动条 start')
const end = source.indexOf('/* 手机端自绘滚动条 end */')
assert.ok(start >= 0 && end > start, 'mobile scrollbar extraction markers')
const script = source.slice(start, end)

function events() {
  const listeners = new Map()
  return {
    addEventListener(type, fn, options) {
      if (!listeners.has(type)) listeners.set(type, new Map())
      listeners.get(type).set(fn, options)
    },
    emit(type) { for (const fn of listeners.get(type)?.keys() || []) fn({ type }) },
    count(type) { return listeners.get(type)?.size || 0 },
    options(type) { return [...(listeners.get(type)?.values() || [])] }
  }
}

function fixture({ width = 390, height = 800, total = 3200, readyState = 'complete' } = {}) {
  const reads = [], writes = [], frames = new Map()
  let nextFrame = 1, checking = false, wrote = false
  const geometry = { width, height, total, offset: 0, docTop: 0 }
  function read(name, value) {
    reads.push(name)
    if (checking) assert.equal(wrote, false, 'layout read after DOM write: ' + name)
    return value
  }
  function write(node, kind, value) {
    if (checking) wrote = true
    if (node.everConnected) assert.ok(body && body.contains(node), 'write to detached node: ' + node.id)
    writes.push({ node, kind, value })
  }
  function element(id = '') {
    const node = { id, parentNode: null, children: [], everConnected: false }
    const classes = new Set()
    node.contains = child => node === child || node.children.some(n => n.contains(child))
    node.appendChild = child => {
      write(node, 'append', child.id)
      if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1)
      child.parentNode = node
      node.children.push(child)
      if (node === body || body?.contains(node)) {
        function connect(n) { n.everConnected = true; n.children.forEach(connect) }
        connect(child)
      }
      return child
    }
    node.classList = {
      contains: value => classes.has(value),
      add(value) { write(node, 'class:add', value); classes.add(value) },
      remove(value) { write(node, 'class:remove', value); classes.delete(value) }
    }
    const styles = { height: '', transform: '' }
    node.style = new Proxy(styles, { set(obj, key, value) { write(node, 'style:' + key, value); obj[key] = value; return true } })
    for (const key of ['scrollHeight', 'offsetHeight']) Object.defineProperty(node, key, { get: () => read(id + '.' + key, geometry.total) })
    Object.defineProperty(node, 'clientHeight', { get: () => read(id + '.clientHeight', geometry.height) })
    Object.defineProperty(node, 'scrollTop', { get: () => read(id + '.scrollTop', geometry.docTop) })
    return node
  }
  let body = null
  body = element('body')
  const doc = element('html')
  const window = Object.assign(events(), {
    get innerWidth() { return geometry.width },
    get innerHeight() { return read('window.innerHeight', geometry.height) },
    get pageYOffset() { return read('window.pageYOffset', geometry.offset) },
    requestAnimationFrame(fn) { const id = nextFrame++; frames.set(id, fn); return id },
    cancelAnimationFrame(id) { frames.delete(id) }
  })
  // Object.assign invokes accessors: restore them for live geometry and metric tracing.
  for (const [key, fn] of Object.entries({ innerWidth: () => geometry.width, innerHeight: () => read('window.innerHeight', geometry.height), pageYOffset: () => read('window.pageYOffset', geometry.offset) })) {
    Object.defineProperty(window, key, { configurable: true, get: fn })
  }
  const document = Object.assign(events(), {
    get body() { return body }, documentElement: doc, readyState,
    getElementById(id) {
      function search(node) { if (!node) return null; if (node.id === id) return node; for (const child of node.children) { const found = search(child); if (found) return found } return null }
      return search(body)
    },
    createElement() { return element() }
  })
  Object.defineProperty(document, 'body', { configurable: true, get: () => body })
  const context = { window, document, Math, requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame }
  reads.length = 0
  vm.runInNewContext(script, context, { filename: 'mobile-scrollbar.iife.js' })
  return {
    window, document, geometry, reads, writes,
    get pending() { return frames.size },
    get track() { return document.getElementById('mscrollbar') },
    get thumb() { return document.getElementById('mscrollbar-thumb') },
    reset() { reads.length = writes.length = 0 },
    flush() {
      assert.ok(frames.size <= 1, 'more than one pending frame')
      const due = [...frames.values()]; frames.clear(); checking = true; wrote = false
      try { due.forEach(fn => fn()) } finally { checking = false }
    },
    replaceBody() { body = element('body'); return body },
    setBody(value) { body = value },
    replaceTrack() {
      const old = this.track
      old.parentNode.children.splice(old.parentNode.children.indexOf(old), 1)
      old.parentNode = null
      const replacement = element('mscrollbar'), thumb = element('mscrollbar-thumb')
      body.appendChild(replacement); replacement.appendChild(thumb)
      return old
    },
    replaceThumb() {
      const old = this.thumb
      old.parentNode.children.splice(old.parentNode.children.indexOf(old), 1)
      old.parentNode = null
      const replacement = element('mscrollbar-thumb')
      this.track.appendChild(replacement)
      return old
    },
    seedTrack() {
      const track = element('mscrollbar'), thumb = element('mscrollbar-thumb')
      body.appendChild(track); track.appendChild(thumb)
      thumb.style.height = '200px'; thumb.style.transform = 'translateY(0px)'
      track.classList.add('mscrollbar-on')
      return track
    }
  }
}

function settle(f) { f.document.emit('DOMContentLoaded'); f.flush(); f.reset() }

test('desktop skips DOM creation and all scroll/height reads, including event storms', () => {
  const f = fixture({ width: 1024 })
  for (let i = 0; i < 20; i++) { f.window.emit('scroll'); f.window.emit('resize'); f.document.emit('pjax:complete') }
  f.document.emit('DOMContentLoaded'); f.flush()
  assert.deepEqual(f.reads, [])
  assert.equal(f.writes.length, 0)
  assert.equal(f.track, null)
  assert.equal(f.pending, 0)
})

test('scroll/resize/pjax/DOMContentLoaded merge into one frame with reads before writes', () => {
  const f = fixture({ readyState: 'loading' })
  for (let i = 0; i < 10; i++) { f.window.emit('scroll'); f.window.emit('resize'); f.document.emit('pjax:complete') }
  f.document.emit('DOMContentLoaded')
  assert.equal(f.pending, 1)
  assert.equal(f.reads.length, 0)
  assert.equal(f.writes.length, 0)
  f.flush()
  assert.equal(f.reads.filter(r => r === 'body.scrollHeight').length, 1)
  assert.equal(f.thumb.style.height, '200px')
  assert.equal(f.thumb.style.transform, 'translateY(0px)')
  assert.equal(f.track.classList.contains('mscrollbar-on'), true)
  assert.equal(f.pending, 0)
})

test('deferred script initializes when DOMContentLoaded already fired', () => {
  const f = fixture()
  assert.equal(f.pending, 1)
  f.flush()
  assert.equal(f.track.classList.contains('mscrollbar-on'), true)
})

test('unchanged frame writes nothing; scrolling changes only rounded transform', () => {
  const f = fixture(); settle(f)
  f.window.emit('scroll'); f.flush()
  assert.equal(f.writes.length, 0)
  f.geometry.offset = 1200
  f.window.emit('scroll'); f.flush()
  assert.deepEqual(f.writes.map(w => w.kind), ['style:transform'])
  assert.equal(f.thumb.style.transform, 'translateY(300px)')
  f.reset(); f.geometry.offset = 1200.1; f.window.emit('scroll'); f.flush()
  assert.equal(f.writes.length, 0)
})

test('mobile -> desktop -> mobile cancels stale frame, skips desktop reads, restores visibility', () => {
  const f = fixture(); settle(f)
  f.window.emit('scroll')
  f.geometry.width = 1024; f.window.emit('resize'); f.flush()
  assert.deepEqual(f.reads, [])
  assert.equal(f.track.classList.contains('mscrollbar-on'), false)
  f.reset(); f.window.emit('scroll'); f.flush(); assert.equal(f.writes.length, 0)
  f.geometry.width = 768; f.window.emit('resize'); f.flush()
  assert.equal(f.track.classList.contains('mscrollbar-on'), true)
  assert.equal(f.thumb.style.height, '200px')
})

test('PJAX body replacement uses current nodes and does not accumulate listeners/rAF', () => {
  const f = fixture(); settle(f)
  for (let i = 0; i < 15; i++) {
    const oldTrack = f.track
    f.window.emit('scroll'); f.replaceBody()
    f.geometry.offset = i * 100
    f.document.emit('pjax:complete'); f.document.emit('pjax:complete'); f.flush()
    assert.notEqual(f.track, oldTrack)
    assert.equal(f.track.classList.contains('mscrollbar-on'), true)
    assert.equal(f.pending, 0)
  }
  for (const type of ['scroll', 'resize']) assert.equal(f.window.count(type), 1)
  for (const type of ['DOMContentLoaded', 'pjax:complete']) assert.equal(f.document.count(type), 1)
  assert.equal(f.window.options('scroll')[0].passive, true)
})

test('width changing before queued frame is rechecked without desktop layout reads', () => {
  const f = fixture({ readyState: 'loading' })
  f.window.emit('scroll'); f.geometry.width = 1024
  f.flush()
  assert.deepEqual(f.reads, [])
  assert.equal(f.writes.length, 0)
  assert.equal(f.pending, 0)
  f.geometry.width = 390; f.window.emit('resize'); f.flush()
  assert.equal(f.track.classList.contains('mscrollbar-on'), true)
})

test('replacing track within the same body resets style caches for fresh nodes', () => {
  const f = fixture(); settle(f)
  const old = f.replaceTrack(); f.reset()
  f.document.emit('pjax:complete'); f.flush()
  assert.notEqual(f.track, old)
  assert.equal(f.thumb.style.height, '200px')
  assert.equal(f.thumb.style.transform, 'translateY(0px)')
  assert.equal(f.track.classList.contains('mscrollbar-on'), true)
})

test('replacing only the thumb rebinds without writing the detached thumb', () => {
  const f = fixture(); settle(f)
  const old = f.replaceThumb(); f.reset()
  f.document.emit('pjax:complete'); f.flush()
  assert.notEqual(f.thumb, old)
  assert.equal(f.thumb.style.height, '200px')
  assert.equal(f.thumb.style.transform, 'translateY(0px)')
})

test('existing correct inline styles/classes are not redundantly rewritten', () => {
  const f = fixture({ readyState: 'loading' }); f.seedTrack(); f.reset()
  f.document.emit('DOMContentLoaded'); f.flush()
  assert.equal(f.writes.length, 0)
})

test('non-scrollable page hides once; minimum thumb and overscroll bounds remain', () => {
  const f = fixture({ total: 800 }); settle(f)
  assert.equal(f.track.classList.contains('mscrollbar-on'), false)
  f.window.emit('scroll'); f.flush(); assert.equal(f.writes.length, 0)
  f.geometry.total = 100000; f.geometry.offset = 1000000; f.window.emit('resize'); f.flush()
  assert.equal(f.thumb.style.height, '30px')
  assert.equal(f.thumb.style.transform, 'translateY(770px)')
  f.geometry.offset = -100; f.window.emit('scroll'); f.flush()
  assert.equal(f.thumb.style.transform, 'translateY(0px)')
  f.geometry.total = 801; f.window.emit('resize'); f.flush()
  assert.equal(f.track.classList.contains('mscrollbar-on'), false)
  f.reset(); f.window.emit('scroll'); f.flush(); assert.equal(f.writes.length, 0)
})

test('missing body is safe and later PJAX completion recovers with viewport/scroll fallbacks', () => {
  const f = fixture({ readyState: 'loading' })
  f.setBody(null); f.document.emit('DOMContentLoaded'); f.flush()
  assert.equal(f.writes.length, 0)
  f.replaceBody(); f.geometry.height = 800
  Object.defineProperty(f.window, 'innerHeight', { configurable: true, get: () => 0 })
  f.geometry.docTop = 1200; f.document.emit('pjax:complete'); f.flush()
  assert.equal(f.thumb.style.height, '200px')
  assert.equal(f.thumb.style.transform, 'translateY(300px)')
})
