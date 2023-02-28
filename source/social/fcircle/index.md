---
title: 朋友圈
date: 2022-09-05 18:00:00
comments: false
---

<style>
  #cf-container {
    background: transparent !important;
  }
  .cf-article .cf-article-title:hover {
    color: #f4f4f4 !important;
  }
  .cf-img-avatar {
    opacity: .4 !important;
  }
  .cf-article-author:hover {
    background: var(--theme-color) !important;
  }
  #cf-more:hover {
    background: var(--theme-color) !important;
  }
  .cf-overshow p a:hover {
    color: #f4f4f4 !important;
  }
  .cf-article {
    transition: transform linear 0.3s;
  }
  .cf-article:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 10px 8px #07111b29;
  }
  .cf-article {
    border-radius: 15px !important;
    border: 1px solid #a5a5a5ee !important;
  }
  ::selection {
  background: var(--theme-color) !important;
  color: #f4f4f4 !important;
  }
</style>

<div id="hexo-circle-of-friends-root"></div>
<script>
    let UserConfig = {
        // 替换为你的API!!!
        private_api_url: 'https://fcircle.fomal.cc/',
        // 点击加载更多时，一次最多加载几篇文章，默认10
        page_turning_number: 12,
        // 头像加载失败时，默认头像地址
        error_img: '/assets/r1.jpg',
        // 进入页面时第一次的排序规则
        sort_rule: 'created'
    }
</script>
<link rel="stylesheet" href="https://cdn1.tianli0.top/gh/zhheo/JS-Heo@master/mainColor/heoMainColor.css">
<script type="text/javascript" src="https://cdn1.tianli0.top/gh/zhheo/JS-Heo@master/moments5/app.min.js"></script>
<script type="text/javascript" src="https://cdn1.tianli0.top/gh/zhheo/JS-Heo@master/moments5/bundle.js"></script>
