import type { Message } from 'node-karin'
import { logger } from 'node-karin'
import { MemesApi } from '@/utils/memes-api'
import { MemesStore } from '@/utils/memes-store'

const api = new MemesApi()
const store = new MemesStore()

async function regenerateListImage (): Promise<void> {
  const keys = await api.getKeys()
  const listItems = keys.map(key => ({
    meme_key: key,
    disabled: false,
    labels: []
  }))

  const arr = await api.renderList(listItems)
  const buffer = Buffer.from(arr)
  store.saveListImage(buffer)
}

export async function runMemesUpdate (
  e: Message,
  commandAll: unknown[],
  initAll: (forceRemote?: boolean) => Promise<void>,
  resetContext: () => void
): Promise<boolean> {
  await e.reply('正在更新 meme 数据...')

  try {
    commandAll.length = 0
    resetContext()
    await initAll(true)
    await regenerateListImage()
    await e.reply('更新完成，已刷新列表图。')
  } catch (err) {
    logger.error('meme 更新流程失败', err)
    await e.reply('更新失败：' + (err as Error).message)
  }
  return true
}
