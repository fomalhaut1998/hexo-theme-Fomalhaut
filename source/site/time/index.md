---
title: 旧时光
date: 2022-08-31 20:00:00
comments: false
---

{% timeline 主题功能里程碑 %}

<!-- timeline 2022-08 -->

1. 站点从 Butterfly 4.3.1 起步，开始第一轮美化：自定义字体、加载动画、右键菜单、鼠标指针特效

<!-- endtimeline -->

<!-- timeline 2022-10 -->

1. 首页卡片改版：文章卡片、分类磁贴、轮播图三件套成型
2. 新增友人帐、朋友圈、画廊、八音盒等独立页面

<!-- endtimeline -->

<!-- timeline 2023-03 -->

1. 主题正式从 butterfly 改名为 fomalhaut，配置文件同步为 `_config.fomalhaut.yml`

<!-- endtimeline -->

<!-- timeline 2026-10-03 -->

1. **屎山重构**：`fomal.js` 从 2973 行拆成 105 行主引导 + 10 个模块/数据文件；配置里的内联样式与脚本抽成 `site-inject.css` 与 6 个注入脚本；`custom.css` 删掉 341 行死代码并加上文件头地图

<!-- endtimeline -->

<!-- timeline 2026-10-04 -->

1. 关于页重做：顶部 Hero + 线路卡片 + 实测参数对照表，卡片右下角挂「实时延迟」徽标，可单条重测或一键重测全部
2. 配色全量改为「主题色派生」（`color-mix`），换主题色整页跟着走，不再有写死的绿色
3. 部署链路新增一键脚本 `npm run deploy:vercel`；AI 助手前端脚本带上内容版本号，改完访客不会拿到旧缓存
4. 手机端抽屉重做（独立样式表，13 个小节）：面板、字标、签名、头像、统计胶囊、菜单与二级菜单、遮罩、入场动效、深色与无障碍

<!-- endtimeline -->

<!-- timeline 2026-10-05 -->

1. 网页统计页改版，图表配色统一由主题色派生
2. 归档页时间线视图上线

<!-- endtimeline -->

<!-- timeline 2026-10 -->

1. 全站图片与字体外链改走公共 CDN（jsDelivr），不再依赖作者自建对象存储
2. 主题整理为 v1.0.0 并开源：站点配置与主题代码彻底分离，克隆即可搭建自己的站点

<!-- endtimeline -->

{% endtimeline %}

{% note info flat %}
这一页是「时间线插件」的示例：正文用 `{% raw %}{% timeline 标题 %}{% endraw %}` 包起来，每段用 `<!-- timeline 日期 -->` 与 `<!-- endtimeline -->` 括住即可。改内容不用碰主题源码。
{% endnote %}
