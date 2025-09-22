import { dir } from '@/dir'
import { karin, render, segment, logger } from 'node-karin'
import { config } from '@/utils/config'
import path from 'node:path'

/**
 * 帮助页面
 * 触发指令: #帮助、#help、#功能列表
 */
export const help = karin.command(/^#?(帮助|help|功能列表)$/, async (e) => {
  try {
    // 获取配置中的功能列表
    const cfg = config()
    const helpList = cfg.helpList || []

    if (helpList.length === 0) {
      await e.reply('❌ 功能列表为空，请检查配置文件')
      return false
    }

    // HTML模板路径
    const htmlTemplate = path.join(dir.resourcesDir, "template/help.html")
    // 背景图片路径
    const backgroundImage = path.join(dir.resourcesDir, "image/lux.webp")

    // 生成功能列表HTML
    const helpListHTML = helpList.map((item, index) => `
      <div class="help-item">
        <div class="help-header">
          <div class="help-number">${index + 1}</div>
          <div class="help-name">${item.name}</div>
        </div>
        <div class="help-desc">${item.content}</div>
      </div>
    `).join('')

    // 渲染帮助页面
    const img = await render.render({
      name: 'help',
      encoding: 'base64',
      file: htmlTemplate,
      data: {
        backgroundImage: backgroundImage,
        pluginName: 'karin-plugin-lux',
        pluginInfo: '杂七杂八的小功能合集 v1.0.5',
        pluResPath: process.cwd(),
        helpListHTML: helpListHTML, // 传递预生成的HTML
      },
      pageGotoParams: {
        waitUntil: 'networkidle2',
      },
    })

    await e.reply(segment.image(`base64://${img}`))
    return true

  } catch (error) {
    logger.error('帮助页面渲染失败:', error)
    await e.reply('❌ 帮助页面渲染失败，请稍后再试')
    return false
  }
}, {
  /** 插件优先级 */
  priority: 9999,

  /** 插件触发是否打印触发日志 */
  log: true,

  /** 插件名称 */
  name: '帮助页面',

  /** 谁可以触发这个插件 */
  permission: 'all',
})