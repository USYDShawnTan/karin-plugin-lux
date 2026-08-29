import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { karin } from 'node-karin'

const execFileAsync = promisify(execFile)
const packageJsonUrl = new URL('../../package.json', import.meta.url)
const npmLatestUrl = 'https://registry.npmjs.org/karin-plugin-lux/latest'

type PackageJson = {
  version: string
}

type NpmLatest = {
  version: string
}

async function getCurrentVersion () {
  const raw = await readFile(packageJsonUrl, 'utf8')
  const pkg = JSON.parse(raw) as PackageJson
  return pkg.version
}

async function getLatestVersion () {
  const response = await fetch(npmLatestUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'karin-plugin-lux-update-check'
    }
  })

  if (!response.ok) {
    throw new Error(`npm registry returned ${response.status}`)
  }

  const data = await response.json() as NpmLatest
  return data.version
}

export const luxVersion = karin.command(/^#?lux版本$/, async (e) => {
  try {
    const [current, latest] = await Promise.all([
      getCurrentVersion(),
      getLatestVersion()
    ])

    const status = current === latest
      ? '当前已是最新版本'
      : `发现新版本：${latest}`

    await e.reply(`karin-plugin-lux\n当前版本：${current}\n最新版本：${latest}\n${status}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await e.reply(`检查更新失败：${message}`)
  }

  return true
}, {
  name: 'Lux版本检查',
  event: 'message',
  perm: 'all',
  log: true
})

export const luxUpdate = karin.command(/^#?lux更新$/, async (e) => {
  try {
    const [current, latest] = await Promise.all([
      getCurrentVersion(),
      getLatestVersion()
    ])

    if (current === latest) {
      await e.reply(`当前已经是最新版本：${current}`)
      return true
    }

    await e.reply(`开始更新 karin-plugin-lux：${current} → ${latest}\n请稍候，更新完成后建议重启 Karin。`)

    const { stdout, stderr } = await execFileAsync(
      'pnpm',
      ['up', 'karin-plugin-lux@latest', '-w'],
      {
        cwd: process.cwd(),
        timeout: 120_000,
        maxBuffer: 1024 * 1024
      }
    )

    const output = [stdout, stderr]
      .filter(Boolean)
      .join('\n')
      .trim()
      .slice(-1500)

    await e.reply(`更新命令执行完成：${current} → ${latest}\n请重启 Karin 使新版本生效。${output ? `\n\n${output}` : ''}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await e.reply(`更新失败：${message}`)
  }

  return true
}, {
  name: 'Lux更新',
  event: 'message',
  perm: 'master',
  log: true
})
