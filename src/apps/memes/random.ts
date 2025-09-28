import type { Message } from 'node-karin'
import { initContext, getInfos } from './context'

export async function handleRandomMemes (e: Message, handler: (msg: Message) => Promise<boolean>): Promise<boolean> {
  await initContext()
  const infoMap = getInfos()
  const keys = Object.keys(infoMap).filter(key =>
    infoMap[key].params_type.min_images === 1 && infoMap[key].params_type.min_texts === 0
  )

  if (keys.length === 0) {
    await e.reply('暂无可随机的表情包')
    return true
  }

  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  const info = infoMap[randomKey]

  const keywordHint = info.keywords.join('、')
  await e.reply('恭喜你抽到了' + keywordHint)
  e.msg = info.keywords[0]

  return handler(e)
}
