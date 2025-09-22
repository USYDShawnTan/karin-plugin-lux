import { karin, segment, logger, fs } from 'node-karin'
import { MemesApi, type MemeInfo } from '@/utils/memes-api'
import { MemesStore } from '@/utils/memes-store'
import type { Message, AtElement } from 'node-karin'

const api = new MemesApi()
const store = new MemesStore()

let keyMap: Record<string, string> = {}
let infos: Record<string, MemeInfo> = {}
let triggerCounts: Record<string, number> = {}

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
export const randomMemes = karin.command(/^#?随机(meme(s)?|表情包|mm)$/, async (e) => {
  const keys = Object.keys(infos).filter(key =>
    infos[key].params_type.min_images === 1 && infos[key].params_type.min_texts === 0
  )

  if (keys.length === 0) {
    await e.reply('暂无可随机的表情包')
    return true
  }

  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  const info = infos[randomKey]
  e.msg = info.keywords[0]

  return await memes(e)
}, { name: '随机表情包' })

/** meme帮助 */
export const memesHelp = karin.command(/^#?(meme(s)?|表情包)帮助$/, async (e) => {
  await e.reply([
    '【表情包列表】：查看支持的表情包列表',
    '【表情包名称】：发送表情包名称，根据提供的文字或图片制作表情包',
    '【随机表情包】：随机制作一个表情包',
    '【表情包搜索+关键词】：搜索表情包关键词',
    '【表情包名称+详情】：查看该表情包所支持的参数',
    '【表情包更新】：更新表情包数据'
  ].join('\n'))
  return true
}, { name: '表情包帮助' })

