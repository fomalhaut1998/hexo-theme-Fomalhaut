'use strict'

// Run: node --test tools/tests/scroll-listeners.test.cjs
// Original regression check (PowerShell):
// $env:SCROLL_TEST_SOURCE_ROOT='bak/scroll-listeners-20261005/before'; node --test tools/tests/scroll-listeners.test.cjs
// Source overrides are read into VM strings only; production files are never replaced.
// No browser, network, jsdom, Hexo startup, or build is involved.
// The independent setTimeout(autoScrollToc, 0) is outside the throttle patch's
// cancellation contract. Cancellation fixtures keep headings below activation
// so they isolate throttle timers rather than asserting cancellation of that task.

const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const repo = path.resolve(__dirname, '../..')
const sourceRoot = process.env.SCROLL_TEST_SOURCE_ROOT
  ? path.resolve(repo, process.env.SCROLL_TEST_SOURCE_ROOT) : repo
const files = {
  utils: 'themes/fomalhaut/source/js/utils.js',
  main: 'themes/fomalhaut/source/js/main.js',
  nav: 'source/js/modules/nav.js',
  pjax: 'themes/fomalhaut/layout/includes/third-party/pjax.pug'
}
const sources = Object.fromEntries(Object.entries(files).map(([key, file]) =>
  [key, fs.readFileSync(path.join(sourceRoot, file), 'utf8').replace(/\r\n/g, '\n')]))

function between(source, start, end) {
  for (const marker of [start, end]) {
    assert.equal(source.split(marker).length - 1, 1, 'extraction marker must be unique: ' + marker)
  }
  const a = source.indexOf(start)
  const b = source.indexOf(end)
  assert.ok(b > a, 'extraction markers must remain ordered')
  return source.slice(a, b)
}
const extracted = {
  throttle: 'globalThis.btf = {' + between(sources.utils, '  throttle: function', '  sidebarPaddingR:') + '};',
  main: between(sources.main, '  const scrollFn = function', '  const rightSideFn =') +
    '\nglobalThis.initHeader = scrollFn; globalThis.initToc = scrollFnToDo;',
  nav: between(sources.nav, "document.addEventListener('pjax:complete', tonav);", '/* 导航栏显示标题 end */'),
  pjax: between(sources.pjax, "  document.addEventListener('pjax:send',", "  document.addEventListener('pjax:complete',")
}

function clock() {
  let now = 1000000 // previous=0 is a sentinel; an epoch-zero fake clock changes leading behavior.
  let next = 1
  const timers = new Map()
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return now }
  }
  return {
    Date: FakeDate,
    setTimeout(fn, delay = 0) { const id = next++; timers.set(id, { fn, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    get pending() { return timers.size },
    advance(ms) {
      const target = now + ms
      let iterations = 0
      while (true) {
        const due = [...timers].filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!due) break
        assert.ok(++iterations < 1000, 'timer runaway')
        now = due[1].at
        timers.delete(due[0])
        due[1].fn()
      }
      now = target
    }
  }
}

function events() {
  const handlers = new Map()
  return {
    addEventListener(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type).add(fn)
    },
    removeEventListener(type, fn) { handlers.get(type)?.delete(fn) },
    emit(type) { for (const fn of [...(handlers.get(type) || [])]) fn({ type }) },
    listeners(type) { return [...(handlers.get(type) || [])] }
  }
}

function node(label) {
  const writes = []
  const classes = new Set()
  const attributes = {}
  const item = { label, writes, attributes, detached: false }
  function write(kind, value) {
    assert.equal(item.detached, false, 'stale DOM mutation: ' + label + '.' + kind)
    writes.push({ kind, value })
  }
  item.classList = {
    contains: name => classes.has(name),
    add(...names) { write('class.add', names); names.forEach(name => classes.add(name)) },
    remove(...names) { write('class.remove', names); names.forEach(name => classes.delete(name)) }
  }
  item.style = new Proxy({}, { set(obj, key, value) { write('style.' + key, value); obj[key] = value; return true } })
  item.setAttribute = (key, value) => { write('attribute.' + key, value); attributes[key] = value }
  item.getAttribute = key => attributes[key]
  for (const key of ['textContent', 'innerText', 'scrollTop']) {
    let value = key === 'scrollTop' ? 0 : ''
    Object.defineProperty(item, key, { get: () => value, set(v) { write(key, v); value = v } })
  }
  item.addEventListener = () => {}
  return item
}

