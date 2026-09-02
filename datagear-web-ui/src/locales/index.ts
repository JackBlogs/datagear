import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'

/**
 * vue-i18n 语言包。
 * 阶段一：zh-CN（由 message.properties 一次性脚本生成，见《方案》§6.7）。
 * 结构预留多语言：en-US 平铺即可补译。
 */
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
  },
})

export default i18n
