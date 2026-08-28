import { karin } from 'node-karin'

/**
 * 生成指定区间内的随机整数。
 * 用法：#随机数 1 100
 */
export const randomNumber = karin.command(/^#?随机数\s+(-?\d+)\s+(-?\d+)$/, async (e) => {
  const match = e.msg.match(/^#?随机数\s+(-?\d+)\s+(-?\d+)$/)
  if (!match) return false

  let min = Number(match[1])
  let max = Number(match[2])

  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    await e.reply('请输入有效的整数范围，例如：#随机数 1 100')
    return true
  }

  if (min > max) [min, max] = [max, min]

  if (max - min > 1_000_000_000) {
    await e.reply('范围有点太大了，请把区间控制在 10 亿以内。')
    return true
  }

  const value = Math.floor(Math.random() * (max - min + 1)) + min
  await e.reply(`🎲 随机结果：${value}\n范围：${min} ~ ${max}`)
  return true
}, {
  name: '随机数',
  event: 'message',
  perm: 'all',
  log: true,
})
