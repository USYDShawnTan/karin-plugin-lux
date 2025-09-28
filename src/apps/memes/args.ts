import type { Message } from 'node-karin'
import type { MemeInfo, MemeParserOption } from '@/utils/memes-api'
import { getUserInfos, normalizeUserInfoList } from './user'

export interface ArgsPayloadResult {
  json?: string
  error?: string
}

export async function buildArgsPayload (key: string, info: MemeInfo, rawArgs: string, e: Message): Promise<ArgsPayloadResult> {
  const trimmedArgs = rawArgs.trim()
  const argsType = info.params_type.args_type

  if (!argsType) {
    if (!trimmedArgs) return {}
    const userInfos = await getUserInfos(e)
    const legacy = buildLegacyArgs(key, trimmedArgs, userInfos)
    return legacy ? { json: legacy } : {}
  }

  const userInfos = await getUserInfos(e)
  const normalizedInfos = normalizeUserInfoList(userInfos)
  const payload: Record<string, any> = {}
  let hasData = false

  if (normalizedInfos.length > 0) {
    payload.user_infos = normalizedInfos
    hasData = true
  }

  if (!trimmedArgs) {
    return hasData ? { json: JSON.stringify(payload) } : {}
  }

  const parsed = parseArgsWithOptions(trimmedArgs, argsType.parser_options || [])
  if (parsed.errors.length > 0) {
    return { error: parsed.errors.join('\n') }
  }

  if (!parsed.matched) {
    const legacy = buildLegacyArgs(key, trimmedArgs, userInfos)
    if (legacy) return { json: legacy }
    return { error: '暂时无法识别的参数格式，请参考帮助指令' }
  }

  Object.assign(payload, parsed.values)
  hasData = hasData || Object.keys(parsed.values).length > 0

  if (!hasData) {
    return { error: '参数解析后没有有效字段，请检查写法' }
  }

  return { json: JSON.stringify(payload) }
}

function tokenizeArgsInput (input: string): string[] {
  if (!input.trim()) return []

  const pattern = /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'|\S+/g
  const matches = input.match(pattern)
  if (!matches) return []

  return matches.map(token => {
    let result = token.trim()
    if (!result) return result
    const first = result[0]
    const last = result[result.length - 1]
    if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
      result = result.slice(1, -1)
    }
    return result.replace(/\\(["'\\])/g, '$1')
  })
}

function parseArgsWithOptions (argsStr: string, options: MemeParserOption[]): { matched: boolean, values: Record<string, any>, errors: string[] } {
  const tokens = tokenizeArgsInput(argsStr)
  if (tokens.length === 0) {
    return { matched: false, values: {}, errors: [] }
  }

  const aliasMap = new Map<string, MemeParserOption>()
  for (const option of options) {
    for (const name of option.names || []) {
      if (name) aliasMap.set(name, option)
    }
  }

  const values: Record<string, any> = {}
  const errors: string[] = []
  let matched = false

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]
    if (!token) continue

    let inlineValue: string | undefined
    const equalIndex = token.indexOf('=')
    if (equalIndex > 0) {
      inlineValue = token.slice(equalIndex + 1)
      token = token.slice(0, equalIndex)
    }

    const option = aliasMap.get(token)
    if (!option) {
      continue
    }

    matched = true

    if (option.args && option.args.length > 0) {
      const spec = option.args[0]
      let rawValue = inlineValue
      if (rawValue === undefined) {
        i += 1
        rawValue = tokens[i]
      }

      if (rawValue === undefined) {
        errors.push('选项 ' + token + ' 缺少值')
        continue
      }

      const cleanedValue = stripWrappingQuotes(rawValue)
      const coerced = coerceValue(cleanedValue, spec.value)
      if (coerced.error) {
        errors.push(coerced.error)
        continue
      }
      values[spec.name] = coerced.value
    } else if (option.action && option.action.type === 0) {
      const dest = option.dest ?? deriveOptionDestination(option)
      if (dest) {
        values[dest] = option.action.value
      }
    } else {
      const dest = option.dest ?? deriveOptionDestination(option)
      if (dest) {
        values[dest] = true
      }
    }
  }

  return { matched, values, errors }
}

function stripWrappingQuotes (value: string): string {
  if (!value) return value
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return value.slice(1, -1)
  }
  return value
}

function coerceValue (raw: string, type?: string): { value: any, error?: string } {
  const input = raw.trim()
  if (!type || type === 'str') {
    return { value: input }
  }

  if (type === 'int') {
    const parsed = Number.parseInt(input, 10)
    if (Number.isNaN(parsed)) {
      return { value: input, error: '选项的值必须是数字：' + raw }
    }
    return { value: parsed }
  }

  return { value: input }
}

function deriveOptionDestination (option: MemeParserOption): string | undefined {
  if (option.dest) return option.dest || undefined
  if (option.args && option.args[0]) return option.args[0].name
  const named = option.names?.find(name => name.startsWith('--')) ?? option.names?.find(name => name.startsWith('-'))
  if (!named) return undefined
  return named.replace(/^[-]+/, '')
}

function buildLegacyArgs (key: string, args: string, userInfos: Array<{ name: string, gender: string }>): string | null {
  const normalizedInfos = normalizeUserInfoList(userInfos)
  const trimmedArgs = args.trim()
  const payload: Record<string, any> = {}

  switch (key) {
    case 'look_flat':
      payload.ratio = parseInt(trimmedArgs) || 2
      break
    case 'crawl':
      payload.number = parseInt(trimmedArgs) || Math.floor(Math.random() * 92) + 1
      break
    case 'symmetric': {
      const directionMap: Record<string, string> = {
        左: 'left', 右: 'right', 上: 'top', 下: 'bottom'
      }
      payload.direction = directionMap[trimmedArgs] || 'left'
      break
    }
    case 'petpet':
    case 'jiji_king':
    case 'kirby_hammer':
      payload.circle = trimmedArgs.startsWith('圆')
      break
    case 'my_friend':
      payload.name = trimmedArgs || normalizedInfos[0]?.name || '朋友'
      break
    case 'looklook':
      payload.mirror = trimmedArgs === '翻转'
      break
    case 'gun':
    case 'bubble_tea': {
      const directionMap: Record<string, string> = {
        左: 'left', 右: 'right', 两边: 'both'
      }
      payload.position = directionMap[trimmedArgs] || 'right'
      break
    }
    case 'dog_dislike':
      payload.circle = trimmedArgs.startsWith('圆')
      break
    case 'clown':
      payload.person = trimmedArgs.startsWith('爷')
      break
    case 'note_for_leave':
      if (trimmedArgs) payload.time = trimmedArgs
      break
    case 'mourning':
      payload.black = trimmedArgs.startsWith('黑白') || trimmedArgs.startsWith('灰')
      break
    case 'genshin_eat': {
      const roleMap: Record<string, number> = {
        '八重': 1, '胡桃': 2, '妮露': 3, '可莉': 4, '刻晴': 5, '钟离': 6
      }
      payload.character = roleMap[trimmedArgs] || 0
      break
    }
  }

  const hasCustomField = Object.keys(payload).length > 0
  if (!hasCustomField && normalizedInfos.length === 0) {
    return null
  }

  if (normalizedInfos.length > 0) {
    payload.user_infos = normalizedInfos
  }

  return JSON.stringify(payload)
}
