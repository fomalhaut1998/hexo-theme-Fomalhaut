---
title: 网址导航
date: 2022-09-26 16:00:00
description: 一路攒下来的站点导航 —— AI 助手与评测、博客免费托管、图床、知识社区、实用工具与天文观测。
comments: false
---

<!--
  八宝箱 · 网址导航 —— 页面自定样式（2026-10-03 改版）
  只写在本页正文里，没有改动 themes/ 下任何主题源码。
  样式作用域限定在 #article-container 内；配色全部由站点主题色派生（color-mix），换主题色会自动跟随。
  卡片改为「圆形头像 + 标题 + 两行描述」的紧凑小卡（与友人帐页的小卡同源），原来的站点大截图在本页隐藏（display:none，配合 lazyload 也不会真正去下载图片）。
  「N 个站点」角标与页脚汇总行都是纯 CSS 计数器实现，没有额外 JS。
-->
<style>
/* ===== 变量 ===== */
#article-container {
  --nv-accent: var(--theme-color, #39c5bb);
  --nv-04: rgba(57, 197, 187, .05);
  --nv-04: color-mix(in srgb, var(--nv-accent) 5%, transparent);
  --nv-10: rgba(57, 197, 187, .11);
  --nv-10: color-mix(in srgb, var(--nv-accent) 11%, transparent);
  --nv-18: rgba(57, 197, 187, .2);
  --nv-18: color-mix(in srgb, var(--nv-accent) 20%, transparent);
  --nv-45: rgba(57, 197, 187, .45);
  --nv-45: color-mix(in srgb, var(--nv-accent) 45%, transparent);
  --nv-card: var(--card-bg, #fff);
  --nv-text: var(--font-color, #1f2937);
  --nv-muted: rgba(60, 60, 67, .58);
  --nv-muted: color-mix(in srgb, var(--font-color, #1f2937) 64%, transparent);
  --nv-line: rgba(128, 128, 128, .16);
  --nv-line: color-mix(in srgb, var(--nv-accent) 14%, transparent);
  counter-reset: nvall nvcat;
}
[data-theme="dark"] #article-container {
  --nv-card: #343434e8;
  --nv-text: rgba(255, 255, 255, .86);
  --nv-muted: rgba(255, 255, 255, .56);
  --nv-line: rgba(255, 255, 255, .13);
  --nv-04: color-mix(in srgb, var(--nv-accent) 7%, transparent);
  --nv-10: color-mix(in srgb, var(--nv-accent) 15%, transparent);
  --nv-18: color-mix(in srgb, var(--nv-accent) 24%, transparent);
}

/* ===== 页头说明条 ===== */
#article-container .nav-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px;
  padding: 15px 20px;
  border: 1px solid var(--nv-10);
  border-radius: 18px;
  background-color: var(--nv-card);
  background-image: linear-gradient(120deg, var(--nv-10), transparent 68%);
  box-shadow: 0 3px 8px 6px rgba(7, 17, 27, .03);
}
#article-container .nav-hero-ico {
  flex: 0 0 auto;
  font-size: 20px;
  line-height: 1;
}
#article-container .nav-hero-txt {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .4px;
  line-height: 1.6;
  color: var(--nv-text);
}
#article-container .nav-hero-txt em {
  font-style: normal;
  font-weight: 400;
  color: var(--nv-muted);
}

/* ===== 分类标题 ===== */
#article-container h2 {
  position: relative;
  margin: 44px 0 14px !important;
  padding: 0 0 12px !important;
  font-size: 1.22rem !important;
  font-weight: 800 !important;
  letter-spacing: .3px;
  color: var(--nv-text) !important;
  border-bottom: 1px solid var(--nv-line);
  counter-increment: nvcat;
}
#article-container h2:first-of-type { margin-top: 14px !important; }
#article-container h2::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 54px;
  height: 3px;
  border-radius: 3px;
  background: var(--nv-accent);
}

