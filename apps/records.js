/**
 * MATOOL-Plugin - 抽卡记录导入/导出
 *
 * 导出流程：
 *   #导出UID记录 → 请发抽卡链接 → 用户发链接 → 服务器拉取→导出JSON→文件
 *
 * 导入流程：
 *   #导入UID记录 → 请发抽卡链接 → 用户发链接 → 验证成功
 *   → 请发JSON → 用户发JSON → 服务器导入 → 反馈
 *
 * 游戏符号：#原神 *星铁 %绝区零（不指定默认原神）
 */
import plugin from '../../../lib/plugins/plugin.js'
import { exportGacha, importGachaJSON, importGacha, symbolToGameBiz, gameBizToName } from './api.js'
import fs from 'fs'
import path from 'path'

const STATE = new Map()
const STATE_TTL = 120_000 // 120s
const SYMBOL_GAME = { '#': 'gs', '*': 'sr', '%': 'zzz' }

// 定时清理过期状态
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of STATE) {
    if (now - v._ts > STATE_TTL) STATE.delete(k)
  }
}, 30_000).unref()

export class matRecords extends plugin {
  constructor() {
    super({
      name: 'MATOOL:记录',
      dsc: '导入/导出抽卡记录',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /^#?[*%]?(导入|导出)\s*\d{8,10}\s*(记录|json)/i, fnc: 'recordsCmd' },
      ],
    })
  }

  // ────────── 主命令入口 ──────────

  async recordsCmd() {
    const msg = this.e.msg.trim()

    let trimmed = msg.replace(/^#/, '')
    const first = trimmed.charAt(0)
    const gameSym = SYMBOL_GAME[first] || '#'
    if (gameSym !== '#') trimmed = trimmed.slice(1)

    const cmdMatch = trimmed.match(/(导入|导出)/i)
    if (!cmdMatch) return false
    const cmd = cmdMatch[0]

    const uidMatch = trimmed.match(/(\d{8,10})/)
    const targetUid = uidMatch ? uidMatch[1] : ''
    if (!targetUid) {
      this.reply('格式: 游戏符号+导入/导出+UID+记录\n示例: #导出128814012记录')
      return false
    }

    const gameBiz = symbolToGameBiz(gameSym)
    const gameName = gameBizToName(gameBiz)

    if (cmd === '导出') return this._startExport(targetUid, gameBiz, gameName)
    if (cmd === '导入') return this._startImport(targetUid, gameBiz, gameName)
    return false
  }

  // ────────── 导出流程 ──────────

  _startExport(uid, gameBiz, gameName) {
    const userId = this.e.user_id
    STATE.set(userId, { type: 'export', uid, gameBiz, gameName, _ts: Date.now() })
    this.setContext('handleExportLink')

    this.reply([
      '📤 导出 ' + gameName + ' UID:' + uid,
      '',
      '━━━━━━━━━━━━━━━━',
      '',
      '请发送该账号的抽卡链接',
      '（游戏内 → 祈愿/跃迁记录 → 点分享复制链接）',
      '',
      '⏱ 120 秒内有效',
      '━━━━━━━━━━━━━━━━',
    ].join('\n'))
    return true
  }

  async handleExportLink() {
    const msg = this.e.msg.trim()
    const userId = this.e.user_id
    const state = STATE.get(userId)
    STATE.delete(userId)

    if (!state || state.type !== 'export') {
      this.reply('⚠ 会话已过期，请重新发送命令')
      return true
    }

    const urlMatch = msg.match(/https?:\/\/[^\s]*(?:authkey|webstatic|mihoyo|hoyolab|hoyoverse)[^\s]*/i)
    if (!urlMatch) {
      this.reply('⏰ 未检测到抽卡链接，已取消导出')
      return true
    }
    const gachaUrl = urlMatch[0]
    const { uid, gameBiz, gameName } = state

    this.reply('⏳ 正在拉取抽卡数据...')

    // 第1步：用链接拉取数据并导入服务器
    const importResult = await importGacha(gachaUrl)
    if (importResult.code !== 0) {
      this.reply('❌ 拉取数据失败：' + (importResult.message || '链接无效或已过期'))
      return true
    }

    this.reply('✅ 数据同步完成，正在生成文件...')

    // 第2步：从服务器导出为 JSON
    const exportResult = await exportGacha(uid, gameBiz)
    if (exportResult.code !== 0) {
      this.reply('❌ 导出失败：' + (exportResult.message || '未知错误'))
      return true
    }

    try {
      const data = exportResult.data
      const fileContent = JSON.stringify(data, null, 2)
      const fileName = 'gacha_' + uid + '_' + gameName + '.json'

      const dir = process.cwd() + '/data/MATOOL-Plugin/'
      const filePath = path.join(dir, fileName)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, fileContent, 'utf8')

      // 发送文件到 QQ
      try { this.e.reply(segment.file(filePath)) } catch (_) {}

      this.reply([
        '✅ 导出成功！',
        '',
        '━━━━━━━━━━━━━━━━',
        '  游戏: ' + gameName,
        '  UID: ' + uid,
        '  记录: ' + (data.total || 0) + ' 条',
        '  文件: ' + fileName,
        '━━━━━━━━━━━━━━━━',
      ].join('\n'))
    } catch (e) {
      this.reply('❌ 文件生成失败：' + e.message)
    }
    return true
  }

  // ────────── 导入流程 ──────────

  _startImport(uid, gameBiz, gameName) {
    const userId = this.e.user_id
    STATE.set(userId, { type: 'import_link', uid, gameBiz, gameName, _ts: Date.now() })
    this.setContext('handleImportLink')

    this.reply([
      '📥 导入 ' + gameName + ' UID:' + uid,
      '',
      '━━━━━━━━━━━━━━━━',
      '',
      '第1步：请发送该账号的抽卡链接',
      '（用于验证身份并同步官方数据）',
      '',
      '⏱ 120 秒内有效',
      '━━━━━━━━━━━━━━━━',
    ].join('\n'))
    return true
  }

  async handleImportLink() {
    const msg = this.e.msg.trim()
    const userId = this.e.user_id
    const state = STATE.get(userId)

    if (!state || state.type !== 'import_link') {
      this.reply('⚠ 会话已过期，请重新发送命令')
      return true
    }

    const urlMatch = msg.match(/https?:\/\/[^\s]*(?:authkey|webstatic|mihoyo|hoyolab|hoyoverse)[^\s]*/i)
    if (!urlMatch) {
      this.reply('⏰ 未检测到抽卡链接，已取消导入')
      STATE.delete(userId)
      return true
    }
    const gachaUrl = urlMatch[0]
    const { uid, gameBiz, gameName } = state

    this.reply('⏳ 正在验证抽卡链接...')

    // 用链接拉取数据（验证链接 + 同步官方数据）
    const result = await importGacha(gachaUrl)
    if (result.code !== 0) {
      this.reply('❌ 链接验证失败：' + (result.message || '链接无效或已过期'))
      STATE.delete(userId)
      return true
    }

    // 使用服务器返回的已验证 UID（而非用户命令中可能不准确的 UID）
    const verifiedUid = (result.data && result.data.uid) ? String(result.data.uid) : uid
    const verifiedBiz = (result.data && result.data.game_biz) ? result.data.game_biz : gameBiz
    STATE.set(userId, { type: 'import_json', uid: verifiedUid, gameBiz: verifiedBiz, gameName, _ts: Date.now() })
    this.setContext('handleImportJson')

    this.reply([
      '✅ 链接验证成功，官方数据已同步',
      '',
      '━━━━━━━━━━━━━━━━',
      '',
      '第2步：请发送要导入的 JSON 文件',
      '',
      '可以：',
      '• 直接粘贴 JSON 文本',
      '• 发送文件下载链接',
      '• 发送文件（QQ文件消息）',
      '',
      '⏱ 120 秒内有效',
      '━━━━━━━━━━━━━━━━',
    ].join('\n'))
    return true
  }

  async handleImportJson() {
    const msg = this.e.msg.trim()
    const userId = this.e.user_id
    const state = STATE.get(userId)
    STATE.delete(userId)

    if (!state || state.type !== 'import_json') {
      this.reply('⚠ 会话已过期，请重新发送命令')
      return true
    }

    const { uid, gameBiz, gameName } = state
    let jsonText = ''

    // 尝试从文件附件读取
    const fileElem = this.e.message?.find(m => m.type === 'file')
    if (fileElem) {
      this.reply('⏳ 正在读取文件...')
      try {
        const fid = fileElem.file?.startsWith('fid:') ? fileElem.file.slice(4) : fileElem.file
        const friend = this.e.bot?.pickFriend(this.e.user_id)
        if (!friend) throw new Error('无法获取好友对象')
        const fileInfo = await friend.getFileInfo(fid)
        if (fileInfo?.url) {
          const resp = await globalThis.fetch(fileInfo.url)
          if (!resp.ok) throw new Error('HTTP ' + resp.status)
          jsonText = await resp.text()
        } else {
          this.reply('❌ 无法获取文件内容（可能是下载链接为空）')
          return true
        }
      } catch (e) {
        this.reply('❌ 文件读取失败：' + e.message)
        return true
      }
    } else if (msg.startsWith('http://') || msg.startsWith('https://')) {
      // 从链接下载
      this.reply('⏳ 正在下载...')
      try {
        const resp = await globalThis.fetch(msg, {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'MATOOL-Plugin/Yunzai' },
        })
        if (!resp.ok) throw new Error('HTTP ' + resp.status)
        jsonText = await resp.text()
      } catch (e) {
        this.reply('❌ 下载失败：' + e.message)
        return true
      }
    } else if (msg.startsWith('{') || msg.startsWith('[')) {
      // 直接粘贴 JSON
      jsonText = msg
    } else {
      this.reply('❌ 无法识别：请发送 JSON 文件内容（{...} 或 [...] 开头）或文件下载链接')
      return true
    }

    // 解析 JSON
    let records = null
    try {
      const jsonData = JSON.parse(jsonText)
      records = jsonData.records || jsonData
      if (Array.isArray(jsonData) && jsonData[0]?.gacha_type) records = jsonData
    } catch (e) {
      this.reply('❌ JSON 解析失败：内容格式不正确')
      return true
    }

    if (!Array.isArray(records) || records.length === 0) {
      this.reply('❌ 未找到有效的抽卡记录数据')
      return true
    }

    this.reply('⏳ 已解析 ' + records.length + ' 条记录，正在导入...')

    const result = await importGachaJSON(uid, gameBiz, records)
    if (result.code !== 0) {
      this.reply('❌ 导入失败：' + (result.message || '未知错误'))
      return true
    }

    const data = result.data || {}
    const importedCount = data.total_genshin || data.total_starrail || data.total_zzz || records.length
    const gameSym = gameBiz === 'hk4e_cn' ? '#' : gameBiz === 'hkrpg_cn' ? '*' : '%'

    this.reply([
      '✅ 导入成功！',
      '',
      '━━━━━━━━━━━━━━━━',
      '  游戏: ' + gameName,
      '  UID: ' + uid,
      '  解析: ' + records.length + ' 条',
      '  导入: ' + importedCount + ' 条',
      '━━━━━━━━━━━━━━━━',
      '',
      '查看统计： ' + gameSym + '总结' + uid,
      '查看分析： ' + gameSym + '分析' + uid,
    ].join('\n'))
    return true
  }
}
