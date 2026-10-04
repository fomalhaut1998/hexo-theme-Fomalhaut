---
title: 友人帐
date: 2022-08-10 15:39:15
type: "link"
---

<!--
  友人帐 · 页面自定样式（2026-10-03 改版）
  只写在本页正文里，没有改动 themes/ 下任何主题源码。
  作用域统一限定在 article-container 里的 flink 容器内，不影响站内其它页面。
  配色全部由站点主题色派生（color-mix），换主题色会自动跟随。
  说明：分类标题 h2 与分组托盘 site-card-group 的数量角标、页脚汇总行都是纯 CSS 计数器实现的，没有额外 JS。
-->
<style>
/* ===== 变量 ===== */
#article-container .flink {
  --fkl-accent: var(--theme-color, #39c5bb);
  --fkl-04: rgba(57, 197, 187, .05);
  --fkl-04: color-mix(in srgb, var(--fkl-accent) 5%, transparent);
  --fkl-10: rgba(57, 197, 187, .11);
  --fkl-10: color-mix(in srgb, var(--fkl-accent) 11%, transparent);
  --fkl-18: rgba(57, 197, 187, .2);
  --fkl-18: color-mix(in srgb, var(--fkl-accent) 20%, transparent);
  --fkl-45: rgba(57, 197, 187, .45);
  --fkl-45: color-mix(in srgb, var(--fkl-accent) 45%, transparent);
  --fkl-card: var(--card-bg, #fff);
  --fkl-text: var(--font-color, #1f2937);
  --fkl-muted: rgba(60, 60, 67, .58);
  --fkl-muted: color-mix(in srgb, var(--font-color, #1f2937) 62%, transparent);
  --fkl-line: rgba(128, 128, 128, .16);
  --fkl-line: color-mix(in srgb, var(--fkl-accent) 13%, transparent);
  counter-reset: fklall fklcat;
}
[data-theme="dark"] #article-container .flink {
  --fkl-card: #343434e8;
  --fkl-text: rgba(255, 255, 255, .86);
  --fkl-muted: rgba(255, 255, 255, .56);
  --fkl-line: rgba(255, 255, 255, .13);
  --fkl-04: color-mix(in srgb, var(--fkl-accent) 7%, transparent);
  --fkl-10: color-mix(in srgb, var(--fkl-accent) 15%, transparent);
  --fkl-18: color-mix(in srgb, var(--fkl-accent) 24%, transparent);
}

/* ===== 页头 ===== */
#article-container .flink::before {
  content: "✿ 友人帐 · 这里是我在互联网上认识的朋友们";
  display: block;
  margin: 0 0 8px;
  padding: 15px 20px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--fkl-text);
  background-color: var(--fkl-card);
  background-image: linear-gradient(120deg, var(--fkl-10), transparent 68%);
  border: 1px solid var(--fkl-10);
  border-radius: 18px;
  box-shadow: 0 3px 8px 6px rgba(7, 17, 27, .03);
}

/* ===== 分类标题 ===== */
#article-container .flink h2 {
  position: relative;
  margin: 44px 0 14px !important;
  padding: 0 0 12px !important;
  font-size: 1.22rem !important;
  font-weight: 800 !important;
  letter-spacing: .3px;
  color: var(--fkl-text) !important;
  border-bottom: 1px solid var(--fkl-line);
  counter-increment: fklcat;
}
#article-container .flink h2:first-of-type { margin-top: 10px !important; }
#article-container .flink h2::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 54px;
  height: 3px;
  border-radius: 3px;
  background: var(--fkl-accent);
}

/* ===== 分类描述 ===== */
#article-container .flink .flink-desc {
  display: block;
  margin: 0 0 16px !important;
  padding: 9px 14px !important;
  font-size: 12.5px !important;
  line-height: 1.7;
  color: var(--fkl-muted) !important;
  background: var(--fkl-04);
  border-left: 3px solid var(--fkl-45);
  border-radius: 0 12px 12px 0;
}

