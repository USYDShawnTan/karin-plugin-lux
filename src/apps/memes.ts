import { karin, segment, logger } from 'node-karin'
import { MemesApi } from '@/utils/memes-api'
import { MemesStore } from '@/utils/memes-store'
import type { Message } from 'node-karin'
import { collectImages } from './memes/images'
import { prepareTexts } from './memes/texts'
import { buildArgsPayload } from './memes/args'
import { sendMemesHelp } from './memes/help'
import { runMemesUpdate } from './memes/update'
import { handleRandomMemes } from './memes/random'
import {
  initContext,
  getKeywordMap,
  getInfo,
  getDetail,
  incrementTrigger,
  resetContext
} from './memes/context'

const api = new MemesApi()
const store = new MemesStore()

const commandAll: ReturnType<typeof karin.command>[] = []

/** 表情包列表 */
export const memesList = karin.command(/^#?(meme(s)?|表情包)列表$/, async (e) => {
  const buf = store.readListImage()
  if (buf) {
    const base64 = buf.toString('base64')
    await e.reply(segment.image(`base64://${base64}`))
    return true
  }

  // 如果没有本地图片，尝试生成
  try {
    const keys = await api.getKeys()
    const listItems = keys.map(key => ({
      meme_key: key,
      disabled: false,
      labels: []
    }))
    const arr = await api.renderList(listItems)
    const buffer = Buffer.from(arr)
    store.saveListImage(buffer)
    await e.reply(segment.image(`base64://${buffer.toString('base64')}`))
  } catch (err) {
    await e.reply('memes 列表图片未找到，请先执行 #表情包更新')
  }
  return true
}, { name: '表情包列表' })

/** 随机meme */
export const randomMemes = karin.command(
  /^#?随机(meme(s)?|表情包|mm)$/,
  (e) => handleRandomMemes(e, memes),
  { name: '随机表情包' }
)

/** meme帮助 */
export const memesHelp = karin.command(/^#?(meme(s)?|表情包)帮助$/, (e) => sendMemesHelp(e), { name: '表情包帮助' })

/** meme搜索 */
export const memesSearch = karin.command(/^#?(meme(s)?|表情包)搜索/, async (e) => {
  const search = e.msg.replace(/^#?(meme(s)?|表情包)搜索/, '').trim()
  if (!search) {
    await e.reply('你要搜什么？')
    return true
  }

  await initContext()
  const keywordMap = getKeywordMap()
  const hits = Object.keys(keywordMap).filter(k => k.includes(search))
  let result = '搜索结果'
  if (hits.length > 0) {
    for (let i = 0; i < hits.length; i++) {
      result += `\n${i + 1}. ${hits[i]}`
    }
  } else {
    result += '\n无'
  }
  await e.reply(result)
  return true
}, { name: '表情包搜索' })

/** meme更新 */
export const memesUpdate = karin.command(
  /^#?(meme(s)?|表情包)更新$/,
  (e) => runMemesUpdate(e, commandAll, initAll, resetContext),
  { name: '表情包更新', permission: 'admin' }
)

/**
 * 表情包核心处理函数
 */
const memes = async (e: Message) => {
  await initContext()

  let msg = e.msg

  const keywordMap = getKeywordMap()
  const target = Object.keys(keywordMap).find(k => msg.startsWith(k))
  if (!target) return false

  const targetCode = keywordMap[target]
  const info = getInfo(targetCode)
  if (!info) return false

  // 处理参数
  const argsStr = msg.replace(target, '')
  if (argsStr.trim() === '详情' || argsStr.trim() === '帮助') {
    await e.reply(getDetail(targetCode))
    return true
  }

  // 先按 '#' 分割，不存在再按空格
  let text = '', args = ''
  if (argsStr.includes('#')) {
    [text, args = ''] = argsStr.split('#')
  } else {
    [text, args = ''] = argsStr.split(' ')
  }
  text = text?.trim() || ''

  try {
    const formData = new FormData()
    const paramsType = info.params_type
    const { max_images: maxImages, min_images: minImages, max_texts: maxTexts } = paramsType

    if (maxImages > 0) {
      const imgUrls = await collectImages(e, info)
      if (imgUrls.length < minImages) {
        await e.reply('图片数量不足，需要至少 ' + minImages + ' 张')
        return true
      }

      for (let i = 0; i < imgUrls.length; i++) {
        const imgUrl = imgUrls[i]
        const response = await fetch(imgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (!response.ok) continue

        const blob = await response.blob()
        const buffer = Buffer.from(await blob.arrayBuffer())
        formData.append('images', new Blob([buffer]), `image_${i}.jpg`)
      }
    }

    if (maxTexts > 0) {
      const textResult = await prepareTexts(e, info, text)
      if (textResult.error) {
        await e.reply(textResult.error)
        return true
      }
      textResult.texts.forEach(t => formData.append('texts', t))
    } else if (text) {
      await e.reply('该表情不支持文本内容')
      return true
    }

    const argsResult = await buildArgsPayload(targetCode, info, args, e)
    if (argsResult.error) {
      await e.reply(argsResult.error)
      return true
    }
    if (argsResult.json) {
      formData.set('args', argsResult.json)
    }

    const result = await api.renderMeme(targetCode, formData)
    const buffer = Buffer.from(result)
    const base64 = buffer.toString('base64')

    // 记录触发次数
    incrementTrigger(targetCode)

    await e.reply(segment.image(`base64://${base64}`))
    return true

  } catch (error) {
    logger.error('生成表情包失败', error)
    await e.reply('生成表情包失败，请稍后再试')
    return true
  }
}

/**
 * 初始化函数
 */
const initAll = async (forceRemote = false) => {
  await initContext(forceRemote)
  registerDynamicCommands()
}

/**
 * 动态注册命令
 */
function registerDynamicCommands () {
  // 清除旧命令
  commandAll.length = 0

  const keywordMap = getKeywordMap()
  Object.keys(keywordMap).forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const command = karin.command(new RegExp(`^${escapedKeyword}`), (e) => memes(e), {
      name: `meme-${keyword}`,
      priority: 500
    })
    commandAll.push(command)
  })

  logger.info(`动态注册 ${commandAll.length} 个表情包命令`)
}
// 启动时初始化
initAll().catch(err => {
  logger.error('表情包插件初始化失败', err)
})

export { commandAll }
