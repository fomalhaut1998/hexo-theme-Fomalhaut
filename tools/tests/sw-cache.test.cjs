'use strict'

// Run: node --test tools/tests/sw-cache.test.cjs
// Against a backup copy:
//   $env:SW_TEST_SOURCE_ROOT='<你备份的目录>'; node --test tools/tests/sw-cache.test.cjs
// The service worker source is read into a VM string only; production files are never replaced.
// No browser, network, Service Worker runtime, or Hexo build is involved: caches / fetch / Response
// are all stubbed, and CacheStorage is an in-memory Map keyed by the exact request URL.

const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const repo = path.resolve(__dirname, '../..')
const sourceRoot = process.env.SW_TEST_SOURCE_ROOT
  ? path.resolve(repo, process.env.SW_TEST_SOURCE_ROOT)
  : repo
const SW_PATH = path.join(sourceRoot, 'themes', 'fomalhaut', 'source', 'sw.js')
const S3 = 'https://your-bucket.s3.example.com'

function loadWorker() {
  const src = fs.readFileSync(SW_PATH, 'utf8')
  const store = new Map()
  const state = { calls: [] }
  const ctx = {
    console, setTimeout, clearTimeout, URL, TextDecoder, Response, Request, Headers, AbortController,
    fetch: async (u) => {
      state.calls.push(String(u))
      return new Response('X', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    },
    caches: {
      open: async (n) => {
        if (!store.has(n)) store.set(n, new Map())
        const s = store.get(n)
        return {
          match: async (k) => s.get(typeof k === 'string' ? k : k.url),
          put: async (k, v) => { s.set(typeof k === 'string' ? k : k.url, v) },
        }
      },
      keys: async () => [...store.keys()],
      delete: async (n) => store.delete(n),
    },
  }
  ctx.globalThis = ctx
  ctx.self = ctx
  const handlers = {}
  ctx.addEventListener = (t, f) => { handlers[t] = f }
  ctx.skipWaiting = () => {}
  ctx.clients = { claim: async () => {} }
  vm.createContext(ctx)
  vm.runInContext(src + '\nglobalThis.__sw = { getFileType, ttlOf, CACHE_NAME, TTL_TEXT, TTL_MEDIA };', ctx)
  const api = vm.runInContext('__sw', ctx)
  const fire = async (url) => {
    let captured = null
    handlers.fetch({ request: new Request(url), respondWith: (p) => { captured = p } })
    if (!captured) return { responded: false }
    const res = await captured
    return { responded: true, type: res.headers.get('content-type'), status: res.status }
  }
  const seed = (key, ageMs) => {
    if (!store.has(api.CACHE_NAME)) store.set(api.CACHE_NAME, new Map())
    store.get(api.CACHE_NAME).set(key, new Response('OLD', {
      status: 200,
      headers: { 'Content-Type': 'text/javascript;charset=utf-8', 'X-SW-TIME': String(Date.now() - ageMs) },
    }))
  }
  return { api, store, state, fire, seed }
}

const tick = () => new Promise((r) => setTimeout(r, 50))

test('CACHE_NAME 已升到 v3（老访客 activate 时会主动丢掉 v2 残片）', () => {
  assert.equal(loadWorker().api.CACHE_NAME, 'ICDNCache-v3')
})

test('getFileType 覆盖光标 / XML / 图片新格式，未知扩展仍然回退 text/plain', () => {
  const { api } = loadWorker()
  assert.equal(api.getFileType('c3.cur'), 'image/x-icon')
  assert.equal(api.getFileType('atom.xml'), 'application/xml')
  assert.equal(api.getFileType('home_bg.avif'), 'image/avif')
  assert.equal(api.getFileType('site.webmanifest'), 'application/manifest+json')
  assert.equal(api.getFileType('index.css'), 'text/css')
  assert.equal(api.getFileType('x.bin'), 'text/plain')
})

test('ttlOf 把文本资源判成短 TTL、媒体判成长 TTL', () => {
  const { api } = loadWorker()
  assert.equal(api.TTL_TEXT, 10 * 60 * 1000)
  assert.equal(api.TTL_MEDIA, 24 * 60 * 60 * 1000)
  for (const n of ['index.html', 'shell.js', 'a.mjs', 'index.css', 'search.xml', 'data.json']) {
    assert.equal(api.ttlOf(n), api.TTL_TEXT, n)
  }
  for (const n of ['a.webp', 'c3.cur', 'f.woff2', 'v.mp4']) {
    assert.equal(api.ttlOf(n), api.TTL_MEDIA, n)
  }
})

test('非目标域名完全不介入（不挂 respondWith）', async () => {
  assert.equal((await loadWorker().fire('https://example.org/js/a.js')).responded, false)
})

test('目标域名回源到对象存储并写入缓存；二次请求直接吃缓存', async () => {
  const w = loadWorker()
  const url = 'https://www.example.com/js/modules/shell.js?v=fresh'
  const first = await w.fire(url)
  assert.equal(first.responded, true)
  assert.equal(first.type, 'text/javascript;charset=utf-8')
  assert.deepEqual(w.state.calls, [S3 + '/js/modules/shell.js?v=fresh'])
  assert.ok(w.store.get(w.api.CACHE_NAME).has(S3 + '/js/modules/shell.js?v=fresh'))
  w.state.calls = []
  const second = await w.fire(url)
  assert.deepEqual(w.state.calls, [], '命中缓存不应再次回源')
  assert.equal(second.type, 'text/javascript;charset=utf-8')
})

test('文本资源：超过 10 分钟才后台校验，未超时不动', async () => {
  const url = 'https://www.example.com/js/modules/shell.js?v=old'
  const key = S3 + '/js/modules/shell.js?v=old'
  const w = loadWorker()
  w.seed(key, 11 * 60 * 1000)
  await w.fire(url)
  await tick()
  assert.deepEqual(w.state.calls, [key], '11 分钟旧应触发一次后台重新校验')
  const w2 = loadWorker()
  w2.seed(key, 5 * 60 * 1000)
  await w2.fire(url)
  await tick()
  assert.deepEqual(w2.state.calls, [], '5 分钟新不应回源')
})

test('图片仍按 24 小时长 TTL（省流不被这次改动影响）', async () => {
  const url = 'https://www.example.com/img/a.webp?x=1'
  const key = S3 + '/img/a.webp?x=1'
  const w = loadWorker()
  w.seed(key, 11 * 60 * 1000)
  await w.fire(url)
  await tick()
  assert.deepEqual(w.state.calls, [], '11 分钟旧不应回源')
  const w2 = loadWorker()
  w2.seed(key, 25 * 60 * 60 * 1000)
  await w2.fire(url)
  await tick()
  assert.deepEqual(w2.state.calls, [key], '25 小时旧应触发一次后台校验')
})

test('线路探测（?__pr=）只回源不写缓存', async () => {
  const w = loadWorker()
  const sizeBefore = w.store.get(w.api.CACHE_NAME) ? w.store.get(w.api.CACHE_NAME).size : 0
  const r = await w.fire('https://www.example.com/?__pr=muv9k9c0-0')
  assert.equal(r.responded, true)
  assert.equal(r.type, 'text/html;charset=utf-8')
  assert.deepEqual(w.state.calls, [S3 + '/index.html?__pr=muv9k9c0-0'])
  const sizeAfter = w.store.get(w.api.CACHE_NAME) ? w.store.get(w.api.CACHE_NAME).size : 0
  assert.equal(sizeAfter, sizeBefore, '探测请求不应写入 CacheStorage')
  await w.fire('https://www.example.com/?__pr=muv9k9c0-1')
  const sizeAfter2 = w.store.get(w.api.CACHE_NAME) ? w.store.get(w.api.CACHE_NAME).size : 0
  assert.equal(sizeAfter2, sizeBefore, '第二个随机串同样不应写入')
})

test('普通 HTML / JS 请求仍然照常写缓存（回归保护）', async () => {
  const w = loadWorker()
  await w.fire('https://www.example.com/')
  assert.ok(w.store.get(w.api.CACHE_NAME).has(S3 + '/index.html'))
  await w.fire('https://www.example.com/js/modules/shell.js?v=fresh')
  assert.ok(w.store.get(w.api.CACHE_NAME).has(S3 + '/js/modules/shell.js?v=fresh'))
})