function page(tag) {
  const nodes = Object.fromEntries(['rightside', 'page-header', 'article-container', 'card-toc',
    'name-container', 'page-name'].map(id => [id, node(tag + ':' + id)]))
  const menus = [node(tag + ':menu0'), node(tag + ':menu1')]
  const content = node(tag + ':toc-content')
  const percentage = node(tag + ':toc-percentage')
  const link = node(tag + ':toc-link')
  const root = { matches: selector => selector === '.toc' }
  link.parentNode = root
  link.getBoundingClientRect = () => ({ top: 200 })
  content.querySelectorAll = selector => selector === '.toc-link' ? [link] :
    (link.classList.contains('active') ? [link] : [])
  nodes['card-toc'].getElementsByClassName = () => [content]
  nodes['card-toc'].querySelector = () => percentage
  nodes['article-container'].clientHeight = 2000
  nodes['article-container'].offsetTop = 100
  // Never activates a TOC link: independent 0ms autoScrollToc is explicitly excluded.
  nodes['article-container'].querySelectorAll = () => [{ id: 'heading', top: 10000 }]
  const all = [...Object.values(nodes), ...menus, content, percentage, link]
  return { nodes, menus, content, percentage, all, detach() { all.forEach(n => { n.detached = true }) } }
}

function harness() {
  const time = clock()
  const native = events()
  const docEvents = events()
  const jqHandlers = []
  let currentPage = page('A')
  let top = 0
  let reads = 0
  const chat = []
  const anchors = []
  const jq = {
    scrollTop: () => top,
    on(spec, fn) { const [type, namespace = ''] = spec.split('.'); jqHandlers.push({ type, namespace, fn }); return jq },
    off(spec, fn) {
      const [type, namespace] = spec.split('.')
      for (let i = jqHandlers.length - 1; i >= 0; i--) {
        const h = jqHandlers[i]
        if ((!type || h.type === type) && (!namespace || h.namespace === namespace) && (!fn || h.fn === fn)) jqHandlers.splice(i, 1)
      }
      return jq
    },
    scroll(fn) { return jq.on('scroll', fn) }
  }
  const document = {
    ...docEvents, title: 'Test article | Demo',
    body: { scrollHeight: 3000, classList: node('body').classList },
    documentElement: { scrollTop: 0, clientHeight: 800, scrollHeight: 3000 },
    getElementById: id => currentPage.nodes[id] || null,
    getElementsByClassName: name => name === 'menus_items' ? currentPage.menus : []
  }
  const sandbox = {
    ...native, document, Date: time.Date, setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
    innerHeight: 800, innerWidth: 1000, GLOBAL_CONFIG: { isAnchor: true }, GLOBAL_CONFIG_SITE: { isToc: true },
    chatBtnHide: () => chat.push('hide'), chatBtnShow: () => chat.push('show'),
    getComputedStyle: el => ({ getPropertyValue: () => el.style.cssText?.includes('opacity: 0.8') ? '0.8' : '0' }),
    // VM global objects are contextified wrappers; compare the shared document instead.
    $: target => { assert.equal(target.document, document); return jq }
  }
  sandbox.window = sandbox
  Object.defineProperty(sandbox, 'scrollY', { get() { reads++; return top }, set(v) { top = v } })
  const context = vm.createContext(sandbox)
  function load(name) { vm.runInContext(extracted[name], context, { filename: files[name] }) }
  load('throttle')
  sandbox.btf.getEleTop = el => el.top
  sandbox.btf.updateAnchor = id => anchors.push(id)
  sandbox.btf.scrollToDest = () => {}
  load('main'); load('nav'); load('pjax')
  return {
    sandbox, document, time, jq, jqHandlers, chat, anchors,
    get page() { return currentPage }, get reads() { return reads },
    replacePage(tag = 'B') { const old = currentPage; old.detach(); currentPage = page(tag); return old },
    scroll(y) {
      top = y
      document.documentElement.scrollTop = y
      native.emit('scroll')
      for (const h of [...jqHandlers]) if (h.type === 'scroll') h.fn.call(sandbox, { type: 'scroll' })
    },
    send() { docEvents.emit('pjax:send') },
    complete() { docEvents.emit('pjax:complete') },
    ready() { docEvents.emit('DOMContentLoaded') },
    listeners: native.listeners
  }
}

