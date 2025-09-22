import axios from 'node-karin/axios'

const DEFAULT_BASE = 'https://mobiustaylor-meme.hf.space/memes/'

export interface MemeInfo {
  key: string
  keywords: string[]
  date_created?: string
  params_type: {
    min_images: number
    max_images: number
    min_texts: number
    max_texts: number
    args_type?: {
      parser_options: Array<{ names: string[]; help_text?: string }>
    }
  }
}

export interface RenderListItem {
  meme_key: string
  disabled: boolean
  labels: string[]
}

export class MemesApi {
  private readonly baseUrl: string

  constructor (baseUrl: string = DEFAULT_BASE) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
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


