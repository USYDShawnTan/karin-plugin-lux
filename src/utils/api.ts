import axios from 'node-karin/axios'

// API 基础地址
const API_BASE_URL = 'https://api.433200.xyz/api'

// 通用 API 请求函数
export async function fetchApi(endpoint: string): Promise<any> {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`)
    return response.data
  } catch (error) {
    console.error(`API 请求失败: ${endpoint}`, error)
    throw new Error(`API 请求失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 今日运势 API
export async function getTodayFortune() {
  return await fetchApi('/jrys')
}

// 随机一言 API
export async function getHitokoto() {
  return await fetchApi('/hitokoto')
}

// 随机图片 API
export async function getRandomImage() {
  return await fetchApi('/long')
}
