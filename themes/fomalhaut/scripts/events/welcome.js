const logger = require('hexo-log')()

// FOMALHAUT 主题自有版本号（改这里即可）
const fomalhautVersion = '1.0.3'
// 上游 Butterfly 版本：显示继承关系，cdn.js 也用它拼 jsdelivr / unpkg 地址。
// 它是「fork 自哪个 Butterfly」，与主题自己的版本（package.json 的 version）是两回事。
const butterflyVersion = require('../butterfly-version')

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
