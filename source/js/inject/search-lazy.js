/* ============================================================================
 * inject/search-lazy.js —— Algolia 搜索按需加载（2026-10-04，性能优化第③步）
 * ----------------------------------------------------------------------------
 * 【为什么】
 * 主题默认在【每一页】把 Algolia 三连脚本当成阻塞脚本加载（原
 * themes/fomalhaut/layout/includes/additional-js.pug:25-29）：
 *     algoliasearch-lite.umd.js        13.6 KB（压缩后约 4 KB）
 *     instantsearch.production.min.js 277   KB（压缩后约 88 KB）
 *     /js/search/algolia.js             5   KB
 * 但它们只有在用户点开搜索框之后才用得上。三个都没有 defer，
 * 等于每次访问都在为「可能永远不会用的功能」付一次下载 + 解析，
 * 全站每一页都付。
 *
 * 【怎么做】分两段，对应「聪明做法」：
 *   ① 空闲预取：页面 load 之后的空闲时刻，用 <link rel=prefetch> 把三个文件
 *      静静拉进浏览器 HTTP 缓存。只下载、不执行 —— 所以不占主线程，
 *      也不会和首屏图片抢带宽（等 load 之后才开始）。
 *   ② 点击兜底：万一用户点得比预取快（或者浏览器忽略了 prefetch 提示），
 *      先立刻把搜索面板打开（有反馈，不像卡住），再按顺序注入三个脚本；
 *      就绪后自动聚焦输入框。也就是「最差等于原来的体验，最好等于零等待」。
 *
 * 【地址从哪来】不写死在本文件。主题 additional-js.pug 会把 CDN 配置
 * （_config.fomalhaut.yml 的 CDN.option）解析好的三条 URL 放进
 * window.__SEARCH_LAZY__，本文件只消费它 —— 以后换 CDN 只改配置。
 *
 * 【为什么必须劫持 addEventListener】
 * 主题的 algolia.js 整段包在 window.addEventListener('load', …) 里。
 * 页面已经 load 过之后，load 不会再来第二次 —— 直接注入的话整个搜索模块
 * 永远不会初始化。所以在「readyState 已经是 complete」时，执行 algolia.js
 * 期间临时接管 window.addEventListener，把注册进来的 load 回调当场同步执行，
 * 脚本一执行完就立刻还原。
 * 页面还没 load 的情况（用户第一秒就点搜索）走另一条路：让它照常注册，
 * 等 load 事件跑完初始化之后再认为「就绪」。
 *
 * 【和主题/其他脚本的关系】
 *   · #search-button 在 #body-wrap 里，pjax 换页会被替换，所以这里用
 *     document 上的捕获阶段委托，而不是直接绑按钮。
 *   · #algolia-search / #search-mask 在 #body-wrap 之外（layout.pug:125），
 *     pjax 不会替换它们，面板状态可以跨页保留。
 *   · 库一旦就绪（state=READY），本文件的点击拦截立刻让位，
 *     完全交回主题 algolia.js 自己的处理函数，不做任何多余的事。
 *   · source/js/modules/shell.js:211-222 的「搜索框修复」只依赖静态的
 *     #algolia-hits 节点，与库是否加载无关，不受影响。
 *
 * 【回滚】见 bak/perf-search-lazy-20261004/ROLLBACK.txt：
 *   删除本文件 + 从 _config.fomalhaut.yml 的 inject.bottom 去掉那一行 +
 *   把 additional-js.pug 的 search 分支换回三条 <script>。
 * ========================================================================== */
