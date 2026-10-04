/* global hexo */

/**
 * 正文标记置顶
 * ---------------------------------------------------------------------------
 * 在文章正文任意位置写一行 HTML 注释即可给这篇文章置顶：
 *
 *     <!-- sticky -->      置顶       （等价于 Front-Matter 里写 sticky: 1）
 *     <!-- sticky: 2 -->   强置顶     （sticky: 2 或更大，角标样式更醒目）
 *
 * 标记会在渲染时被自动删除，不会出现在网页正文 / 摘要 / RSS / 搜索结果里。
 * 也可以在 Front-Matter 里直接写 sticky: 1（或 2、3……），两者等效；
 * Front-Matter 的值优先，正文标记只在 Front-Matter 没写时生效。
 *
 * 排序由 hexo-generator-index@2.0.0 负责（lib/generator.js）：
 *     sort(posts.data, (a, b) => (b.sticky || 0) - (a.sticky || 0));
 * 数值越大越靠前，所以不需要额外安装置顶插件。
 *
 * 角标渲染在 themes/fomalhaut/layout/includes/mixins/post-ui.pug 的
 * postStickyBadge 混入里，样式在 themes/fomalhaut/source/css/_custom/custom.css。
 *
 * 实现要点：注册在 after_post_render 且 priority = 5。
 * Hexo 的 excerpt 过滤器以默认 priority = 10 注册，所以本过滤器一定先跑，
 * 标记在任何摘要切分（<!-- more -->）之前就被剥掉了。
 */

const STICKY_MARKER = /<!--\s*sticky\s*(?::\s*(\d+)\s*)?-->/i;

function parseStickyValue(raw) {
  const matched = STICKY_MARKER.exec(raw);
  if (!matched) return null;
  const level = matched[1] ? parseInt(matched[1], 10) : 1;
  return level > 0 ? level : 1;
}

/**
 * 在正文 / 摘要 / 摘要副本里剥掉标记，顺手清掉可能留下的空段落。
 */
function stripMarker(content) {
  if (!content || content.indexOf('sticky') === -1) return content;
  return content
    .replace(STICKY_MARKER, '')
    .replace(/<p>\s*<\/p>/g, '');
}

hexo.extend.filter.register(
  'after_post_render',
  function (data) {
    // raw 是渲染前的 Markdown 源文，标记只可能出现在这里；
    // content 已渲染成 HTML，注释会被原样保留，两边都查一遍更稳妥。
    const fromRaw = data.raw ? parseStickyValue(data.raw) : null;
    const fromContent = data.content ? parseStickyValue(data.content) : null;
    const level = fromRaw !== null ? fromRaw : fromContent;
    if (level === null) return;

    if (!(data.sticky > 0)) {
      data.sticky = level;
      hexo.log.info(
        '[sticky-post] ' + (data.title || data.path) + ' 由正文标记置顶 -> sticky: ' + level
      );
    }

    if (data.raw) data.raw = stripMarker(data.raw);
    data.content = stripMarker(data.content);
    if (data.excerpt) data.excerpt = stripMarker(data.excerpt);
    if (data.more) data.more = stripMarker(data.more);
  },
  5
);
