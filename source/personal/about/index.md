---
title: 关于
date: 2022-08-10 16:05:11
---

<!-- {% note warning modern %}<b>非商免字体、网图</b>等资源未经授权仅限个人使用，不得用于商业用途。本站平时仅用于交流和学习，如涉及侵权请联系站长删除对应资源，谢谢！ —— 致版权方{% endnote %} -->

<!-- ## 0.网站自述视频🎬

<div class="about_page">
  <div align=center class="aspect-ratio">
      <iframe src="https://player.bilibili.com/player.html?aid=474023258&&page=1&as_wide=1&high_quality=1&danmaku=0" 
      scrolling="no" 
      border="0" 
      frameborder="no" 
      framespacing="0" 
      high_quality=1
      danmaku=1 
      allowfullscreen="true"> 
      </iframe>
  </div>
</div>

<br> -->

<div class="ab2">
  <div class="ab2-hero">
    <p class="ab2-kicker">About · 关于本站</p>
    <p class="ab2-hero-title">一份源码 · <em>六线并行</em></p>
    <p class="ab2-hero-sub">Hexo 静态站点，同一份构建产物同时分发给 6 条线路（2 条主线路 + 4 条备用线路），全站 HTTPS、实测全部协商到 TLS 1.3 + HTTP/2。下面把每条线路的节点位置、Ping 延迟、HTTPS 握手耗时与首字节响应都摊开写清楚。</p>
    <ul class="ab2-hero-stats">
      <li><b>6</b><span>在线线路</span></li>
      <li><b>2</b><span>主线路</span></li>
      <li><b>TLS 1.3</b><span>全站 HTTPS</span></li>
      <li><b>h2</b><span>HTTP/2 全支持</span></li>
    </ul>
  </div>
</div>

## 1.线路信息🚁

