import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'
import i18n from './locales'
import primevueComponents from './plugins/primevue'

// PrimeVue 主题：blue = saga-blue（亮色）。
// blueDark（vela-blue）双主题“换 link href”切换见 stores/theme.ts（阶段一 POC 验证项）。
import 'primevue/resources/themes/saga-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// 自建覆盖层（对应现状 static/theme/style.css 的迁移目标，后续从后端 theme 覆盖层迁入）
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(PrimeVue, { ripple: true })
app.use(ToastService)
app.use(ConfirmationService)
app.use(primevueComponents)

app.mount('#app')