/* ===== 分组托盘 ===== */
#article-container .flink .site-card-group {
  position: relative;
  counter-reset: fklcard;
  margin: 0 0 6px !important;
  padding: 32px 14px 6px !important;
  border: 1px solid var(--fkl-10);
  border-radius: 20px;
  background: var(--fkl-04);
}
#article-container .flink .site-card-group::after {
  content: counter(fklcard) " 位";
  position: absolute;
  top: 10px;
  right: 14px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  white-space: nowrap;
  color: var(--fkl-accent);
  background: var(--fkl-10);
  border-radius: 20px;
}

/* ===== 站点卡片 ===== */
#article-container .flink .site-card {
  display: block;
  padding: 8px !important;
  border: 1px solid var(--fkl-line) !important;
  border-radius: 16px !important;
  background: var(--fkl-card) !important;
  box-shadow: 0 2px 10px -7px rgba(7, 17, 27, .35);
  transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
  counter-increment: fklall fklcard;
}
#article-container .flink a.site-card:hover {
  color: inherit !important;
  background: var(--fkl-card) !important;
  border-color: var(--fkl-45) !important;
  box-shadow: 0 14px 26px -18px var(--fkl-45), 0 3px 10px -8px rgba(7, 17, 27, .3) !important;
  transform: translateY(-4px);
}
#article-container .flink .site-card .img {
  height: auto !important;
  aspect-ratio: 16 / 10;
  border-radius: 11px !important;
  box-shadow: none !important;
  background: var(--fkl-04);
}
#article-container .flink .site-card:hover .img { box-shadow: none !important; }
#article-container .flink .site-card .img img { transition: transform .6s ease; }
#article-container .flink .site-card:hover .img img { transform: scale(1.05); }

/* ===== 卡片信息区（头像 + 标题 + 描述，网格两列） ===== */
#article-container .flink .site-card .info {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
  margin-top: 10px !important;
}
#article-container .flink .site-card .info img {
  grid-row: 1 / span 2;
  width: 42px !important;
  height: 42px !important;
  margin: 0 !important;
  float: none !important;
  border-radius: 50% !important;
  object-fit: cover;
  background: var(--fkl-04);
  box-shadow: 0 0 0 2px var(--fkl-10);
}
#article-container .flink .site-card .info .title {
  grid-column: 2;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.4;
  color: var(--fkl-text) !important;
  -webkit-line-clamp: 1;
}
#article-container .flink .site-card .info .desc {
  grid-column: 2;
  margin-top: 3px;
  font-size: 12px !important;
  line-height: 1.5;
  color: var(--fkl-muted) !important;
  -webkit-line-clamp: 2;
}
#article-container .flink .site-card:hover .info .title { color: var(--fkl-accent) !important; }
#article-container .flink .site-card:hover .info .desc { color: var(--fkl-muted) !important; }

/* ===== 紧凑小卡（无站点截图的分类） ===== */
#article-container .flink .site-card.mini-link {
  height: auto !important;
  min-height: 76px;
  padding: 11px 12px !important;
  background: var(--fkl-card) !important;
}
#article-container .flink a.site-card.mini-link:hover {
  border-radius: 12px !important;
  padding: 11px 12px !important;
  scale: 1;
}
#article-container .flink .site-card.mini-link .info { margin-top: 0 !important; }
#article-container .flink .site-card.mini-link .info img {
  width: 38px !important;
  height: 38px !important;
}

/* ===== 页脚汇总 ===== */
#article-container .flink::after {
  content: "— 共 " counter(fklall) " 位朋友 · " counter(fklcat) " 个分类 —";
  display: block;
  margin: 26px 0 4px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--fkl-muted);
}

