import { logger } from 'node-karin'
import { MemesApi, type MemeInfo } from '@/utils/memes-api'
import { MemesStore } from '@/utils/memes-store'

const api = new MemesApi()
const store = new MemesStore()

let keyMap: Record<string, string> = {}
let infos: Record<string, MemeInfo> = {}
let triggerCounts: Record<string, number> = {}
let loaded = false

export async function initContext (forceRemote = false): Promise<void> {
  if (loaded && !forceRemote) return

  keyMap = {}
  infos = {}

  const useLocal = !forceRemote
  const loadedKeyMap = useLocal ? store.loadKeyMap() : null
  const loadedInfos = useLocal ? store.loadInfos() : null

  if (loadedKeyMap && loadedInfos) {
    keyMap = loadedKeyMap
    infos = loadedInfos
    logger.info('从本地加载表情包数据，支持 ' + Object.keys(keyMap).length + ' 个关键词')
  } else {
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

    store.saveInfos(infos as any)
    store.saveKeyMap(keyMap)

    logger.info('获取表情包数据完成，支持 ' + Object.keys(keyMap).length + ' 个关键词')
  }

  triggerCounts = store.loadTriggers()
  loaded = true
}

export function getKeywordMap (): Record<string, string> {
  return keyMap
}

export function getInfos (): Record<string, MemeInfo> {
  return infos
}

export function getInfo (code: string): MemeInfo | undefined {
  return infos[code]
}

export function incrementTrigger (key: string): void {
  if (!triggerCounts[key]) triggerCounts[key] = 0
  triggerCounts[key] += 1
  store.saveTriggers(triggerCounts)
}

export function getDetail (code: string): string {
  const info = infos[code]
  if (!info) return '表情包信息不存在'

  const keywords = info.keywords.join('、')
  const parts = [
    '【代码】' + info.key,
    '【名称】' + keywords,
    '【最大图片数量】' + info.params_type.max_images,
    '【最小图片数量】' + info.params_type.min_images,
    '【最大文本数量】' + info.params_type.max_texts,
    '【最小文本数量】' + info.params_type.min_texts
  ]

  return parts.join('\n')
}

export function resetContext (): void {
  loaded = false
}
