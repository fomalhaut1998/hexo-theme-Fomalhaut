/* ============================================================================
 * modules/nav.js —— 导航栏 / 首屏欢迎语 / 随便逛逛 / 分享按钮
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 导航栏显示标题（37-66）—— 滚动到正文后，顶栏中间淡入文章标题（原来只有站点名）
 *   · 欢迎信息（70-165）—— 首屏打字机欢迎语，按当前时间/节日换不同问候语；window.onload 触发
 *   · 随便逛逛（504-525）—— 右下角"随便逛逛"按钮，随机跳一篇文章
 *   · 分享按钮（1237-1267）—— 文章页分享：复制链接 / 调起系统分享面板
 * ----------------------------------------------------------------------------
 * 和「顶栏 + 首屏 + 分享」有关的交互都在这。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 8 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     37  tonav()
 *     55  scrollToTop()
 *     81  getDistance(e1, n1, e2, n2)
 *     98  showWelcomeLoading()
 *    107  showWelcome()
 *    168  randomPost()
 *    191  share_()
 *    215  share()
 * ========================================================================== */

/* ------------------------------ 导航栏显示标题 ------------------------------ */
/* 原 fomal.js 37-66 行，原样搬运，未改逻辑 */
/* 导航栏显示标题 start */

document.addEventListener('pjax:complete', tonav);
document.addEventListener('DOMContentLoaded', tonav);
//响应pjax
function tonav() {
  // Replace only this module's listener; keep other scroll handlers intact.
  var $window = $(window);
  $window.off('scroll.fomalNavTitle');
  var nameContainer = document.getElementById("name-container");
  var menusItems = document.getElementsByClassName("menus_items")[1];
  var pageName = document.getElementById("page-name");
  if (!nameContainer || !menusItems || !pageName) return;

  nameContainer.setAttribute("style", "display:none");
  var position = $window.scrollTop();
  $window.on('scroll.fomalNavTitle', function () {
    var scroll = $window.scrollTop();
    if (scroll > position) {
      nameContainer.setAttribute("style", "");
      menusItems.setAttribute("style", "display:none!important");
    } else {
      menusItems.setAttribute("style", "");
      nameContainer.setAttribute("style", "display:none");
    }
    position = scroll;
  });
  //修复没有弄右键菜单的童鞋无法回顶部的问题
  pageName.innerText = document.title.split(" | Demo")[0];
}

function scrollToTop() {
  document.getElementsByClassName("menus_items")[1].setAttribute("style", "");
  document.getElementById("name-container").setAttribute("style", "display:none");
  btf.scrollToDest(0, 500);
}

/* 导航栏显示标题 end */

/* ------------------------------ 欢迎信息 ------------------------------ */
/* 原 fomal.js 70-165 行，原样搬运，未改逻辑 */
/* 欢迎信息 start */
// 用腾讯位置服务按访客 IP 粗略定位（侧栏「欢迎信息」卡片）
// ⚠️ 需要你自己的 Key：到 https://lbs.qq.com/ 申请「WebService API」Key，替换下面的 YOUR_TENCENT_MAP_KEY。
//    Key 是明文下发到浏览器的，务必在控制台把它限制到你的域名，避免配额被盗用。
//    不想要这个功能：删掉本段 $.ajax 即可，卡片会停在「欢迎信息正在加载中...」。
//get请求
$.ajax({
  type: 'get',
  url: 'https://apis.map.qq.com/ws/location/v1/ip',
  data: {
    key: 'YOUR_TENCENT_MAP_KEY',
    output: 'jsonp',
  },
  dataType: 'jsonp',
  success: function (res) {
    ipLoacation = res;
    //数据回来后立刻渲染：接口慢于 window.onload 时，原先这段欢迎信息会一直空着
    showWelcome();
  }
})
function getDistance(e1, n1, e2, n2) {
  const R = 6371
  const { sin, cos, asin, PI, hypot } = Math
  let getPoint = (e, n) => {
    e *= PI / 180
    n *= PI / 180
    return { x: cos(n) * cos(e), y: cos(n) * sin(e), z: sin(n) }
  }

  let a = getPoint(e1, n1)
  let b = getPoint(e2, n2)
  let c = hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  let r = asin(c / 2) * 2 * R
  return Math.round(r);
}

//还没拿到位置数据时先占个位：避免侧栏留一个空的蓝色盒子，也避免控制台报错
function showWelcomeLoading() {
  try {
    let el = document.getElementById("welcome-info");
    if (el && !el.innerHTML.trim()) el.innerHTML = '<b><center>欢迎信息正在加载中...</center></b>';
  } catch (err) {
    // console.log("Pjax无法获取#welcome-info元素🙄🙄🙄")
  }
}

