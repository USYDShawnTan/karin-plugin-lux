import { defineConfig, components } from "node-karin"
import { getConfig, saveFeaturesConfig, saveGeneralConfig, saveServicesConfig } from "@/config"

interface WebConfigValues {
  masterId: string
  apiBaseUrl: string
  dynamicEmojiBaseUrl: string
  emojiComboBaseUrl: string
  memeBaseUrl: string
  hitokotoUrl: string
  pokeEnabled: boolean
  protectMaster: boolean
  memeEnabled: boolean
  emojiEnabled: boolean
}

export default defineConfig({
  info: {
    id: "karin-plugin-lux",
    name: "杂七杂八的插件",
    author: {
      name: 'Xiaotan',
      home: 'https://github.com/USYDShawnTan/karin-plugin-lux',
      avatar: 'https://github.com/USYDShawnTan.png'
    },
    description: "德玛西亚人站一排,你光要套盾了"
  },

  components: () => [
    components.divider.create('general-divider', {
      description: "基本设置"
    }),
    components.input.string("masterId", {
      label: "主人ID",
      placeholder: "请输入主人ID",
      defaultValue: getConfig().general.masterId,
      isRequired: true
    }),
    components.divider.create('services-divider', {
      description: "服务设置"
    }),
    components.input.string("apiBaseUrl", {
      label: "通用 API 根地址（今日运势）",
      placeholder: "例如：https://api.433200.xyz/api",
      defaultValue: getConfig().services.apiBaseUrl,
      isRequired: true
    }),
    components.input.string("dynamicEmojiBaseUrl", {
      label: "动态 Emoji API 地址",
      placeholder: "请输入动态 Emoji API 地址",
      defaultValue: getConfig().services.dynamicEmojiBaseUrl,
      isRequired: true
    }),
    components.input.string("emojiComboBaseUrl", {
      label: "Emoji 合成 API 地址",
      placeholder: "请输入 Emoji 合成 API 地址",
      defaultValue: getConfig().services.emojiComboBaseUrl,
      isRequired: true
    }),
    components.input.string("memeBaseUrl", {
      label: "Meme API 地址",
      placeholder: "请输入 Meme API 地址",
      defaultValue: getConfig().services.memeBaseUrl,
      isRequired: true
    }),
    components.input.string("hitokotoUrl", {
      label: "Hitokoto / 一言 API 地址",
      placeholder: "请输入 Hitokoto API 地址",
      defaultValue: getConfig().services.hitokotoUrl,
      isRequired: true
    }),
    components.divider.create('features-divider', {
      description: "功能设置"
    }),
    components.switch.create("pokeEnabled", {
      label: "启用戳一戳",
      defaultSelected: getConfig().features.poke.enabled
    }),
    components.switch.create("protectMaster", {
      label: "启用主人保护",
      defaultSelected: getConfig().features.poke.protectMaster
    }),
    components.switch.create("memeEnabled", {
      label: "启用 Meme",
      defaultSelected: getConfig().features.meme.enabled
    }),
    components.switch.create("emojiEnabled", {
      label: "启用 Emoji",
      defaultSelected: getConfig().features.emoji.enabled
    })
  ],

  save: (cfg: WebConfigValues) => {
    saveGeneralConfig({ masterId: cfg.masterId })
    saveServicesConfig({
      apiBaseUrl: cfg.apiBaseUrl,
      dynamicEmojiBaseUrl: cfg.dynamicEmojiBaseUrl,
      emojiComboBaseUrl: cfg.emojiComboBaseUrl,
      memeBaseUrl: cfg.memeBaseUrl,
      hitokotoUrl: cfg.hitokotoUrl
    })
    saveFeaturesConfig({
      poke: { enabled: cfg.pokeEnabled, protectMaster: cfg.protectMaster },
      meme: { enabled: cfg.memeEnabled },
      emoji: { enabled: cfg.emojiEnabled }
    })
    return { success: true, message: "配置保存成功" }
  }
})