<div class="ab2">
  <p class="ab2-lead">本站是纯静态站点，一份构建产物同时推给 6 个托管商：<b>2 条主线路</b>负责日常访问，<b>4 条备用线路</b>负责兜底与分流。六条线路全部支持 HTTPS，浏览器与服务器都能协商到 <b>TLS 1.3 + HTTP/2</b>。下面先逐条说明「它在哪、有什么特点」，再给一张本机实测参数对照表。</p>
  <div class="ab2-sub">主线路 · 日常入口 <small>2 条</small></div>
  <div class="ab2-grid">
    <a class="ab2-line is-primary" href="https://example.com/" target="_blank" rel="noopener" data-route-url="https://example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">example.com</span><span class="ab2-badge">主线路</span></div>
      <div class="ab2-line-host">example.com</div>
      <div class="ab2-line-platform"><b>Vercel Edge Network</b> · 全球 Anycast 泛播，本次请求落到<b>新加坡 sin1</b> 节点（响应头 <code>x-vercel-id: sin1::…</code>），边缘缓存命中（<code>x-vercel-cache: HIT</code>）；HSTS 有效期 2 年</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">186<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">197<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">188<em>ms</em></span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:71%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">64.29.17.65</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
    <a class="ab2-line is-primary" href="https://example.com/" target="_blank" rel="noopener" data-route-url="https://example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">example.com</span><span class="ab2-badge">主线路</span></div>
      <div class="ab2-line-host">example.com</div>
      <div class="ab2-line-platform"><b>Cloudflare</b> · 泛播就近接入，本次落到<b>阿姆斯特丹 AMS</b>（<code>cf-ray: …-AMS</code>），动态回源（<code>cf-cache-status: DYNAMIC</code>）；额外提供 <b>HTTP/3</b>（<code>alt-svc: h3</code>）。用 .cn 域名的原因：更易被记住，对国内 SEO 也更友好</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">250<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">250<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">230<em>ms</em></span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:91%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">172.67.222.147</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
  </div>
  <div class="ab2-sub">备用线路 · 兜底与分流 <small>4 条</small></div>
  <div class="ab2-grid">
    <a class="ab2-line is-alt" href="https://github.example.com/" target="_blank" rel="noopener" data-route-url="https://github.example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">github.example.com</span><span class="ab2-badge is-mute">备用</span></div>
      <div class="ab2-line-host">github.example.com</div>
      <div class="ab2-line-platform"><b>GitHub Pages / Fastly</b> · 解析到 Fastly 任播（<code>Server: GitHub.com</code>、<code>Via: 1.1 varnish</code>）。裸连接是六条里最快的，但正文响应在国内时常被拖住，只当兜底用</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">60–1081<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">65–171<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">多次超时</span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:50%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">185.199.108/109.153</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
    <a class="ab2-line is-alt" href="https://netlify.example.com/" target="_blank" rel="noopener" data-route-url="https://netlify.example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">netlify.example.com</span><span class="ab2-badge is-mute">备用</span></div>
      <div class="ab2-line-host">netlify.example.com</div>
      <div class="ab2-line-platform"><b>Netlify</b> · 源站在 <b>AWS 新加坡 ap-southeast-1</b>（<code>Server: Netlify</code>）。命中边缘缓存时表现稳定，冷启动 / 回源时抖动比较明显</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">191<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">197<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">190<em>ms</em></span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:72%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">13.215.239.219</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
    <a class="ab2-line is-alt" href="https://edgeone.example.com/" target="_blank" rel="noopener" data-route-url="https://edgeone.example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">edgeone.example.com</span><span class="ab2-badge is-mute">备用</span></div>
      <div class="ab2-line-host">edgeone.example.com</div>
      <div class="ab2-line-platform"><b>腾讯云 EdgeOne</b> · 腾讯云海外节点（<code>Server: edgeone makers</code>），响应头 <code>Age: ≈49000</code> 说明边缘缓存长期命中；本次采样 <b>0 失败</b>，是四条备用线路里最稳的一条</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">216<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">211<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">221<em>ms</em></span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:81%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">43.174.247.63</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
    <a class="ab2-line is-alt" href="https://render.example.com/" target="_blank" rel="noopener" data-route-url="https://render.example.com/">
      <div class="ab2-line-top"><span class="ab2-line-name">render.example.com</span><span class="ab2-badge is-mute">备用</span></div>
      <div class="ab2-line-host">render.example.com</div>
      <div class="ab2-line-platform"><b>Render</b> · 免费容器托管，入口经 <b>Cloudflare</b> 清洗与加速（<code>cf-ray: …-LAX</code>，本次落到洛杉矶）。静态产物走边缘，只有容器冷启动时才会变慢</div>
      <div class="ab2-metrics">
        <div><span class="ab2-metric-k">Ping 延迟</span><span class="ab2-metric-v">173<em>ms</em></span></div>
        <div><span class="ab2-metric-k">HTTPS 握手</span><span class="ab2-metric-v">181<em>ms</em></span></div>
        <div><span class="ab2-metric-k">首字节 TTFB</span><span class="ab2-metric-v">171<em>ms</em></span></div>
      </div>
      <div class="ab2-bar"><i style="--pct:66%"></i></div>
      <div class="ab2-line-foot"><span class="ab2-node">216.24.57.18</span><span class="ab2-probe">实时延迟 · 待测</span></div>
    </a>
  </div>
  <div class="ab2-sub">本机实测参数对照 <small>2026-10-04 · 每条采样 4 次</small><button class="ab2-probe-all" data-probe-all type="button" style="margin-left:auto">重测全部</button></div>
  <div class="ab2-tablewrap">
    <table class="ab2-table">
      <thead>
        <tr><th>线路</th><th>托管平台 / 边缘</th><th>本次落点</th><th>Ping<br>(TCP RTT)</th><th>HTTPS 握手<br>(TLS)</th><th>首字节<br>(TTFB)</th><th>稳定性</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="strong">example.com</td>
          <td>Vercel Edge Network</td>
          <td class="mono">新加坡 sin1 · 64.29.17.65</td>
          <td class="mono">186 ms</td>
          <td class="mono">197 ms</td>
          <td class="mono">185–190 ms</td>
          <td><span class="ab2-dot warn"></span>4 次里 2 次响应被拖慢</td>
        </tr>
        <tr>
          <td class="strong">example.com</td>
          <td>Cloudflare（支持 HTTP/3）</td>
          <td class="mono">阿姆斯特丹 AMS · 172.67.222.147</td>
          <td class="mono">212–343 ms</td>
          <td class="mono">219–278 ms</td>
          <td class="mono">214–258 ms</td>
          <td><span class="ab2-dot"></span>4/4 成功</td>
        </tr>
        <tr>
          <td class="strong">github.example.com</td>
          <td>GitHub Pages / Fastly</td>
          <td class="mono">Fastly 任播 · 185.199.108/109.153</td>
          <td class="mono">60–1081 ms</td>
          <td class="mono">65–171 ms</td>
          <td class="mono">多次超时</td>
          <td><span class="ab2-dot bad"></span>正文 3/3 未取回（HEAD 200 正常）</td>
        </tr>
        <tr>
          <td class="strong">netlify.example.com</td>
          <td>Netlify（源站 AWS 新加坡）</td>
          <td class="mono">新加坡 ap-southeast-1 · 13.215.239.219</td>
          <td class="mono">191 ms</td>
          <td class="mono">194–440 ms</td>
          <td class="mono">190 ms（峰值 1021）</td>
          <td><span class="ab2-dot warn"></span>4 次里 1 次超时</td>
        </tr>
        <tr>
          <td class="strong">edgeone.example.com</td>
          <td>腾讯云 EdgeOne</td>
          <td class="mono">腾讯云海外 · 43.174.247.63</td>
          <td class="mono">187–239 ms</td>
          <td class="mono">190–267 ms</td>
          <td class="mono">206–227 ms</td>
          <td><span class="ab2-dot"></span>4/4 成功 · 边缘缓存命中</td>
        </tr>
        <tr>
          <td class="strong">render.example.com</td>
          <td>Render（入口经 Cloudflare）</td>
          <td class="mono">洛杉矶 LAX · 216.24.57.18</td>
          <td class="mono">164–191 ms</td>
          <td class="mono">178–383 ms</td>
          <td class="mono">163–181 ms</td>
          <td><span class="ab2-dot"></span>4/4 成功</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="ab2-note">
    <b>数据口径</b>：上表三列全部是 <b>2026-10-04</b> 在<b>站长本机（中国大陆家庭宽带）</b>上用原始套接字分阶段计时得到的 —— DNS 解析 → TCP 三次握手 → TLS 握手 → 发出 <code>GET /</code> 直到收到第一个字节，每条线路采样 4 次后取区间。单位毫秒，<b>是参考值不是承诺值</b>：不同运营商、不同省份、不同时段的差异可以很大，跨国线路尤其明显（相邻两次采样差出一秒很常见，所以只写区间）。<br>
    线路卡右下角的<b>「实时延迟」徽标</b>才是属于你自己的数字 —— 它是浏览器用 <code>fetch(mode:"no-cors")</code> 打一次带随机参数的请求量出来的往返耗时，点一下即可单独重测，页面静置五分钟也会自动静默复测一轮。<br>
    另外：主域 <code>example.com</code> 还通过 Service Worker 把主域链接劫持到对象存储，国内访问时会进一步走更快的国内线路。
  </div>
