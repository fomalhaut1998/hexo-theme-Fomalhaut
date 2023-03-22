### 🥝的网站目前已经开源啦！！！暂定名为**hexo-theme-Fomalhaut**，原作者网站：[www.fomal.cc](https://www.fomal.cc)，如果你喜欢的话可以帮我点一个免费的Star🌟🌟🌟哦！

### 🚧🚧🚧本开源项目并不适合纯小白，需要一定的魔改经验，因此安装之前务必对Hexo框架命令和Butterfly主题比较熟悉，不熟悉的朋友建议提前熟悉[Hexo中文文档](https://hexo.bootcss.com/docs/configuration.html)和[Butterfly主题文档](https://butterfly.js.org/)，以及熟悉本站魔改教程，别上来就问文章怎么写！！！避免各种不必要的麻烦！！！望周知！！！！！！！！！！


![](/repoPic/cover.jpg)

本源码是基于`Butterfly 4.3.1`的二次开发，暂时没做完全的主题分离，因此安装方法是整个博客的替换，建议另起一个文件夹进行安装，或备份好原来的资料再搬过来。当然你也可以不直接搬走，而是借鉴里面的部分代码写法。

### 📅📅📅3.5更新：微调部分样式，修复部分人反映手机端无法加载css样式的问题，问题在`fomal.js`的1340行附近，切换至手机端时候导致空指针异常，这部分代码注释掉即可！

```js
/* 搜索框修复 start */
// searchSize();
// window.addEventListener('resize', searchSize)
// // 搜索窗口自适应
// function searchSize() {
//   // 只需要适应手机端
//   if (document.body.clientWidth > 768) return
//   let div = document.querySelector('#algolia-hits')
//   // 监听插入，如果有插入则根据可视高度动态设置最大高度
//   div.addEventListener('DOMNodeInserted', () => {
//     div.children[0].style.maxHeight = (document.documentElement.clientHeight - 210) + 'px'
//   })
// }
/* 搜索框修复 end */
```

大家如果还遇到什么问题欢迎给作者留言，作者看到会第一时间修复哦，感谢您的支持！

### 🍡🍡🍡安装教程（演示NodeJS v16.14.0 + Hexo 6.3.0）：

