🥝的博客源码，目前已经开源啦！！！暂定名为**Fomalhaut**
![](https://tuchuang.voooe.cn/images/2023/02/28/1677592090312.webp)

食用方法🍡🍡🍡：

1. 安装好 `Git Bash` 和 `NodeJs` 环境，注册并连接好Github，这部分可以参考[Hexo博客搭建基础教程(一)](https://www.fomal.cc/posts/e593433d.html)

2. 把源码打包下载到自己的电脑，然后解压缩

3. 在`git bash`中切换到博客根目录，使用以下命令，进行模块安装。这里绝对不能使用hexo init初始化，如果不慎用了，则站点的配置文件_config.yml里面内容会被重置，所以这一步一定要慎重

  ```bash
  npm i
  ```

4. 执行以下命令情况并启动项目，进入`localhost:4000`进行验证

  ```bash
  hexo cl; hexo g; hexo s
  ```

5. 当本地能成功启动，改一下站点配置文件的`_config.yml`的`deploy`配置项，然后用以下部署到Github

  ```bash
  hexo d
  ```
  
 注意：本项目开源了本站绝大部分样式，但是部分模块需要自行更改为自己的密钥或信息，不会的请多看相关文档和本站教程，图中出现问题请在QQ群里留言：691942826