function writes(item, kind) { return item.writes.filter(w => w.kind === kind) }

test('throttle burst has one leading execution and one trailing execution with latest args/this', () => {
  const h = harness()
  const calls = []
  const fn = h.sandbox.btf.throttle(function (value) { calls.push([this.id, value]) }, 100)
  fn.call({ id: 'first' }, 'A')
  h.time.advance(20); fn.call({ id: 'second' }, 'B')
  h.time.advance(20); fn.call({ id: 'latest' }, 'C')
  assert.deepEqual(calls, [['first', 'A']])
  assert.equal(h.time.pending, 1)
  h.time.advance(59); assert.equal(calls.length, 1)
  h.time.advance(1); assert.deepEqual(calls, [['first', 'A'], ['latest', 'C']])
  assert.equal(h.time.pending, 0)
})

test('throttle supports leading:false and trailing:false without extra execution', () => {
  const h = harness()
  const calls = []
  const deferred = h.sandbox.btf.throttle(v => calls.push(v), 100, { leading: false })
  deferred('A'); h.time.advance(30); deferred('B')
  assert.deepEqual(calls, [])
  h.time.advance(70); assert.deepEqual(calls, ['B'])
  const leadingOnly = h.sandbox.btf.throttle(v => calls.push(v), 100, { trailing: false })
  leadingOnly('C'); h.time.advance(20); leadingOnly('D')
  assert.equal(h.time.pending, 0)
  h.time.advance(100); assert.deepEqual(calls, ['B', 'C'])
})

test('throttle cancel is idempotent, discards pending state, and resets leading/deferred reuse', () => {
  const h = harness()
  const calls = []
  const fn = h.sandbox.btf.throttle(v => calls.push(v), 100)
  fn('A'); h.time.advance(20); fn('stale')
  assert.equal(h.time.pending, 1)
  assert.equal(typeof fn.cancel, 'function')
  fn.cancel(); fn.cancel(); assert.equal(h.time.pending, 0)
  fn('fresh'); assert.deepEqual(calls, ['A', 'fresh'])
  h.time.advance(200); assert.deepEqual(calls, ['A', 'fresh'])
  const deferred = h.sandbox.btf.throttle(v => calls.push(v), 100, { leading: false })
  deferred('stale'); deferred.cancel(); deferred('latest')
  h.time.advance(99); assert.equal(calls.length, 2)
  h.time.advance(1); assert.deepEqual(calls, ['A', 'fresh', 'latest'])
})

test('actual header listener throttles repeated events and trailing work reads latest scroll state', () => {
  const h = harness()
  h.sandbox.initHeader()
  h.scroll(200); h.time.advance(20); h.scroll(300); h.time.advance(20); h.scroll(100)
  assert.equal(h.reads, 1, 'event wrapper must not recreate the throttle')
  assert.deepEqual(h.chat, ['hide'])
  h.time.advance(159); assert.equal(h.reads, 1)
  h.time.advance(1); assert.equal(h.reads, 2)
  assert.equal(h.page.nodes['page-header'].classList.contains('nav-visible'), true)
  assert.deepEqual(h.chat, ['hide', 'show'])
})

test('actual TOC listener throttles repeated events and preserves latest percentage state', () => {
  const h = harness()
  h.sandbox.initToc()
  h.scroll(100); h.time.advance(20); h.scroll(200); h.time.advance(20); h.scroll(300)
  assert.equal(writes(h.page.percentage, 'textContent').length, 1)
  h.time.advance(60)
  assert.equal(writes(h.page.percentage, 'textContent').length, 2)
  assert.equal(h.page.percentage.textContent, 17)
  assert.equal(h.time.pending, 0)
})

