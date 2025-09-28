import { redis as karinRedis } from 'node-karin'

const BALANCE_KEY = 'karin:money:balance'
const CHECKIN_KEY = 'karin:money:lastCheckIn'
const DEFAULT_REWARD = 100

function getRedisClient (): any {
  const client: any = karinRedis
  if (!client || typeof client.hGet !== 'function') {
    throw new Error('[money] 未检测到可用的 Redis 客户端，请确认 node-karin 已启用 Redis')
  }
  return client
}

// 读取用户余额
export async function getBalance (userId: string): Promise<number> {
  if (!userId) return 0
  const client = getRedisClient()
  const raw = await client.hGet(BALANCE_KEY, userId)
  return raw ? Number(raw) : 0
}

// 增加用户余额
export async function addBalance (userId: string, amount: number): Promise<number> {
  if (!userId) throw new Error('userId 不能为空')
  if (!Number.isFinite(amount)) throw new Error('amount 必须为数字')
  const client = getRedisClient()
  const result = await client.hIncrBy(BALANCE_KEY, userId, Math.floor(amount))
  return typeof result === 'number' ? result : Number(result ?? 0)
}

// 每日打卡：成功打卡后写入日期并返回最新余额
export async function checkInDaily (userId: string, reward: number = DEFAULT_REWARD): Promise<{ already: boolean, reward?: number, balance: number }> {
  if (!userId) throw new Error('userId 不能为空')
  const client = getRedisClient()
  const today = new Date().toISOString().slice(0, 10)

  const last = await client.hGet(CHECKIN_KEY, userId)
  if (last === today) {
    const balanceRaw = await client.hGet(BALANCE_KEY, userId)
    const balance = balanceRaw ? Number(balanceRaw) : 0
    return { already: true, balance }
  }

  const result = await client.hIncrBy(BALANCE_KEY, userId, Math.floor(reward))
  const balance = typeof result === 'number' ? result : Number(result ?? 0)
  await client.hSet(CHECKIN_KEY, userId, today)
  return { already: false, reward, balance }
}

// 余额格式化（千分位）
export function formatBalance (balance: number): string {
  return Number.isFinite(balance) ? balance.toLocaleString('zh-CN') : '0'
}
