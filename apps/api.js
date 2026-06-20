/**
 * MATOOL-Plugin - API 请求模块
 */
import { Cfg } from '../components/index.js'

export function getApiBase() {
  return Cfg.getApiBase()
}

function getAuthKey() {
  return Cfg.getFirstApiKey()
}

export const GAME_MAP = {
  gs: { key: 'gs', name: '原神', uigfSection: 'hk4e' },
  sr: { key: 'sr', name: '星穹铁道', uigfSection: 'hkrpg' },
  zzz: { key: 'zzz', name: '绝区零', uigfSection: 'nap' },
}

export function parseGame(msg) {
  const patterns = [
    { key: 'gs', reg: /^(原神|gs|genshin|元)/i },
    { key: 'sr', reg: /^(星铁|铁道|星穹|sr|崩铁)/i },
    { key: 'zzz', reg: /^(绝区零|zzz)/i },
  ]
  for (const p of patterns) {
    const m = msg.match(p.reg)
    if (m) {
      return { game: p.key, rest: msg.slice(m[0].length).trim() }
    }
  }
  return { game: null, rest: msg }
}

export function parseUid(str) {
  const m = str.match(/\b(\d{8,10})\b/)
  return m ? m[1] : null
}

async function apiGet(url) {
  const resp = await globalThis.fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'MATOOL-Plugin/Yunzai' },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const json = await resp.json()
  if (json.code !== 0) throw new Error(json.message || '请求失败')
  return json.data
}

export async function getAnalysis(uid, game) {
  const base = getApiBase()
  return apiGet(`${base}/analysis?uid=${encodeURIComponent(uid)}&game=${encodeURIComponent(game)}`)
}

export async function queryGacha(uid, game) {
  const base = getApiBase()
  return apiGet(`${base}/query?uid=${encodeURIComponent(uid)}&game=${encodeURIComponent(game)}`)
}

export async function fetchWithKey(uid, game) {
  const base = getApiBase()
  const apiKey = getAuthKey()
  if (!apiKey) throw new Error('未绑定 API Key')
  return apiGet(`${base}/fetch?uid=${encodeURIComponent(uid)}&game=${encodeURIComponent(game)}&api_key=${encodeURIComponent(apiKey)}`)
}

export async function getUserInfo(apiKey) {
  const base = getApiBase()
  return apiGet(`${base}/userinfo?api_key=${encodeURIComponent(apiKey)}`)
}

// ── Gacha type configs for proxy-based import ──
const GACHA_TYPES = {
  hk4e_cn: ['100', '200', '301', '302', '400', '500'],
  hkrpg_cn: ['1', '2', '11', '12'],
  nap_cn: ['2001', '3001', '1001', '5001'],
}

const GAME_BIZ_HINTS = [
  { pattern: /hk4e|mihoyo|mona|yuanshen/i, biz: 'hk4e_cn' },
  { pattern: /hkrpg|starrail/i, biz: 'hkrpg_cn' },
  { pattern: /nap|zzz/i, biz: 'nap_cn' },
]

/**
 * Detect game biz from URL
 */
function detectGameBiz(url) {
  const u = url.toLowerCase()
  for (const hint of GAME_BIZ_HINTS) {
    if (hint.pattern.test(u)) return hint.biz
  }
  return 'hk4e_cn'
}

/**
 * Call proxy endpoint for a single gacha page.
 */
async function proxyGachaPage(authkey, region, gameBiz, gachaType, page, size, endId) {
  const base = Cfg.getApiBase()
  const url = base + '/gacha/proxy'
  const resp = await globalThis.fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MATOOL-Plugin/Yunzai',
    },
    body: JSON.stringify({ authkey, region, game_biz: gameBiz, gacha_type: gachaType, page, size, end_id: endId }),
  })
  const json = await resp.json()
  if (json.code !== 0 && json.code !== -1) {
    throw new Error(json.message || '请求失败')
  }
  return json.data || json
}

/**
 * Collect all records for a single pool type by paginating.
 */
