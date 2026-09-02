import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeName = 'blue' | 'blueDark'

const THEME_KEY = 'datagear.theme'

const THEME_CSS_MAP: Record<ThemeName, string> = {
  blue: 'saga-blue',
  blueDark: 'vela-blue',
}

/** 动态切换 PrimeVue 主题 link href */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeName>((localStorage.getItem(THEME_KEY) as ThemeName) || 'blue')

  function apply(name: ThemeName) {
    theme.value = name
    localStorage.setItem(THEME_KEY, name)
    let link = document.getElementById('app-theme') as HTMLLinkElement | null
    if (name === 'blue') {
      link?.remove()
      return
    }
    if (!link) {
      link = document.createElement('link')
      link.id = 'app-theme'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `/themes/${THEME_CSS_MAP[name]}/theme.css`
  }

  function setTheme(name: ThemeName) {
    apply(name)
  }

  function toggle() {
    apply(theme.value === 'blue' ? 'blueDark' : 'blue')
  }

  function init() {
    apply(theme.value)
  }

  return { theme, apply, setTheme, toggle, init }
})
