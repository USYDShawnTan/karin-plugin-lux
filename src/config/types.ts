export interface GeneralConfig {
  masterId: string
}

export interface ServicesConfig {
  apiBaseUrl: string
  dynamicEmojiBaseUrl: string
  emojiComboBaseUrl: string
  memeBaseUrl: string
  hitokotoUrl: string
}

export interface FeaturesConfig {
  poke: {
    enabled: boolean
    protectMaster: boolean
  }
  meme: {
    enabled: boolean
  }
  emoji: {
    enabled: boolean
  }
}

export interface LuxConfig {
  general: GeneralConfig
  services: ServicesConfig
  features: FeaturesConfig
}

export type ConfigSection = keyof LuxConfig
