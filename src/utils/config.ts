import path from "node:path"
import fs from "node:fs"
import {
  watch,
  logger,
  filesByExt,
  copyConfigSync,
  requireFileSync,
} from "node-karin"
import { dir } from "@/dir"

export interface Config {
  /** 一言API */
  yiyanApi: string
  /** API基础地址 */
  apiBaseUrl: string
  /** Emoji API基础地址 */
  emojiApiBaseUrl: string
  /** 帮助列表 */
  helpList: Array<{
    name: string
    content: string
  }>
  /** 主人ID */
  masterId: string
}

/**
 * @description 判断运行环境
 */
function isProd () {
  return process.env.NODE_ENV === "production"
}

/**
 * @description 配置文件路径（根据环境自动切换）
 * - 开发模式：写源码目录 config/config.json
 * - 生产模式：写运行时目录 @karinjs/karin-plugin-xxx/config/config.json
 */
export const configFile = path.join(
  isProd() ? dir.ConfigDir : dir.defConfigDir,
  "config.json"
)

/**
 * @description 初始化配置文件
 * - 启动时会把默认配置拷贝到运行时目录
 */
copyConfigSync(dir.defConfigDir, dir.ConfigDir, [".json"])

/**
 * @description 获取配置
 */
export const config = (): Config => {
  const def = requireFileSync(path.join(dir.defConfigDir, "config.json"))
  const cfg = requireFileSync(configFile)
  return { ...def, ...cfg }
}

/**
 * @description 保存配置
 */
export const saveConfig = (data: Config) => {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2), "utf-8")
  logger.info(`配置已保存到: ${configFile}`)
}

/**
 * @description 监听配置文件变化
 */
setTimeout(() => {
  const list = filesByExt(dir.ConfigDir, ".json", "abs")
  list.forEach(file =>
    watch(file, (old, now) => {
      logger.info(
        [
          "QAQ: 检测到配置文件更新",
          `旧数据: ${JSON.stringify(old, null, 2)}`,
          `新数据: ${JSON.stringify(now, null, 2)}`,
        ].join("\n")
      )
    })
  )
}, 2000)
