/**
 * MATOOL-Plugin - 抽卡记录导出/导入
 *
 * 导出： #导出UID记录 → 发链接 → 验证 → JSON文件
 * 导入： #导入UID记录 → 发链接 → 验证 → 发JSON → 导入
 *
 * 游戏符号：#原神 *星铁 %绝区零（不指定默认原神）
 *
 * 机制说明：
 *   导出走规则正则，不涉及链接 → 无冲突。
 *   导入用 accept() 钩子接管后续消息（accept 优先于所有规则执行）。
 *   accept 无状态时返回 false，正常流程不受影响。
 */
import plugin from '../../../lib/plugins/plugin.js'
import { exportGacha, importGachaJSON, importGacha, verifyLink, symbolToGameBiz, gameBizToName } from './api.js'
import fs from 'fs'
import path from 'path'

const GACHA_URL_RE = /https?:\/\/[^\s]*(?:authkey|webstatic|mihoyo|hoyolab|hoyoverse)[^\s]*/i

// ── 状态管理 ──

const STATE = new Map()
const TTL = 120_000

function stGet(uid) {
  const s = STATE.get(uid)
  if (s && Date.now() - s._ts > TTL) { STATE.delete(uid); return null }
  return s || null
}
function stSet(uid, v) { STATE.set(uid, { ...v, _ts: Date.now() }) }
function stDel(uid) { STATE.delete(uid) }

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of STATE) if (now - v._ts > TTL) STATE.delete(k)
}, 30_000).unref()

// ── 插件 ──

export class matRecords extends plugin {
  constructor() {
    super({
      name: 'MATOOL:记录',
      dsc: '导出/导入抽卡记录',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /^#?[*%]?(导出)\s*\d{8,10}\s*(记录|json)/i, fnc: 'exportCmd' },
        { reg: /^#?[*%]?(导入)\s*\d{8,10}\s*(记录|json)/i, fnc: 'importStart' },
      ],
    })
  }

  // ═══════════════ 导出 ═══════════════

  async exportCmd() {
    const uid = this._uid()
    const gameBiz = this._gameBiz()
    const gameName = gameBizToName(gameBiz)
    if (!uid) return false
    stSet(this.e.user_id, { step: 'link', mode: 'export', uid, gameBiz, gameName })
    this.reply('📤 导出 ' + gameName + ' UID:' + uid + '\n\n发送该账号的抽卡链接验证身份\n⏱ 120秒有效')
    return true
  }

  // ═══════════════ 导入 ═══════════════

  async importStart() {
    const uid = this._uid()
    const gameBiz = this._gameBiz()
    const gameName = gameBizToName(gameBiz)
    if (!uid) return false
    stSet(this.e.user_id, { step: 'link', mode: 'import', uid, gameBiz, gameName })
    this.reply('📥 导入 ' + gameName + ' UID:' + uid + '\n\n发送该账号的抽卡链接验证身份\n⏱ 120秒有效')
    return true
  }

  // ═══════════════ accept 钩子 ═══════════════
  // 规则执行前运行。有状态时接管消息，无状态时返回 false（不影响其他插件）

  async accept() {
    const state = stGet(this.e.user_id)
    if (!state) return false

    if (state.step === 'link')    return await this._handleLink(state)
    if (state.step === 'json')    return await this._handleJson(state)
    return false
  }

  async _handleLink(state) {
    const url = this.e.msg.match(GACHA_URL_RE)?.[0]
    if (!url) { stDel(this.e.user_id); this.reply('⏰ 未检测到抽卡链接，已取消'); return 'return' }

    this.reply('⏳ 正在验证...')
    const r = await verifyLink(url)
    if (r.code !== 0) { stDel(this.e.user_id); this.reply('❌ ' + (r.message || '链接无效')); return 'return' }

    const vu = r.data?.uid ? String(r.data.uid) : ''
    const vb = r.data?.game_biz || state.gameBiz

    // 检查 UID 是否匹配用户指定的 UID
    if (vu && vu !== state.uid) {
      stDel(this.e.user_id)
      this.reply('❌ 验证失败：该链接对应 UID ' + vu + '，与指定的 ' + state.uid + ' 不符')
      return 'return'
    }

    if (state.mode === 'export') {
      // 导出：验证通过后直接导出
      stDel(this.e.user_id)
      this.reply('✅ 验证成功，正在导出...')
      return await this._doExport(state.uid, state.gameBiz, state.gameName)
    } else {
      // 导入：进入等待 JSON 阶段
      stSet(this.e.user_id, { step: 'json', mode: 'import', uid: state.uid, gameBiz: vb, gameName: state.gameName })
      this.reply('✅ 验证成功\n\n发送 JSON 文件继续导入')
      return 'return'
    }
  }

