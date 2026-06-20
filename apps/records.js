/**
 * MATOOL-Plugin - 抽卡记录导入/导出
 */
import plugin from '../../../lib/plugins/plugin.js'
import { Cfg } from '../components/index.js'
import { exportGacha, importGachaJSON, symbolToGameBiz, gameBizToName } from './api.js'

const SYMBOL_GAME = { '#': 'gs', '*': 'sr', '%': 'zzz' }

export class matRecords extends plugin {
  constructor() {
    super({
      name: 'MATOOL:记录',
      dsc: '导入/导出抽卡记录',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /^#?[*%]?(导入|导出)\s*\d{8,10}\s*记录/i, fnc: 'recordsCmd' },
      ],
    })
  }

  async recordsCmd() {
    const msg = this.e.msg.trim()
    // Extract game symbol
    let trimmed = msg.replace(/^#/, '')
    const first = trimmed.charAt(0)
    const gameSym = SYMBOL_GAME[first] || '#'
    if (gameSym !== '#') trimmed = trimmed.slice(1)

    const cmd = trimmed.match(/(导入|导出)/i)[0]
    const uidMatch = trimmed.match(/(\d{8,10})/)
    const uid = uidMatch ? uidMatch[1] : ''
    if (!uid) {
      this.reply('格式: ' + gameSym + cmd + 'UID记录')
      return false
    }

    const gameBiz = symbolToGameBiz(gameSym)
    const gameName = gameBizToName(gameBiz)

    if (cmd === '导出') {
      return this._export(uid, gameBiz, gameName)
    } else if (cmd === '导入') {
      return this._import(uid, gameBiz, gameName)
    }
  }

  async _export(uid, gameBiz, gameName) {
    this.reply('正在导出 ' + gameName + ' UID:' + uid + ' 的抽卡记录...')

    const result = await exportGacha(uid, gameBiz)
    if (result.code !== 0) {
      this.reply('导出失败：' + result.message)
      return false
    }

    try {
      const data = result.data
      // Build JSON file content
      const fileContent = JSON.stringify(data, null, 2)
      const fileName = 'gacha_export_' + uid + '_' + gameName + '.json'
      const filePath = process.cwd() + '/data/MATOOL-Plugin/' + fileName

      // Ensure directory exists
      const dir = process.cwd() + '/data/MATOOL-Plugin/'
      if (!require('fs').existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true })
      }

      require('fs').writeFileSync(filePath, fileContent, 'utf8')

      // Send the file
      this.reply([
        '导出成功！' + gameName + ' UID:' + uid + '，共 ' + (data.total || 0) + ' 条记录',
        '',
        '━━━━━━━━━━━━━━━━',
        '  文件: ' + fileName,
        '  路径: ' + filePath,
        '━━━━━━━━━━━━━━━━',
      ].join('\n'))

      // Try to send as file attachment
      if (typeof this.e.reply === 'function') {
        this.e.reply(require('fs').readFileSync(filePath), { name: fileName })
      }
    } catch (e) {
      this.reply('导出失败：' + e.message)
    }
    return true
  }

  async _import(uid, gameBiz, gameName) {
    // Get the JSON content - could be inline in message or as a file/URL
    const msg = this.e.msg.trim()

    // Remove the command prefix to get the content
    let content = msg.replace(/^#?[*%]?(导入)\s*\d{8,10}\s*记录\s*/i, '').trim()

    if (!content) {
      this.reply([
        '格式: #导入UID记录 <JSON内容>',
        '示例: #导入128814012记录 {"records":[{...}]}',
        '或导入来自导出的 JSON 文件内容',
      ].join('\n'))
      return false
    }

    this.reply('正在导入 ' + gameName + ' UID:' + uid + ' 的抽卡记录...')

    // Try to parse as JSON
    let records = null
    try {
      // If content starts with { or [, try to parse as JSON directly
      if (content.startsWith('{') || content.startsWith('[')) {
        const jsonData = JSON.parse(content)
        records = jsonData.records || jsonData
        // If it's a flat array, use it directly
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].gacha_type) {
          records = jsonData
        }
      } else {
        // Might be a URL - try to fetch from URL
        this.reply('尝试从链接获取 JSON 数据...')
        const resp = await globalThis.fetch(content, {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'MATOOL-Plugin/Yunzai' },
        })
        if (!resp.ok) throw new Error('HTTP ' + resp.status)
        const jsonData = await resp.json()
        records = jsonData.records || jsonData
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].gacha_type) {
          records = jsonData
        }
      }
    } catch (e) {
      this.reply('JSON 解析失败：' + e.message)
      return false
    }

    if (!Array.isArray(records) || records.length === 0) {
      this.reply('未找到有效的抽卡记录数据')
      return false
    }

    this.reply('已解析 ' + records.length + ' 条记录，正在导入...')

    const result = await importGachaJSON(uid, gameBiz, records)
    if (result.code !== 0) {
      this.reply('导入失败：' + result.message)
      return false
    }

    this.reply([
      '导入成功！' + gameName + ' UID:' + uid,
      '',
      '━━━━━━━━━━━━━━━━',
      '  导入 ' + records.length + ' 条',
      '  新增 ' + (result.data ? (result.data.total_genshin || result.data.total_starrail || result.data.total_zzz || 0) : 0) + ' 条',
      '━━━━━━━━━━━━━━━━',
      '',
      '查看统计： ' + (gameBiz === 'hk4e_cn' ? '#' : gameBiz === 'hkrpg_cn' ? '*' : '%') + '总结' + uid,
    ].join('\n'))
    return true
  }
}
