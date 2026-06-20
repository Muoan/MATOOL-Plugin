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
      version: '1.0.0',
      logs: [
        {
          title: 'MATOOL-Plugin 正式版',
          logs: [
            '原神/星穹铁道/绝区零 抽卡统计分析',
            '#总结/#分析/#五星 + 符号区分游戏',
            '歪率/命座/保底分布可视化',
            '#导出UID记录 / #导入UID记录',
            '服务端 authkey 验证/导入/导出',
            'Web 端抽卡记录上传与管理面板',
          ],
        },
        {
          title: '修复与改进',
          logs: [
            '修复 TRSS-Yunzai * / % 前缀无法触发的问题',
            '修复 导入与导出双handler 冲突（402错误）',
            '新增 UIGF v2.2 格式导入支持',
            '修复 QQ 机器人文件下载兼容性',
            '修复 导出时游戏检测（*星铁 / %绝区零）',
            '服务端修复 api_key_owner 匹配问题',
            '服务端导出统一使用 UIGF v4.2 格式',
            '导出时 info 字段置于最前，与网站一致',
          ],
        },
      ],
    },
  ],
}

export default Version
