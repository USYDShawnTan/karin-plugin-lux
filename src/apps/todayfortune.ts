import { karin, redis as karinRedis } from 'node-karin'
import { getTodayFortune } from '../utils/api'
import { addBalance } from '../utils/money'

const CHECKIN_CONTENT = 'karin:jrys'

/**
 * 获取今日运势
 */
export const fortune = karin.command(/^#*(今日运势|打卡|jrys)$/, async (e) => {
  try {
    await e.reply('正在获取今日运势...')

    const data = await getTodayFortune()

    // 格式化今日运势响应数据
    let message = '🔮 今日运势\n\n'
    if (typeof data === 'string') {
      message += data
    } else if (data.fortuneSummary) {
      // 使用新的API响应结构
      message += `🎯 运势: ${data.fortuneSummary}\n`
      message += `✨ 幸运指数: ${data.luckyStar}\n\n`
      message += `📜 签文: ${data.signText}\n\n`
      if (data.unsignText) {
        message += `💡 解签: ${data.unsignText}`
      }
    } else {
      // 兼容旧格式或未知格式
      message += JSON.stringify(data, null, 2)
    }
    const baseMessage = message
    const userId = e.sender?.userId
    if (userId) {
      try {
        const client: any = karinRedis
        if (client && typeof client.hExists === 'function' && typeof client.hSet === 'function' && typeof client.hGet === 'function') {
          const dateKey = new Date().toISOString().slice(0, 10)
          const redisKey = `${CHECKIN_CONTENT}:${dateKey}`
          const fieldKey = `${userId}`
          const signText = typeof data === 'string' ? data : data.signText ?? ''

          const exists = await client.hExists(redisKey, fieldKey)

          if (!exists) {
            const reward = Math.floor(Math.random() * 11) + 5
            const balance = await addBalance(userId, reward)

            message += `\n\n🎉 今日打卡成功，奖励 ${reward} 金币！\n💰 当前余额: ${balance}`

            const payload = JSON.stringify({
              userId,
              date: dateKey,
              reward,
              balance,
              signText,
              fortuneSummary: typeof data === 'object' && data ? (data as any).fortuneSummary ?? '' : '',
              fortuneMessage: message,
              fortuneBaseMessage: baseMessage,
              fortuneRaw: data,
              createdAt: Date.now()
            })

            await client.hSet(redisKey, fieldKey, payload)

            if (typeof client.expire === 'function') {
              const now = new Date()
              const nextMidnight = new Date(now)
              nextMidnight.setHours(24, 0, 0, 0)
              const ttlSeconds = Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000)
              if (ttlSeconds > 0) {
                await client.expire(redisKey, ttlSeconds)
              }
            }
          } else {
            const rawRecord = await client.hGet(redisKey, fieldKey)
            let previousSign = ''
            let storedMessage = ''
            if (typeof rawRecord === 'string' && rawRecord) {
              try {
                const parsed = JSON.parse(rawRecord)
                if (parsed && typeof parsed.signText === 'string') {
                  previousSign = parsed.signText
                }
                if (parsed && typeof parsed.fortuneMessage === 'string') {
                  storedMessage = parsed.fortuneMessage
                }
              } catch (parseError) {
                console.warn('今日运势签到记录解析失败:', parseError)
              }
            }
            message = storedMessage || baseMessage
            message += '\n\n⚠️ 今日已经打卡过了~'
          }
        }
      } catch (redisError) {
        console.error('今日运势打卡记录失败:', redisError)
      }
    }

    await e.reply(message)
    return true

  } catch (error) {
    console.error('获取今日运势失败:', error)
    await e.reply('❌ 获取今日运势失败，请稍后再试')
    return false
  }
}, { name: '今日运势' })