test('header direction, equal position, 56 boundary, top reset, and scrollTop fallback retain behavior', () => {
  const h = harness()
  h.sandbox.initHeader()
  const header = h.page.nodes['page-header']
  h.scroll(100); assert.equal(header.classList.contains('nav-visible'), false)
  h.time.advance(200); h.scroll(80); assert.equal(header.classList.contains('nav-visible'), true)
  h.time.advance(200); h.scroll(120); assert.equal(header.classList.contains('nav-visible'), false)
  h.time.advance(200); h.scroll(120); assert.equal(header.classList.contains('nav-visible'), true)
  h.time.advance(200); h.scroll(56)
  assert.equal(h.page.nodes.rightside.style.cssText, "opacity: ''; transform: ''")
  h.time.advance(200); h.scroll(0)
  assert.equal(header.classList.contains('nav-fixed'), false)
  assert.equal(header.classList.contains('nav-visible'), false)
  h.time.advance(200)
  h.sandbox.scrollY = 0; h.document.documentElement.scrollTop = 140
  h.sandbox.scrollCollect()
  assert.equal(header.classList.contains('nav-fixed'), true)
})

test('repeated header initialization removes/cancels old callback but preserves unrelated native handlers', () => {
  const h = harness()
  const foreign = () => {}
  h.sandbox.addEventListener('scroll', foreign)
  h.sandbox.initHeader(); const old = h.sandbox.scrollCollect
  h.scroll(100); h.time.advance(20); h.scroll(200)
  h.sandbox.initHeader()
  assert.equal(h.time.pending, 0)
  assert.notEqual(h.sandbox.scrollCollect, old)
  assert.deepEqual(h.listeners('scroll'), [foreign, h.sandbox.scrollCollect])
  const before = h.reads
  h.scroll(250); assert.equal(h.reads - before, 1)
})

test('header short-page early return first releases old callback and pending trailing work', () => {
  const h = harness()
  h.sandbox.initHeader(); h.scroll(100); h.time.advance(20); h.scroll(200)
  h.document.body.scrollHeight = h.sandbox.innerHeight + 56
  h.sandbox.initHeader()
  assert.equal(h.sandbox.scrollCollect, null)
  assert.equal(h.listeners('scroll').length, 0)
  assert.equal(h.time.pending, 0)
  assert.equal(h.page.nodes.rightside.style.cssText, 'opacity: 1; transform: translateX(-58px)')
})

test('repeated TOC initialization releases the old listener and pending percentage update', () => {
  const h = harness()
  h.sandbox.initToc(); const old = h.sandbox.tocScrollFn
  h.scroll(100); h.time.advance(20); h.scroll(200)
  h.sandbox.initToc()
  assert.equal(h.time.pending, 0)
  assert.notEqual(h.sandbox.tocScrollFn, old)
  assert.deepEqual(h.listeners('scroll'), [h.sandbox.tocScrollFn])
  const before = writes(h.page.percentage, 'textContent').length
  h.scroll(300); assert.equal(writes(h.page.percentage, 'textContent').length - before, 1)
})

for (const reason of ['missing article', 'disabled TOC and anchor']) {
  test('TOC early return (' + reason + ') releases old listener and pending trailing work', () => {
    const h = harness()
    h.sandbox.initToc(); h.scroll(100); h.time.advance(20); h.scroll(200)
    if (reason === 'missing article') delete h.page.nodes['article-container']
    else { h.sandbox.GLOBAL_CONFIG_SITE.isToc = false; h.sandbox.GLOBAL_CONFIG.isAnchor = false }
    h.sandbox.initToc()
    assert.equal(h.sandbox.tocScrollFn, null)
    assert.equal(h.listeners('scroll').length, 0)
    assert.equal(h.time.pending, 0)
  })
}

