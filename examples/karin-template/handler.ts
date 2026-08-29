import { karin, handler } from 'node-karin'

export const test = karin.handler('test.image', (args, reject) => {
  // reject('继续循环下一个handler')
  return 'Handler处理完成'
})

export const testHandler = karin.command(/^#?测试handler$/, async (e) => {
  const msg = '测试handler'
  const res = await handler.call('test.image', { e, msg })
  await e.reply(res)
  return true
}, {
  priority: 9999,
  log: true,
  name: '测试handler',
  permission: 'master',
})