/* ===== 分类描述 ===== */
#article-container .nav-desc {
  display: block;
  margin: 0 0 16px !important;
  padding: 9px 14px !important;
  font-size: 12.5px !important;
  line-height: 1.7;
  color: var(--nv-muted) !important;
  background: var(--nv-04);
  border-left: 3px solid var(--nv-45);
  border-radius: 0 12px 12px 0;
}

/* ===== 分组托盘 ===== */
#article-container .site-card-group {
  position: relative;
  counter-reset: nvcard;
  margin: 0 0 6px !important;
  padding: 34px 14px 8px !important;
  border: 1px solid var(--nv-10);
  border-radius: 20px;
  background: var(--nv-04);
}
#article-container .site-card-group::after {
  content: counter(nvcard) " 个站点";
  position: absolute;
  top: 11px;
  right: 15px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  white-space: nowrap;
  color: var(--nv-accent);
  background: var(--nv-10);
  border-radius: 20px;
}

/* ===== 站点卡片（紧凑小卡） ===== */
#article-container .site-card {
  width: calc(100% / 3 - 16px) !important;
  margin: 8px !important;
  padding: 12px 14px !important;
  border: 1px solid var(--nv-line) !important;
  border-radius: 16px !important;
  background: var(--nv-card) !important;
  box-shadow: 0 2px 10px -7px rgba(7, 17, 27, .35);
  transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
  counter-increment: nvall nvcard;
}
#article-container a.site-card:hover {
  color: inherit !important;
  background: var(--nv-card) !important;
  border-color: var(--nv-45) !important;
  box-shadow: 0 14px 26px -18px var(--nv-45), 0 3px 10px -8px rgba(7, 17, 27, .3) !important;
  transform: translateY(-4px);
}
/* 原站点大截图：本页不再使用 */
#article-container .site-card .img { display: none !important; }

/* ===== 卡片信息区：头像 + 标题 + 描述 ===== */
#article-container .site-card .info {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 11px;
  align-items: center;
  margin-top: 0 !important;
}
#article-container .site-card .info > a,
#article-container .site-card .info > img {
  display: block;
  grid-row: 1 / span 2;
  align-self: center;
  width: 44px;
  height: 44px;
  pointer-events: none; /* 主题的图片灯箱会给头像自动套一层 <a>，这里让它不抢卡片的跳转 */
}
#article-container .site-card .info img {
  width: 44px !important;
  height: 44px !important;
  margin: 0 !important;
  float: none !important;
  border-radius: 50% !important;
  object-fit: cover;
  background: var(--nv-04);
  box-shadow: 0 0 0 2px var(--nv-10);
}
/* 少数站点的 favicon 已经 404：给加载失败的图一个体面的占位，而不是空白圈 */
#article-container .site-card .info img.error {
  background-color: var(--nv-10);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2339c5bb' stroke-width='1.7' stroke-linecap='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 20px 20px;
}
#article-container .site-card .info .title {
  grid-column: 2;
  display: -webkit-box !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.4;
  color: var(--nv-text) !important;
}
#article-container .site-card .info .desc {
  grid-column: 2;
  display: -webkit-box !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 3px;
  font-size: 12px !important;
  line-height: 1.5;
  color: var(--nv-muted) !important;
}
#article-container .site-card:hover .info .title { color: var(--nv-accent) !important; }

/* 万一某个站点没填头像，别留一列空位 */
#article-container .site-card .info:not(:has(img)) { grid-template-columns: minmax(0, 1fr); }

/* ===== 页脚汇总 ===== */
#article-container .nav-foot {
  margin: 26px 0 4px !important;
  text-align: center;
  font-size: 12px !important;
  letter-spacing: 1px;
  color: var(--nv-muted) !important;
}
#article-container .nav-foot::before {
  content: "— 共 " counter(nvall) " 个站点 · " counter(nvcat) " 个分类 —";
}

