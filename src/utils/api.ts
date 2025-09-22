import axios from 'node-karin/axios'
import { config } from './config'

// 使用配置中的API地址
const API_BASE_URL = config().apiBaseUrl
const EMOJI_API_BASE_URL = config().emojiApiBaseUrl

// 通用 API 请求函数
export async function fetchApi (endpoint: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`)
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
  return await fetchApi('/hitokoto')
}

// 随机图片 API
export async function getRandomLongImage () {
  return await fetchApi('/long')
}

// 获取单个emoji的JSON数据
export async function getSingleEmojiData (emoji: string): Promise<string | null> {
  try {
    const url = `${EMOJI_API_BASE_URL}/${encodeURIComponent(emoji)}`
    const response = await axios.get(url)
    return response.data.image || null
  } catch (error) {
    console.error('获取单个emoji失败:', error)
    return null
  }
}

// 获取两个emoji合成的JSON数据
export async function getComboEmojiData (emoji1: string, emoji2: string): Promise<string | null> {
  try {
    const url = `${EMOJI_API_BASE_URL}/${encodeURIComponent(emoji1)}+${encodeURIComponent(emoji2)}`
    const response = await axios.get(url)

    // 检查是否有错误
    if (response.data.error) {
      console.log('emoji组合不存在:', response.data.error)
      return null
    }

    return response.data.image || null
  } catch (error) {
    console.error('获取emoji合成失败:', error)
    return null
  }
}