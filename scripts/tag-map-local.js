/*!
 * scripts/tag-map-local.js  —  把 hexo-tag-map 的 jsDelivr CDN 改写成站内自托管
 * ---------------------------------------------------------------------------
 * 背景：hexo-tag-map 1.2.0 把库地址硬编码在 node_modules/hexo-tag-map/index.js
 *       的 css_text / js_text / proj4 / proj4leaflet 常量里，全部指向
 *       https://cdn.jsdelivr.net/npm/hexo-tag-map/lib/ 。
 *       cdn.jsdelivr.net 走 Cloudflare（国内实测 520ms~1.8s，且时常不可达），
 *       是国内访问时首屏最后一个境外请求。
 *
 * 做法：这些库文件已原样复制到 source/js/tag-map/（仅把文件名里的 @ 换成 -），
 *       这里在 HTML 渲染完成后把 CDN 前缀改写为站内路径。改 node_modules 会在
 *       重装依赖时丢失，用 Hexo 的 scripts/ 插件目录则随仓库一起版本化。
 *
 * 影响面：只改写 hexo-tag-map 自己的 5 个文件路径；文章正文里出现的其它
 *         jsDelivr 链接（教程截图、友链头像）属于内容，一律不动。
 */
'use strict';

const CDN_PREFIX = 'https://cdn.jsdelivr.net/npm/hexo-tag-map/lib/';
const LOCAL_PREFIX = '/js/tag-map/';

const FILE_MAP = {
  'leaflet@1.7.1.css': 'leaflet-1.7.1.css',
  'leaflet@1.7.1.js': 'leaflet-1.7.1.js',
  'leaflet.ChineseTmsProviders@1.0.4.js': 'leaflet.ChineseTmsProviders-1.0.4.js',
  'proj4@2.4.3.js': 'proj4-2.4.3.js',
  'proj4leaflet@1.0.1.min.js': 'proj4leaflet-1.0.1.min.js'
};

hexo.extend.filter.register('after_render:html', function (html) {
  if (html.indexOf(CDN_PREFIX) === -1) return html;
  for (const src of Object.keys(FILE_MAP)) {
    html = html.split(CDN_PREFIX + src).join(LOCAL_PREFIX + FILE_MAP[src]);
  }
  return html;
});
