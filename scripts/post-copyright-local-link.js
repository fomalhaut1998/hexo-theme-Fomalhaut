/*
 * post-copyright-local-link.js —— 文章版权卡片「文章链接」本地化补丁
 * ---------------------------------------------------------------------------
 * 症状：文章页底部的版权卡片（渐变底 + 右下角大 CC 水印那张）里，「文章链接」写的是
 *   站点绝对地址 https://example.com/posts/76815704.html 。
 *   读者在镜像线路（example.com / netlify.example.com / cloudflare.example.com / render.example.com /
 *   yourname.github.io）或本地预览（hexo server 的 http://localhost:4000）上看文章时，
 *   点这个链接会被带回主域名 example.com —— 也就是「链接不指向本站」。
 *
 * 根因：themes/fomalhaut/layout/includes/post/post-copyright.pug:21,30
 *   - let url = page.copyright_url ? page.copyright_url : page.permalink   // page.permalink 是绝对地址
 *   a(href=url_for(url))= theme.post_copyright.decode ? decodeURI(url) : url
 *   hexo 的 url_for 对 http(s):// 开头的地址原样放行（hexo/lib/plugins/helper/url_for.js 的
 *   /^(#|\/\/|https?:)/ 判断），所以绝对地址一路原样输出到页面上。
 *
 * 为什么纯改配置做不到：主题的 post_copyright 段（_config.fomalhaut.yml:463-468）只有
 *   enable / decode / author_href / license / license_url 五项，没有「用站内相对地址」的开关；
 *   front-matter 的 copyright_url 只能逐篇手写，写死路径同样是硬编码。所以只能在渲染产物上定点替换。
 *
 * 改法：只动 .post-copyright__type 里的那一个 <a>：
 *   href="https://<config.url 的域名>/posts/xxx.html"  ->  href="/posts/xxx.html"
 *   显示文字同样换成站内路径（随后由 _config.fomalhaut.yml inject.bottom 的
 *   <script id="pcLocalLinkJs"> 在浏览器里补成「当前访问域名」下的完整网址）。
 *   其它任何位置的绝对地址（canonical / og:url / sitemap / 分享按钮 / 图片 CDN）一律不碰。
 *
 * 这个文件不在 source/ 也不在 theme/ 里，不会被渲染；它在 hexo.load() 阶段作为脚本执行。
 * 回滚：删掉本文件 + 撤掉 _config.fomalhaut.yml 里的 pcLocalLinkJs 注入即可
 *   （备份见 bak/post-copyright-local-link/before/_config.fomalhaut.yml）。
 */

const fs = require('node:fs');
const path = require('node:path');

// 站点自己的域名，例如 https://example.com（不含 root，root 属于路径的一部分要保留）
function siteOrigin() {
  const cfg = (hexo && hexo.config) || {};
  const url = String(cfg.url || '').replace(/\/+$/, '');
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch (e) {
    return null;
  }
}

// 版权卡片里的链接块：<div class="post-copyright__type"> ... </div>（内部没有嵌套 div）
const BLOCK_RE = /<div class="post-copyright__type">([\s\S]*?)<\/div>/g;

function rewrite(html, origin) {
  let n = 0;
  const out = html.replace(BLOCK_RE, function (whole, inner) {
    if (inner.indexOf(origin) === -1) return whole;
    const fixed = inner.replace(/(<a\s[^>]*?href=")([^"]*)(">)([\s\S]*?)(<\/a>)/, function (m, head, href, mid, text, tail) {
      if (href.indexOf(origin) !== 0) return m;
      n++;
      const rel = href.slice(origin.length); // 保留 root，例如 /posts/76815704.html
      const label = text.trim().indexOf(origin) === 0 ? decodeURI(rel) : text;
      return head + rel + mid + label + tail;
    });
    return '<div class="post-copyright__type">' + fixed + '</div>';
  });
  return { out: out, n: n };
}

// —— 主修：渲染期。hexo generate 与 hexo server 都会经过这里
hexo.extend.filter.register('after_render:html', function (str) {
  if (typeof str !== 'string' || str.indexOf('post-copyright__type') === -1) return str;
  const origin = siteOrigin();
  if (!origin) return str;
  const r = rewrite(str, origin);
  if (r.n > 0) hexo.log.info('[post-copyright-local-link] 渲染期改写 ' + r.n + ' 个版权卡片链接 -> 站内相对地址');
  return r.out;
}, 21);

// —— 兜底：产物落盘后再扫一遍 public/（正常情况下上面已经改好了，这里是保险）
function walk(dir, out) {
  out = out || [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const f = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}

function fixPublicDir() {
  const origin = siteOrigin();
  if (!origin || !hexo.base_dir) return;
  const pub = path.join(hexo.base_dir, 'public');
  if (!fs.existsSync(pub)) return;
  const files = walk(pub).filter(function (f) {
    return f.slice(-5) === '.html';
  });
  let changed = 0;
  let hits = 0;
  for (let i = 0; i < files.length; i++) {
    let text;
    try {
      text = fs.readFileSync(files[i], 'utf8');
    } catch (e) {
      continue;
    }
    if (text.indexOf('post-copyright__type') === -1 || text.indexOf(origin) === -1) continue;
    const r = rewrite(text, origin);
    if (r.n > 0) {
      fs.writeFileSync(files[i], r.out, 'utf8');
      changed++;
      hits += r.n;
    }
  }
  if (changed > 0) hexo.log.info('[post-copyright-local-link] 产物兜底改写 ' + hits + ' 个版权卡片链接（' + changed + ' 个文件）');
}

hexo.extend.filter.register('before_exit', fixPublicDir, 1000);
hexo.extend.filter.register('before_deploy', fixPublicDir, 1000);