(function () {
  'use strict'

  var urls = window.__SEARCH_LAZY__
  if (!urls || !urls.length) return

  var STATE_IDLE = 0, STATE_LOADING = 1, STATE_READY = 2
  var state = STATE_IDLE
  var waiters = []
  var dialogShown = false

  /* ------------------------------ 注入 ------------------------------ */

  function appendScript(url, onDone) {
    var s = document.createElement('script')
    s.src = url
    // 动态插入的 script 默认是 async，关掉它保证「前一个执行完再执行下一个」
    s.async = false
    s.onload = onDone
    s.onerror = function () {
      console.warn('[search-lazy] 脚本加载失败，搜索可能不可用：' + url)
      onDone()
    }
    document.head.appendChild(s)
  }

  // 注入最后一个脚本（algolia.js，负责初始化 InstantSearch）
  function appendInitScript(url, onDone) {
    if (document.readyState === 'complete') {
      // 页面已经 load 过：临时接管 addEventListener，把它的 load 回调同步跑掉
      var nativeAdd = window.addEventListener
      window.addEventListener = function (type, fn, opts) {
        if (type === 'load' && typeof fn === 'function') {
          try { fn() } catch (err) { console.error('[search-lazy] 搜索初始化异常', err) }
          return
        }
        return nativeAdd.call(window, type, fn, opts)
      }
      appendScript(url, function () {
        window.addEventListener = nativeAdd
        onDone()
      })
    } else {
      // 页面还没 load：algolia.js 会正常注册到 load 上。
      // 先注入（它会注册自己的监听），再挂我们的监听 —— 后注册的后触发，
      // 保证「它的初始化先跑完」才放行。
      appendScript(url, function () {})
      window.addEventListener('load', function () { onDone() })
    }
  }

  function load() {
    if (state === STATE_READY) return Promise.resolve()
    if (state === STATE_LOADING) return new Promise(function (r) { waiters.push(r) })
    state = STATE_LOADING

    var chain = Promise.resolve()
    urls.forEach(function (url, i) {
      chain = chain.then(function () {
        return new Promise(function (done) {
          if (i === urls.length - 1) appendInitScript(url, done)
          else appendScript(url, done)
        })
      })
    })

    return chain.then(function () {
      state = STATE_READY
      waiters.splice(0).forEach(function (r) { r() })
    }).catch(function (err) {
      state = STATE_IDLE
      console.error('[search-lazy] 加载流程出错', err)
    })
  }

  /* -------------------- ① 空闲预取（只下载不执行） -------------------- */

  function prefetch() {
    if (state !== STATE_IDLE) return
    urls.forEach(function (url) {
      var l = document.createElement('link')
      l.rel = 'prefetch'
      l.as = 'script'
      l.href = url
      document.head.appendChild(l)
    })
  }

  function onIdle(fn) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 3000 })
    else window.setTimeout(fn, 1500)
  }

  if (document.readyState === 'complete') onIdle(prefetch)
  else window.addEventListener('load', function () { onIdle(prefetch) })

  /* --------------- ② 库没就绪时，自己负责开关面板 --------------- */

  function searchDialog() { return document.querySelector('#algolia-search .search-dialog') }
  function searchMask() { return document.getElementById('search-mask') }

  function showDialog() {
    var mask = searchMask(), dlg = searchDialog()
    if (!mask || !dlg) return
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    if (typeof btf !== 'undefined' && btf.animateIn) {
      btf.animateIn(mask, 'to_show 0.5s')
      btf.animateIn(dlg, 'titleScale 0.5s')
    } else {
      mask.style.display = 'block'
      dlg.style.display = 'block'
    }
    dialogShown = true
    // 加载期间给个反馈，免得面板打开却是空的。
    // instantsearch 渲染 #algolia-hits 时会整块替换掉，所以这里不需要清理。
    var hits = document.getElementById('algolia-hits')
    if (hits && !hits.getAttribute('data-search-lazy')) {
      hits.setAttribute('data-search-lazy', '1')
      hits.innerHTML = '<div style="padding:24px 0;text-align:center;opacity:.55">'
        + '<i class="fas fa-spinner fa-spin"></i> 正在加载搜索…</div>'
    }
  }

  function hideDialog() {
    var mask = searchMask(), dlg = searchDialog()
    document.body.style.width = ''
    document.body.style.overflow = ''
    if (typeof btf !== 'undefined' && btf.animateOut) {
      if (dlg) btf.animateOut(dlg, 'search_close .5s')
      if (mask) btf.animateOut(mask, 'to_hide 0.5s')
    } else {
      if (dlg) dlg.style.display = ''
      if (mask) mask.style.display = ''
    }
    dialogShown = false
  }

  function focusInput() {
    var input = document.querySelector('#algolia-search .ais-SearchBox-input')
    if (input) input.focus()
  }

  /* -------- 点击拦截：捕获阶段，保证先于主题自己的按钮监听 -------- */

  document.addEventListener('click', function (e) {
    // 库已就绪 —— 什么都不做，完全交回主题的 algolia.js
    if (state === STATE_READY) return

    var t = e.target

    // 点搜索按钮：先开面板给反馈，再加载
    if (t && t.closest && t.closest('#search-button')) {
      e.preventDefault()
      e.stopPropagation()
      var wasShown = dialogShown
      showDialog()
      load().then(function () {
        if (dialogShown) window.setTimeout(focusInput, wasShown ? 0 : 60)
      })
      return
    }

    // 就绪前的关闭兜底：否则面板会「关不掉」
    if (dialogShown && t && (t.id === 'search-mask' ||
        (t.closest && t.closest('.search-close-button')))) {
      e.preventDefault()
      e.stopPropagation()
      hideDialog()
    }
  }, true)
})()
