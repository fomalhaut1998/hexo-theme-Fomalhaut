/* ============================================================================
 * modules/console-art.js —— 控制台字符画
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 控制台输出字符画（1067-1145）—— F12 控制台里的 ASCII 字符画 + 三条 %c 彩色提示（用 console.warn 而非 log，避免被下面的策略静音）
 * ----------------------------------------------------------------------------
 * 打开 F12 才会看到的那几行 ASCII 艺术字和"你已打开控制台"提示。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 3 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     25  now1
 *     27  createtime1()
 *     71  createtime2()
 * ========================================================================== */

/* ------------------------------ 控制台输出字符画 ------------------------------ */
/* 原 fomal.js 1067-1145 行，原样搬运，未改逻辑 */
/* 控制台输出字符画 start */
var now1 = new Date();

function createtime1() {
  var grt = new Date("08/09/2022 00:00:00"); //此处修改你的建站时间或者网站上线时间
  now1.setTime(now1.getTime() + 250);
  var days = (now1 - grt) / 1000 / 60 / 60 / 24;
  var dnum = Math.floor(days);

  var ascll = [
    `欢迎来到Demoの小家!`,
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
    "©2022 By Demo",
  ];

  setTimeout(
    console.log.bind(
      console,
      `\n%c${ascll[0]} %c ${ascll[1]} %c \n%c${ascll[2]}%c ${ascll[3]}%c ${ascll[4]}\n\n%c ${ascll[5]}\n`,
      "color:#39c5bb",
      "",
      "color:#39c5bb",
      // 字符画必须用等宽字体：控制台默认等宽字体可能把 U+2588(█) 当全角渲染，
      // 方块会比字符格宽一倍，整幅画糊成一片。这里显式指定带半宽方块的等宽字体。
      "color:#39c5bb;font-family:Consolas,Menlo,Monaco,\"DejaVu Sans Mono\",\"Courier New\",monospace",
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
      "%c ⚡ Powered by Demo %c 你正在访问Demoの小家",
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

