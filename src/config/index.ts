import fs from 'node:fs'
import path from 'node:path'
import { copyConfigSync, logger, requireFileSync } from 'node-karin'
import { dir } from '@/dir'
import type { ConfigSection, FeaturesConfig, GeneralConfig, LuxConfig, ServicesConfig } from './types'

export type { FeaturesConfig, GeneralConfig, LuxConfig, ServicesConfig } from './types'

const sections: ConfigSection[] = ['general', 'services', 'features']

interface LegacyConfig {
  masterId?: unknown
  apiBaseUrl?: unknown
  emojiApiBaseUrl?: unknown
  memeBasePath?: unknown
  yiyanApi?: unknown
  enableMastercannotbefucked?: unknown
}

function configPath (section: ConfigSection, runtime = true): string {
  return path.join(runtime ? dir.runtimeConfig : dir.defaultConfig, `${section}.json`)
}

function writeJson (filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function readJson<T> (filePath: string): T {
  return requireFileSync(filePath, { force: true }) as T
}

function migratedBackupPath (legacyPath: string): string {
  const preferred = `${legacyPath}.migrated`
  if (!fs.existsSync(preferred)) return preferred
  let suffix = 1
  while (fs.existsSync(`${preferred}.${suffix}`)) suffix += 1
  return `${preferred}.${suffix}`
}

function migrateLegacyConfig (missingBeforeSeed: Set<ConfigSection>): void {
  const legacyPath = path.join(dir.runtimeConfig, 'config.json')
  if (!fs.existsSync(legacyPath) || missingBeforeSeed.size === 0) return

  try {
    const legacy = readJson<LegacyConfig>(legacyPath)

    if (missingBeforeSeed.has('general')) {
      const general = readJson<GeneralConfig>(configPath('general'))
      if (typeof legacy.masterId === 'string') general.masterId = legacy.masterId
      writeJson(configPath('general'), general)
    }

    if (missingBeforeSeed.has('services')) {
      const services = readJson<ServicesConfig>(configPath('services'))
      if (typeof legacy.apiBaseUrl === 'string') services.apiBaseUrl = legacy.apiBaseUrl
      if (typeof legacy.emojiApiBaseUrl === 'string') {
        services.dynamicEmojiBaseUrl = legacy.emojiApiBaseUrl
        services.emojiComboBaseUrl = legacy.emojiApiBaseUrl
      }
      if (typeof legacy.memeBasePath === 'string') services.memeBaseUrl = legacy.memeBasePath
      if (typeof legacy.yiyanApi === 'string') services.hitokotoUrl = legacy.yiyanApi
      writeJson(configPath('services'), services)
    }

    if (missingBeforeSeed.has('features')) {
      const features = readJson<FeaturesConfig>(configPath('features'))
      if (typeof legacy.enableMastercannotbefucked === 'boolean') {
        features.poke.protectMaster = legacy.enableMastercannotbefucked
      }
      writeJson(configPath('features'), features)
    }

    const backupPath = migratedBackupPath(legacyPath)
    fs.renameSync(legacyPath, backupPath)
    logger.info(`[karin-plugin-lux] 旧配置迁移完成，原文件已备份为: ${backupPath}`)
  } catch (error) {
    logger.error(`[karin-plugin-lux] 迁移旧配置文件失败: ${legacyPath}`, error)
  }
}

function initializeConfig (): void {
  try {
    fs.mkdirSync(dir.runtimeConfig, { recursive: true })
    const missingBeforeSeed = new Set(sections.filter(section => !fs.existsSync(configPath(section))))
    copyConfigSync(dir.defaultConfig, dir.runtimeConfig, ['.json'], true)
    migrateLegacyConfig(missingBeforeSeed)
  } catch (error) {
    logger.error(`[karin-plugin-lux] 初始化配置目录失败: ${dir.runtimeConfig}`, error)
    throw error
  }
}

initializeConfig()

function readSection<T> (section: ConfigSection): T {
  const defaultValue = readJson<T>(configPath(section, false))
  const runtimeValue = readJson<Partial<T>>(configPath(section))
  return { ...defaultValue, ...runtimeValue }
}

function readServicesConfig (): ServicesConfig {
  const defaults = readJson<ServicesConfig>(configPath('services', false))
  const runtime = readJson<Partial<ServicesConfig>>(configPath('services'))
  const useRuntimeUrl = (value: string | undefined, fallback: string): string => {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  }

  return {
    apiBaseUrl: useRuntimeUrl(runtime.apiBaseUrl, defaults.apiBaseUrl),
    dynamicEmojiBaseUrl: useRuntimeUrl(runtime.dynamicEmojiBaseUrl, defaults.dynamicEmojiBaseUrl),
    emojiComboBaseUrl: useRuntimeUrl(runtime.emojiComboBaseUrl, defaults.emojiComboBaseUrl),
    memeBaseUrl: useRuntimeUrl(runtime.memeBaseUrl, defaults.memeBaseUrl),
    hitokotoUrl: useRuntimeUrl(runtime.hitokotoUrl, defaults.hitokotoUrl)
  }
}

export function getConfig (): LuxConfig {
  const defaultFeatures = readSection<FeaturesConfig>('features')
  const runtimeFeatures = readJson<Partial<FeaturesConfig>>(configPath('features'))

  return {
    general: readSection<GeneralConfig>('general'),
    services: readServicesConfig(),
    features: {
      poke: { ...defaultFeatures.poke, ...runtimeFeatures.poke },
      meme: { ...defaultFeatures.meme, ...runtimeFeatures.meme },
      emoji: { ...defaultFeatures.emoji, ...runtimeFeatures.emoji }
    }
  }
}

function saveSection<T> (section: ConfigSection, data: T): void {
  const filePath = configPath(section)
  try {
    writeJson(filePath, data)
    logger.info(`[karin-plugin-lux] 配置已保存: ${filePath}`)
  } catch (error) {
    logger.error(`[karin-plugin-lux] 保存配置文件失败: ${filePath}`, error)
    throw error
  }
}

export const saveGeneralConfig = (data: GeneralConfig): void => saveSection('general', data)
export const saveServicesConfig = (data: ServicesConfig): void => saveSection('services', data)
export const saveFeaturesConfig = (data: FeaturesConfig): void => saveSection('features', data)
