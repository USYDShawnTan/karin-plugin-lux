import type { Message } from 'node-karin'
import type { MemeInfo } from '@/utils/memes-api'
import { getDefaultText } from './user'

export interface PrepareTextsResult {
  texts: string[]
  error?: string
}

// 根据模板配置顺序拼装文本。优先使用用户输入，其次 default_texts，最后用昵称兜底。
export async function prepareTexts (e: Message, info: MemeInfo, rawText: string): Promise<PrepareTextsResult> {
  const { min_texts: minTexts, max_texts: maxTexts, default_texts: defaultTexts = [] } = info.params_type
  if (maxTexts === 0) {
    return { texts: [] }
  }

  const slots: Array<string | null> = new Array(maxTexts).fill(null)
  const userParts = rawText ? rawText.split('/', maxTexts).map(part => part.trim()) : []

  for (let i = 0; i < maxTexts; i++) {
    const fromUser = userParts[i]
    if (fromUser) {
      slots[i] = fromUser
      continue
    }

    const fromDefault = defaultTexts[i]
    if (fromDefault) {
      slots[i] = fromDefault
    }
  }

  let filledCount = slots.filter(Boolean).length
  if (filledCount < minTexts) {
    const fallback = await getDefaultText(e)
    if (fallback) {
      for (let i = 0; i < maxTexts && filledCount < minTexts; i++) {
        if (!slots[i]) {
          slots[i] = fallback
          filledCount++
        }
      }
    }
  }

  const texts = slots.filter((value): value is string => Boolean(value))
  if (texts.length < minTexts) {
    return { texts, error: '文字不够，需要至少' + minTexts + '个，用/分隔' }
  }

  return { texts: texts.slice(0, maxTexts) }
}
