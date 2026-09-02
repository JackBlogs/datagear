import type { App } from 'vue'

// PrimeVue 3：组件按需全局注册（骨架期先注册核心组件，后续按模块增量补齐）。
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import ProgressSpinner from 'primevue/progressspinner'
import Divider from 'primevue/divider'

/**
 * 全局注册 PrimeVue 核心组件。
 * 组件命名遵循 PrimeVue 3 的 PascalCase（如 <Button />）。
 */
export default {
  install(app: App) {
    app.component('Button', Button)
    app.component('InputText', InputText)
    app.component('Password', Password)
    app.component('Checkbox', Checkbox)
    app.component('Card', Card)
    app.component('DataTable', DataTable)
    app.component('Column', Column)
    app.component('Dialog', Dialog)
    app.component('Toast', Toast)
    app.component('ConfirmDialog', ConfirmDialog)
    app.component('ProgressSpinner', ProgressSpinner)
    app.component('Divider', Divider)
  },
}
