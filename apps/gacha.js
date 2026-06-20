import plugin from '../../../lib/plugins/plugin.js'
import { Render, Cfg } from '../components/index.js'
import { GAME_MAP, parseUid, getAnalysis, queryGacha, fetchWithKey } from './api.js'

/** 命座标签: count 为该角色出现的总次数 */
function constLabel(count) {
  const MAP = ['', '二', '三', '四', '五']
  if (count === 1) return ''
  if (count <= 5) return MAP[count - 2] + '命'
  if (count === 6) return '满命'
  return '满命溢出' + (count - 6)
}

// 游戏符号映射: #=gs(原神), *=sr(星铁), %=zzz(绝区零)
// 也支持 TRSS-Yunzai 替换后的 星铁/绝区零 前缀
const SYMBOL_GAME = {
  '*': 'sr',
  '%': 'zzz',
  '星铁': 'sr',
  '崩铁': 'sr',
  '绝区零': 'zzz',
}

export class matGacha extends plugin {
  constructor() {
    super({
      name: 'MATOOL:抽卡',
      dsc: '墨安抽卡查询与分析',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /^#?(?:[*%]|星铁|绝区零)?(总结|分析|五星)/i, fnc: 'analysis' },
        { reg: /^#?(?:[*%]|星铁|绝区零)?(抽卡|查询)\s*/i, fnc: 'query' },
      ],
    })
  }