test('actual PJAX send cancels both trailing callbacks before DOM replacement; new page responds once', () => {
  const h = harness()
  let unrelated = 0
  const foreign = () => unrelated++
  h.sandbox.addEventListener('scroll', foreign)
  h.sandbox.initHeader(); h.sandbox.initToc()
  h.scroll(100); h.time.advance(20); h.scroll(200)
  assert.equal(h.time.pending, 2)
  h.send()
  assert.equal(h.time.pending, 0)
  assert.equal(h.sandbox.scrollCollect, null)
  assert.equal(h.sandbox.tocScrollFn, null)
  assert.deepEqual(h.listeners('scroll'), [foreign])
  const old = h.replacePage()
  const oldWrites = old.all.reduce((n, el) => n + el.writes.length, 0)
  h.time.advance(400); h.send() // repeat cleanup is safe on the new page
  assert.equal(old.all.reduce((n, el) => n + el.writes.length, 0), oldWrites)
  h.sandbox.initHeader(); h.sandbox.initToc(); h.scroll(300)
  assert.equal(writes(h.page.percentage, 'textContent').length, 1)
  assert.equal(h.page.nodes['page-header'].classList.contains('nav-fixed'), true)
  assert.equal(unrelated, 3)
})

test('PJAX cleanup independently cancels already-persistent throttle timers', () => {
  const h = harness()
  const old = h.page
  for (const name of ['scrollCollect', 'tocScrollFn']) {
    h.sandbox[name] = h.sandbox.btf.throttle(() => { old.nodes['page-header'].classList.add(name) }, 100)
    h.sandbox.addEventListener('scroll', h.sandbox[name])
  }
  h.scroll(100); h.time.advance(20); h.scroll(200)
  assert.equal(h.time.pending, 2)
  h.send()
  assert.equal(h.time.pending, 0, 'PJAX must cancel timers, not only remove event listeners')
  h.replacePage(); h.time.advance(200)
})

test('PJAX send also accepts legacy callbacks without cancel and clears globals', () => {
  const h = harness()
  for (const name of ['scrollCollect', 'tocScrollFn']) {
    h.sandbox[name] = () => {}
    h.sandbox.addEventListener('scroll', h.sandbox[name])
  }
  h.send(); h.send()
  assert.equal(h.listeners('scroll').length, 0)
  assert.equal(h.sandbox.scrollCollect, null)
  assert.equal(h.sandbox.tocScrollFn, null)
})

test('repeated actual tonav initialization keeps exactly one owned namespaced listener and unrelated identities', () => {
  const h = harness()
  let bareCalls = 0; let foreignCalls = 0
  const bare = () => bareCalls++
  const foreign = () => foreignCalls++
  h.jq.on('scroll', bare).on('scroll.otherModule', foreign)
  h.ready(); h.complete(); h.complete(); h.sandbox.tonav(); h.sandbox.tonav()
  assert.equal(h.jqHandlers.filter(x => x.namespace === 'fomalNavTitle').length, 1)
  assert.equal(h.jqHandlers.length, 3)
  assert.equal(h.jqHandlers[0].fn, bare); assert.equal(h.jqHandlers[1].fn, foreign)
  assert.equal(h.page.nodes['page-name'].innerText, 'Test article')
  const before = writes(h.page.nodes['name-container'], 'attribute.style').length
  h.scroll(100)
  assert.equal(writes(h.page.nodes['name-container'], 'attribute.style').length - before, 1)
  assert.equal(bareCalls, 1); assert.equal(foreignCalls, 1)
})

for (const missing of ['name-container', 'menus_items', 'page-name']) {
  test('nav early return with missing ' + missing + ' removes only its previous listener', () => {
    const h = harness()
    const foreign = () => {}
    h.jq.on('scroll.otherModule', foreign)
    h.sandbox.tonav()
    if (missing === 'menus_items') h.page.menus.pop()
    else delete h.page.nodes[missing]
    assert.doesNotThrow(() => h.sandbox.tonav())
    assert.deepEqual(h.jqHandlers.map(x => x.fn), [foreign])
  })
}

test('nav down/up/equal direction is retained and PJAX reinit targets only new DOM', () => {
  const h = harness()
  h.sandbox.tonav()
  h.scroll(100)
  assert.equal(h.page.nodes['name-container'].attributes.style, '')
  assert.equal(h.page.menus[1].attributes.style, 'display:none!important')
  h.scroll(80)
  assert.equal(h.page.nodes['name-container'].attributes.style, 'display:none')
  h.scroll(120); h.scroll(120)
  assert.equal(h.page.nodes['name-container'].attributes.style, 'display:none')
  h.replacePage(); h.complete(); h.scroll(150)
  assert.equal(h.page.nodes['name-container'].attributes.style, '')
  assert.equal(h.jqHandlers.length, 1)
})
