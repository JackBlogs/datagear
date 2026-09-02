import { defineStore } from 'pinia'

export interface TabItem {
  /** 路由 name（用于 KeepAlive include） */
  name: string
  title: string
  path: string
}

/**
 * 多标签页：复刻现状“多 panel 共存”语义。
 * 支持打开/激活/关闭/关闭其他（替代 po.tabview* 系列，见《方案》§6.2）。
 */
export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as TabItem[],
    activeName: '',
  }),
  getters: {
    keepAliveNames: (state) => state.tabs.map((t) => t.name),
  },
  actions: {
    open(tab: TabItem) {
      if (!this.tabs.some((t) => t.name === tab.name)) {
        this.tabs.push(tab)
      }
      this.activeName = tab.name
    },
    close(name: string) {
      const idx = this.tabs.findIndex((t) => t.name === name)
      if (idx >= 0) this.tabs.splice(idx, 1)
      if (this.activeName === name && this.tabs.length > 0) {
        this.activeName = this.tabs[this.tabs.length - 1].name
      }
    },
    closeOthers(name: string) {
      this.tabs = this.tabs.filter((t) => t.name === name)
    },
    closeAll() {
      this.tabs = []
      this.activeName = ''
    },
  },
})
