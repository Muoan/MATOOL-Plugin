import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import chalk from 'chalk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginName = path.basename(__dirname)
const startTime = Date.now()
let success = 0, failed = 0

let apps = {}

try {
  let files = []
  function walk(dir) {
    for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
      let p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.name.endsWith('.js')) files.push(p)
    }
  }
  walk(path.join(__dirname, 'apps'))

  await Promise.all(files.map(async (file) => {
    try {
      let name = path.basename(file, '.js')
      let mod = await import(pathToFileURL(file).href)
      apps[name] = mod.default || mod[Object.keys(mod)[0]]
      success++
    } catch (err) {
      if (err?.code !== 'ERR_MODULE_NOT_FOUND') {
        logger.error(`[${pluginName}] 载入 ${path.basename(file)} 错误：`, err)
      }
      failed++
    }
  }))
} catch (err) {
  logger.error(`[${pluginName}] 载入插件时发生错误`, err)
}

const elapsed = Date.now() - startTime
const line = '─'.repeat(30)

logger.info(line)
logger.info(chalk.cyanBright.bold(`${pluginName} 加载完成`))
logger.info(chalk.greenBright.bold(`成功: ${success} 个模块`))
if (failed > 0) {
  logger.info(chalk.yellowBright.bold(`失败: ${failed} 个`))
} else {
  logger.info(chalk.magentaBright.bold('没有失败'))
}
logger.info(chalk.blueBright.bold(`总耗时: ${elapsed} ms`))
logger.info(line)

export { apps }
