import { defineStore } from 'pinia'

const LOCALE_KEY = 'datagear.locale'

/**
 * 语言切换（阶段一先 zh-CN，结构预留多语言 en-US）。
 * 与后端校验/错误消息的 locale 约定对齐：请求头携带 locale。
 */
export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: (localStorage.getItem(LOCALE_KEY) as string) || 'zh-CN',
  }),
  actions: {
    setLocale(locale: string) {
      this.locale = locale
      localStorage.setItem(LOCALE_KEY, locale)
    },
  },
})
