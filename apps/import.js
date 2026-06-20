/**
 * MATOOL-Plugin - 抽卡链接解析导入
 *
 * 用户发送米游社/HoYoLAB 抽卡链接时，自动解析并导入数据到服务器
 * 成功则提示使用 统计/分析 命令查看
 *
 * API 说明（record.muoan.com）：
 *   POST /api/gacha/proxy  - 代理拉取米游社抽卡数据
 *   POST /api/gacha/import - 导入抽卡记录到数据库
 *
 * 错误码：
 *   400 - URL 格式不正确
 *   401 - API Key 无效
 *   402 - authkey 已过期
 *   403 - authkey 无效
 *   404 - 未找到抽卡记录
 *   408 - 代理请求超时
 *   429 - 请求过于频繁
 *   500 - 导入失败
 */
import plugin from '../../../lib/plugins/plugin.js'
import { importGacha } from './api.js'

// Gacha URL 正则：包含 authkey 的米游社/HoYoLAB 链接
const GACHA_URL_RE = /https?:\/\/[^\s]*(?:authkey|webstatic|mihoyo|hoyolab|hoyoverse)[^\s]*/i

export class GachaImport extends plugin {
  constructor() {
    super({
      name: '墨安抽卡导入',
      dsc: '自动解析米游社/HoYoLAB抽卡链接并导入数据',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: null,
          fnc: 'importUrl',
        },
      ],
    })
  }

  /** Auto-detect gacha URLs in user messages */
  async importUrl() {
    // ── detect gacha URL ──
    const msg = this.e.msg
    const match = msg.match(GACHA_URL_RE)
    if (!match) return false

    const gachaUrl = match[0]

    // If message also starts with a known command prefix (#/*/%), let normal command handle it
    if (/^[#\*%]/.test(msg.trim())) return false

    // ── process ──
    this.reply('⏳ 正在解析抽卡链接，请稍候...')

    const result = await importGacha(gachaUrl)

    if (result.code === 0) {
      const data = result.data
      const gameSym = { gs: '#', sr: '*', zzz: '%' }[data.game] || '#'
      this.reply(
        `✅ 解析成功！\n` +
        `UID：${data.uid}\n` +
        `导入：${data.imported} 条记录\n\n` +
        `可使用以下命令查看：\n` +
        `${gameSym}统计${data.uid}   ${gameSym}分析${data.uid}`
      )
    } else {
      this.reply(`❌ 解析失败\n原因：${result.message}`)
    }

    return true
  }
}
