# karin-plugin-lux

> 一个基于 [KarinJS](https://github.com/KarinJS/Karin) 的杂七杂八小功能合集。  
> 有正经功能，也有一点不太正经的东西。

[![npm version](https://img.shields.io/npm/v/karin-plugin-lux.svg)](https://www.npmjs.com/package/karin-plugin-lux)
[![license](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](./LICENSE)
[![Karin](https://img.shields.io/badge/KarinJS-plugin-orange.svg)](https://github.com/KarinJS/Karin)

## ✨ 这是什么

`karin-plugin-lux` 是一个面向 KarinJS 的功能型插件集合。

目前主要包含：

- 🔮 今日运势 / 打卡
- 💭 随机一言
- 🐉 随机龙图
- 🐔 随机坤图——关键词故意匹配得很宽，小黑子注意言辞
- 😂 Meme 表情包
- 😀 Emoji 图片处理与双 Emoji 合成
- 💰 虚拟金币 / 虚拟股票等娱乐功能
- 🎲 随机数
- 🔄 插件版本检查与 C 端更新
- 👆 戳一戳互动

功能会继续往里塞，主打一个：能用、好玩、别太严肃。

## 📦 安装

在 Karin 根目录执行：

```bash
pnpm add karin-plugin-lux -w
```

安装完成后重启 Karin。

更新到最新版：

```bash
pnpm up karin-plugin-lux@latest -w
```

也可以直接在机器人里使用：

```text
#lux版本
#lux更新
```

其中 `#lux更新` 仅允许主人触发，执行完成后建议重启 Karin。插件会从 npm Registry 检查最新版本。

## 🎮 常用功能

### 今日运势

```text
今日运势
打卡
jrys
```

每天获取运势信息，并结合插件内金币逻辑完成每日打卡。

### 随机一言

```text
一言
随机一言
hitokoto
```

返回随机语句，并尽可能附带出处和作者信息。

### 龙图

```text
#龙
#long
```

龙图不打包进 npm。插件启动时会检查本地运行数据目录，没有图库时自动从远端仓库浅克隆：

```text
https://git.acwing.com/XT/long.git
```

然后从本地图库随机读取一张图片发送。

### 坤图

坤图同样采用本地图库机制，远端仓库：

```text
https://git.acwing.com/XT/ikun.git
```

它不要求 `#` 前缀，而是采用故意设计的“超宽包含匹配”。

例如消息中出现这些词，都可能触发：

```text
坤
鸡
干嘛
小黑子
cxk
ikun
只因
蔡徐坤
鸡你太美
唱跳
rap
篮球
练习生
两年半
鸡脚
```

所以像：

```text
今天吃鸡
你干嘛哈哈
练习生怎么了
露出鸡脚了吧
```

都有概率现场掉落一张坤图。

这不是误触，这是设计目标。

### Meme 表情包

```text
#meme帮助
```

查看 Meme 相关能力和具体用法。

### Emoji

直接发送 Emoji 即可触发对应图片处理；部分场景支持两个 Emoji 合成。

### 插件帮助

```text
#帮助
#help
#功能列表
```

插件会渲染当前功能帮助页面。

## 🖼️ 龙图 / 坤图仓库认证

龙图和坤图都托管在 AcWing GitLab，并共用同一套认证配置。

如果仓库访问需要登录，请在 Karin 运行环境设置：

```bash
LUX_LONG_GIT_USERNAME=你的AcWing用户名
LUX_LONG_GIT_TOKEN=具有read_repository权限的Token
```

插件启动时会并行初始化两套图库：

```text
Karin 启动
   ↓
karin-plugin-lux 加载
   ↓
┌───────────────────┬───────────────────┐
│ initializeLong    │ initializeIkun    │
│ XT/long.git       │ XT/ikun.git       │
└───────────────────┴───────────────────┘
   ↓
本地不存在 → git clone --depth 1
   ↓
运行时随机读取图片
```

图库只保存在运行数据目录，不会随着 npm 包一起分发。

## ⚙️ 更新机制

查询当前版本：

```text
#lux版本
```

插件会对比：

```text
当前 package.json version
        ↓
npm Registry karin-plugin-lux/latest
```

主人可以执行：

```text
#lux更新
```

底层会运行：

```bash
pnpm up karin-plugin-lux@latest -w
```

然后提示重启 Karin 生效。

## 🧩 项目结构

```text
karin-plugin-lux/
├── src/
│   ├── apps/              # C 端实际加载的功能
│   ├── utils/             # 正式运行时工具
│   ├── config/            # 配置
│   └── constants/         # 常量
├── resources/             # 正式静态资源 / HTML 模板
├── examples/
│   └── karin-template/    # Karin 官方模板/示例，仅供开发参考
├── agent.md               # Agent 开发与自动发布约定
└── .github/workflows/
    └── release.yml        # npm 自动发布
```

`examples/karin-template/` 不参与 C 端插件加载。里面保留了 Karin 的命令、Handler、Render、主动消息、转发、Task 等 API 示例，方便后续开发参考，而不会把一堆 `#测试xxx` 注册到实际机器人。

## 🚀 开发与发布

本项目使用 GitHub Actions + npm Trusted Publishing / OIDC 自动发布。

大致链路：

```text
功能开发完成
   ↓
提交 main
   ↓
package.json patch +1
   ↓
GitHub Actions
   ↓
自动创建 vx.y.z Tag
   ↓
npm Trusted Publishing / OIDC
   ↓
npm publish
```

仓库内 Agent 修改代码时应优先阅读 [`agent.md`](./agent.md)。其中记录了：

- 正式代码与示例代码边界
- 龙图 / 坤图初始化方式
- AcWing Git 认证变量
- C 端更新规则
- 默认 patch 自动发版规则
- GitHub Actions / npm OIDC 发布流程

## 🤝 鸣谢

本项目开发过程中参考了部分开源项目与 Karin 社区实现。

部分代码参考：

- [ikechan8370/yunzai-meme](https://github.com/ikechan8370/yunzai-meme)

相关项目：

- [KarinJS / Karin](https://github.com/KarinJS/Karin)
- [Karin 文档](https://karin.fun)

感谢所有相关开源项目与贡献者。

## 🧷 License

本项目使用 [GPL-3.0](./LICENSE) 许可证。
