/*
 * magnet-local-links.js  —— hexo-magnet-fomal 首页「小冰磁贴」链接本地化补丁
 * ---------------------------------------------------------------------------
 * 症状：首页磁贴（🍡 Demoの算法学习笔记 … 那一排 + 「查看更多...」）点击后跳到
 *   外站 https://example.com/categories/xxx/ ，而不是本站 /categories/xxx/ 。
 *
 * 根因：node_modules/hexo-magnet-fomal/index.js 拼磁贴 HTML 时写死了
 *   <a class="magnet_link" href="${hexo.config.url}/${item.path}">
 *   （「查看更多」同理：hexo.config.url + '/categories/'），把 _config.yml 里的
 *   url（https://example.com/）原样拼了进去。插件没有任何「链接前缀」配置项，
 *   所以纯改 _config.yml 做不到；改 node_modules 又会在重装依赖时丢失。
 *
 * 为什么改这里有效：插件是用 hexo.extend.injector.register('body_end', ...) 把这段
 *   HTML 注入「每一个渲染出来的页面」的。Hexo 渲染 HTML 路由的顺序是：
 *     主题渲染  ->  injector.exec()  ->  _after_html_render 过滤器
 *   所以注册 after_render:html 一定在注入之后拿到完整 HTML，而且
 *   hexo generate 和 hexo server（localhost:4000 那种在线预览）都会生效
 *   —— 这一点很关键：before_exit 只在进程退出时触发，hexo server 常驻，永远等不到。
 *
 * 改法：只动 class="magnet_link" / "magnet_link_more" 的 a 标签，
 *   https://<config.url>/categories/xxx/   ->   /categories/%E5%88%86%E7%B1%BB/
 *   即「去掉站点绝对前缀、补回站内路径、按站点约定 percent-encode 中文」。
 *   其它位置的绝对地址（canonical / og:url / sitemap / 分享链接）一律不碰。
 *
 * 这个文件不在 source/ 也不在 theme/ 里，不会被渲染；它在 hexo.load() 阶段作为脚本执行。
 */

const fs = require('node:fs');
const path = require('node:path');

var MARKER = '/categories/';

// 站点绝对前缀：https://example.com/categories/  以及对应的站内路径 /categories/
function absolutePrefix() {
  var cfg = (this && this.config) || (typeof hexo !== 'undefined' && hexo && hexo.config) || {};
  var siteUrl = String(cfg.url || '').replace(/\/+$/, '');
  if (!siteUrl) return null;
  var prefix = siteUrl + MARKER;
  var rel = MARKER;
  try {
    rel = new URL(prefix).pathname; // -> /categories/
  } catch (e) {
    rel = prefix.slice(siteUrl.length);
  }
  return { prefix: prefix, rel: rel };
}

// 只重写磁贴那两个 class 的 a 标签，且必须命中站点绝对前缀
function rewrite(html, prefix, rel) {
  var n = 0;
  var re = /(<a\s+class="magnet_link[^>]*?href=")([^"]*)(")/g;
  var out = html.replace(re, function (m, head, href, tail) {
    if (href.indexOf(prefix) !== 0) return m;
    n++;
    return head + rel + encodeURI(href.slice(prefix.length)) + tail;
  });
  return { out: out, n: n };
}

// —— 主修：渲染期。hexo generate 与 hexo server 都会经过这里
hexo.extend.filter.register('after_render:html', function (str) {
  if (typeof str !== 'string' || str.indexOf(MARKER) === -1) return str;
  var p = absolutePrefix.call(this);
  if (!p) return str;
  var r = rewrite(str, p.prefix, p.rel);
  if (r.n > 0) {
    hexo.log.info('[magnet-local-links] 渲染期改写 ' + r.n + ' 个磁贴链接 -> ' + p.rel);
  }
  return r.out;
}, 20);

// —— 兜底：产物落盘后再扫一遍 public/（正常情况下上面已经改好了，这里是保险）
function walk(dir, out) {
  out = out || [];
  var entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (var i = 0; i < entries.length; i++) {
    var ent = entries[i];
    var p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function fixPublicDir() {
  var p = absolutePrefix.call(this);
  if (!p) return;
  var base = this.base_dir || (typeof hexo !== 'undefined' && hexo.base_dir) || process.cwd();
  var pub = path.join(base, 'public');
  if (!fs.existsSync(pub)) return;
  var files = walk(pub).filter(function (f) {
    return f.slice(-5) === '.html' || /[\/]js[\/].*\.js$/.test(f);
  });
  var changed = 0;
  var hits = 0;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch (e) {
      continue;
    }
    if (text.indexOf(p.prefix) === -1) continue;
    var r = rewrite(text, p.prefix, p.rel);
    if (r.n > 0) {
      fs.writeFileSync(f, r.out, 'utf8');
      changed++;
      hits += r.n;
    }
  }
  if (changed > 0) {
    hexo.log.info('[magnet-local-links] 产物兜底改写 ' + hits + ' 个磁贴链接（' + changed + ' 个文件）');
  }
}

hexo.extend.filter.register('before_exit', fixPublicDir, 1000);
hexo.extend.filter.register('before_deploy', fixPublicDir, 1000);
