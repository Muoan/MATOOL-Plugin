import fs from 'node:fs'

const PluginPath = process.cwd() + '/plugins/MATOOL-Plugin'
const YunzaiPath = process.cwd()

// 读取插件 package.json
let pluginPkg = {}
try {
  pluginPkg = JSON.parse(fs.readFileSync(PluginPath + '/package.json', 'utf8'))
} catch (e) { /* ignore */ }

// 读取 Yunzai package.json
let yunzaiPkg = {}
try {
  yunzaiPkg = JSON.parse(fs.readFileSync(YunzaiPath + '/package.json', 'utf8'))
} catch (e) { /* ignore */ }

const isMiao = !!yunzaiPkg.dependencies?.sequelize || !!global.Bot?.versions?.miao
const isTrss = !!yunzaiPkg.name?.toLowerCase().includes('trss') || Array.isArray(global.Bot?.uin)

const Version = {
  pluginName: pluginPkg.name || 'MATOOL-Plugin',
  version: pluginPkg.version || '1.0.0',
  isMiao,
  isTrss,
  get yunzai() {
    let v = global.Bot?.version
    if (typeof v === 'string') return v
    if (v?.trss) return v.trss
    if (v?.miao) return v.miao
    return yunzaiPkg.version || '3.0.0'
  },
  changelogs: [
    {
      version: '1.0.1',
      logs: [
        {
          title: '全新改版',
          logs: [
            '修复歪率字段（won/lost/guaranteed）',
            '新增命座统计、卡池分组汇总',
            '蓝白配色全面改版（浅蓝底+白卡）',
            '命令格式改为 #总结/#分析/#五星 + 符号区分游戏',
            '新增 #墨安更新 插件更新功能',
            '#墨安绑定/信息/解绑 改为仅主人可用',
            'API Key 读写兼容字符串格式',
            '新增无保底/歪了大保底等状态标签',
            '进度条显示抽数/水位',
            '保底分布可视化',
            '优先级最高防命令冲突',
          ],
        },
      ],
    },
  ],
}

export default Version
