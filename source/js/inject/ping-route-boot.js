/*!
 * ping-route-boot.js —— 公告栏线路延时的可调参数
 * 在 ping-route.js 之前以同步脚本加载（inject.head），只负责把配置挂到全局。
 * 改这里的数字不用动 ping-route.js：initialDelay=首个探测前的等待，stagger=每条线路之间的错开量，
 * retryDelay=失败重试的间隔，attempts=每条线路的探测次数上限（成功即止）。
 */
window.__FOMAL_PING_ROUTE__ = {
  initialDelay: 350,
  stagger: 180,
  retryDelay: 1500,
  attempts: 2
};
