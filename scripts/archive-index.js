/* global hexo */

/**
 * archive-index.js —— 给归档页补一份「全站文章索引」（站点级脚本，不改 themes/）
 * ---------------------------------------------------------------------------
 * 为什么需要：归档页默认每页 9 篇、共 5 页，页面上只有日期和标题。
 *   - 概览统计条要「文章总数 / 覆盖年份 / 文章最多的年份 / 年均产出」——这些是**全站**口径，
 *     只靠当前页的 DOM 算不出来（第 2 页起更明显）；
 *   - 卡片要显示分类与阅读时长，而 article-sort 的 DOM 里没有这两个信息。
 *   两者都得在构建期补数据，客户端没法凭空得到（不加额外网络请求是硬要求）。
 *
 * 做法：注册一个 after_render:html 过滤器，在归档页（page.archive 为真，含分页）
 *   </head> 前插入一行：
 *     <script type="application/json" id="ar-index">{"v":1,"posts":{"/posts/xxxx.html":{...}}}</script>
 *   内容是全站每篇文章的 { t 标题, p 路径, d 日期, c 分类, w 字数, r 阅读分钟 }。
 *   阅读时长直接复用 hexo-wordcount-fomal 的口径（中文 300 字/分、英文 160 词/分，
 *   与该插件 min2read 默认参数一致），所以和文章页顶部「阅读时长」显示的数字是同源的。
 *
 * 只读 / 只写归档页：其它页面（首页、文章页、分类页……）不插入任何东西。
 * 降级：本脚本没跑（或异常被吞）时，页面里没有 #ar-index，
 *   source/js/inject/archive-page.js 会退化成"统计条用当前页口径、卡片不显示分类与阅读时长"，
 *   排版不受影响。
 * 卸载：删掉本文件即可，不产生任何其它构建产物依赖。
 */

'use strict';

const INDEX_ID = 'ar-index';
const MAX_CAT = 12;

/**
 * 字数 / 阅读时长：直接复用 hexo-util 的 stripHTML + hexo-wordcount-fomal 的计数正则，
 * 保证与文章页顶部（themes/fomalhaut/layout/includes/header/post-info.pug:63
 * 的 min2read(page.content, {cn: 350, en: 160})）口径同源、数字对得上。
 * 注意 stripHTML 只去标签不去实体，content 里的中文实体（如 &#x5B57;）会被算进去 ——
 * 这是插件本身的既有口径，这里不额外"修正"，免得同一篇在两处显示不同数字。
 */
const stripHTML = require('hexo-util').stripHTML;

const CN_RE = /[\u4E00-\u9FA5]/g;
const WORD_RE = /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g;

/** @returns {[number, number]} [中文字数, 英文词数] */
function counter(content) {
  const text = stripHTML(String(content || ''));
  const cn = (text.match(CN_RE) || []).length;
  const en = (text.replace(CN_RE, '').match(WORD_RE) || []).length;
  return [cn, en];
}

/** 与插件 min2read 默认参数（cn:300, en:160）一致 */
function readMinutes(content) {
  const c = counter(content);
  const minutes = c[0] / 300 + c[1] / 160;
  return minutes < 1 ? 1 : Math.round(minutes);
}

/** 总字数（中文字 + 英文词），用于卡片上的"字数"提示 */
function wordCount(content) {
  const c = counter(content);
  return c[0] + c[1];
}

function firstCategory(post) {
  let name = '';
  try {
    const cats = post.categories;
    if (cats && typeof cats.each === 'function') {
      cats.each((cat) => { if (!name) name = String(cat.name || ''); });
    } else if (cats && typeof cats.toArray === 'function') {
      const arr = cats.toArray();
      if (arr.length) name = String(arr[0].name || '');
    }
  } catch (e) {
    name = '';
  }
  if (name.length > MAX_CAT) name = name.slice(0, MAX_CAT);
  return name;
}

hexo.extend.filter.register('after_render:html', function (html, data) {
  try {
    const page = data && data.page;
    if (!page || !page.archive) return html;         // 只处理归档页（含 /archives/page/N/）
    if (html.indexOf('id="' + INDEX_ID + '"') !== -1) return html;

    const posts = {};
    hexo.locals.get('posts').sort('-date').each((post) => {
      if (!post.path) return;
      const p = '/' + String(post.path).replace(/^\//, '');
      posts[p] = {
        t: String(post.title || ''),
        p: p,
        d: post.date ? post.date.format('YYYY-MM-DD') : '',
        c: firstCategory(post),
        w: wordCount(post.content),
        r: readMinutes(post.content),
      };
    });

    // 放在 <script type="application/json"> 里：写 '</script' 会提前闭合标签
    const json = JSON.stringify({ v: 1, posts: posts }).replace(/<\//g, '<\\/');
    const tag = '<script type="application/json" id="' + INDEX_ID + '">' + json + '</script>';
    return html.indexOf('</head>') !== -1
      ? html.replace('</head>', tag + '</head>')
      : html + tag;
  } catch (e) {
    hexo.log.warn('[archive-index] 生成索引失败，归档页按无索引降级：' + (e && e.message));
    return html;
  }
});
