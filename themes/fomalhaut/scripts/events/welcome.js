const logger = require('hexo-log')()

// FOMALHAUT 主题自有版本号（改这里即可）
const fomalhautVersion = '1.0.0'
// 上游 Butterfly 版本：仅用于显示继承关系。
// 注意：cdn.js 也用这个 version 拼 jsdelivr/unpkg 资源地址，所以不要改 package.json 里的 version。
const { version: butterflyVersion } = require('../../package.json')

hexo.on('ready', () => {
  const art = [
    '███████  ██████  ███    ███      ██      ██      ██    ██      ██      ██    ██ ████████ ',
    '██      ██    ██ ████  ████     ████     ██      ██    ██     ████     ██    ██    ██    ',
    '█████   ██    ██ ██ ████ ██    ██  ██    ██      ████████    ██  ██    ██    ██    ██    ',
    '██      ██    ██ ██  ██  ██   ████████   ██      ██    ██   ████████   ██    ██    ██    ',
    '██       ██████  ██      ██  ██      ██  ███████ ██    ██  ██      ██   ██████     ██    '
  ]
  // 中文按 2 个字符宽计算，让版本行在艺术字下方居中
  const title = `主题版本：${fomalhautVersion} (Inherited from Butterfly ${butterflyVersion})`
  const width = art[0].length
  const textWidth = [...title].reduce((n, ch) => n + (/[\u2E80-\uFFEF]/.test(ch) ? 2 : 1), 0)
  const pad = ' '.repeat(Math.max(0, Math.round((width - textWidth) / 2)))
  logger.info(`
  ${'='.repeat(width)}

${art.join('\n')}

${pad}${title}
  ${'='.repeat(width)}`)
})
