import axios from 'node-karin/axios'
import { getConfig } from '@/config'

// 通用 API 请求函数
export async function fetchApi (endpoint: string): Promise<any> {
  try {
    const { apiBaseUrl } = getConfig().services
    const response = await axios.get(`${apiBaseUrl}${endpoint}`)
    return response.data
  } catch (error) {
    console.error(`API 请求失败: ${endpoint}`, error)
    throw new Error(`API 请求失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 今日运势 API
export async function getTodayFortune () {
  return await fetchApi('/jrys')
}

// 随机一言 API
export async function getHitokoto () {
  const { hitokotoUrl } = getConfig().services
  const response = await axios.get(hitokotoUrl)
  return response.data
}

// 获取单个emoji的JSON数据
export async function getSingleEmojiData (emoji: string): Promise<string | null> {
  try {
    const { dynamicEmojiBaseUrl } = getConfig().services
    const url = `${dynamicEmojiBaseUrl}?emoji=${encodeURIComponent(emoji)}`
    const response = await axios.get(url)
    return response.data.url || null
  } catch (error) {
    console.error('获取单个emoji失败:', error)
    return null
  }
}

// 获取两个emoji合成的JSON数据
export async function getComboEmojiData (emoji1: string, emoji2: string): Promise<string | null> {
  try {
    const { emojiComboBaseUrl } = getConfig().services
    const url = `${emojiComboBaseUrl}?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`
    const response = await axios.get(url)

    // 检查是否有错误
    if (response.data.error) {
      console.log('emoji组合不存在:', response.data.error)
      return null
    }

    return response.data.url || null
  } catch (error) {
    console.error('获取emoji合成失败:', error)
    return null
  }
}
