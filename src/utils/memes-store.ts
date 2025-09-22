import fs from 'node:fs'
import path from 'node:path'
import { dir } from '@/dir'
import type { MemeInfo } from './memes-api'

export interface MemesInfosIndex {
  [key: string]: Omit<MemeInfo, 'key'> & { key: string }
}

export class MemesStore {
  readonly baseDir: string
  readonly infosPath: string
  readonly keyMapPath: string
  readonly triggersPath: string
  readonly listImagePath: string

  constructor () {
    this.baseDir = dir.memesDataDir
    this.infosPath = path.join(this.baseDir, 'infos.json')
    this.keyMapPath = path.join(this.baseDir, 'keyMap.json')
    this.triggersPath = path.join(this.baseDir, 'triggers.json')
    this.listImagePath = path.join(this.baseDir, 'memes_list.png')
  }

  ensureDirs () {
    fs.mkdirSync(this.baseDir, { recursive: true })
  }

  loadInfos (): MemesInfosIndex | null {
    try {
      if (!fs.existsSync(this.infosPath)) return null
      const raw = fs.readFileSync(this.infosPath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  loadKeyMap (): Record<string, string> | null {
    try {
      if (!fs.existsSync(this.keyMapPath)) return null
      const raw = fs.readFileSync(this.keyMapPath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  saveInfos (data: MemesInfosIndex) {
    this.ensureDirs()
    fs.writeFileSync(this.infosPath, JSON.stringify(data, null, 2), 'utf8')
  }

  saveKeyMap (data: Record<string, string>) {
    this.ensureDirs()
    fs.writeFileSync(this.keyMapPath, JSON.stringify(data, null, 2), 'utf8')
  }

  loadTriggers (): Record<string, number> {
    try {
      if (!fs.existsSync(this.triggersPath)) return {}
      const raw = fs.readFileSync(this.triggersPath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  saveTriggers (counts: Record<string, number>) {
    this.ensureDirs()
    fs.writeFileSync(this.triggersPath, JSON.stringify(counts, null, 2), 'utf8')
  }

  hasListImage (): boolean {
    return fs.existsSync(this.listImagePath)
  }

  saveListImage (buffer: Buffer) {
    this.ensureDirs()
    fs.writeFileSync(this.listImagePath, buffer)
  }

  readListImage (): Buffer | null {
    if (!this.hasListImage()) return null
    return fs.readFileSync(this.listImagePath)
  }
}


