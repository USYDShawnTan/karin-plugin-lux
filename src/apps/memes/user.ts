import type { Message, AtElement } from 'node-karin'

export async function getDefaultText (e: Message): Promise<string> {
  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []

  if (atElements.length > 0) {
    return atElements[0].name || '未知用户'
  }

  if (e.isGroup) {
    try {
      const memberInfo = await e.bot.getGroupMemberInfo(e.groupId, e.userId)
      return memberInfo.card || memberInfo.nick || '未知用户'
    } catch (err) {
      return e.sender?.nick || '未知用户'
    }
  }

  return e.sender?.nick || '未知用户'
}

export async function getUserInfos (e: Message): Promise<Array<{ name: string, gender: string }>> {
  const userInfos: Array<{ name: string, gender: string }> = []

  const atElements = e.elements?.filter(el => el.type === 'at') as AtElement[] || []

  if (atElements.length > 0 && e.isGroup) {
    try {
      for (const atEl of atElements) {
        const memberInfo = await e.bot.getGroupMemberInfo(e.groupId, atEl.targetId)
        userInfos.push({
          name: memberInfo.card || memberInfo.nick || atEl.name || '未知用户',
          gender: 'unknown'
        })
      }
    } catch (err) {
      userInfos.push({
        name: atElements[0].name || '未知用户',
        gender: 'unknown'
      })
    }
  } else {
    const name = e.isGroup ?
      (await e.bot.getGroupMemberInfo(e.groupId, e.userId).then(info => info.card || info.nick).catch(() => e.sender?.nick)) :
      e.sender?.nick

    userInfos.push({
      name: name || '未知用户',
      gender: 'unknown'
    })
  }

  return userInfos
}

export function normalizeUserInfoList (userInfos: Array<{ name: string, gender: string }>): Array<{ name: string, gender: string }> {
  return userInfos.map(u => ({
    name: u.name.replace('@', '').trim(),
    gender: u.gender || 'unknown'
  }))
}