/* ===== 小屏 ===== */
@media screen and (min-width: 2048px) {
  #article-container .site-card { width: calc(100% / 4 - 16px) !important; }
}
@media screen and (max-width: 1200px) {
  #article-container .site-card { width: calc(100% / 2 - 16px) !important; }
}
@media screen and (max-width: 768px) {
  #article-container .nav-hero { padding: 13px 16px; border-radius: 15px; }
  #article-container .nav-hero-txt { font-size: 13px; }
  #article-container h2 { margin-top: 34px !important; font-size: 1.1rem !important; }
  /* 标题的左内边距在上面被归零，而风车图标的负 margin 是全局的（-1.35rem ≈ 21.6px），
     窄屏卡片左内边距只有 14px 兜不住 → 图标被顶出卡片、在手机视口里被裁掉。
     这里补回 1.6rem（> 1.35rem），图标就稳定落在标题盒内部；下划线跟着文字一起右移。 */
  #article-container h2 { padding-left: 1.6rem !important; }
  #article-container h2::after { left: 1.6rem; }
  #article-container .nav-desc { padding: 8px 12px !important; font-size: 12px !important; }
  #article-container .site-card-group { padding: 30px 8px 4px !important; border-radius: 16px; }
  #article-container .site-card .info img { width: 40px !important; height: 40px !important; }
}
@media screen and (max-width: 560px) {
  #article-container .site-card { width: calc(100% - 16px) !important; }
}
</style>

<div class="nav-hero">
  <span class="nav-hero-ico">🧭</span>
  <span class="nav-hero-txt">一路攒下来的站点 <em>— 能聊天的、能查榜的、能存图的、能抬头看星星的，点开就能用</em></span>
</div>

## 1. AI 助手与评测

<p class="nav-desc">🤖 常用几家放在前头，后面跟上各家评测榜 —— 谁强谁弱，看榜说话</p>

