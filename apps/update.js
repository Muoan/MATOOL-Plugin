import plugin from '../../../lib/plugins/plugin.js'
import { update as Update } from '../../other/update.js'

export class matUpdate extends plugin {
  constructor() {
    super({
      name: 'MATOOL:更新',
      dsc: '更新 MATOOL-Plugin',
      event: 'message',
      priority: -10,
      rule: [
        {
          reg: /^#*墨安(强制|強制)?更新$/i,
          fnc: 'update',
        },
      ],
    })
  }

  async update() {
    if (!this.e.isMaster) {
      this.reply('暂无权限，只有主人才能操作')
      return true
    }
    this.e.isMaster = true
    if (this.e.at && !this.e.atme) return
    this.e.msg = `#${this.e.msg.includes('强制') || this.e.msg.includes('強制') ? '强制' : ''}更新MATOOL-Plugin`
    const up = new Update(this.e)
    up.e = this.e
    return up.update()
  }
}