/* ===== 小屏 ===== */
@media screen and (max-width: 768px) {
  #article-container .flink::before { padding: 13px 16px; font-size: 13px; border-radius: 15px; }
  #article-container .flink h2 { margin-top: 34px !important; font-size: 1.1rem !important; }
  /* 标题的左内边距在上面被归零，而风车图标的负 margin 是全局的（-1.35rem ≈ 21.6px），
     窄屏卡片左内边距只有 14px 兜不住 → 图标被顶出卡片、在手机视口里被裁掉。
     这里补回 1.6rem（> 1.35rem），图标就稳定落在标题盒内部；下划线跟着文字一起右移。 */
  #article-container .flink h2 { padding-left: 1.6rem !important; }
  #article-container .flink h2::after { left: 1.6rem; }
  #article-container .flink .flink-desc { padding: 8px 12px !important; font-size: 12px !important; }
  #article-container .flink .site-card-group { padding: 28px 8px 2px !important; border-radius: 16px; }
  #article-container .flink .site-card .info img { width: 36px !important; height: 36px !important; }
}
</style>




## 本站友链添加方式：
{% tabs link %}
<!-- tab 🙋 butterfly-💭candy -->
```yml
    - name: Demo
      link: https://example.com/
      avatar: https://picsum.photos/id/1016/1200/675
      descr: Future is now 🍭🍭🍭
      siteshot: https://picsum.photos/id/1039/800/450
```
<!-- endtab -->

<!-- tab 🥗Volantis -->
```JSON
{
  "title": "Demo",
  "screenshot": "https://picsum.photos/id/1039/800/450",
  "url": "https://example.com/",
  "avatar": "https://picsum.photos/id/1016/1200/675",
  "description": "Future is now 🍭🍭🍭",
  "keywords": "Demo"
}
```
<!-- endtab -->

<!-- tab 🌴General -->

| 名称       | 数值                                                         |
| ---------- | ------------------------------------------------------------ |
| 站点名称   | Demo                                                   |
| 站点截图   | https://picsum.photos/id/1039/800/450 |
| 站点链接   | https://example.com/                                        |
| 站长头像   | https://picsum.photos/id/1016/1200/675                         |
| 站点描述   | Future is now🍭🍭🍭                         |
| 站点关键词 | Demo,个人博客,代码                                     |

<!-- endtab -->
{% endtabs %}


## 加入本站友链方式
参照以下格式留言即可
```YML
- name: #站点名称
  link: #站点链接
  avatar: #站长头像
  descr: #站点描述
  siteshot: #站点截图 
```
头像图片尽量控制在50KB以内，必须提供头像图片链接，否则将使用默认头像。
站点截图可以自己提供，尺寸尽量不要大于 600*600，图片压缩后最好小于200KB。
未提供站点预览图的，本站会根据贵站链接调用以下 API 自动获取贵站的站点截图。
对于做了反扒措施的站点，API 获取的将是反扒页面，望知悉。
站点截图建议使用以下 API 获取以匹配本站样式
有部分朋友的截图体积过大影响加载速度，后面一律采用小体积截图代替望周知
```markdown
https://image.thum.io/get/allowJPG/wait/20/width/600/crop/950/https://<你的域名>/
```

{% note primary flat %}
🎉本站支持交换友链，在您提出申请之前，请将本站添加至友链
🥗为了保障本站用户，本站仅支持个人网站的友链申请
🍧申请本站友链需要拥有独立域名（非免费域名），建议开启全站HTTPS
🥫如果友情链接已经添加，请保持网站的正常访问，会定期清理僵尸网站
🍖网站有一定的实质性内容和主题，不能是空壳网站和练手网站
💕感谢您对本站的支持，如果您已经满足上述要求，请在下方表单提交友链申请~~~
{% endnote %}

<div class="addBtn"><button onclick="leonus.linkCom()"><i class="fa-solid fa-circle-plus"></i>快速申请 (默认样式)</button> <button onclick="leonus.linkCom(&quot;bf&quot;)"><i class="fa-solid fa-circle-plus"></i>快速申请 (Butterfly)</button></div>
<link rel="stylesheet" href="/css/kslink.css">
<script src="/js/kslink.js"></script>