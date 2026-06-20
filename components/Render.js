import { Version } from './index.js'

const PluginPath = process.cwd() + '/plugins/MATOOL-Plugin'

function scale(pct = 1) {
  return `style=transform:scale(${pct})`
}

const Render = {
  async render(path, params, cfg = { retType: 'default', saveId: '' }) {
    const { e } = cfg
    if (!e?.runtime) {
      throw new Error('未找到 e.runtime，请升级至最新版 Yunzai')
    }
    const BotName = Version.isTrss ? 'TRSS-Yunzai' : Version.isMiao ? 'Miao-Yunzai' : 'Yunzai-Bot'
    const layoutPath = PluginPath + '/resources/common/layout/'
    return e.runtime.render('MATOOL-Plugin', path, params, {
      retType: cfg.retType,
      beforeRender({ data }) {
        const resPath = data.pluResPath || PluginPath + '/resources/'
        // 匹配 Ymoan 模式：pluginName span 不闭合，由 copyright 尾部的 </span> 闭合
        let pluginName = ''
        if (data.pluginName !== false) {
          let pn = data.pluginName || Version.pluginName
          pluginName = ' & ' + pn
          if (data.pluginVersion !== false) {
            let pv = data.pluginVersion || Version.version
            pluginName += '<span class="version">' + pv
          }
        }
        return {
          ...data,
          saveId: (cfg.saveId || e?.user_id || data.saveId) + '_' + Math.random().toString().slice(-6),
          _res_path: resPath,
          _ws_path: resPath,
          _layout_path: layoutPath,
          _tpl_path: PluginPath + '/resources/common/tpl/',
          defaultLayout: layoutPath + 'default.html',
          elemLayout: layoutPath + 'elem.html',
          sys: {
            scale: scale(cfg.scale || 1),
          },
          copyright: 'Created By ' + BotName + '<span class="version">' + Version.yunzai + '</span>' + pluginName + '</span>',
          pageGotoParams: {
            waitUntil: 'networkidle2',
          },
        }
      },
    })
  },
}

export default Render
