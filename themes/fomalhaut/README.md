# hexo-theme-fomalhaut

> [hexo-theme-fomalhaut](https://github.com/fomalhaut1998/hexo-theme-fomalhaut) 的主题本体 · **v1.0.3**
> 基于 [hexo-theme-butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 4.3.1 的二次开发，沿用 Apache-2.0 协议。
> 上游版本号同时供启动横幅与 CDN 地址使用，写在 `scripts/butterfly-version.js`（主题自身版本在 `package.json` 的 `version`，两者分开）。

## 这个目录里有什么

| 目录 / 文件 | 作用 |
| --- | --- |
| `_config.yml` | 主题默认配置（**会被站点根目录的 `_config.fomalhaut.yml` 覆盖**，平时不用改这份） |
| `layout/` | Pug 模板：`index` / `post` / `page` / `archive` / `category` / `tag` + `includes/` 组件 |
| `source/css/` | Stylus 样式；站点自定义样式在 `source/css/_custom/custom.css` |
| `source/js/` | 主题脚本（`main.js` 等） |
| `scripts/tag/` | 外挂标签：`note` `tabs` `timeline` `btn` `label` `gallery` `mermaid` `flink` `hideToggle` `inlineImg` |
| `scripts/filters/` | 构建期过滤器（图片懒加载、随机封面） |
| `scripts/helpers/` | 模板助手函数（归档、分类、相关文章、echarts…） |
| `scripts/events/` | 启动事件（版本横幅、CDN 预解析、404、评论初始化） |
| `languages/` | 多语言文案 |
| `LICENSE` | 上游 Apache-2.0 许可证 |

## 安装

本主题是**整套站点**的一部分，不单独发布到 npm，安装方式就是克隆整个仓库：

```bash
git clone https://github.com/fomalhaut1998/hexo-theme-fomalhaut.git my-blog
cd my-blog && npm install && npx hexo server
```

完整说明（环境要求、每一项配置的含义与示例、部署方式）见仓库根目录的 [README.md](../README.md)。

## 主题配置

所有开关都在**站点根目录**的 `_config.fomalhaut.yml`（Hexo 5+ 的 `_config.[theme].yml` 机制）。
本目录下的 `_config.yml` 只是默认值模板，修改它不会生效。

## 授权

Apache License 2.0 —— 见 [LICENSE](./LICENSE)。本项目派生自 hexo-theme-butterfly（Copyright Jerry），保留其许可证与署名。
