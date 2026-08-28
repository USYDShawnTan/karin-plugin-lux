import path from "node:path"
import { URL, fileURLToPath } from "node:url"
import { karinPathBase, requireFileSync } from "node-karin"

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
  /** 插件源码 / 包根目录 */
  root: pluginDir,

  /** 插件目录名称 */
  pluginName,

  /** package.json */
  pkg,

  /** 插件版本号 */
  get version () {
    return pkg.version
  },

  /** 插件名称（package.json 的 name） */
  get name () {
    return pkg.name
  },

  /** 插件默认配置目录（源码目录下） */
  get defaultConfig () {
    return path.join(pluginDir, "config")
  },

  /** 在 `@karinjs` 下的目录路径 */
  get runtimeRoot () {
    return path.join(karinPathBase, pluginName)
  },

  /** 插件配置目录（运行时路径） */
  get runtimeConfig () {
    return path.join(this.runtimeRoot, "config")
  },

  /** 插件数据目录（运行时路径：@karinjs/karin-plugin-xxx/data） */
  get runtimeData () {
    return path.join(this.runtimeRoot, "data")
  },

  /** memes 专用数据目录（运行时路径：@karinjs/karin-plugin-xxx/data/memes） */
  get memesData () {
    return path.join(this.runtimeData, "memes")
  },

  /**
   * 插件资源目录（增强版：开发 / 生产自动兼容）
   * - 开发时：使用源码目录的 resources
   * - 生产时：使用 @karinjs 下的 resources
   */
  get resources () {
    return path.join(pluginDir, "resources")
  }
}