function showWelcome() {

  //数据还没回来（接口慢或被拦截）就先显示加载提示
  if (!ipLoacation || !ipLoacation.result || !ipLoacation.result.location) {
    showWelcomeLoading();
    return;
  }

  //站长所在地坐标（示例值：北京天安门 116.397428, 39.90923）。换成你自己的经纬度，或删掉 dist 与下面这句问候里的距离部分
  let dist = getDistance(116.397428, 39.90923, ipLoacation.result.location.lng, ipLoacation.result.location.lat);
  let ad = ipLoacation.result.ad_info;
  let pos = ad.nation === "中国" ? [ad.province, ad.city, ad.district].filter(Boolean).join(" ") : ad.nation;
  let ip = ipLoacation.result.ip;
  //IPv6 动辄 30+ 字符且无空格，在每个冒号后插软换行点（<wbr>），让它能在冒号处断行而不撑破卡片
  let ipHtml = String(ip).replace(/:/g, ":<wbr>");

  //根据本地时间切换问候语
  let timeChange;
  let date = new Date();
  let hour = date.getHours();
  if (hour >= 5 && hour < 11) timeChange = "<span>上午好</span>";
  else if (hour >= 11 && hour < 13) timeChange = "<span>中午好</span>";
  else if (hour >= 13 && hour < 18) timeChange = "<span>下午好</span>";
  else if (hour >= 18 && hour < 24) timeChange = "<span>晚上好</span>";
  else timeChange = "<span>夜深了</span>";
  let clock = String(hour).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");

  try {
    //自定义文本和需要放的位置
    document.getElementById("welcome-info").innerHTML =
      `<b><center>🎉 欢迎信息 🎉</center>来自 <span style="color:var(--blue-custom)">${pos}</span> 的访客，${timeChange}，现在是 <span style="color:var(--blue-custom)">${clock}</span>，你目前距站长约 <span style="color:var(--blue-custom)">${dist}</span> 公里，IP地址：<span style="color:var(--blue-custom)">${ipHtml}</span></b>`;
  } catch (err) {
    // console.log("Pjax无法获取#welcome-info元素🙄🙄🙄")
  }
}
window.onload = showWelcome;
// 如果使用了pjax在加上下面这行代码
document.addEventListener('pjax:complete', showWelcome);
//Pjax 换页后新插入的 #welcome-info 是空的，先放加载提示（有数据时会被 showWelcome 覆盖）
document.addEventListener('pjax:complete', showWelcomeLoading);

//fomal.js 是 defer 加载的，执行时 DOM 已解析，先立刻占位
showWelcomeLoading();
//接口 10 秒还没回来就给出失败提示，免得「欢迎信息正在加载中...」一直挂着
setTimeout(function () {
  try {
    let el = document.getElementById("welcome-info");
    if (el && el.innerHTML.indexOf("正在加载中") > -1) {
      el.innerHTML = '<b><center>欢迎信息加载失败，请刷新重试🥺</center></b>';
    }
  } catch (err) { }
}, 10000);

/* 欢迎信息 end */

/* ------------------------------ 随便逛逛 ------------------------------ */
/* 原 fomal.js 504-525 行，原样搬运，未改逻辑 */
/* 随便逛逛 start */
// 随便逛逛
// sitemap 里的 <loc> 是绝对地址（域名由 _config.yml 的 url 决定），
// 直接跳转会导致本地预览 / 镜像域名下跳到生产站，所以统一转成同源相对路径。
function randomPost() {
  fetch('/baidusitemap.xml').then(res => res.text()).then(str => (new window.DOMParser()).parseFromString(str, "text/xml")).then(data => {
    const ls = [...data.querySelectorAll('url loc')].map(el => {
      try {
        const u = new URL(el.textContent.trim(), location.origin);
        return u.pathname + u.search + u.hash;
      } catch (e) { return null }
    }).filter(Boolean);
    if (!ls.length) return;
    // 发现有时会和当前页面重复，加一个判断
    let url = ls[Math.floor(Math.random() * ls.length)];
    for (let i = 0; i < 20 && url === decodeURI(location.pathname); i++) {
      url = ls[Math.floor(Math.random() * ls.length)];
    }
    location.href = url;
  })
}
/* 随便逛逛 end */

/* ------------------------------ 分享按钮 ------------------------------ */
/* 原 fomal.js 1237-1267 行，原样搬运，未改逻辑 */
/* 分享按钮 start */
// 分享本页
function share_() {
  let url = window.location.origin + window.location.pathname
  try {
    // 截取标题
    var title = document.title;
    var subTitle = title.endsWith("| Demo") ? title.substring(0, title.length - 7) : title;
    navigator.clipboard.writeText('Demo的站内分享\n标题：' + subTitle + '\n链接：' + url + '\n欢迎来访！🍭🍭🍭');
    fomalNotify({
          title: "成功复制分享信息🎉",
          message: "您现在可以通过粘贴直接跟小伙伴分享了！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 5000
        })
  } catch (err) {
    console.error('复制失败！', err);
  }
  // new ClipboardJS(".share", { text: function () { return '标题：' + document.title + '\n链接：' + url } });
  // btf.snackbarShow("本页链接已复制到剪切板，快去分享吧~")
}

// 防抖
function share() {
  debounce(share_, 300);
}

/* 分享按钮 end */
