#源站重构中插件暂无法使用


# 🎲 MATOOL-Plugin

本插件基于墨安游戏助手（MoAn Game Assistant）开发

![ljhx2.png](https://raw.gitcode.com/user-images/assets/5424764/be7eaf0c-76b9-40dc-9e5f-dc47ebfadb8b/ljhx2.png 'ljhx2.png')
****
## 😍插件介绍：
**本插件基于墨安游戏助手（MoAn Game Assistant）开发**，提供抽卡分析、云端抽卡记录导入/导出/拉取/上传等功能，数据存取均通过墨安助手 API。


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
| 抽卡分析 | `#分析[uid]` | 原神抽卡分析图（`#` 原神 / `*` 星铁 / `%` 绝区零），**无需 Key，直接出图** |
| 抽卡记录 | `#抽卡[uid]` | 文字版抽卡记录 |
| 绑定Key | `#墨安绑定[key]` | **所有用户**绑定自己的 Key（按 QQ 存储，如 `#墨安绑定mo-123456786`） |
| Key获取 | `#墨安key获取` | 官网/注册/Key 获取方法说明 |
| 设置公用Key | `#墨安设置公用[key]` | **仅主人**：保存公用 Key（不自动开启，需 `#墨安切换公用模式` 启用） |
| 切换公用模式 | `#墨安切换公用模式` | **仅主人**：启用公用模式（需已设置公用 Key） |
| 切换个人模式 | `#墨安切换个人模式` | **仅主人**：关闭公用模式（保留公用 Key，可随时切回） |
| 导出记录 | `#导出[UID]记录` | 导出 UIGF JSON 文件（命令后加 `v22` 可导出 v2.2，**需先绑定 Key**） |
| 导入记录 | `#导入[UID]记录` | 导入抽卡记录（**需先绑定 Key**） |
| 拉取云端 | `#拉取[UID]云端记录` | 云端记录拉取写入本地 genshin/miao 目录（个人 Key 优先；发送链接验证归属） |
| 上传记录 | `#上传[UID]云端` | 上传本地抽卡记录到云端（个人 Key 优先；仅限本地其他插件如 genshin-plugin 保存的记录） |
| 全部上传 | `#全部记录上传云端` | **仅主人**：本地全部原神+星铁记录上传到公用 Key 账号 |
| 链接自动导入 | 发送抽卡链接 | 自动解析米游社 authkey 并导入（需绑定 Key） |
| 禁用链接解析 | `#禁用链接解析` | **仅主人**：关闭链接自动解析，不抢占其他插件 |
| 启用链接解析 | `#启用链接解析` | **仅主人**：重新开启链接自动解析 |
| 插件更新 | `#墨安更新` | 拉取插件更新（仅主人） |

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

[插件库](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index)

****

## 😍其他：

**素材来源于网络，仅供交流学习使用，严禁用于商业和非法用途**

**交易问题/其他问题均已本插件无交换任何问题均与本插件无关**

**API服务地址：https://record.muoan.com**
