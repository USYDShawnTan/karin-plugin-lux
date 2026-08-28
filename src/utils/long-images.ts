import path from 'node:path'
import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { logger } from 'node-karin'
import { dir } from '@/dir'

const execFileAsync = promisify(execFile)
const repositoryUrl = 'https://git.acwing.com/XT/long.git'
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])

export const longImagesDir = path.join(dir.runtimeData, 'long')

let initialization: Promise<void> | null = null

function cloneDownloadSize (): number {
  const objectsDir = path.join(longImagesDir, '.git', 'objects')
  if (!fs.existsSync(objectsDir)) return 0

  const sizeOf = (target: string): number => {
    try {
      return fs.readdirSync(target, { withFileTypes: true }).reduce((total, entry) => {
        const entryPath = path.join(target, entry.name)
        return total + (entry.isDirectory() ? sizeOf(entryPath) : fs.statSync(entryPath).size)
      }, 0)
    } catch {
      return 0
    }
  }
  return sizeOf(objectsDir)
}

async function findImages (directory: string): Promise<string[]> {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    if (entry.name === '.git') return []
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findImages(entryPath)
    return entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()) ? [entryPath] : []
  }))
  return nested.flat()
}

async function validateRepository (): Promise<void> {
  try {
    await execFileAsync('git', ['-C', longImagesDir, 'rev-parse', '--verify', 'HEAD'], {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      timeout: 10_000
    })
  } catch (error) {
    throw new Error(`龙图目录不是完整的 Git 仓库: ${longImagesDir}`, { cause: error })
  }

  const images = await findImages(longImagesDir)
  if (images.length === 0) {
    throw new Error(`龙图仓库克隆完成但没有找到可用图片: ${longImagesDir}`)
  }
}

async function cloneImages (): Promise<void> {
  fs.mkdirSync(dir.runtimeData, { recursive: true })
  logger.info(`[karin-plugin-lux] 本地龙图不存在，开始克隆到: ${longImagesDir}`)

  const username = process.env.LUX_LONG_GIT_USERNAME
  const token = process.env.LUX_LONG_GIT_TOKEN
  if (Boolean(username) !== Boolean(token)) {
    throw new Error('龙图仓库认证配置不完整，请同时设置 LUX_LONG_GIT_USERNAME 和 LUX_LONG_GIT_TOKEN')
  }

  const askPassPath = path.join(dir.runtimeData, '.long-git-askpass.sh')
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  const progressTimer = setInterval(() => {
    const downloadedMb = (cloneDownloadSize() / 1024 / 1024).toFixed(1)
    logger.info(`[karin-plugin-lux] 龙图仓库正在克隆，已接收约 ${downloadedMb} MB`)
  }, 15_000)
  progressTimer.unref()

  try {
    if (username && token) {
      const askPassScript = [
        '#!/bin/sh',
        'case "$1" in',
        '  *Username*) printf \'%s\\n\' "$LUX_LONG_GIT_USERNAME" ;;',
        '  *) printf \'%s\\n\' "$LUX_LONG_GIT_TOKEN" ;;',
        'esac',
        ''
      ].join('\n')
      fs.writeFileSync(askPassPath, askPassScript, { encoding: 'utf8', mode: 0o700 })
      Object.assign(env, {
        GIT_ASKPASS: askPassPath,
        GIT_ASKPASS_REQUIRE: 'force',
        LUX_LONG_GIT_USERNAME: username,
        LUX_LONG_GIT_TOKEN: token
      })
    }

    await execFileAsync('git', ['clone', '--depth', '1', repositoryUrl, longImagesDir], {
      env,
      timeout: 30 * 60_000
    })
    await validateRepository()
    logger.info(`[karin-plugin-lux] 龙图仓库克隆完成: ${longImagesDir}`)
  } catch (error) {
    if (fs.existsSync(path.join(longImagesDir, '.git', 'shallow.lock'))) {
      fs.rmSync(longImagesDir, { recursive: true, force: true })
    }
    if (!username || !token) {
      throw new Error('龙图仓库需要登录。请设置 LUX_LONG_GIT_USERNAME 和具有 read_repository 权限的 LUX_LONG_GIT_TOKEN', { cause: error })
    }
    throw error
  } finally {
    clearInterval(progressTimer)
    if (fs.existsSync(askPassPath)) fs.unlinkSync(askPassPath)
  }
}

export async function initializeLongImages (): Promise<void> {
  if (initialization) return initialization
  if (fs.existsSync(longImagesDir)) {
    if (fs.existsSync(path.join(longImagesDir, '.git', 'shallow.lock'))) {
      throw new Error(`检测到未完成的龙图克隆，请确认旧进程已停止后删除此目录再重试: ${longImagesDir}`)
    }
    await validateRepository()
    return
  }

  initialization = cloneImages().finally(() => {
    initialization = null
  })
  return initialization
}

export async function getRandomLongImageBuffer (): Promise<Buffer> {
  await initializeLongImages()
  const images = await findImages(longImagesDir)
  if (images.length === 0) {
    throw new Error(`龙图仓库中没有可用图片: ${longImagesDir}`)
  }
  const imagePath = images[Math.floor(Math.random() * images.length)]
  return fs.promises.readFile(imagePath)
}
