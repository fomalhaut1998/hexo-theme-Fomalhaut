---
title: Hello World · 从这里开始
categories:
  - 开始使用
tags:
  - Hexo
  - Fomalhaut
cover: 'https://picsum.photos/id/1044/1200/675'
description: 这是一篇示例文章，顺手说明这套源码怎么改成你自己的站点。
comments: true
abbrlink: 8b9651a9
date: 2026-10-01 10:00:00
updated: 2026-10-01 10:00:00
---

## 你现在看到的是什么

一个跑在 **Hexo 6.3.0** 上的静态站点，主题是 **hexo-theme-Fomalhaut v1.0.1**（基于 Butterfly 4.3.1 二次开发）。
仓库里 `source/_posts/` 下只有这一篇与另一篇《外挂标签速查》作为示例，其余空位留给你自己填。

## 三步换成你自己的站

### 1. 改站点信息

打开根目录的 `_config.yml`：

```yaml
title: 你的站点名
author: 你的名字
url: https://your-domain.com/
```

### 2. 改主题配置

主题的所有开关都在根目录的 `_config.fomalhaut.yml`：

```yaml
avatar:
  img: /assets/avatar.webp      # 换成你自己的头像

social:                          # 社交链接，格式： 名称: 链接 || 图标 || 动画
  Github: https://github.com/yourname || icon-github || faa-tada

index_img: /assets/head.jpg      # 首页大图
```

### 3. 写文章、跑起来

```bash
hexo new post "我的第一篇文章"   # 在 source/_posts/ 生成
hexo server                      # 本地预览 http://localhost:4000
hexo generate && gulp            # 构建（gulp 负责压缩）
```

{% note info flat %}
根目录的 `scripts/` 与 `source/js/`、`source/css/` 是**站点级**的增强代码，和 `themes/fomalhaut/` 里的主题代码是分开的。
升级主题时只要不动 `themes/` 目录，你自己写的样式和脚本都不会丢。
{% endnote %}

## 这篇示例用到的写法

上面用到了 `{% note info flat %}...{% endnote %}` 提示块、二级/三级标题、行内代码与代码块。
更多外挂标签（时间线、标签页、画廊、按钮、折叠、Mermaid 等）见另一篇《外挂标签速查》。
