/**
 * 上游 Butterfly 的版本号 —— 本主题 fork 自它。
 *
 * 为什么单独放一个文件：
 *   - 本主题自己的版本写在 themes/fomalhaut/package.json 的 version（hexo-theme-fomalhaut 1.0.x）；
 *   - 而 welcome.js 的启动横幅、cdn.js 拼的 jsdelivr / unpkg 地址
 *     （https://cdn.jsdelivr.net/npm/hexo-theme-butterfly@<这个版本>/...）需要的都是
 *     「上游 Butterfly」的版本号。
 *   两者混用会在主题自己升版本时把 CDN 地址一起拼错，所以这里明确分开。
 *
 * 升级 Butterfly 时改这里；README 里「基于 Butterfly x.y.z」的说明也一并改。
 */
'use strict'

module.exports = '4.3.1'
