# karin-plugin-lux Agent 开发约定

本文件是本仓库的开发与发布约定。Agent 在修改代码前应先阅读本文件，并优先遵循仓库现有实现。

## 1. 目录边界

### 正式运行代码

- `src/apps/`：C 端实际加载的命令、事件、任务和功能入口。
- `src/utils/`：正式运行时工具代码。
- `src/config/`、`src/constants/`：正式配置与常量。
- `resources/`：正式运行时资源。

### 示例代码

- `examples/karin-template/`：Karin 官方模板/示例归档，仅供开发参考。
- 示例目录不得作为正式功能直接加载。
- 开发新功能时可以参考示例 API 写法，但必须按现有正式代码结构重新实现。

## 2. 开发原则

1. 修改前先检查相邻正式代码，优先复用现有模式，不重复造轮子。
2. 不要把测试命令、demo 命令、官方模板代码直接放回 `src/apps/`。
3. 新功能应尽量小改动、低耦合，并与已有命名、日志、错误处理风格保持一致。
4. 涉及图片仓库、本地缓存、外部服务时，优先复用已有初始化与认证方式。
5. 除非用户明确要求，否则不要引入新的长期密钥、Token 或重复环境变量。

## 3. 龙图 / 坤图约定

龙图仓库：

`https://git.acwing.com/XT/long.git`

坤图仓库：

`https://git.acwing.com/XT/ikun.git`

两者：

- 在插件加载阶段初始化，缺失时自动 `git clone --depth 1`。
- 共用 AcWing Git 认证环境变量：
  - `LUX_LONG_GIT_USERNAME`
  - `LUX_LONG_GIT_TOKEN`
- 不再额外创建 `LUX_IKUN_*` 一套认证变量。
- 仓库下载到运行时数据目录，不把图库打入 npm 包。
- 图片读取后以 Buffer/base64 方式发送。
- 坤图关键词是有意设计成“超宽包含匹配”，不要擅自收窄；例如 `坤`、`鸡`、`干嘛`、`小黑子`、`cxk`、`ikun`、`只因`、`蔡徐坤`、`鸡你太美`、`唱跳`、`rap`、`篮球`、`练习生`、`两年半`、`鸡脚` 等。

## 4. npm 发布流程

默认规则：**正式代码改完后直接发布 patch 版本，除非用户明确说“不要发布 / 先别发布”。**

流程：

1. 完成功能修改并提交到 `main`。
2. 读取 `package.json` 当前版本。
3. 默认执行 patch +1，例如 `1.1.5 -> 1.1.6`。
4. 版本提交信息使用：`chore: release x.y.z`。
5. `.github/workflows/release.yml` 检测新版本。
6. GitHub Actions 自动创建 `vx.y.z` Tag。
7. 使用 npm Trusted Publishing / OIDC 发布，不依赖长期 `NPM_TOKEN`。
8. 发布后检查 GitHub Actions Run 已正常触发，并向用户报告版本和状态。

版本语义：

- 用户只说“发布 / 发版本”：默认 `patch`。
- 用户明确说 `minor`：`1.1.6 -> 1.2.0`。
- 用户明确说 `major`：`1.2.0 -> 2.0.0`。

## 5. C 端更新

插件提供版本检查/更新能力时：

- 版本来源以 npm Registry 的 `karin-plugin-lux/latest` 为准。
- 更新使用 workspace 包管理方式，例如 `pnpm up karin-plugin-lux@latest -w`。
- 高风险更新动作只允许主人/管理员触发。
- 更新完成后明确提示重启 Karin 生效。

## 6. README 与文档

- README 面向最终用户，不要混入大量官方模板教学内容。
- Agent 开发细节、发布流程、内部约定放在本文件。
- Karin API 示例放在 `examples/karin-template/`。
- README 的风格、篇幅和功能展示方式在大改前先向用户确认。

## 7. 修改完成后的最低检查

提交前至少确认：

- 没有误把 demo 放进 `src/apps/`。
- 没有新增与已有功能重复的命令。
- TypeScript import 路径与现有 alias 规则一致。
- 外部仓库认证沿用既有 env。
- `package.json` 版本只在真正发布时增加。
- GitHub Actions 发布流程已触发；若失败，先看 Job/日志再继续加版本。
