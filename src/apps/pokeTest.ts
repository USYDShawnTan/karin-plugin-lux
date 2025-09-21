import karin from 'node-karin'

/** 戳一戳事件的实际数据结构 */
interface ActualPokeEvent {
  target_id: number
  user_id: number
  group_id: number
}

/**
 * 戳一戳事件处理器 - 最小化实现
 * 当机器人被戳时回复
 */
export const pokeEvent = karin.accept('notice.groupPoke', async (ctx) => {
  const pokeData = ctx.rawEvent as ActualPokeEvent
  
  if (String(pokeData.target_id) === String(ctx.selfId)) {
    await ctx.reply('别jb戳了')
    return true
  }
  
  return false
})