1. 安装 NodeJs、Hexo、Git、注册并连接Github，此部分可参考[Hexo博客搭建基础教程(一)](https://www.fomal.cc/posts/e593433d.html)。
  PS：相当于链接教程的第1-7步，第8步就不要做了，不然会清空源码的！！！（不是新手请跳过这条）

2. 把源码打包下载到自己的电脑，然后解压缩到一个你喜欢的文件夹中

3. 在git bash命令中切换到下载的博客根目录，使用以下命令进行模块安装。这里绝不能使用`hexo init`初始化，若不慎用了，则站点的配置文件`_config.yml`内容会被重置

  ```bash
  npm i
  ```

4. 执行以下命令清空并启动项目，启动成功后再浏览器地址栏输入`localhost:4000`进行验证

  ```bash
  hexo cl; hexo g; hexo s
  ```

5. 到这里一般是没啥问题的了，当本地能成功启动后，改一下站点配置文件的`_config.yml`的`deploy`配置项，然后用以下命令部署到Github（这一步出问题的，请删除站点配置文件的`deploy`配置项与`baidu_url_submitter`的信息）

  ```bash
  hexo d
  ```

### 🌈🌈🌈简要说明文档：

- js的主体在`source/js/fomal.js`里面，做了基本分块逻辑的标注，后期整合的，以`... start`和`... end` 包裹

- css主体在`themes\butterfly\source\css\_custom\custom.css`里，与Butterfly的自带样式联合编译为一个index.css，有基本的注释

- 因为兼顾了白天夜间模式不同壁纸和用户自定义壁纸，背景的切换做在了`fomal.js`的第3190行附近，美化模块代码逻辑在`fomal.js`的第2894-3596行，四个背景分别为PC端白天、PC端黑夜、手机端白天、手机端黑夜；美化模块起点为第3356行，可以自定义任何DOM，例如按钮、滑块、开关按钮、图片框和外挂标签等（注意：外挂标签必须要被`<div id="article-container">`包含才会被渲染）

  ![](repoPic/meihua.png)

  ```js
  /* 美化模块 start */
  ...
  // 雪花开关(这里就是默认关雪花，如果你想默认开就将none改为block)
  if (localStorage.getItem("snow") == undefined) {
    localStorage.setItem("snow", "none");
  }
  ...
  // 背景图(约3190行) 下面链接换成你自己的图片链接
  document.getElementById("defineBg").innerText = `:root{
    --default-bg: url(https://lskypro.acozycotage.net/Fomalhaut/img/dm14.webp);
    --darkmode-bg:url(https://lskypro.acozycotage.net/Fomalhaut/img/yuanshen1.webp);
    --mobileday-bg: url(https://lskypro.acozycotage.net/Fomalhaut/img/snow.webp);
    --mobilenight-bg: url(https://lskypro.acozycotage.net/Fomalhaut/img/mb8.webp);
  }`;
  ...
  // 美化模块主体DOM(约3356行)
    winbox.body.innerHTML = `
    
      ...
      <h3>1. 二次元</h3>
      {% folding cyan, 查看二次元背景 %}
      <div class="bgbox">
      <a href="javascript:;" rel="noopener external nofollow" style="background-image:url(https://lskypro.acozycotage.net/Fomalhaut/img/home_bg.webp)" class="imgbox" onclick="changeBg('url(https://lskypro.acozycotage.net/Fomalhaut/img/home_bg.webp)')"></a>
      // 这里自己加图片
      </div>
      {% endfolding %}
      ...
  
    `
  ...
  /* 美化模块 end */
  
  ```

- 页脚部分请见`themes\butterfly\layout\includes\footer.pug`，包括页脚计时器、徽标、文字、布局等

- 封面图在主题配置文件`_config.butterfly.yml`的`default_cover`配置项，建议配置多项后随机刷出封面图

  ```yaml
  cover:
    # display the cover or not (是否顯示文章封面)
    index_enable: true
    aside_enable: true
    archives_enable: true
    # the position of cover in home page (封面顯示的位置)
    # left/right/both
    position: both
    # When cover is not set, the default cover is displayed (當沒有設置cover時，默認的封面顯示)
    default_cover:
      - https://source.fomal.cc/img/default_cover_14.webp
      - https://source.fomal.cc/img/default_cover_15.webp
      # ......
  ```

  

- 加载页面时中间的头像在`custom.css`约1300行附近，直接搜索替换成你自己的头像即可

  ```css
  /* heo 加载动画头像 */
  .loading-img {
    background: url(https://lskypro.acozycotage.net/LightPicture/2022/12/60e5d4e39da7c077.webp)
      no-repeat center center;
    background-size: cover;
  }
  ```

- 页脚时间由`fomal.js`控制，搜索以下代码，将网站诞生时间改为你自己的即可(示例：`2022-08-09`)

  ```js
  /* 页脚计时器 start */
  var now = new Date();
  function createtime() {
    // 当前时间
    now.setTime(now.getTime() + 1000);
    var start = new Date("08/01/2022 00:00:00"); // 旅行者1号开始计算的时间
    var dis = Math.trunc(23400000000 + ((now - start) / 1000) * 17); // 距离=秒数*速度 记住转换毫秒
    var unit = (dis / 149600000).toFixed(6);  // 天文单位
    // 网站诞生时间
    var grt = new Date("08/09/2022 00:00:00");
  ...
    let currentTimeHtml = "";
    (currentTimeHtml =
      hnum < 18 && hnum >= 9
        ? `<img class='boardsign' src='https://lskypro.acozycotage.net/Fomalhaut/badge/F小屋-科研摸鱼中.svg' title='什么时候能够实现财富自由呀~'><br> <div style="font-size:13px;font-weight:bold">本站居然运行了 ${dnum} 天 ${hnum} 小时 ${mnum} 分 ${snum} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${dis} 千米，约为 ${unit} 个天文单位 🚀</div>`
        : `<img class='boardsign' src='https://lskypro.acozycotage.net/Fomalhaut/badge/F小屋-下班休息啦.svg' title='下班了就该开开心心地玩耍~'><br> <div style="font-size:13px;font-weight:bold">本站居然运行了 ${dnum} 天 ${hnum} 小时 ${mnum} 分 ${snum} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i> <br> 旅行者 1 号当前距离地球 ${dis} 千米，约为 ${unit} 个天文单位 🚀</div>`),
      document.getElementById("workboard") &&
      (document.getElementById("workboard").innerHTML = currentTimeHtml);
  }
  ...
  
  /*页脚计时器 end */
  ```

  

- 控制台字符画，在`fomal.js`找到以下代码，并进行相应的替换，字符画可以到：[Text to ASCII Art Generator (TAAG)](https://patorjk.com/software/taag/#p=display&f=Graffiti&t=Type%20Something%20)生成

  ```js
  /* 控制台输出字符画 start */
  var now1 = new Date();
  
  function createtime1() {
    var grt = new Date("08/09/2022 00:00:00"); //此处修改你的建站时间或者网站上线时间
    now1.setTime(now1.getTime() + 250);
    var days = (now1 - grt) / 1000 / 60 / 60 / 24;
    var dnum = Math.floor(days);
  
    var ascll = [
      `欢迎来到Fomalhaut🥝の小家!`,
      `Future is now 🍭🍭🍭`,
      `
          
  ███████  ██████  ███    ███  █████  ██      ██   ██  █████  ██    ██ ████████ 
  ██      ██    ██ ████  ████ ██   ██ ██      ██   ██ ██   ██ ██    ██    ██    
  █████   ██    ██ ██ ████ ██ ███████ ██      ███████ ███████ ██    ██    ██    
  ██      ██    ██ ██  ██  ██ ██   ██ ██      ██   ██ ██   ██ ██    ██    ██    
  ██       ██████  ██      ██ ██   ██ ███████ ██   ██ ██   ██  ██████     ██   
                                                
  `,
      "小站已经苟活",
      dnum,
      "天啦!",
      "©2022 By Fomalhaut",
    ];
  
    setTimeout(
      console.log.bind(
        console,
        `\n%c${ascll[0]} %c ${ascll[1]} %c ${ascll[2]} %c${ascll[3]}%c ${ascll[4]}%c ${ascll[5]}\n\n%c ${ascll[6]}\n`,
        "color:#39c5bb",
        "",
        "color:#39c5bb",
        "color:#39c5bb",
        "",
        "color:#39c5bb",
        ""
      )
    );
  }
  
  createtime1();
  
  function createtime2() {
    var ascll2 = [`NCC2-036`, `调用前置摄像头拍照成功，识别为「大聪明」`, `Photo captured: `, ` 🤪 `];
  
    setTimeout(
      console.log.bind(
        console,
        `%c ${ascll2[0]} %c ${ascll2[1]} %c \n${ascll2[2]} %c\n${ascll2[3]}`,
        "color:white; background-color:#10bcc0",
        "",
        "",
        'background:url("https://unpkg.zhimg.com/anzhiyu-assets@latest/image/common/tinggge.gif") no-repeat;font-size:450%'
      )
    );
  
    setTimeout(console.log.bind(console, "%c WELCOME %c 欢迎光临，大聪明", "color:white; background-color:#23c682", ""));
  
    setTimeout(
      console.warn.bind(
        console,
        "%c ⚡ Powered by Fomalhaut🥝 %c 你正在访问Fomalhaut🥝の小家",
        "color:white; background-color:#f0ad4e",
        ""
      )
    );
  
    setTimeout(console.log.bind(console, "%c W23-12 %c 系统监测到你已打开控制台", "color:white; background-color:#4f90d9", ""));
    setTimeout(
      console.warn.bind(console, "%c S013-782 %c 你现在正处于监控中", "color:white; background-color:#d9534f", "")
    );
  }
  createtime2();
  ...
  /* 控制台输出字符画 end */
  ```


- 加载头像见`themes\butterfly\source\css\_custom\custom.css`下的：

  ```css
  .loading-img {
    background: url(https://lskypro.acozycotage.net/LightPicture/2022/12/60e5d4e39da7c077.webp)
      no-repeat center center;
    background-size: cover;
  }
  ```

- 文章打赏彩蛋，见主题配置文件：`_config.butterfly.yml`

  ```yml
  # Sponsor/reward
  reward:
    enable: true
    coinAudio: https://npm.elemecdn.com/akilar-candyassets@1.0.36/audio/aowu.m4a
    QR_code:
      - img: https://tuchuang.voooe.cn/images/2023/01/04/2.webp
        link:
        text: 微信
      - img: https://tuchuang.voooe.cn/images/2023/01/04/20f8e49805975b8f8.webp
        link:
        text: 支付宝
  ```

- 哔哔页面样式部分：见`source\personal\bb\index.md`：

  ```markdown
  ---
  title: 唠叨
  date: 2022-09-08 23:08:13
  comments: false
  ---
  
  <style>
  /* 哔哔页面 */
  #bibi button {
    color: #fff;
    border: 0;
    margin: 20px auto;
    border-radius: 0.3125rem;
    display: block;
    padding: 0 1rem;
    height: 40px;
    font-weight: 500;
    text-align: center;
    transition: all 0.5s ease-out;
    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
    background-size: 1000% 1000%;
    animation: Gradient 60s linear infinite;
    outline: 0;
  }
  
  #bibi .bb-info {
    font-weight: 700;
    font-size: 22px;
  }
  
  #bibi .bb-card {
    padding: 15px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #a5a5a5ee;
    margin-top: 20px;
    transition: all 0.25s;
    user-select: none;
    width: calc(48% - 7px);
    margin: 10px;
  }
  
  @media screen and (max-width: 800px) {
    #bibi .bb-card {
    width: 100%;
    }
  }
  
  #bibi .bb-card:hover {
    box-shadow: 0 5px 10px 8px #07111b29;
    transform: translateY(-3px);
  }
  
  #bibi .card-header {
    display: flex;
    align-items: center;
  }
  
  #bibi .card-header .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin-right: 10px;
    border-radius: 20px;
    overflow: hidden;
  }
  
  #bibi .card-header svg {
    height: 20px;
    width: 20px;
    margin-left: 5px;
  }
  
  #bibi .card-header .card-time {
    font-size: 12px;
    text-shadow: #d9d9d9 0 0 1px, #fffffb 0 0 1px, #fffffb 0 0 2px;
    margin-left: 10px;
  }
  
  #bibi .card-content {
    padding: 10px 0;
    white-space: pre-wrap;
  }
  
  #bibi .card-footer {
    display: flex;
    padding-bottom: 10px;
  }
  
  #bibi .card-footer .card-label {
    border-radius: 5px;
    padding: 0 5px;
    font-weight: 550;
    border-radius: 5px;
    box-shadow: inset 0 -1px 0 rgb(27 31 35 / 12%);
    font-size: 14px;
    user-select: none;
    margin-right: 10px;
  }
  
  div#bb_loading img{
    border-radius: 15px;
  }
  
  #bb-main {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  </style>
  
  <script src="/js/bibi.js"></script>
  
  <div id="bibi">
  <div class="bb-info"></div><div id="bb-main"></div>
  </div>
  
  ```

- 哔哔的API请见`source\js\bibi.js`，部署教程：[哔哔部署](https://www.fomal.cc/posts/d1927166.html#%E5%93%94%E5%93%94%E9%83%A8%E7%BD%B2)

- 欢迎信息地理位置显示，这个需要配置自己的 key，类似的还有 bibi 的配置、朋友圈等配置均需要参考相关文档改成自己的API

- 网站图标为根目录的`favicon.ico`，替换为你自己的图标即可
- 个人信息卡片的图标和菜单栏等图标，参考[博客魔改教程总结(二)](https://www.fomal.cc/posts/5389e93f.html)中的第4-7项
- 其余配置项基本与Butterfly兼容，参考[Butterfly官方文档](https://butterfly.js.org/)即可
- 遇到问题请多看相关文档(Hexo主题文档、Butterfly主题文档、店长的教程)和本站教程，若有其他疑问请加Q群：`691942826` 验证回答：`🥝开源项目`



### 项目星标概况

[![Star History Chart](https://api.star-history.com/svg?repos=fomalhaut1998/hexo-theme-Fomalhaut&type=Timeline)](https://star-history.com/#fomalhaut1998/hexo-theme-Fomalhaut&Timeline)



