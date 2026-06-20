/**
 * MATOOL-Plugin - API 请求模块
 */
import https from 'https'
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

/**
 * Direct fetch bypassing CDN - connects to origin server IP directly
 * with proper Host header for virtual hosting support.
 */
const ORIGIN_IP = '198.44.177.135'

function fetchOrigin(urlStr, options = {}) {
  const u = new URL(urlStr)
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: ORIGIN_IP,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        Host: u.hostname,
        ...options.headers,
      },
      servername: u.hostname,
      rejectUnauthorized: false,
    }
    const req = https.request(reqOpts, (res) => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode < 400, statusCode: res.statusCode, json: () => JSON.parse(data) })
        } catch (e) {
          reject(new Error('响应解析失败: ' + data.slice(0, 100)))
        }
      })
    })
    req.on('error', reject)
    if (options.timeout) {
      req.setTimeout(options.timeout, () => { req.destroy(); reject(new Error('连接超时')) })
    }
    if (options.body) req.write(options.body)
    req.end()
  })
}

/**
 * Import gacha records via URL - sends URL to server's /api/gacha/import-link endpoint.
 * Uses direct origin connection to bypass CDN timeout issues.
 *
 * @param {string} gachaUrl - The full gacha URL (hoyolab/mihoyo authkey URL)
 * @returns {{ code: number, message: string, data?: { game: string, uid: string, imported: number } }}
 */
export async function importGacha(gachaUrl) {
  const apiKey = getAuthKey()
  if (!apiKey) {
    return { code: 401, message: '未绑定 API Key，请使用 #墨安绑定 绑定' }
  }

  const base = getApiBase()
  try {
    const url = base + '/gacha/import-link'
    const resp = await fetchOrigin(url, {
      method: 'POST',
      timeout: 150000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MATOOL-Plugin/Yunzai',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ link: gachaUrl }),
    })
    const json = await resp.json()

    if (json.code === 0 && json.data) {
      const data = json.data
      const gameBiz = data.game_biz || ''
      const gameMap = { hk4e_cn: 'gs', hkrpg_cn: 'sr', nap_cn: 'zzz' }
      const game = gameMap[gameBiz] || 'gs'
      const gameName = { gs: '原神', sr: '星穹铁道', zzz: '绝区零' }[game] || game
      const imported = data.total_genshin || data.total_starrail || data.total_zzz || 0
      if (imported > 0) {
        return {
          code: 0,
          message: '解析成功！' + gameName + ' UID: ' + (data.uid || '') + '，共导入 ' + imported + ' 条记录',
          data: { game, uid: data.uid, imported },
        }
      }
      // Server returned code 0 but 0 records imported — likely authkey expired
      return { code: 402, message: data.message || '未导入任何记录，抽卡链接可能已过期' }
    }

    const errMsg = json.message || '请求失败 (' + json.code + ')'
    return { code: json.code || 500, message: errMsg }
  } catch (e) {
    return { code: 408, message: '网络请求超时：' + e.message }
  }
}
