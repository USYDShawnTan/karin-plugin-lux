import type { Message } from 'node-karin'

const HELP_LINES = [
  '【表情包列表】：查看支持的表情包列表',
  '【表情包名称】：发送表情包名称，根据提供的文字或图片制作表情包',
  '【随机表情包】：随机制作一个表情包',
  '【表情包搜索+关键词】：搜索表情包关键词',
  '【表情包名称+详情】：查看该表情包所支持的参数',
  '【表情包更新】：更新表情包数据'
]

const NEWLINE = String.fromCharCode(10)

export async function sendMemesHelp (e: Message): Promise<boolean> {
  await e.reply(HELP_LINES.join(NEWLINE))
  return true
}
