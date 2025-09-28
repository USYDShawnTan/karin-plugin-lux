import { karin } from 'node-karin'
import { getTodayFortune, getHitokoto, getRandomLongImage, getSingleEmojiData, getComboEmojiData } from '../utils/api'
import { checkInDaily, formatBalance } from '../utils/money'
import emojiRegex from 'emoji-regex'

/**
 * 获取今日运势
 */
export const fortune = karin.command(/^#*(今日运势|打卡|jrys)$/, async (e) => {
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

    try {
      const userId = e.userId ?? e.sender?.userId
      if (userId) {
        const result = await checkInDaily(String(userId))
        if (result.already) {
          message += `\n\n💰 今日已打卡，当前余额：${formatBalance(result.balance)}`
        } else {
          message += `\n\n💰 打卡成功！获得 ${result.reward} 金币，当前余额：${formatBalance(result.balance)}`
        }
      }
    } catch (err) {
      console.error('打卡奖励失败:', err)
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

    const data = await getRandomLongImage()

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

/**
 * Emoji处理 - 检测消息中的emoji并自动发图
 */
export const emojiHandler = karin.command(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u, async (e) => {
  try {
    const emojis = e.msg.match(emojiRegex())

    if (!emojis || emojis.length === 0) return false

    let imageUrl: string | null = null

    if (emojis.length === 1) {
      // 单个emoji - 获取GIF
      imageUrl = await getSingleEmojiData(emojis[0])
    } else {
      // 两个emoji合成 (取前两个)
      imageUrl = await getComboEmojiData(emojis[0], emojis[1])

      // 如果合成失败，尝试发送第一个emoji
      if (!imageUrl) {
        imageUrl = await getSingleEmojiData(emojis[0])
      }
    }

    if (imageUrl) {
      await e.reply([{ type: 'image', file: imageUrl }])
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('emoji处理失败:', error)
    return false
  }
}, { name: 'emoji处理' })