/** meme搜索 */
export const memesSearch = karin.command(/^#?(meme(s)?|表情包)搜索/, async (e) => {
  const search = e.msg.replace(/^#?(meme(s)?|表情包)搜索/, '').trim()
  if (!search) {
    await e.reply('你要搜什么？')
    return true
  }

  const hits = Object.keys(keyMap).filter(k => k.includes(search))
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
export const memesUpdate = karin.command(/^#?(meme(s)?|表情包)更新$/, async (e) => {
  await e.reply('表情包资源更新中...')

  try {
    // 清除旧的动态命令
    commandAll.length = 0

    await init()
    await e.reply('更新完成！')
  } catch (err) {
    logger.error('表情包更新失败', err)
    await e.reply('更新失败：' + (err as Error).message)
  }
  return true
}, { name: '表情包更新', permission: 'admin' })

/**
 * 表情包核心处理函数
 */
const memes = async (e: Message) => {
  let msg = e.msg

  // 找到匹配的关键词
  let target = Object.keys(keyMap).find(k => msg.startsWith(k))
  if (!target) return false

  const targetCode = keyMap[target]
  const info = infos[targetCode]
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

    // 处理图片
    if (info.params_type.max_images > 0) {
      const imgUrls = await collectImages(e, info)

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

    // 处理文字
    if (info.params_type.max_texts > 0) {
      if (!text && info.params_type.min_texts > 0) {
        // 使用默认文字（用户昵称或@的用户昵称）
        const defaultText = await getDefaultText(e)
        formData.append('texts', defaultText)
      } else if (text) {
        const texts = text.split('/', info.params_type.max_texts)

        if (texts.length < info.params_type.min_texts) {
          await e.reply(`文字不够！需要至少${info.params_type.min_texts}个，用/分隔`)
          return true
        }

        texts.forEach(t => formData.append('texts', t.trim()))
      }
    }

    // 处理特殊参数
    if (args && info.params_type.args_type) {
      const userInfos = await getUserInfos(e)
      const argsJson = handleArgs(targetCode, args, userInfos)
      if (argsJson) {
        formData.set('args', argsJson)
      }
    }

    // 调用API生成表情包
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
 * 收集图片URLs
 */
async function collectImages (e: Message, info: MemeInfo): Promise<string[]> {
  let imgUrls: string[] = []

  // 1. 从消息中的图片获取
  const imgElements = e.elements?.filter(el => el.type === 'image') || []
  imgUrls.push(...imgElements.map((img: any) => img.file || img.url))

  // 2. 从回复消息中获取图片
  if (e.replyId && imgUrls.length < info.params_type.max_images) {
    try {
      const replyMsg = await e.bot.getMsg(e.contact, e.replyId)
      const replyImages = replyMsg.elements?.filter(el => el.type === 'image') || []
      imgUrls.push(...replyImages.map((img: any) => img.file || img.url))
    } catch (err) {
      // 忽略获取回复消息失败的错误
    }
  }

  // 3. 从@的用户头像获取
  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []
  if (atElements.length > 0 && imgUrls.length < info.params_type.max_images) {
    for (const atEl of atElements) {
      if (imgUrls.length >= info.params_type.max_images) break
      const avatarUrl = await e.bot.getAvatarUrl(atEl.targetId)
      imgUrls.push(avatarUrl)
    }
  }

  // 4. 如果还没有图片或不够，使用发送者头像
  if (imgUrls.length === 0 || imgUrls.length < info.params_type.min_images) {
    const senderAvatar = await e.bot.getAvatarUrl(e.userId)
    imgUrls.unshift(senderAvatar) // 放在最前面
  }

  // 限制图片数量
  return imgUrls.slice(0, info.params_type.max_images)
}

/**
 * 获取默认文字（用户昵称）
 */
async function getDefaultText (e: Message): Promise<string> {
  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []

  if (atElements.length > 0) {
    return atElements[0].name || '未知用户'
  }

  // 获取发送者信息
  if (e.isGroup) {
    try {
      const memberInfo = await e.bot.getGroupMemberInfo(e.groupId, e.userId)
      return memberInfo.card || memberInfo.nick || '未知用户'
    } catch (err) {
      return e.sender?.nick || '未知用户'
    }
  }

  return e.sender?.nick || '未知用户'
}

/**
 * 获取用户信息列表
 */
async function getUserInfos (e: Message): Promise<Array<{ name: string, gender: string }>> {
  const userInfos: Array<{ name: string, gender: string }> = []

  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []

  if (atElements.length > 0 && e.isGroup) {
    try {
      for (const atEl of atElements) {
        const memberInfo = await e.bot.getGroupMemberInfo(e.groupId, atEl.targetId)
        userInfos.push({
          name: memberInfo.card || memberInfo.nick || atEl.name || '未知用户',
          gender: 'unknown'
        })
      }
    } catch (err) {
      // 如果获取失败，使用基本信息
      userInfos.push({
        name: atElements[0].name || '未知用户',
        gender: 'unknown'
      })
    }
  } else {
    // 使用发送者信息
    const name = e.isGroup ?
      (await e.bot.getGroupMemberInfo(e.groupId, e.userId).then(info => info.card || info.nick).catch(() => e.sender?.nick)) :
      e.sender?.nick

    userInfos.push({
      name: name || '未知用户',
      gender: 'unknown'
    })
  }

  return userInfos
}

/**
 * 初始化函数
 */
const init = async () => {
  // 清理旧数据
  keyMap = {}
  infos = {}

  // 尝试加载本地数据
  const loadedKeyMap = store.loadKeyMap()
  const loadedInfos = store.loadInfos()

  if (loadedKeyMap && loadedInfos) {
    keyMap = loadedKeyMap
    infos = loadedInfos
    logger.info(`从本地加载表情包数据，支持 ${Object.keys(keyMap).length} 个关键词`)
  } else {
    // 从远程获取数据
    logger.info('从远程获取表情包数据...')

    const keys = await api.getKeys()
    const newInfos: Record<string, MemeInfo> = {}
    const newKeyMap: Record<string, string> = {}

    for (const key of keys) {
      const info = await api.getInfo(key)
      newInfos[key] = info

      for (const keyword of info.keywords) {
        newKeyMap[keyword] = key
      }
    }

    infos = newInfos
    keyMap = newKeyMap

    // 保存到本地
    store.saveInfos(infos as any)
    store.saveKeyMap(keyMap)

    logger.info(`获取表情包数据完成，支持 ${Object.keys(keyMap).length} 个关键词`)
  }

  // 加载触发计数
  triggerCounts = store.loadTriggers()

  // 动态注册命令
  registerDynamicCommands()
}

/**
 * 动态注册命令
 */
function registerDynamicCommands () {
  // 清除旧命令
  commandAll.length = 0

  Object.keys(keyMap).forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const command = karin.command(new RegExp(`^${escapedKeyword}`), (e) => memes(e), {
      name: `表情包-${keyword}`,
      priority: 500
    })
    commandAll.push(command)
  })

  logger.info(`动态注册 ${commandAll.length} 个表情包命令`)
}

/**
 * 增加触发计数
 */
function incrementTrigger (key: string) {
  if (!triggerCounts[key]) triggerCounts[key] = 0
  triggerCounts[key] += 1
  store.saveTriggers(triggerCounts)
}

/**
 * 获取详情信息
 */
function getDetail (code: string): string {
  const info = infos[code]
  if (!info) return '表情包信息不存在'

  const keywords = info.keywords.join('、')
  let result = `【代码】${info.key}\n【名称】${keywords}\n`
  result += `【最大图片数量】${info.params_type.max_images}\n`
  result += `【最小图片数量】${info.params_type.min_images}\n`
  result += `【最大文本数量】${info.params_type.max_texts}\n`
  result += `【最小文本数量】${info.params_type.min_texts}\n`

  return result
}

/**
 * 处理特殊参数
 */
function handleArgs (key: string, args: string, userInfos: Array<{ name: string, gender: string }>): string {
  let argsObj: any = {}
  args = args.trim()

  switch (key) {
    case 'look_flat':
      argsObj = { ratio: parseInt(args) || 2 }
      break
    case 'crawl':
      argsObj = { number: parseInt(args) || Math.floor(Math.random() * 92) + 1 }
      break
    case 'symmetric': {
      const directionMap: Record<string, string> = {
        左: 'left', 右: 'right', 上: 'top', 下: 'bottom'
      }
      argsObj = { direction: directionMap[args] || 'left' }
      break
    }
    case 'petpet':
    case 'jiji_king':
    case 'kirby_hammer':
      argsObj = { circle: args.startsWith('圆') }
      break
    case 'my_friend':
      argsObj = { name: args || userInfos[0]?.name || '朋友' }
      break
    case 'looklook':
      argsObj = { mirror: args === '翻转' }
      break
    case 'gun':
    case 'bubble_tea': {
      const directionMap: Record<string, string> = {
        左: 'left', 右: 'right', 两边: 'both'
      }
      argsObj = { position: directionMap[args] || 'right' }
      break
    }
    case 'dog_dislike':
      argsObj = { circle: args.startsWith('圆') }
      break
    case 'clown':
      argsObj = { person: args.startsWith('爷') }
      break
    case 'note_for_leave':
      if (args) argsObj = { time: args }
      break
    case 'mourning':
      argsObj = { black: args.startsWith('黑白') || args.startsWith('灰') }
      break
    case 'genshin_eat': {
      const roleMap: Record<string, number> = {
        '八重': 1, '胡桃': 2, '妮露': 3, '可莉': 4, '刻晴': 5, '钟离': 6
      }
      argsObj = { character: roleMap[args] || 0 }
      break
    }
  }

  argsObj.user_infos = userInfos.map(u => ({
    name: u.name.replace('@', '').trim(),
    gender: u.gender || 'unknown'
  }))

  return JSON.stringify(argsObj)
}

// 启动时初始化
init().catch(err => {
  logger.error('表情包插件初始化失败', err)
})

export { commandAll }