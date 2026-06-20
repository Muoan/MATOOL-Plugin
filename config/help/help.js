export const helpCfg = {
  themeSet: false,
  title: 'MATOOL 使用帮助',
  subTitle: '墨安游戏助手',
  colWidth: 265,
  theme: 'all',
  themeExclude: ['default'],
  colCount: 3,
  bgBlur: true,
}

export const helpList = [
  {
    group: '抽卡查询',
    list: [
      {
        icon: 62,
        title: '#总结[uid]',
        desc: '查看原神抽卡总结图片',
      },
      {
        icon: 67,
        title: '#分析[uid]',
        desc: '深度分析原神抽卡',
      },
      {
        icon: 77,
        title: '#五星[uid]',
        desc: '原神五星出货列表',
      },
      {
        icon: 35,
        title: '#抽卡[uid]',
        desc: '文字版抽卡记录',
      },
      {
        icon: 38,
        title: '*总结[uid]',
        desc: '星铁抽卡（同样可用分析/五星/抽卡/导出/导入）',
      },
      {
        icon: 41,
        title: '%总结[uid]',
        desc: '绝区零抽卡（同样可用分析/五星/抽卡/导出/导入）',
      },
    ],
  },
  {
    group: '记录管理',
    list: [
      {
        icon: 84,
        title: '#导出UID记录',
        desc: '导出 UIGF v4.2 JSON 文件',
      },
      {
        icon: 85,
        title: '#导入UID记录',
        desc: '支持 UIGF v4.2 / v2.2 / 旧格式',
      },
      {
        icon: 73,
        title: '链接导入',
        desc: '发送抽卡链接自动导入到服务器',
      },
      {
        icon: 79,
        title: '多游戏导出',
        desc: '# 原神 / * 星铁 / % 绝区零',
      },
    ],
  },
  {
    group: '账号设置（仅主人）',
    list: [
      {
        icon: 58,
        title: '#墨安绑定 [key]',
        desc: '绑定 API Key',
      },
      {
        icon: 55,
        title: '#墨安信息',
        desc: '查看 Key 配额',
      },
      {
        icon: 254,
        title: '#墨安解绑',
        desc: '清除 API Key',
      },
    ],
  },
  {
    group: '其他',
    list: [
      {
        icon: 61,
        title: '#墨安帮助',
        desc: '查看本帮助',
      },
      {
        icon: 73,
        title: '#墨安更新',
        desc: '更新插件（仅主人）',
      },
      {
        icon: 84,
        title: '游戏符号',
        desc: '#原神 / *星铁 / %绝区零',
      },
    ],
  },
]
