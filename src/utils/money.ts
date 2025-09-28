import { redis as karinRedis } from 'node-karin'

const MONEY_KEY = 'karin:money'

function getRedisClient (): any {
  const client: any = karinRedis
  if (!client || typeof client.hGet !== 'function') {
    throw new Error('未检测到可用的 Redis 客户端，请确认 node-karin 已启用 Redis')
  }
  return client
}

// 读取用户余额
export async function getBalance (userId: string): Promise<number> {
  if (!userId) return 0
  const client = getRedisClient()
  const raw = await client.hGet(MONEY_KEY, userId)
  return raw ? Number(raw) : 0
}

// 增加用户余额
export async function addBalance (userId: string, amount: number): Promise<number> {
  if (!userId) throw new Error('userId 不能为空')
  if (!Number.isFinite(amount)) throw new Error('amount 必须为数字')
  const client = getRedisClient()
  const result = await client.hIncrBy(MONEY_KEY, userId, Math.floor(amount))
  return typeof result === 'number' ? result : Number(result ?? 0)
}

// 扣除用户余额
export async function deductBalance (userId: string, amount: number): Promise<number> {
  if (!userId) throw new Error('userId 不能为空')
  if (!Number.isFinite(amount)) throw new Error('amount 必须为数字')
  const client = getRedisClient()
  const currentRaw = await client.hGet(MONEY_KEY, userId)
  const current = currentRaw ? Number(currentRaw) : 0
  if (current < amount) {
    throw new Error('余额不足，无法扣除')
  }
  const result = await client.hIncrBy(MONEY_KEY, userId, -Math.floor(amount))
  return typeof result === 'number' ? result : Number(result ?? 0)
}



