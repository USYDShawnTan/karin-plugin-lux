import type { Message, AtElement } from 'node-karin'
import { config } from '@/utils/config'
import type { MemeInfo } from '@/utils/memes-api'

/**
 * 按模板配置的优先级收集图片资源（消息 -> 回复 -> @头像 -> 自己头像）
 */
export async function collectImages (e: Message, info: MemeInfo): Promise<string[]> {
  const { min_images: minImages, max_images: maxImages } = info.params_type
  if (maxImages === 0) return []

  const imgUrls: string[] = []
  const pushUnique = (url?: string) => {
    // 避免重复上传同一图片；兼容部分平台 file/url 混用
    if (!url) return
    if (!imgUrls.includes(url)) imgUrls.push(url)
  }
  const unshiftUnique = (url?: string) => {
    if (!url) return
    const index = imgUrls.indexOf(url)
    if (index === 0) return
    if (index > 0) imgUrls.splice(index, 1)
    imgUrls.unshift(url)
  }

  const { masterId, enableMastercannotbefucked } = config()
  const protectMaster = Boolean(enableMastercannotbefucked) && info.key === 'do' && Boolean(masterId)
  let senderAvatar: string | undefined
  let masterAvatar: string | undefined
  let masterAt = false
  if (minImages === 2 && maxImages === 2) {
    try {
      senderAvatar = await e.bot.getAvatarUrl(e.userId)
      unshiftUnique(senderAvatar)
    } catch (err) {
      senderAvatar = undefined
    }
  }

  const imgElements = e.elements?.filter(el => el.type === 'image') || []
  imgElements.forEach((img: any) => pushUnique(img.file || img.url))

  if (e.replyId && imgUrls.length < maxImages) {
    try {
      const replyMsg = await e.bot.getMsg(e.contact, e.replyId)
      const replyImages = replyMsg.elements?.filter(el => el.type === 'image') || []
      replyImages.forEach((img: any) => pushUnique(img.file || img.url))
    } catch (err) {
      // 忽略获取回复消息失败的错误
    }
  }

  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []
  if (atElements.length > 0 && imgUrls.length < maxImages) {
    for (const atEl of atElements) {
      if (imgUrls.length >= maxImages) break
      try {
        const avatarUrl = await e.bot.getAvatarUrl(atEl.targetId)
        const isMaster = protectMaster && String(masterId) === String(atEl.targetId)
        if (isMaster) {
          masterAt = true
          masterAvatar = avatarUrl
          unshiftUnique(masterAvatar)
        } else {
          pushUnique(avatarUrl)
        }
      } catch (err) {
        // 忽略单个头像拉取失败
      }
    }
  }

  if (protectMaster && masterAt && masterAvatar) {
    unshiftUnique(masterAvatar)
  }

  if (minImages > 0 && imgUrls.length < minImages) {
    try {
      if (!senderAvatar) {
        senderAvatar = await e.bot.getAvatarUrl(e.userId)
      }
      while (imgUrls.length < minImages && senderAvatar) {
        imgUrls.push(senderAvatar)
      }
    } catch (err) {
      // 如果拉取头像失败则忽略
    }
  }

  return imgUrls.slice(0, maxImages)
}