  /** 解析 msg: 返回 { uid, game, type } */
  _parse(msg) {
    // 判断游戏
    let trimmed = msg.replace(/^#/, '') // 去掉可选的 # 前缀
    // 检测游戏符号: * % 星铁 崩铁 绝区零（TRSS-Yunzai 将 *→#星铁, %→#绝区零）
    let game = 'gs'
    const matchedPrefix = trimmed.match(/^(星铁|崩铁|绝区零|[#*%])/)
    if (matchedPrefix) {
      const prefix = matchedPrefix[1]
      if (SYMBOL_GAME[prefix]) {
        game = SYMBOL_GAME[prefix]
        trimmed = trimmed.slice(prefix.length)
      }
    }
    msg = trimmed

    // 判断类型
    let rawType = msg.match(/^(总结|分析|五星)/)
    let rawQuery = msg.match(/^(抽卡|查询)/)
    let type = rawType ? rawType[1] : (rawQuery ? '抽卡' : '统计')

    // 取 UID
    let cleaned = msg.replace(/^(总结|分析|五星|抽卡|查询)\s*/, '').trim()
    // 也支持尾部 UID
    let tail = cleaned.match(/(\d{8,10})\s*$/)
    let uid = tail ? tail[1] : parseUid(cleaned) || parseUid(msg)

    return { uid, game, type }
  }

  async analysis() {
    const msg = this.e.msg.trim()
    const parsed = this._parse(msg)
    if (!parsed || !parsed.uid) {
      this.reply('格式: #总结[uid] / *总结[uid] / %总结[uid]  示例: #总结128814012')
      return false
    }
    const { uid, game, type } = parsed
    const gameName = GAME_MAP[game]?.name || '原神'
    this.reply('正在查询 ' + gameName + ' UID:' + uid + ' 的抽卡数据...')

    const analysis = await getAnalysis(uid, game)
    if (analysis.total_records === 0) {
      this.reply(gameName + ' UID:' + uid + ' 暂无抽卡记录')
      return false
    }

    let tplName = 'gacha/stats'
    if (/^分析/.test(type)) tplName = 'gacha/analysis'
    if (/^五星/.test(type)) tplName = 'gacha/five'

    const extended = analysis.extended_stats || {}
    const rawPity = extended.pity_analysis || {}
    const poolStats = analysis.pool_stats || []
    const pityStats = analysis.pity_stats || []
    const fiveList = analysis.five_star_list || []

    // === 五星命座统计 ===
    const constMap = {}
    for (const fs of fiveList) {
      constMap[fs.name] = (constMap[fs.name] || 0) + 1
    }
    const constRank = Object.entries(constMap)
      .map(([name, count]) => ({ name, count, label: constLabel(count) }))
      .sort((a, b) => b.count - a.count)
    const uniqueChars = constRank.length
    const totalFive = fiveList.length

    // === 卡池分类统计 ===
    const poolGroupMap = {}
    for (const fs of fiveList) {
      const key = fs.gacha_type_name || '未知'
      if (!poolGroupMap[key]) poolGroupMap[key] = []
      poolGroupMap[key].push(fs)
    }
    const poolOrder = poolStats.map(p => p.pool_name)
    const poolGroups = Object.entries(poolGroupMap).sort((a, b) => {
      const ai = poolOrder.indexOf(a[0])
      const bi = poolOrder.indexOf(b[0])
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    const pitiesByNameTime = {}
    for (const ps of pityStats) {
      for (const p of (ps.pities || [])) {
        pitiesByNameTime[p.name + '_' + p.time] = p.pity
      }
    }
    const poolGroupsWithPity = poolGroups.map(([poolName, list]) => ({
      pool_name: poolName,
      chars: list.map(fs => ({
        name: fs.name,
        type: fs.item_type || '',
        time: (fs.time || '').slice(0, 10),
        pity: pitiesByNameTime[fs.name + '_' + fs.time] || null,
      })),
    }))

    // === 歪率分析 ===
    const pityAnalysis = {
      win_rate: rawPity.win_rate || 0,
      won: rawPity.won || 0,
      lost: rawPity.lost || 0,
      guaranteed: rawPity.guaranteed || 0,
      total_five_stars: rawPity.total_five_stars || 0,
      current_guaranteed: rawPity.current_guaranteed || false,
      chain: rawPity.chain || [],
    }

    // === 保底数据预计算 ===
    const pityStatsPre = pityStats.map(pity => {
      const maxPity = pity.max_pity || 90
      const pct = Math.min(100, Math.floor((pity.current_pity || 0) / maxPity * 100))
      return { ...pity, pity_percent: pct }
    })

    // === 分析页：按池+抽数进度条 ===
    const psByName = {}
    for (const ps of pityStats) { psByName[ps.pool_name] = ps }
    const poolDetail = poolStats.map(pool => {
      const ps = psByName[pool.pool_name] || {}
      const maxPity = ps.max_pity || 90
      const chars = (ps.pities || []).map(p => {
        let status = ''; let statusText = ''
        const chain = pityAnalysis.chain
        if (chain && chain.length > 0) {
          const pt = new Date(p.time).getTime()
          const match = chain.find(c => Math.abs(new Date(c.time).getTime() - pt) < 45000)
          if (match) { status = match.status; statusText = match.status_text }
        }
        if (!status && pool.pool_type === 'standard') { status = 'standard'; statusText = '常驻' }
        const pct = Math.min(100, Math.floor((p.pity || 0) / maxPity * 100))
        let barClass = 'bar-good'
        if (p.pity <= 10) barClass = 'bar-europe'
        else if (pct <= 50) barClass = 'bar-good'
        else if (pct <= 83) barClass = 'bar-normal'
        else barClass = 'bar-bad'
        return { name: p.name, pity: p.pity, maxPity, pct, status, statusText, time: p.time, barClass }
      })
      return { pool_name: pool.pool_name, pool_type: pool.pool_type, chars, total: pool.total, five_star: pool.five_star, avg_to_pity: pool.avg_to_pity }
    })

    const data = {
      uid, game,
      gameName,
      totalRecords: analysis.total_records,
      fiveStarCount: totalFive,
      fourStarCount: analysis.four_star_count,
      avgFiveStarOdds: analysis.avg_five_star_odds,
      uniqueChars,
      constRank,
      fiveStarList: fiveList,
      poolStats,
      pityStats: pityStatsPre,
      poolGroups: poolGroupsWithPity,
      poolDetail,
      pityAnalysis,
      luckStats: extended.luck_stats || null,
      extraStats: extended.extra_stats || null,
      topPulled: extended.top_pulled || [],
      pityDistribution: extended.pity_distribution || [],
      renderTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      dataSource: Cfg.getApiBase().replace(/^https?:\/\//, '').replace(/\/api$/, ''),
    }
    return Render.render(tplName, data, { e: this.e, scale: 1.2 })
  }

  async query() {
    const msg = this.e.msg.trim()
    const parsed = this._parse(msg)
    if (!parsed || !parsed.uid) {
      this.reply('格式: #抽卡[uid] / *抽卡[uid] / %抽卡[uid]  示例: #抽卡128814012')
      return false
    }
    const { uid, game } = parsed
    const gameName = GAME_MAP[game]?.name || '原神'
    const apiKey = Cfg.getFirstApiKey()
    this.reply('正在查询 ' + gameName + ' UID:' + uid + ' 的抽卡记录...')

    const data = apiKey
      ? await fetchWithKey(uid, game)
      : await queryGacha(uid, game)

    const section = GAME_MAP[game]?.uigfSection || 'hk4e'
    const groups = data[section] || []
    if (!groups.length || !groups[0].list.length) {
      this.reply(gameName + ' UID:' + uid + ' 暂无抽卡记录')
      return false
    }

    const total = groups.reduce((sum, g) => sum + g.list.length, 0)
    const fiveCount = groups.reduce((sum, g) => sum + g.list.filter(r => r.rank_type === '5').length, 0)
    const fourCount = groups.reduce((sum, g) => sum + g.list.filter(r => r.rank_type === '4').length, 0)
    const all = groups.flatMap(g => g.list).sort((a, b) => new Date(b.time) - new Date(a.time))
    const recent = all.slice(0, 10)

    const lines = [
      gameName + ' 抽卡记录 - UID:' + uid,
      '━━━━━━━━━━━━━━━━',
      '总计: ' + total + ' 抽 | 五星 ' + fiveCount + ' | 四星 ' + fourCount,
      apiKey ? '已用 API Key 授权查询' : '公开查询（绑定 Key 提高限额）',
      '数据来源: ' + Cfg.getApiBase().replace(/^https?:\/\//, '').replace(/\/api$/, ''),
      '━━━━━━━━━━━━━━━━',
      '最近 ' + recent.length + ' 条:',
    ]
    for (const r of recent) {
      const star = { '5': '★★★★★', '4': '★★★★', '3': '★★★' }[r.rank_type] || ''
      lines.push('  ' + (r.time || '').slice(0, 10) + ' ' + star + ' ' + r.name)
    }
    if (total > recent.length) {
      lines.push('... 以及 ' + (total - recent.length) + ' 条更早记录')
    }
    lines.push('', '使用 #总结[uid] 查看统计图片')
    this.reply(lines.join('\n'))
  }
}
