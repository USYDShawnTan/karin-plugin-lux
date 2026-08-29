import { dir } from '@/dir'
import { karin, render, segment, logger } from 'node-karin'
import path from 'node:path'

/** 渲染 demo：#测试渲染 */
export const image = karin.command(/^#?测试渲染$/, async (e) => {
  try {
    const html = path.join(dir.resources, 'template/test.html')
    const image = path.join(dir.resources, 'image/启程宣发.png')
    const img = await render.render({
      name: 'render',
      encoding: 'base64',
      file: html,
      data: { file: image, pluResPath: process.cwd() },
      pageGotoParams: { waitUntil: 'networkidle2' },
    })
    await e.reply(segment.image(`base64://${img}`))
    return true
  } catch (error) {
    logger.error(error)
    await e.reply(JSON.stringify(error))
    return true
  }
}, { priority: 9999, log: true, name: '测试渲染', permission: 'all' })

/** URL 渲染 demo：#渲染 <url> */
export const renderUrl = karin.command(/^#?渲染/, async (e) => {
  const file = e.msg.replace(/^#?渲染/, '').trim()
  try {
    const img = await render.render({
      name: 'render',
      encoding: 'base64',
      file: file || 'https://whitechi73.github.io/OpenShamrock/',
      type: 'png',
      pageGotoParams: { waitUntil: 'networkidle2' },
      setViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    }) as string
    await e.reply(segment.image(`base64://${img}`))
    return true
  } catch (error: any) {
    logger.error(error)
    await e.reply(error.message)
    return true
  }
}, { priority: 9999, log: true, name: '渲染demo', permission: 'master' })

/** 网页截图 demo */
export const screenshot = karin.command('^#测试截图$', async (e) => {
  const img = await karin.render('https://whitechi73.github.io/OpenShamrock/')
  await e.reply(segment.image(`base64://${img}`))
  return true
}, { name: '测试截图' })
