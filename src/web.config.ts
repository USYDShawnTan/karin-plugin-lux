import { defineConfig, components } from "node-karin"
import { saveConfig } from "@/utils/config"

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
    components.input.string("yiyanApi", {
      label: "一言 API 地址",
      placeholder: "请输入 URL",
      defaultValue: "https://v1.hitokoto.cn/",
      isRequired: true
    }),
    components.input.string("apiBaseUrl", {
      label: "通用 API 基础地址",
      placeholder: "请输入 API 基础地址",
      defaultValue: "",
      isRequired: true
    }),
    components.input.string("emojiApiBaseUrl", {
      label: "Emoji API 基础地址",
      placeholder: "请输入 Emoji API 基础地址",
      defaultValue: "",
      isRequired: true
    }),
    components.input.string("masterId", {
      label: "主人ID",
      placeholder: "请输入主人ID",
      defaultValue: "",
      isRequired: true
    })
  ],

  save: (cfg: any) => {
    saveConfig(cfg)
    return { success: true, message: "配置保存成功" }
  }
})
