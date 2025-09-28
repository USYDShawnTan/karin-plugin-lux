import { logger } from 'node-karin'
import type { Message } from 'node-karin'

export async function runMemesUpdate (
  e: Message,
  commandAll: unknown[],
  initAll: (forceRemote?: boolean) => Promise<void>,
  resetContext: () => void
): Promise<boolean> {
  await e.reply('表情包资源更新中...')

  try {
    commandAll.length = 0
    resetContext()
    await initAll(true)
    await e.reply('更新完成！')
  } catch (err) {
    logger.error('表情包更新失败', err)
    await e.reply('更新失败：' + (err as Error).message)
  }
  return true
}
