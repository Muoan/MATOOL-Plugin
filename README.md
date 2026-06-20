# 🎲 MATOOL-Plugin

墨安游戏助手 - 原神/星穹铁道/绝区零 抽卡统计分析

****

## 😍插件介绍

基于 [record.muoan.com](https://record.muoan.com) API 的抽卡数据查询与分析插件。
提供抽卡统计、深度分析、五星出货列表、命座统计、卡池分组、保底分布、水位监控等功能。

颜色使用蓝白配色清爽易读，支持多游戏符号区分。

****

## 😒安装插件

<details>
  <summary>展开/收起</summary>

**github：**

```bash
git clone --depth=1 https://github.com/Muoan/MATOOL-Plugin.git ./plugins/MATOOL-Plugin/
```

</details>

****

## 😁安装依赖

```bash
pnpm i
pnpm install --filter=MATOOL-Plugin
```

****

## 😘功能介绍

<details>
<summary>展开/收起</summary>

| 命令 | 说明 |
| --- | --- |
| `#帮助` | 查看本帮助 |
| `#版本` | 查看版本号与更新日志 |
| `#总结[uid]` | 原神抽卡统计总览 |
| `#分析[uid]` | 原神抽卡深度分析 |
| `#五星[uid]` | 原神五星出货列表 |
| `#抽卡[uid]` | 原神文字版抽卡记录 |
| `*总结[uid]` | 星铁抽卡统计（可换 `*分析` `*五星` `*抽卡`） |
| `%总结[uid]` | 绝区零抽卡统计（可换 `%分析` `%五星` `%抽卡`） |

> **游戏符号：** `#` 原神、`*` 星穹铁道、`%` 绝区零

</details>

****

## 🔧账号设置（仅主人）

| 命令 | 说明 |
| --- | --- |
| `#墨安绑定 [api_key]` | 绑定 API Key |
| `#墨安信息` | 查看 Key 配额余额 |
| `#墨安解绑` | 清除 API Key |
| `#墨安更新` | 拉取插件更新 |

****

## 🤝相关项目

- [record.muoan.com](https://record.muoan.com) - 墨安游戏数据 API
- [Ymoan-plugin](https://github.com/Muoan/Ymoan-plugin) - 墨安云插件

****

## 📄版本

v1.0.1
