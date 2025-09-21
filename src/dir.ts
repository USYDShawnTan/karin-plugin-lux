import path from "node:path"
import { URL, fileURLToPath } from "node:url"
import { fs, karinPathBase, requireFileSync } from "node-karin"

/** 插件包绝对路径（源码目录根） */
const pluginDir = fileURLToPath(new URL("../", import.meta.url))

/** 插件包目录名称 */
const pluginName = path.basename(pluginDir)

/** package.json 内容 */
const pkg = requireFileSync(path.join(pluginDir, "package.json"))

/**
 * 插件目录信息（开发 / 生产兼容）
 */
export const dir = {
  /** 源码根目录 */
  pluginDir,

  /** 插件目录名称 */
  pluginName,

  /** package.json */
  pkg,

  /** 插件版本号 */
  get version() {
    return pkg.version
  },

  /** 插件名称（package.json 的 name） */
  get name() {
    return pkg.name
  },

  /** 插件默认配置目录（源码目录下） */
  get defConfigDir() {
    return path.join(pluginDir, "config")
  },

  /** 在 `@karinjs` 下的目录路径 */
  get karinPath() {
    return path.join(karinPathBase, pluginName)
  },

  /** 插件配置目录（运行时路径） */
  get ConfigDir() {
    return path.join(this.karinPath, "config")
  },

  /** 插件资源目录（运行时路径：@karinjs/karin-plugin-xxx/resources） */
  get defResourcesDir() {
    return path.join(this.karinPath, "resources")
  },

  /**
   * 插件资源目录（增强版：开发 / 生产自动兼容）
   * - 开发时：使用源码目录的 resources
   * - 生产时：使用 @karinjs 下的 resources
   */
  get resourcesDir() {
    const devPath = path.join(this.pluginDir, "resources")
    // 优先用源码目录（开发时）
    if (process.env.NODE_ENV !== "production" && fs.existsSync(devPath)) {
      return devPath
    }
    // fallback 到运行时目录
    return this.defResourcesDir
  }
}
