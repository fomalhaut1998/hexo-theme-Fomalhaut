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

1. 首屏关键链：给默认正文字体补 `preload`（浏览器不用再等 CSS 解析完才发现字体）；夜间默认壁纸统一到与 JS 逐字一致的地址，避免同一张图下两份
2. 动画生命周期：雪花 / 星空从「不可见就跳过绘制」升级为「不可见即退出 rAF」，恢复交给失效回调；帧率监测改成「面板开着才起循环」，采样封装成带 generation 的闭包
3. 滚动监听：修掉 `window.scroll = () => btf.throttle(fn, 200)()` 这种「工厂 + 当场调用」的假节流；`btf.throttle` 补 `cancel()`；pjax 清理里统一解绑
4. 指针与滚动读写分离：小猫咪的指针输入只记最新值、下一帧先读几何再增量写；手机端自绘滚动条把测量放在读阶段、创建与写入放在写阶段
5. 评论区重做：三张独立白卡浮在压灰一档的面板上，配整块焦点环（`source/css/twikoo.css`）
6. 侧栏作者卡加回形针装饰（新增 `source/css/paperclip.css`，白天细长蓝白款 / 夜间冰蓝夜光）
7. 新增 4 个 `node:test` 回归脚本（光标效果、帧率生命周期、手机滚动条、滚动监听），可用环境变量指向 `bak/` 里的基线做前后对比（`tools/tests/`）
8. 清理 13 个死文件（`leaves.js` / `bibi.js` / `love.js`、tag-map 的 proj4 两条、`local-search.js`、`tw_cn.js`、旧 gulp 素材等）

<!-- endtimeline -->

<!-- timeline 2026-10 -->

1. 全站图片与字体外链改走公共 CDN（jsDelivr），不再依赖作者自建对象存储
2. 主题整理为 v1.0.0 并开源：站点配置与主题代码彻底分离，克隆即可搭建自己的站点

<!-- endtimeline -->

{% endtimeline %}

{% note info flat %}
这一页是「时间线插件」的示例：正文用 `{% raw %}{% timeline 标题 %}{% endraw %}` 包起来，每段用 `<!-- timeline 日期 -->` 与 `<!-- endtimeline -->` 括住即可。改内容不用碰主题源码。
{% endnote %}
