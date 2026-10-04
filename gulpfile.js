// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);

//用到的各个插件
var gulp = require('gulp');
var cleanCSS = require('gulp-clean-css');
var htmlmin = require('gulp-html-minifier-terser');
var htmlclean = require('gulp-htmlclean');
// gulp-tester
var terser = require('gulp-terser');
// 压缩js
gulp.task('compress', () => {
  // 必须 return 这条 stream：不 return 的话 gulp 会认为任务已结束，
  // 可能在 terser 还没写完 public 时就退出，导致 JS 压缩结果时有时无。
  // [2026-10-03 重构] 原写法漏了 return，且声明了 async 却没有 await。
  return gulp.src(['./public/**/*.js', '!./public/**/*.min.js'])
    .pipe(terser())
    .pipe(gulp.dest('./public'));
});
gulp.task('minify-css', () => {
  // 【2026-10-04 修复】排除含 @container 的两个文件。
  // 现象：本地 hexo server 正常，部署后公告栏样式差一点。
  // 原因：clean-css 0.x（compatibility:'ie11'）不认识 CSS 容器查询 —— 它会把
  //   @container 包裹整个剥掉，把里面「窄卡才生效」的降档规则摊平成无条件规则，
  //   还会连带吞掉紧随其后的规则（实测 .card-announcement .a-sect 整条消失，
  //   而那条正是按钮与「欢迎信息」之间的间距）。
  // 这几个文件本身不大，交给 Vercel 的 brotli 即可，压不压差别只有 1-2 KB。
  // 排查记录与备份：bak/perf-gulp-css-20261004/
  return gulp.src([
    './public/**/*.css',
    '!./public/css/site-inject.css',
    '!./public/css/twikoo.css'
  ])
    .pipe(cleanCSS({
      compatibility: 'ie11'
    }))
    .pipe(gulp.dest('./public'));
});
//压缩html
gulp.task('minify-html', () => {
  return gulp.src('./public/**/*.html')
    .pipe(htmlclean())
    .pipe(htmlmin({
      removeComments: true, //清除html注释
      collapseWhitespace: true, //压缩html
      collapseBooleanAttributes: true,
      //省略布尔属性的值，例如：<input checked="true"/> ==> <input />
      removeEmptyAttributes: true,
      //删除所有空格作属性值，例如：<input id="" /> ==> <input />
      removeScriptTypeAttributes: true,
      //删除<script>的type="text/javascript"
      removeStyleLinkTypeAttributes: true,
      //删除<style>和<link>的 type="text/css"
      minifyJS: true, //压缩页面 JS
      minifyCSS: true, //压缩页面 CSS
      minifyURLs: true  //压缩页面URL
    }))
    .pipe(gulp.dest('./public'))
});

// 运行gulp命令时依次执行以下任务
gulp.task('default', gulp.parallel(
  'compress', 'minify-css', 'minify-html'
))