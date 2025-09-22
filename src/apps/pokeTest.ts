import karin from 'node-karin'
import { config } from '@/utils/config'

/** 戳一戳事件的实际数据结构 */
interface ActualPokeEvent {
  target_id: number
  user_id: number
  group_id: number
}

const replyList = [
  '别jb戳了',
  '铁暗恋',
  '铁男同',
  '你干嘛~',
  '再戳就要那个了',
  '不要戳了',
  '还戳还戳还戳',
  '再戳就要🥵了',
]

const masterReplyList = [
  '怎么了找主人干嘛',
  '铁男同',
  '你干嘛~',
  '我主人忙着呢别打扰他',
  '暗恋很久了是吧还戳',
  '别跟我抢主人😭',
]

/**
 * 戳一戳事件处理器 - 最小化实现
 * 当机器人被戳时回复
 */
export const pokeEvent = karin.accept('notice.groupPoke', async (ctx) => {
  const pokeData = ctx.rawEvent as ActualPokeEvent

  if (String(pokeData.target_id) === String(ctx.selfId)) {
    await ctx.reply(replyList[Math.floor(Math.random() * replyList.length)])
    return true
  }
  if (String(pokeData.target_id) === String(config().masterId)) {
    await ctx.reply(masterReplyList[Math.floor(Math.random() * masterReplyList.length)])
    return true
  }

  return false
})