{% sitegroup %}
{% site ChatGPT, url=https://chatgpt.com/, avatar=/box/nav/icons/chatgpt.ico, description=OpenAI 家的门面，写代码查资料都稳 %}
{% site Claude, url=https://claude.ai/, avatar=/box/nav/icons/claude.png, description=长文和代码读得最细，写文档顺手 %}
{% site Gemini, url=https://gemini.google.com/, avatar=/box/nav/icons/gemini.png, description=谷歌出品，联网搜资料、看图都行 %}
{% site DeepSeek, url=https://chat.deepseek.com/, avatar=/box/nav/icons/deepseek.svg, description=国产开源模型，推理和数学很能打 %}
{% site Kimi, url=https://www.kimi.com/, avatar=/box/nav/icons/kimi.ico, description=超长文档丢进去直接问，网页也能读 %}
{% site 通义千问, url=https://www.tongyi.com/, avatar=/box/nav/icons/qwen.png, description=阿里 Qwen，中文问答与文档处理 %}
{% site 腾讯元宝, url=https://yuanbao.tencent.com/, avatar=/box/nav/icons/yuanbao.ico, description=接微信生态，公众号文章直接喂它 %}
{% site Grok, url=https://grok.com/, avatar=/box/nav/icons/grok.svg, description=xAI 出品，实时刷 X 上的动静 %}
{% site LMArena, url=https://lmarena.ai/, avatar=/box/nav/icons/lmarena.png, description=大模型盲测对战榜，投票投出来的名次 %}
{% site Artificial Analysis, url=https://artificialanalysis.ai/, avatar=/box/nav/icons/artificialanalysis.ico, description=智商、价格、速度放一张表里对比 %}
{% site ARC Prize, url=https://arcprize.org/, avatar=/box/nav/icons/arcprize.png, description=ARC-AGI 基准，专考模型会不会举一反三 %}
{% site LiveBench, url=https://livebench.ai/, avatar=/box/nav/icons/livebench.ico, description=每个月换新题的榜，防止选手刷题 %}
{% site SuperCLUE, url=https://www.superclueai.com/, avatar=/box/nav/icons/superclue.png, description=中文大模型测评，国产选手横评 %}
{% site OpenCompass 司南, url=https://opencompass.org.cn/, avatar=/box/nav/icons/opencompass.svg, description=上海 AI 实验室的开源评测体系 %}
{% endsitegroup %}

## 2. 博客托管

<p class="nav-desc">🚀 都免备案、都有免费额度，Hexo 生成的静态站推上去就能跑</p>

{% sitegroup %}
{% site Cloudflare Pages, url=https://pages.cloudflare.com/, avatar=/box/nav/icons/cfpages.png, description=免费不限流量，每月 500 次构建 %}
{% site GitHub Pages, url=https://pages.github.com/, avatar=/box/nav/icons/ghpages.ico, description=老牌免费，仓库一推就自动发布 %}
{% site EdgeOne Pages, url=https://pages.edgeone.ai/, avatar=/box/nav/icons/edgeone.png, description=腾讯出品，国内节点快，免备案 %}
{% site Vercel, url=https://vercel.com/, avatar=/box/nav/icons/vercel.png, description=Hobby 计划免费，每月 100GB 流量 %}
{% site Netlify, url=https://www.netlify.com/, avatar=/box/nav/icons/netlify.ico, description=免费 100GB 流量加 300 分钟构建 %}
{% site GitLab Pages, url=https://docs.gitlab.com/user/project/pages/, avatar=/box/nav/icons/gitlab.svg, description=私有仓库也能免费发静态站 %}
{% site Render, url=https://render.com/, avatar=/box/nav/icons/render.svg, description=静态站点永久免费，自动配 HTTPS %}
{% site Surge, url=https://surge.sh/, avatar=/box/nav/icons/surge.png, description=命令行一条 surge 就发布，极简 %}
{% site Firebase Hosting, url=https://firebase.google.com/products/hosting, avatar=/box/nav/icons/firebase.png, description=谷歌托管，每月 10GB 存储免费 %}
{% site Zeabur, url=https://zeabur.com/, avatar=/box/nav/icons/zeabur.svg, description=中文界面友好，注册就有免费额度 %}
{% endsitegroup %}

## 3. 图床服务

<p class="nav-desc">🖼️ 写博客总得外链图片 —— 这些都是国内能直连的免费图床，实测正常</p>

{% sitegroup %}
{% site PICUI 图床, url=https://picui.cn/, avatar=/box/nav/icons/picui.ico, description=公益图床，注册后不限量，接口开放 %}
{% site 图床小镇, url=https://imgbed.cn/, avatar=/box/nav/icons/imgbed.ico, description=免登录直接传，单图 100MB，还收视频和 ZIP %}
{% site 路过图床, url=https://imgchr.com/, avatar=/box/nav/icons/imgchr.png, description=老牌免费图床，免注册，单图 10MB %}
{% site img.loc, url=https://imgloc.com/, avatar=/box/nav/icons/imgloc.png, description=匿名可传，一次排队 5 张、每小时 60 张 %}
{% site ImageHub 图仓, url=https://imagehub.cc/, avatar=/box/nav/icons/imagehub.png, description=公益图床，游客也能传，单图 5MB %}
{% site 西洋图床, url=https://imgsea.com/, avatar=/box/nav/icons/imgsea.ico, description=免注册可用，单图 10MB，注册后功能更全 %}
{% site 水墨图床, url=https://img.ink/, avatar=/box/nav/icons/ink.ico, description=单图 12MB、一次 50 张，禁止商用 %}
{% site Imgos 图床, url=https://imgos.cn/, avatar=/box/nav/icons/imgos.ico, description=注册后可用，国内 CDN 快 %}
{% site PicGo 图床, url=https://picgo.net/, avatar=/box/nav/icons/picgonet.png, description=在线版，单图 25MB，建议注册 %}
{% site 聚合图床, url=https://www.superbed.cn/, avatar=/box/nav/icons/superbed.ico, description=一个接口聚合多家图床，直链稳，支持 API %}
{% endsitegroup %}

## 4. 知识社区

<p class="nav-desc">💬 问答、股票、技术、资讯 —— 想找人聊两句、看看别人在想什么，来这儿</p>

{% sitegroup %}
{% site 知乎, url=https://www.zhihu.com/, avatar=/box/nav/icons/zhihu.png, description=中文问答主场，搜问题先看这里 %}
{% site 哔哩哔哩, url=https://www.bilibili.com/, avatar=/box/nav/icons/bilibili.png, description=学习区和科技区当免费公开课看，弹幕陪着不困 %}
{% site 雪球, url=https://xueqiu.com/, avatar=/box/nav/icons/xueqiu.ico, description=股民聊股票的地方，行情和吐槽一起看 %}
{% site V2EX, url=https://www.v2ex.com/, avatar=/box/nav/icons/v2ex.jpg, description=程序员的深夜茶馆，聊技术也聊生活 %}
{% site LinuxDo, url=https://linux.do/, avatar=/box/nav/icons/linuxdo.png, description=技术社区新秀，搞 AI 和爱折腾的人多 %}
{% site 少数派, url=https://sspai.com/, avatar=/box/nav/icons/sspai.ico, description=讲效率工具和数字生活，写得很认真 %}
{% site 掘金, url=https://juejin.cn/, avatar=/box/nav/icons/juejin.png, description=中文技术文章集散地，前端后端都有 %}
{% site 律动 BlockBeats, url=https://www.theblockbeats.info/, avatar=/box/nav/icons/blockbeats.png, description=区块链新闻，币圈动静更新得快 %}
{% site 奇客 Solidot, url=https://www.solidot.org/, avatar=/box/nav/icons/solidot.ico, description=老牌科技新闻站，一条一句，看得快 %}
{% site Reddit, url=https://www.reddit.com/, avatar=/box/nav/icons/reddit.png, description=国外版贴吧，什么话题都有人接 %}
{% site X（原 Twitter）, url=https://x.com/, avatar=/box/nav/icons/x.png, description=全球实时信息流，科技圈和媒体都在这儿首发 %}
{% site Hacker News, url=https://news.ycombinator.com/, avatar=/box/nav/icons/hackernews.ico, description=硅谷技术圈风向标，英文原味 %}
{% endsitegroup %}

## 5. 实用工具

<p class="nav-desc">🧰 压图片、转 PDF、传大文件、画流程图，用完即走不用装</p>

{% sitegroup %}
{% site TinyPNG, url=https://tinypng.com/, avatar=/box/nav/icons/tinypng.png, description=图片压缩神器，拖进去就小一半 %}
{% site Squoosh, url=https://squoosh.app/, avatar=/box/nav/icons/squoosh.ico, description=谷歌开源，压缩前后左右对比着看 %}
{% site Photopea, url=https://www.photopea.com/, avatar=/box/nav/icons/photopea.png, description=网页里的 PS，能直接打开 PSD %}
{% site iLovePDF, url=https://www.ilovepdf.com/zh-cn, avatar=/box/nav/icons/ilovepdf.png, description=PDF 转 Word、合并、拆分、加水印 %}
{% site Smallpdf, url=https://smallpdf.com/cn, avatar=/box/nav/icons/smallpdf.ico, description=PDF 与 Office 互转，界面最清爽 %}
{% site CloudConvert, url=https://cloudconvert.com/, avatar=/box/nav/icons/cloudconvert.png, description=两百多种格式互转，什么都能转 %}
{% site 奶牛快传, url=https://cowtransfer.com/, avatar=/box/nav/icons/cowtransfer.png, description=大文件传得快，不登录也能发 %}
{% site 文叔叔, url=https://www.wenshushu.cn/, avatar=/box/nav/icons/wenshushu.ico, description=免费传文件，单文件最大 5GB %}
{% site WeTransfer, url=https://wetransfer.com/, avatar=/box/nav/icons/wetransfer.png, description=国际老牌，发链接给谁都认 %}
{% site Coolors, url=https://coolors.co/, avatar=/box/nav/icons/coolors.png, description=一键生成配色方案，锁色调色很爽 %}
{% site ray.so, url=https://ray.so/, avatar=/box/nav/icons/rayso.ico, description=把代码贴进去生成好看的截图 %}
{% site Excalidraw, url=https://excalidraw.com/, avatar=/box/nav/icons/excalidraw.ico, description=手绘风流程图，随手画两笔就成 %}
{% site draw.io, url=https://app.diagrams.net/, avatar=/box/nav/icons/diagrams.png, description=免费专业的流程图和架构图工具 %}
{% site Regex101, url=https://regex101.com/, avatar=/box/nav/icons/regex101.png, description=正则在线调试，每步匹配都讲清楚 %}
{% site ITDOG, url=https://www.itdog.cn/, avatar=/box/nav/icons/itdog.png, description=全国节点 ping、测速与网站检测 %}
{% site 草料二维码, url=https://cli.im/, avatar=/box/nav/icons/cliim.ico, description=生成二维码，还能做活码和表单 %}
{% site PicGo, url=https://picgo.app/, avatar=/box/nav/icons/picgo.ico, description=开源图床上传客户端，拖一下就传好 %}
{% site PicList, url=https://piclist.cn/, avatar=/box/nav/icons/piclist.png, description=PicGo 增强版，加水印、改格式都行 %}
{% endsitegroup %}

## 6. 仰望星空

<p class="nav-desc">🔭 光污染、星图、云图、风场，外加正往天上扔火箭的那几家</p>

{% sitegroup %}
{% site SpaceX, url=https://www.spacex.com/, avatar=/box/nav/icons/spacex.png, description=星舰与猎鹰的发射直播、任务档案都在这儿 %}
{% site 全球光污染地图, url=https://www.lightpollutionmap.info/, avatar=/box/nav/icons/lightpollution.ico, description=查你家附近的光污染等级，观星必备 %}
{% site Stellarium Web, url=https://stellarium-web.org/, avatar=/box/nav/icons/stellariumweb.ico, description=浏览器里的星图，抬头对着看 %}
{% site Stellarium, url=https://stellarium.org/, avatar=/box/nav/icons/stellarium.ico, description=开源桌面星象馆，能模拟一万年 %}
{% site Heavens-Above, url=https://heavens-above.com/, avatar=/box/nav/icons/heavensabove.ico, description=查空间站和卫星几点几分过境 %}
{% site 天文通, url=https://laysky.com/, avatar=/box/nav/icons/tianwentong.ico, description=中文观星助手，云量光污染一起看 %}
{% site NASA Worldview, url=https://worldview.earthdata.nasa.gov/, avatar=/box/nav/icons/worldview.png, description=NASA 卫星影像，看全球实时变化 %}
{% site Zoom Earth, url=https://zoom.earth/, avatar=/box/nav/icons/zoomearth.ico, description=实时卫星云图，台风从哪来一目了然 %}
{% site earth.nullschool, url=https://earth.nullschool.net/, avatar=/box/nav/icons/nullschool.png, description=全球风场洋流可视化，美到想截图 %}
{% site Windy, url=https://www.windy.com/, avatar=/box/nav/icons/windy.png, description=风、雨、云、浪，天气预报里最好看 %}
{% site Ventusky, url=https://www.ventusky.com/, avatar=/box/nav/icons/ventusky.png, description=天气动图，气温气压一层层叠 %}
{% site NASA Eyes, url=https://eyes.nasa.gov/, avatar=/box/nav/icons/nasaeyes.svg, description=NASA 官方可视化，跟着探测器飞 %}
{% site Clear Outside, url=https://clearoutside.com/, avatar=/box/nav/icons/clearoutside.png, description=按小时报观星天气，专为拍星党做 %}
{% site SunCalc, url=https://www.suncalc.org/, avatar=/box/nav/icons/suncalc.ico, description=日出日落与银河月亮方位一目了然 %}
{% endsitegroup %}

<p class="nav-foot"></p>