  async _handleJson(state) {
    const { uid, gameBiz, gameName } = state
    let text = ''

    // 1) QQ 文件附件
    const fe = this.e.message?.find(m => m.type === 'file')
    if (fe) {
      this.reply('⏳ 读取文件中...')
      try {
        let fileUrl = ''
        const raw = fe.file || ''
        // 直接是 URL
        if (/^https?:\/\//.test(raw)) {
          fileUrl = raw
        }
        // fid: 格式（OICQ），尝试 resolve
        else if (raw.startsWith('fid:')) {
          const fid = raw.slice(4)
          const friend = this.e.bot?.pickFriend(this.e.user_id)
          if (friend && typeof friend.getFileInfo === 'function') {
            const info = await friend.getFileInfo(fid)
            if (info?.url) fileUrl = info.url
          }
          if (!fileUrl) throw Error('暂不支持从 OICQ fid 下载文件，请发送文件下载链接或粘贴 JSON 内容')
        }
        // 可能是文件路径（Bot 本地文件）
        else if (raw.startsWith('file://')) {
          const resp = await globalThis.fetch(raw)
          if (!resp.ok) throw Error('HTTP ' + resp.status)
          text = await resp.text()
        }
        // fe.file 对象格式
        else if (typeof raw === 'object' && raw !== null) {
          if (raw.url) fileUrl = raw.url
        }
        // fe.url 备用
        else if (fe.url) {
          fileUrl = fe.url
        }

        if (fileUrl) {
          const resp = await globalThis.fetch(fileUrl)
          if (!resp.ok) throw Error('HTTP ' + resp.status)
          text = await resp.text()
        }

        if (!text) throw Error('无法获取文件内容')
      } catch (e) { this.reply('❌ 文件读取失败：' + e.message); return 'return' }
    }

    // 2) 下载链接
    else if (/^https?:\/\//.test(this.e.msg.trim())) {
      this.reply('⏳ 下载中...')
      try {
        const resp = await globalThis.fetch(this.e.msg.trim(), {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'MATOOL-Plugin/Yunzai' },
        })
        if (!resp.ok) throw Error('HTTP ' + resp.status)
        text = await resp.text()
      } catch (e) { this.reply('❌ 下载失败：' + e.message); return 'return' }
    }

    // 3) 粘贴的 JSON
    else if (/^\s*[\{\[]/.test(this.e.msg)) { text = this.e.msg.trim() }

    else { return false } // 啥都不是，不处理

    return this._doImport(uid, gameBiz, gameName, text)
  }

  async _doExport(uid, gameBiz, gameName) {
    const r = await exportGacha(uid, gameBiz)
    if (r.code !== 0) {
      this.reply('❌ 导出失败：' + (r.message || '未知错误'))
      return 'return'
    }

    try {
      const data = r.data
      const gameMap = { hk4e_cn: 'hk4e', hkrpg_cn: 'hkrpg', nap_cn: 'nap' }
      const uigfKey = gameMap[gameBiz]
      let total = 0
      if (data.info && uigfKey && Array.isArray(data[uigfKey])) {
        // UIGF v4.2 格式：可能有多组 (不同 uid/timezone/lang)
        for (const group of data[uigfKey]) {
          if (Array.isArray(group?.list)) total += group.list.length
        }
      } else {
        total = data.total || 0
      }
      const fc = JSON.stringify(data, null, 2)
      const fn = 'gacha_' + uid + '_' + gameName + '.json'
      const dir = process.cwd() + '/data/MATOOL-Plugin/'
      const fp = path.join(dir, fn)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(fp, fc, 'utf8')
      try { this.e.reply(segment.file(fp)) } catch (_) {}
      this.reply('✅ 导出成功 ' + gameName + ' UID:' + uid + ' (' + total + '条)')
    } catch (e) {
      this.reply('❌ 导出失败：' + e.message)
    }
    return 'return'
  }

  async _doImport(uid, gameBiz, gameName, text) {
    stDel(this.e.user_id)
    let records
    try {
      const j = JSON.parse(text)
      // UIGF v4.2 格式：{ hk4e: [{ uid: '...', list: [...] }] }
      const gameMap = { hk4e_cn: 'hk4e', hkrpg_cn: 'hkrpg', nap_cn: 'nap' }
      const uigfKey = gameMap[gameBiz]
      if (j.info && uigfKey && Array.isArray(j[uigfKey]) && Array.isArray(j[uigfKey][0]?.list)) {
        records = j[uigfKey][0].list
      } else if (j.info && !uigfKey) {
        // gameBiz 不匹配，遍历所有游戏
        for (const k of ['hk4e', 'hkrpg', 'nap']) {
          if (Array.isArray(j[k]) && Array.isArray(j[k][0]?.list) && j[k][0].list.length > 0) {
            records = j[k][0].list
            break
          }
        }
      } else {
        // 旧格式：{ records: { hk4e_cn: [...] } } 或直接数组
        if (j.records && typeof j.records === 'object') {
          const raw = j.records[gameBiz]
          if (Array.isArray(raw)) { records = raw }
          else { records = j.records }
        } else if (Array.isArray(j)) {
          records = j
        } else {
          records = j.records || j
        }
      }
    } catch (_) { this.reply('❌ JSON 格式错误'); return 'return' }

    if (!Array.isArray(records) || records.length === 0) {
      this.reply('❌ 未找到有效抽卡记录'); return 'return'
    }

    this.reply('⏳ ' + records.length + '条，正在导入...')
    const r = await importGachaJSON(uid, gameBiz, records)
    if (r.code !== 0) { this.reply('❌ 导入失败：' + (r.message || '未知错误')); return 'return' }

    const sym = gameBiz === 'hk4e_cn' ? '#' : gameBiz === 'hkrpg_cn' ? '*' : '%'
    this.reply('✅ 导入成功 ' + gameName + ' UID:' + uid + ' (' + records.length + '条)\n查看 ' + sym + '总结' + uid)
    return 'return'
  }

  // ═══════════════ 工具 ═══════════════

  _uid() { const m = this.e.msg.match(/(\d{8,10})/); return m ? m[1] : '' }
  _gameBiz() {
    let m = this.e.msg.replace(/^#/, '')
    const c = m.charAt(0)
    return symbolToGameBiz('*%'.includes(c) ? c : '#')
  }
}
