import { karin, segment } from 'node-karin'
import { getHitokoto, getSingleEmojiData, getComboEmojiData } from '../utils/api'
import emojiRegex from 'emoji-regex'
import { getConfig } from '@/config'
import { getRandomLongImageBuffer, initializeLongImages } from '@/utils/long-images'
import { getRandomIkunImageBuffer, initializeIkunImages } from '@/utils/ikun-images'

await Promise.all([
  initializeLongImages(),
  initializeIkunImages()
])

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

    const buffer = await getRandomLongImageBuffer()
    await e.reply(segment.image(`base64://${buffer.toString('base64')}`))
    return true

  } catch (error) {
    console.error('获取随机图片失败:', error)
    await e.reply('❌ 获取随机图片失败，请稍后再试')
    return false
  }
}, { name: '随机图片' })

/**
 * 超宽松坤图触发：消息里只要包含梗关键词就发一张随机坤图
 */
export const randomIkunImage = karin.command(/坤|鸡|干嘛|哎哟|哎呦|小黑子|ckx|cxk|ikun|只因|蔡徐坤|鸡你太美|唱跳|rap|篮球|练习生|两年半|鸡脚|露出鸡脚|你干嘛|哈哈哎哟/iu, async (e) => {
  try {
    const buffer = await getRandomIkunImageBuffer()
    await e.reply(segment.image(`base64://${buffer.toString('base64')}`))
    return true
  } catch (error) {
    console.error('获取随机坤图失败:', error)
    await e.reply('❌ 获取随机坤图失败，请稍后再试')
    return false
  }
}, { name: '随机坤图' })

/**
 * Emoji处理 - 检测消息中的emoji并自动发图
 */
export const emojiHandler = karin.command(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u, async (e) => {
  if (!getConfig().features.emoji.enabled) return false

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