</div>
<br>

## 2.技术栈&框架🧪

<div class="ab2">
  <p class="ab2-lead">按「请求从哪进来 → 页面怎么生成 → 浏览器里跑什么 → 产物怎么构建发布 → 数据存在哪 → 授权怎么给」拆成六层。<b>版本号均为当前实际安装版本</b>，不是官网最新版。</p>
  <div class="ab2-stack">
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L1</span><span class="ab2-layer-name">接入与边缘</span><span class="ab2-layer-en">Ingress / Edge</span></div>
      <ul class="ab2-layer-body">
        <li><b>边缘网络</b><a href="https://vercel.com/" target="_blank" rel="noopener">Vercel</a> · <a href="https://www.cloudflare.com/zh-cn/" target="_blank" rel="noopener">Cloudflare</a> · <a href="https://cloud.tencent.com/product/teo" target="_blank" rel="noopener">腾讯云 EdgeOne</a> · <a href="https://app.netlify.com/" target="_blank" rel="noopener">Netlify</a> · <a href="https://pages.github.com/" target="_blank" rel="noopener">GitHub Pages</a>(Fastly) · <a href="https://render.com/" target="_blank" rel="noopener">Render</a></li>
        <li><b>传输层</b>全站强制 HTTPS：实测六条线路均协商到 <b>TLS 1.3</b>、ALPN 为 <b>h2</b>（HTTP/2）；Cloudflare 侧额外开放 <b>HTTP/3</b>（<code>alt-svc: h3=":443"</code>）。Vercel / Netlify / EdgeOne 均下发 HSTS 响应头</li>
        <li><b>线路分流</b>同一份构建产物推给多个托管平台，用不同域名并行分发；再用 <a href="https://developer.chrome.com/docs/workbox/service-worker-overview/" target="_blank" rel="noopener">Service Worker</a> 做请求分流</li>
        <li><b>静态资源</b>任何 S3 兼容对象存储 / 图床均可，换成你自己的桶地址即可</li>
        <li><b>CDN 源</b><a href="https://registry.npmmirror.com/" target="_blank" rel="noopener">npmmirror</a> · <a href="https://npm.elemecdn.com/" target="_blank" rel="noopener">elemecdn</a> · <a href="https://cdn.baomitu.com/" target="_blank" rel="noopener">360 baomitu</a> · <a href="https://cdn.jsdmirror.com/" target="_blank" rel="noopener">jsdmirror</a> · <a href="https://www.iconfont.cn/" target="_blank" rel="noopener">阿里矢量图标库</a></li>
      </ul>
    </div>
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L2</span><span class="ab2-layer-name">站点生成与渲染</span><span class="ab2-layer-en">SSG / Renderer</span></div>
      <ul class="ab2-layer-body">
        <li><b>生成器</b><a href="https://github.com/hexojs/hexo" target="_blank" rel="noopener">Hexo 6.3.0</a>（Node.js 静态站点生成，全量构建约 9 秒）</li>
        <li><b>Markdown</b><code>hexo-renderer-markdown-it 6.1.0</code> 与 <code>@upupming/hexo-renderer-markdown-it-plus 2.0.2</code> 双渲染器注册（plus 先注册、markdown-it 后注册生效）</li>
        <li><b>模板 / 样式</b><a href="https://pugjs.org/" target="_blank" rel="noopener">Pug 3.0.0</a> · <a href="https://stylus-lang.com/" target="_blank" rel="noopener">Stylus 2.1.0</a> · EJS · YAML</li>
        <li><b>主题</b>Fomalhaut 1.0.2，基于 <a href="https://butterfly.js.org/" target="_blank" rel="noopener">Butterfly 4.3.1</a> 二次开发，源码已开源：<a href="https://github.com/yourname/hexo-theme-fomalhaut" target="_blank" rel="noopener">hexo-theme-Fomalhaut</a></li>
        <li><b>内容插件</b><code>markdown-it-container / -deflist / -emoji / -mark</code> · <code>hexo-abbrlink 2.2.1</code>（固定链接） · <code>hexo-blog-encrypt 3.1.6</code>（文章加密） · <code>hexo-wordcount-fomal</code>（字数统计） · <code>hexo-filter-nofollow</code> · <code>hexo-filter-gitcalendar</code></li>
        <li><b>聚合与订阅</b><code>hexo-generator-index / archive / category / tag</code> · <code>hexo-generator-sitemap</code> · <code>hexo-generator-feed</code> · <code>hexo-generator-baidu-sitemap</code> · <code>hexo-baidu-url-submit</code>（百度主动推送）</li>
      </ul>
    </div>
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L3</span><span class="ab2-layer-name">前端运行时</span><span class="ab2-layer-en">Client Runtime</span></div>
      <ul class="ab2-layer-body">
        <li><b>无刷新路由</b><a href="https://github.com/defunkt/jquery-pjax" target="_blank" rel="noopener">Pjax</a> 0.2.8（换页不整页刷新，配合站点侧 <code>pjax:complete</code> 事件重新初始化各模块）</li>
        <li><b>资源加载</b><code>vanilla-lazyload 17.8.3</code> 图片懒加载；jQuery 3.6.0 + 本地兜底 <code>/js/jquery.min.js</code>（CDN 失效不断链）</li>
        <li><b>离线 / 分流</b><a href="https://developer.chrome.com/docs/workbox/service-worker-overview/" target="_blank" rel="noopener">Workbox 6.5.4</a> 生成 Service Worker：预缓存 + 主域请求分流</li>
        <li><b>交互组件</b>自研零依赖轻量通知组件 <code>/js/notify.js</code>，替换掉原 Element-UI + Vue 方案（省下约 813 KB 同步 CSS/JS）</li>
        <li><b>评论</b><a href="https://twikoo.js.org/" target="_blank" rel="noopener">Twikoo</a> 2.0.12 + <a href="https://vercel.com/" target="_blank" rel="noopener">Vercel</a> 自托管云函数 + <a href="https://www.mongodb.com/" target="_blank" rel="noopener">MongoDB</a> 存储</li>
        <li><b>搜索</b><code>hexo-generator-search 2.4.3</code>（本地搜索） + <code>hexo-algoliasearch 1.0.0</code>（algoliasearch 4.14.3 / instantsearch.js 4.49.2）</li>
        <li><b>音乐 / 媒体</b><a href="https://github.com/MoePlayer/hexo-tag-aplayer" target="_blank" rel="noopener">hexo-tag-aplayer 3.0.4</a> + <a href="https://github.com/metowolf/MetingJS" target="_blank" rel="noopener">MetingJS</a></li>
      </ul>
    </div>
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L4</span><span class="ab2-layer-name">构建与自动化交付</span><span class="ab2-layer-en">Build / CI-CD</span></div>
      <ul class="ab2-layer-body">
        <li><b>构建链</b><a href="https://github.com/gulpjs/gulp" target="_blank" rel="noopener">gulp 4.0.2</a> → <code>gulp-html-minifier-terser 7.1.0</code> · <code>gulp-htmlclean</code> · <code>gulp-clean-css</code> · <code>gulp-terser</code> · <code>gulp-babel</code></li>
        <li><b>图片</b><a href="https://github.com/meowtec/Imagine" target="_blank" rel="noopener">Imagine</a> 有损压缩 → <a href="https://imagestool.com/zh_CN/index.html" target="_blank" rel="noopener">imagesTool</a> 转 WebP</li>
        <li><b>字体</b>Python <code>fonttools</code> 子集化（只打包用到的字形） → <a href="https://cloudconvert.com/" target="_blank" rel="noopener">CloudConvert</a> 转 WOFF2</li>
        <li><b>发布</b><a href="https://git-scm.com/" target="_blank" rel="noopener">Git 钩子</a> + <a href="https://github.com/features/actions" target="_blank" rel="noopener">GitHub Actions</a> 触发，<code>hexo-deployer-git</code> 一份产物推到 6 个远端</li>
      </ul>
    </div>
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L5</span><span class="ab2-layer-name">数据与可观测</span><span class="ab2-layer-en">Data / Observability</span></div>
      <ul class="ab2-layer-body">
        <li><b>结构化存储</b><a href="https://www.mongodb.com/" target="_blank" rel="noopener">MongoDB</a>：托管 Twikoo 评论数据</li>
        <li><b>访问统计</b><a href="https://aoaoao.info/321.html" target="_blank" rel="noopener">不蒜子</a>（前端 UV/PV） + <a href="https://tongji.baidu.com/" target="_blank" rel="noopener">百度统计</a> + <a href="https://github.com/Eurkon/baidu-tongji-api" target="_blank" rel="noopener">baidu-tongji-api</a> 爬虫（部署在 Vercel）</li>
        <li><b>性能监控</b><a href="https://v6.51.la/" target="_blank" rel="noopener">51la</a> + <a href="https://perf.51.la/" target="_blank" rel="noopener">灵雀监控</a>（站点 JS 全部 <code>defer</code>，不进首屏关键路径）</li>
        <li><b>友链朋友圈</b><a href="https://github.com/Rock-Candy-Tea/hexo-circle-of-friends" target="_blank" rel="noopener">hexo-circle-of-friends</a> 爬虫由 GitHub Actions 定时跑，产出静态 JSON 后交 <a href="https://www.jsdelivr.com/" target="_blank" rel="noopener">jsDelivr</a> 分发</li>
      </ul>
    </div>
    <div class="ab2-layer">
      <div class="ab2-layer-h"><span class="ab2-layer-idx">L6</span><span class="ab2-layer-name">工程规范与授权</span><span class="ab2-layer-en">Engineering / License</span></div>
      <ul class="ab2-layer-body">
        <li><b>开发语言</b>HTML5 · CSS3 · JavaScript · <a href="https://pugjs.org/" target="_blank" rel="noopener">Pug</a> · <a href="https://stylus-lang.com/" target="_blank" rel="noopener">Stylus</a> · YAML · Node.js</li>
        <li><b>AI 辅助</b><a href="https://www.deepseek.com/" target="_blank" rel="noopener">DeepSeek V4.1 Flash</a> 与 GPT 6.1 Sol 模型 + DeepSeek Harness 终端智能体（本次全站重构的代码改写、样式排查与文案润色均由它协助完成）</li>
        <li><b>站点增强</b><code>hexo-butterfly-swiper</code>（首页轮播） · <code>hexo-butterfly-clock-anzhiyu</code> · <code>hexo-butterfly-envelope</code> · <code>hexo-butterfly-tag-plugins-plus</code> · <code>hexo-magnet-fomal</code> · <code>hexo-pdf</code> · <code>hexo-tag-map</code></li>
        <li><b>版权声明</b>见 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>（署名 · 非商业性使用 · 相同方式共享）</li>
        <li><b>维护日志</b>见 <a href="/site/time/">旧时光</a> 栏目；<b>鸣谢</b>：Hexo、Butterfly、以及所有开源作者。</li>
      </ul>
    </div>
  </div>