async function collectPoolRecords(authkey, region, gameBiz, gachaType) {
  const allRecords = []
  let page = 1
  let endId = ''
  const size = 20

  for (let attempt = 0; attempt < 50; attempt++) {
    let data
    try {
      data = await proxyGachaPage(authkey, region, gameBiz, gachaType, page, size, endId)
    } catch (e) {
      if (page === 1) throw e
      break
    }

    const list = data.list || []
    if (list.length === 0) break

    const seen = new Set(allRecords.map(r => r.id))
    for (const rec of list) {
      if (rec.id && seen.has(rec.id)) continue
      seen.add(rec.id)
      allRecords.push(rec)
    }

    if (list.length < size) break
    endId = list[list.length - 1].id || ''
    page++
    await new Promise(r => setTimeout(r, 200))
  }

  return allRecords
}

/**
 * Import gacha records via proxy + save flow.
 * Bypasses CDN timeout: fast proxy calls (per page) + fast batch save.
 */
export async function importGacha(gachaUrl) {
  const apiKey = getAuthKey()
  if (!apiKey) {
    return { code: 401, message: '未绑定 API Key，请使用 #墨安绑定 绑定' }
  }

  // Extract authkey and region from URL
  const urlObj = new URL(gachaUrl.replace(/^https?:\/\//, 'https://'))
  const params = new URLSearchParams(urlObj.search)
  const authkey = params.get('authkey') || ''
  const region = params.get('region') || 'cn_gf01'
  const gameBiz = detectGameBiz(gachaUrl)

  if (!authkey) {
    return { code: 400, message: '链接中未找到 authkey' }
  }

  const gameNames = { hk4e_cn: '原神', hkrpg_cn: '星穹铁道', nap_cn: '绝区零' }
  const gameSym = { hk4e_cn: '#', hkrpg_cn: '*', nap_cn: '%' }

  try {
    let detectedBiz = gameBiz
    let uid = ''
    let allRecords = []
    const types = GACHA_TYPES[gameBiz] || GACHA_TYPES.hk4e_cn

    for (const gachaType of types) {
      try {
        const records = await collectPoolRecords(authkey, region, detectedBiz, gachaType)
        allRecords = allRecords.concat(records)
        if (!uid && records.length > 0 && records[0].uid) {
          uid = records[0].uid
        }
      } catch (e) {
        // First type failed entirely (likely wrong game detection)
        if (allRecords.length === 0 && gachaType === types[0]) {
          for (const [altBiz, altTypes] of Object.entries(GACHA_TYPES)) {
            if (altBiz === detectedBiz) continue
            try {
              const test = await collectPoolRecords(authkey, region, altBiz, altTypes[0])
              if (test.length > 0) {
                detectedBiz = altBiz
                allRecords = test
                if (test[0].uid) uid = test[0].uid
                for (const at of altTypes.slice(1)) {
                  try {
                    const recs = await collectPoolRecords(authkey, region, altBiz, at)
                    allRecords = allRecords.concat(recs)
                  } catch (e2) { /* skip */ }
                }
                break
              }
            } catch (e2) { /* skip */ }
          }
          break
        }
      }
      await new Promise(r => setTimeout(r, 100))
    }

    if (allRecords.length === 0) {
      return { code: 402, message: '未获取到任何抽卡记录，authkey 可能已过期' }
    }

    // Step 2: Save via save-records endpoint
    const base = getApiBase()
    const saveUrl = base + '/gacha/save-records'
    let totalSaved = 0

    const batchSize = 500
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize)
      const resp = await globalThis.fetch(saveUrl, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MATOOL-Plugin/Yunzai',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ game_biz: detectedBiz, uid, records: batch }),
      })
      const json = await resp.json()
      if (json.code === 0) {
        totalSaved += (json.data?.total_genshin || json.data?.total_starrail || json.data?.total_zzz || batch.length)
        if (json.data?.uid) uid = json.data.uid
      } else {
        throw new Error(json.message || '存库失败 (' + json.code + ')')
      }
      await new Promise(r => setTimeout(r, 200))
    }

    const gameName = gameNames[detectedBiz] || '原神'
    const sym = gameSym[detectedBiz] || '#'
    const gameKey = { hk4e_cn: 'gs', hkrpg_cn: 'sr', nap_cn: 'zzz' }[detectedBiz] || 'gs'

    return {
      code: 0,
      message: `解析成功！${gameName} UID: ${uid}，共导入 ${totalSaved} 条记录`,
      data: { game: gameKey, uid, imported: totalSaved },
    }
  } catch (e) {
    return { code: 408, message: '网络请求超时：' + e.message }
  }
}
