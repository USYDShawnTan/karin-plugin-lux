import { karin, segment } from 'node-karin'

export const hello = karin.command('^(#)?你好$', async (e) => {
  await e.reply('你好啊！我是Karin，很高兴认识你~ (。・∀・)ノ', { at: false, recallMsg: 0, reply: true })
  return true
})

// 先介绍一个最简单的插件
export const test = karin.command('^(#)?测试$', '让我来展示一下我的功能吧！✨')

// 发送文本消息
export const text = karin.command('^(#)?打招呼$', segment.text('大家好呀！今天也要元气满满哦！╰(*°▽°*)╯'), { name: '打招呼' })

export const test2 = karin.command('^(#)?菜单$', '来看看我都会些什么吧~\n- #你好：打个招呼\n- #测试：功能展示\n- #打招呼：元气问候\n(｡･ω･｡)ﾉ♡', {
  event: 'message',
  name: '菜单',
  perm: 'all',
  at: false,
  reply: false,
  recallMsg: 0,
  log: true,
  rank: 10000,
  adapter: [],
  dsbAdapter: [],
  delay: 0,
  stop: false,
  authFailMsg: '哎呀，这个功能只有主人才能用哦！要不你先许个愿？(๑•̀ㅂ•́)و✧',
})