</div>
<br>

## 3.关于这个演示站📃

<div class="ab2">
  <div class="ab2-profile">
    <div class="ab2-avatar">D</div>
    <div style="min-width:0">
      <div class="ab2-profile-name">Demo</div>
      <div class="ab2-profile-role">示例站点 · 主题演示</div>
      <ul class="ab2-tags">
        <li>Hexo</li>
        <li>Fomalhaut</li>
        <li>静态站点</li>
      </ul>
    </div>
  </div>
  <div class="ab2-kv">
    <div class="ab2-kv-row"><span class="ab2-kv-k">站点名称</span><span class="ab2-kv-v">Demo</span></div>
    <div class="ab2-kv-row"><span class="ab2-kv-k">主题</span><span class="ab2-kv-v">hexo-theme-Fomalhaut v1.0.2（基于 Butterfly 4.3.1 二次开发）</span></div>
    <div class="ab2-kv-row"><span class="ab2-kv-k">邮箱</span><span class="ab2-kv-v"><a href="mailto:you@example.com">you@example.com</a></span></div>
    <div class="ab2-kv-row"><span class="ab2-kv-k">源码</span><span class="ab2-kv-v"><a href="https://github.com/yourname/hexo-theme-fomalhaut" target="_blank" rel="noopener">github.com/yourname/hexo-theme-fomalhaut</a></span></div>
    <div class="ab2-kv-row"><span class="ab2-kv-k">技术栈</span><span class="ab2-kv-v"><span class="ab2-chips"><i>Hexo 6.3.0</i><i>Pug</i><i>Stylus</i><i>gulp</i><i>Vercel</i><i>Cloudflare Pages</i></span></span></div>
  </div>
  <div class="ab2-sub">怎么把它变成你自己的站</div>
  <ol class="ab2-origin">
    <li>根目录 <code>_config.yml</code>：站点名、作者、描述、<code>url</code>、部署仓库，换成你自己的。</li>
    <li>根目录 <code>_config.fomalhaut.yml</code>：主题全部开关都在这里 —— 社交链接、头像、首页轮播、评论、统计、AI 助手、侧栏卡片，按注释改即可。</li>
    <li>主题本体在 <code>themes/fomalhaut/</code>，站点级自定义样式在 <code>source/css/</code>、自定义脚本在 <code>source/js/</code>；两者分离，升级主题不会冲掉你的改动。</li>
    <li><code>source/_posts/</code> 放自己的文章；<code>source/</code> 下不需要的页面（画廊、朋友圈、网址导航……）直接删掉即可。</li>
    <li>本页的样式在 <code>source/css/about-page.css</code>，想换版式改那一个文件就够。</li>
  </ol>
  <div class="ab2-coda">这份源码的全部意义，是让你少走一遍前人在美化博客路上踩过的坑。祝你搭站顺利 🍭</div>
  <div class="ab2-coda-s">hexo-theme-Fomalhaut v1.0.2｜Apache-2.0｜基于 Butterfly 4.3.1 二次开发</div>
</div>
