import { karin } from 'node-karin'
import { getTodayFortune, getHitokoto, getRandomImage } from '../utils/api'

/**
 * 获取今日运势
 */
export const fortune = karin.command(/^#*(今日运势|运势|jrys)$/, async (e) => {
  try {
    await e.reply('正在获取今日运势...')
    
    const data = await getTodayFortune()
    
    // 格式化今日运势响应数据
    let message = '🔮 今日运势\n\n'
    if (typeof data === 'string') {
      message += data
    } else if (data.fortuneSummary) {
      // 使用新的API响应结构
      message += `🎯 运势: ${data.fortuneSummary}\n`
      message += `✨ 幸运指数: ${data.luckyStar}\n\n`
      message += `📜 签文: ${data.signText}\n\n`
      if (data.unsignText) {
        message += `💡 解签: ${data.unsignText}`
      }
    } else {
      // 兼容旧格式或未知格式
      message += JSON.stringify(data, null, 2)
    }
    
    await e.reply(message)
    return true
    
  } catch (error) {
    console.error('获取今日运势失败:', error)
    await e.reply('❌ 获取今日运势失败，请稍后再试')
    return false
  }
}, { name: '今日运势' })

/**
 * 获取随机一言
 */
export const hitokoto = karin.command(/^#*(一言|随机一言|hitokoto)$/, async (e) => {
  try {
    await e.reply('正在获取随机一言...')
    
    const data = await getHitokoto()
    
    // 简单格式化响应数据
    let message = '💭 '
    if (typeof data === 'string') {
      message += data
    } else if (data.hitokoto) {
      message += data.hitokoto
      if (data.from) message += `\n\n📖 出处: ${data.from}`
      if (data.from_who) message += `\n👤 作者: ${data.from_who}`
    } else {
      message += JSON.stringify(data, null, 2)
    }
    
    await e.reply(message)
    return true
    
  } catch (error) {
    console.error('获取随机一言失败:', error)
    await e.reply('❌ 获取随机一言失败，请稍后再试')
    return false
  }
}, { name: '随机一言' })

/**
 * 获取随机图片
 */
export const randomImage = karin.command(/^#*(龙|long)$/, async (e) => {
  try {
    await e.reply('nmsl...')
    
    const data = await getRandomImage()
    
    // 处理图片响应
    const imageUrl = data.image_url
    
    if (imageUrl) {
      await e.reply([
        { type: 'image', file: imageUrl }
      ])
    } else {
      await e.reply('❌ 获取图片失败，请稍后再试')
    }
    return true
    
  } catch (error) {
    console.error('获取随机图片失败:', error)
    await e.reply('❌ 获取随机图片失败，请稍后再试')
    return false
  }
}, { name: '随机图片' })

