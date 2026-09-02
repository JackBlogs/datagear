import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'
import i18n from './locales'
import primevueComponents from './plugins/primevue'
import { useThemeStore } from './stores/theme'

// PrimeVue 默认主题（亮色 blue/saga-blue），暗色主题通过 stores/theme.ts 动态加载。
import 'primevue/resources/themes/saga-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// 自建覆盖层（对应现状 static/theme/style.css 的迁移目标，后续从后端 theme 覆盖层迁入）
import './styles/index.css'
// 旧版全局样式复刻（滚动条、表单字段、表格操作区等）
import './styles/legacy-style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(PrimeVue, { ripple: true })
app.use(ToastService)
app.use(ConfirmationService)
app.use(primevueComponents)

const theme = useThemeStore()
theme.init()

app.mount('#app')
