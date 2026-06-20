/**
 * MATOOL-Plugin - 配置管理
 * 读写插件内预先存在的 data/ 文件
 */
import fs from 'node:fs'
import YAML from 'yaml'

const PluginPath = `${process.cwd()}/plugins/MATOOL-Plugin`

class Cfg {
  constructor() {
    this._data = {}
    this._loadAll()
  }

  _loadAll() {
    const dataDir = `${PluginPath}/data`
    if (!fs.existsSync(dataDir)) return
    for (const dir of fs.readdirSync(dataDir)) {
      const dirPath = `${dataDir}/${dir}`
      if (!fs.statSync(dirPath).isDirectory()) continue
      this._data[dir] = this._data[dir] || {}
      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
        const name = file.replace(/\.(yaml|yml)$/, '')
        try {
          const content = YAML.parse(fs.readFileSync(`${dirPath}/${file}`, 'utf8')) || {}
          this._data[dir][name] = content
        } catch (e) {
          logger.error(`[MATOOL] 加载 ${dir}/${file} 失败: ${e.message}`)
        }
      }
    }
  }

  /** 获取配置: get('KEY.MOANKEY.keys') */
  get(keyPath, def = null) {
    const keys = keyPath.split('.')
    let val = this._data
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k]
      } else {
        return def
      }
    }
    return val !== undefined ? val : def
  }

  getApiBase() {
    const base = this.get('API.MOANAPI.API_BASE')
    return base || 'https://record.muoan.com/api'
  }

  /** 取第一个 API Key（兼容字符串或对象格式）*/
  getFirstApiKey() {
    const keys = this.get('KEY.MOANKEY.keys')
    if (!Array.isArray(keys) || keys.length === 0) return ''
    const first = keys[0]
    return typeof first === 'string' ? first : (first.key || '')
  }

  /** 保存/清除 API Key */
  saveApiKey(key, owner = '') {
    const filePath = `${PluginPath}/data/KEY/MOANKEY.yaml`
    let keys = this.get('KEY.MOANKEY.keys')
    if (!Array.isArray(keys)) keys = []

    if (!key) {
      // 清除所有 Key
      keys = []
    } else {
      // 统一存字符串格式
      keys = keys.filter(k => (typeof k === 'string' ? k : k.key) !== key)
      keys.push(key)
    }

    this._data['KEY']['MOANKEY']['keys'] = keys
    this._writeYaml(filePath, { keys })
  }

  _writeYaml(filePath, data) {
    try {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'))
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, YAML.stringify(data, { indent: 2, lineWidth: 200 }), 'utf8')
    } catch (e) {
      logger.error(`[MATOOL] 写入 ${filePath} 失败: ${e.message}`)
    }
  }
}

export default new Cfg()
