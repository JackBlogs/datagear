import { defineStore } from 'pinia'

export type ThemeName = 'blue' | 'blueDark'

/**
 * 主题切换：复刻现状“换 link href”机制（非 CSS 变量）。
 * 骨架期 main.ts 静态引入 saga-blue（blue）。
 *
 * TODO(阶段一 POC 验证项 #5)：blueDark（vela-blue）双主题“换 link href”。
 * 验证 npm 版 PrimeVue 用“换 link href”方式复刻现有 blue/blueDark：
 *   - blue     -> primevue/resources/themes/saga-blue/theme.css
 *   - blueDark -> primevue/resources/themes/vela-blue/theme.css
 * 方案：index.html 放两个 <link id="app-theme"> 兄弟节点，useTheme() 切换二者 href 并持久化到 localStorage。
 */
const THEME_KEY = 'datagear.theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: (localStorage.getItem(THEME_KEY) as ThemeName) || 'blue',
  }),
  actions: {
    init() {
      // 骨架期占位：正式实现见上方 TODO。
      document.documentElement.setAttribute('data-theme', this.theme)
    },
    setTheme(theme: ThemeName) {
      this.theme = theme
      localStorage.setItem(THEME_KEY, theme)
      document.documentElement.setAttribute('data-theme', theme)
    },
    toggle() {
      this.setTheme(this.theme === 'blue' ? 'blueDark' : 'blue')
    },
  },
})
