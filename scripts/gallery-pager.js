/* global hexo */
/**
 * gallery-pager —— 相册自动分页（Hexo generator）
 *
 * 用法：相册页 front-matter 里写 gallery_per_page: 12（每页几张），
 * 正文按顺序写 ![说明](图片链接) 即可；不必手写页码、不必写 {% gallery %}。
 * 生成器会自动分页，并调用 Hexo 的 paginator helper（与主题列表页同一个 helper，
 * 样式沿用 _config.fomalhaut.yml 里注入的 #pagination 规则），页码外观与首页一致。
 *
 * - 第 1 页路径与原来相同（index.html），第 2..N 页是 p2.html / p3.html...
 *   所以旧链接（/box/gallery/photo/p7.html 之类）不会 404。
 * - 想在某处强制分页，单独一行写 <!-- pagebreak -->。
 * - 主题源码、其他配置均不需要改。
 */
'use strict';

const pagination = require('hexo-pagination');
const { readFile } = require('fs/promises');
const { join } = require('path');

const DEFAULT_PER_PAGE = 12;
const FORMAT = 'p%d.html';
const IMG_RE = /^!\[([^\]]*)\]\(\s*([^)\s]+?)(?:\s+"[^"]*")?\s*\)\s*$/;
const GALLERY_TAG_RE = /^\{%-?\s*(end)?gallery\s*-?%\}\s*$/;
const PAGEBREAK_RE = /^<!--\s*pagebreak\s*-->\s*$/i;

// 与主题 includes/pagination.pug 列表页分支完全一致的参数
const PAGER_OPTIONS = {
  prev_text: '<i class="fas fa-chevron-left fa-fw"></i>',
  next_text: '<i class="fas fa-chevron-right fa-fw"></i>',
  mid_size: 1,
  escape: false
};

function trimBlank(lines) {
  const out = lines.slice();
  while (out.length && !String(out[0]).trim()) out.shift();
  while (out.length && !String(out[out.length - 1]).trim()) out.pop();
  return out.join('\n');
}

// page.raw 是「含 YAML front-matter 的完整文件」，直接用会把 YAML 当正文渲染出来，
// 所以这里先剥掉开头的 front-matter 块（没有 front-matter 时原样返回）。
const FRONT_MATTER_RE = /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n)?/;

function stripFrontMatter(text) {
  return String(text).replace(FRONT_MATTER_RE, '');
}

async function readRaw(ctx, page) {
  if (page.raw) return stripFrontMatter(page.raw);
  const fromDisk = await readFile(join(ctx.source_dir, page.source), 'utf8');
  return stripFrontMatter(fromDisk);
}

async function buildAlbum(ctx, locals, page) {
  const perPage = Math.max(1, parseInt(page.gallery_per_page, 10) || DEFAULT_PER_PAGE);
  const raw = String(await readRaw(ctx, page)).replace(/\r\n/g, '\n');

  const before = [];
  const after = [];
  const segments = [];
  let current = [];
  let seenImage = false;

  for (const line of raw.split('\n')) {
    const text = line.trim();
    if (GALLERY_TAG_RE.test(text)) continue;
    if (PAGEBREAK_RE.test(text)) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    if (IMG_RE.test(text)) {
      current.push(text);
      seenImage = true;
      continue;
    }
    (seenImage ? after : before).push(line);
  }
  if (current.length) segments.push(current);
  if (!segments.length) return [];

  const chunks = [];
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i += perPage) chunks.push(seg.slice(i, i + perPage));
  }

  const base = page.path.replace(/[^/]*$/, '');
  const paginated = pagination(base, chunks, { perPage: 1, format: FORMAT, layout: ['page'] });
  const beforeText = trimBlank(before);
  const afterText = trimBlank(after);
  const paginator = ctx.extend.helper.get('paginator');
  const results = [];

  for (let i = 0; i < paginated.length; i++) {
    const route = paginated[i];
    const body = [
      beforeText,
      '<div class="fj-gallery">',
      chunks[i].join('\n'),
      '</div>',
      afterText
    ].filter(Boolean).join('\n\n');

    // 走 Hexo 正常的正文渲染管线：markdown -> 标签插件 -> after_post_render 过滤器
    // （主题的 post_lazyload 过滤器就在 after_post_render 里，所以图片懒加载照旧生效）
    const data = Object.assign({}, page, { content: body, engine: 'markdown' });
    const rendered = await ctx.post.render(page.source, data);
    if (rendered && !rendered.content) throw new Error(page.source + ' 渲染结果为空');

    const pager = paginator.call(
      { page: route.data, config: ctx.config, theme: ctx.theme.config, path: route.path, site: locals },
      Object.assign({}, PAGER_OPTIONS, {
        base: route.data.base,
        current: route.data.current,
        total: route.data.total,
        format: FORMAT
      })
    );

    const content = (rendered ? rendered.content : data.content)
      + '\n<nav id="pagination">\n  <div class="pagination">' + pager + '</div>\n</nav>';

    results.push({
      path: route.path,
      layout: route.layout,
      data: Object.assign({}, page, {
        content: content,
        current: route.data.current,
        total: route.data.total,
        base: route.data.base,
        prev: route.data.prev,
        next: route.data.next,
        gallery_per_page: undefined
      })
    });
  }

  ctx.log.info('gallery-pager: %s -> %d 页（每页 %d 张，共 %d 张）',
    page.source, paginated.length, perPage, chunks.reduce((n, c) => n + c.length, 0));

  return results;
}

function init(ctx) {
  const log = ctx.log || { info: function () {}, error: function () {} };
  ctx.extend.generator.register('gallery-pager', async function (locals) {
    // locals.pages 是 warehouse Query，不是数组，先物化
    const all = locals.pages && typeof locals.pages.toArray === 'function'
      ? locals.pages.toArray()
      : (locals.pages || []);
    const pages = Array.prototype.filter.call(all, function (p) { return p.gallery_per_page; });
    const routes = [];
    for (let n = 0; n < pages.length; n++) {
      const page = pages[n];
      try {
        routes.push.apply(routes, await buildAlbum(ctx, locals, page));
      } catch (err) {
        log.error('gallery-pager: %s 分页失败 - %s', page.source, err.message);
        throw err;
      }
    }
    return routes;
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend) init(hexo);
module.exports = init;
