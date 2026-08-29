import { getConfig } from '@/config'
import { karin, segment, common } from 'node-karin'

/** 一言 API 示例 */
export const yiyanApi = karin.command(/^#一言$/, async (e) => {
  const { hitokotoUrl } = getConfig().services
  await e.reply(segment.image(hitokotoUrl))
}, { name: '一言api' })

/** 主动消息 demo */
export const sendMsg = karin.command(/^#测试主动消息$/, async (e) => {
  const selfId = e.selfId
  const contact = e.contact
  const messages = ['主动消息 demo A', '主动消息 demo B', '主动消息 demo C']
  const text = `\n${messages[Math.floor(Math.random() * messages.length)]}`
  const { messageId } = await karin.sendMsg(selfId, contact, text, { recallMsg: 10 })
  console.log(`消息ID：${messageId}`)
  return true
}, { priority: 9999, log: true, name: '主动消息demo', permission: 'all' })

/** 转发消息 demo */
export const forwardMessage = karin.command(/^#测试转发$/, async (e) => {
  const message = [segment.text('转发消息 1'), segment.text('转发消息 2'), segment.text('转发消息 3')]
  const content = common.makeForward(message, e.selfId, e.bot.account.name)
  await e.bot.sendForwardMsg(e.contact, content)
  return true
}, { priority: 9999, log: true, name: '转发demo', permission: 'all' })

/** 随机图片消息 demo */
export const randomEmoji = karin.command(/^#随机表情$/, async (e) => {
  const emojiUrls = [
    'https://i.imgur.com/XaUdU2C.gif',
    'https://i.imgur.com/wF2RkHB.gif',
    'https://i.imgur.com/7voHalT.jpg',
  ]
  await e.reply([segment.text('随机表情包：'), segment.image(emojiUrls[Math.floor(Math.random() * emojiUrls.length)])])
  return true
}, { priority: 9999, log: true, name: '随机表情包demo', permission: 'all' })

/** 静态数据回复 demo */
export const dailyQuote = karin.command(/^#每日一言$/, async (e) => {
  const quotes = ['今天也是充满希望的一天！', '做自己的太阳。', '继续前进。']
  await e.reply(segment.text(`每日一言：${quotes[Math.floor(Math.random() * quotes.length)]}`))
  return true
}, { priority: 9999, log: true, name: '每日一言demo', permission: 'all' })
