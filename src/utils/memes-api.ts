import axios from 'node-karin/axios'
import { getConfig } from '@/config'

export interface MemeArgsOptionAction {
  type: number
  value?: any
}

export interface MemeArgsOptionArg {
  name: string
  value: string
  default: any
  flags: any
}

export interface MemeParserOption {
  names: string[]
  args: MemeArgsOptionArg[] | null
  dest?: string | null
  default?: any
  action?: MemeArgsOptionAction | null
  help_text?: string | null
  compact?: boolean
}

export interface MemeArgsModelProperty {
  default?: any
  enum?: any[]
  type?: string
  description?: string
  title?: string
}

export interface MemeArgsModel {
  properties?: Record<string, MemeArgsModelProperty>
}

export interface MemeArgsType {
  parser_options?: MemeParserOption[]
  args_model?: MemeArgsModel
  args_examples?: Record<string, any>[]
}

export interface MemeParamsType {
  min_images: number
  max_images: number
  min_texts: number
  max_texts: number
  default_texts?: string[]
  args_type?: MemeArgsType | null
}

export interface MemeInfo {
  key: string
  keywords: string[]
  date_created?: string
  params_type: MemeParamsType
}

export interface RenderListItem {
  meme_key: string
  disabled: boolean
  labels: string[]
}

export class MemesApi {
  private readonly configuredBaseUrl?: string

  constructor (baseUrl?: string) {
    this.configuredBaseUrl = baseUrl
  }

  private get baseUrl (): string {
    const url = this.configuredBaseUrl ?? getConfig().services.memeBaseUrl
    return url.endsWith('/') ? url : `${url}/`
  }

  async getKeys (): Promise<string[]> {
    const { data } = await axios.get(this.baseUrl + 'keys')
    return data as string[]
  }

  async getInfo (key: string): Promise<MemeInfo> {
    const { data } = await axios.get(this.baseUrl + `${encodeURIComponent(key)}/info`)
    const info = data as Omit<MemeInfo, 'key'>
    return { key, ...(info as any) }
  }

  async renderList (items: RenderListItem[], textTemplate = '{keywords}', addCategoryIcon = true): Promise<ArrayBuffer> {
    const { data } = await axios.post(this.baseUrl + 'render_list', {
      meme_list: items,
      text_template: textTemplate,
      add_category_icon: addCategoryIcon,
    }, { responseType: 'arraybuffer' })
    return data as ArrayBuffer
  }

  async renderMeme (key: string, formData: FormData): Promise<ArrayBuffer> {
    const { data } = await axios.post(this.baseUrl + `${encodeURIComponent(key)}/`, formData as any, {
      responseType: 'arraybuffer',
      headers: (formData as any).getHeaders ? (formData as any).getHeaders() : undefined,
    })
    return data as ArrayBuffer
  }
}

