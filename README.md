# 🎲 MATOOL-Plugin

墨安游戏助手 - 原神/星穹铁道/绝区零 抽卡统计分析

![ljhx2.png](https://raw.gitcode.com/user-images/assets/5424764/be7eaf0c-76b9-40dc-9e5f-dc47ebfadb8b/ljhx2.png 'ljhx2.png')
****
## 😍插件介绍：
提供基于 [record.muoan.com](https://record.muoan.com) API 的抽卡统计分析功能。
含抽卡统计、深度分析、五星出货列表、命座统计、卡池分组、保底分布、水位监控等功能，采用蓝白配色清晰易读。
支持 **UIGF v4.2 导出** 和 **UIGF v2.2 / v4.2 / 旧格式 导入**。

**本插件功能优先级可能高于您使用的插件，遇到问题请拉黑功能或删除本插件**

**本插件拒绝任何【非合理】提议~如遇到问题请卸载本插件或截图＋文字叙述提交issues或加入QQ群或Yunzai论坛反馈即可~**

**如您要参与项目请Pull提交欢迎共同参与此项目！**

****

## 😒安装插件：
<details>
  <summary>展开/收起</summary>

**GitHub：**

```bash
git clone --depth=1 https://github.com/Muoan/MATOOL-Plugin.git ./plugins/MATOOL-Plugin/
```

****

**Gitee：**

```bash
git clone --depth=1 https://gitee.com/muoan/MATOOL-Plugin.git ./plugins/MATOOL-Plugin/
```

****

**GitCode：**

```bash
git clone --depth=1 https://gitcode.com/muoan/MATOOL-Plugin.git ./plugins/MATOOL-Plugin/
```

</details>

****

## 😁安装依赖：
```bash
pnpm i
pnpm install --filter=MATOOL-Plugin
```

****

## 😘功能介绍
<details>
<summary>展开/收起</summary>

| 功能名称 | 功能命令 | 功能讲解 |
| --- | --- | --- |
| 帮助 | `#墨安帮助` | 查看本帮助 |
| 版本 | `#墨安版本` | 查看版本号与更新日志 |
| 抽卡统计 | `#总结[uid]` | 原神抽卡统计总览（`#` 原神 / `*` 星铁 / `%` 绝区零） |
| 抽卡分析 | `#分析[uid]` | 原神抽卡深度分析 |
| 五星列表 | `#五星[uid]` | 原神五星出货列表 |
| 抽卡记录 | `#抽卡[uid]` | 原神文字版抽卡记录 |
| 绑定Key | `#墨安绑定 [api_key]` | 绑定 API Key |
| 信息查询 | `#墨安信息` | 查看 API Key 配额余额 |
| 解绑 | `#墨安解绑` | 清除 API Key |
| 导出记录 | `#导出[UID]记录` | 导出 UIGF v4.2 JSON 文件 |
| 导入记录 | `#导入[UID]记录` | 发送 JSON / 抽卡链接 导入 |
| 抽卡链接导入 | 发送抽卡链接 | 自动解析米游社 authkey 并导入 |
| 插件更新 | `#墨安更新` | 拉取插件更新（仅主人） |

> **游戏符号：** `#` 原神 / `*` 星穹铁道 / `%` 绝区零
>
> **TRSS-Yunzai 用户注意：** `*` 和 `%` 会被自动替换为 `#星铁` / `#绝区零`，命令示例：
> - `*总结102264384记录` → `#星铁总结102264384记录`（星铁抽卡统计）
> - `*导出102264384记录` → `#星铁导出102264384记录`（星铁导出）
> - `%导出UID记录` → `#绝区零导出UID记录`（绝区零导出）

</details>

****

## 😂更新：
**在云崽Bot中发送 `#墨安更新` 或在目录执行 `git pull`**

**PS：遇到无法更新或错误提示可使用 `#墨安强制更新`**

****

## 😜交流：
**QQ群：[872488071](https://qm.qq.com/q/SA5dEJf6MM)**

**云崽论坛：[Yunzai论坛/文档](https://yzai.top)**

****

## 😊友情链接：
[Miao-Yunzai](https://gitee.com/yoimiya-kokomi/Miao-Yunzai)😠
[TRSS-Yunzai](https://gitee.com/TimeRainStarSky/Yunzai)

**API提供者：[record.muoan.com](https://record.muoan.com/)**

**部分代码/功能灵感借鉴：**

[Ymoan-Plugin](https://github.com/Muoan/Ymoan-plugin)

[插件库](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index)

****

## 😍其他：

**素材来源于网络，仅供交流学习使用，严禁用于商业和非法用途**

**交易问题/其他问题均已本插件无交换任何问题均与本插件无关**

**API图片仓库地址：https://github.com/Muoan/resource**

**API服务地址：https://record.muoan.com**
