/**
 * MATOOL-Plugin - 设置指令（仅主人可用）
 */
import plugin from '../../../lib/plugins/plugin.js'
import { Cfg } from '../components/index.js'
import { getApiBase, getUserInfo } from './api.js'

export class matSet extends plugin {
  constructor() {
    super({
      name: 'MATOOL:设置',
      dsc: '墨安工具设置',
      event: 'message',
      priority: 500,
      rule: [
        { reg: /^#?墨安绑定\s*$/i, fnc: 'bindKey' },
        { reg: /^#?墨安绑定\s+\S+/i, fnc: 'bindKey' },
        { reg: /^#?墨安信息$/i, fnc: 'userInfo' },
        { reg: /^#?墨安解绑$/i, fnc: 'unbindKey' },
        { reg: /^#?墨安设置\s+/i, fnc: 'setDefault' },
      ],
    })
  }

  async bindKey() {
    if (!this.e.isMaster) {
      this.reply('暂无权限，只有主人才能操作')
      return true
    }
    const qq = this.e.user_id
    const msg = this.e.msg.replace(/^#?墨安绑定\s*/i, '').trim()
    if (!msg || msg.length < 10) {
      this.reply('请提供正确的 API Key，格式: #墨安绑定 [你的api_key]')
      return
    }
    Cfg.saveApiKey(msg, String(qq))
    this.reply('✅ API Key 绑定成功！使用 #墨安信息 查看详情')
  }

  async userInfo() {
    if (!this.e.isMaster) {
      this.reply('暂无权限，只有主人才能操作')
      return true
    }
    const apiKey = Cfg.getFirstApiKey()
    if (!apiKey) {
      this.reply('还没有绑定 API Key，使用 #墨安绑定 [api_key] 进行绑定')
      return false
    }
    try {
      const info = await getUserInfo(apiKey, getApiBase())
      const statusMap = { active: '✅ 正常', banned: '❌ 封禁', blacklisted: '⚠️ 黑名单' }
      const remaining = info.remaining === -1 ? '无限制' : `${info.remaining} 次`
      this.reply([
        `📋 墨安助手账号信息`,
        `━━━━━━━━━━━━━━━━`,
        `状态: ${statusMap[info.status] || info.status}`,
        `API Key: ${info.api_key.substring(0, 8)}...${info.api_key.slice(-4)}`,
        `QQ: ${info.qq || '未设置'}`,
        `总请求上限: ${info.req_limit || '无限制'}`,
        `已使用: ${info.req_count} 次`,
        `剩余: ${remaining}`,
        `每分钟: ${info.max_per_minute} 次`,
        `每小时间: ${info.max_per_hour} 次`,
        info.expire_at ? `过期时间: ${info.expire_at}` : '',
        `━━━━━━━━━━━━━━━━`,
      ].filter(Boolean).join('\n'))
    } catch (e) {
      this.reply(`❌ 查询失败: ${e.message}`)
    }
  }

  async unbindKey() {
    if (!this.e.isMaster) {
      this.reply('暂无权限，只有主人才能操作')
      return true
    }
    Cfg.saveApiKey('', '')
    this.reply('已清除 API Key')
  }

  async setDefault() {
    if (!this.e.isMaster) {
      this.reply('暂无权限，只有主人才能操作')
      return true
    }
    this.reply('使用 #总结 [uid] 直接查，无需设置默认')
  }
}
