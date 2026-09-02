import type { App } from 'vue'

// PrimeVue 3：组件按需全局注册（骨架期先注册核心组件，后续按模块增量补齐）。
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import SelectButton from 'primevue/selectbutton'
import Password from 'primevue/password'
import Chip from 'primevue/chip'
import Checkbox from 'primevue/checkbox'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import ProgressSpinner from 'primevue/progressspinner'
import Divider from 'primevue/divider'
import Steps from 'primevue/steps'
import Dropdown from 'primevue/dropdown'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import TreeTable from 'primevue/treetable'
import Badge from 'primevue/badge'
import OverlayPanel from 'primevue/overlaypanel'

/**
 * 全局注册 PrimeVue 核心组件。
 * 组件命名遵循 PrimeVue 3 的 PascalCase（如 <Button />）。
 */
export default {
  install(app: App) {
    app.component('Button', Button)
    app.component('InputText', InputText)
    app.component('Textarea', Textarea)
    app.component('SelectButton', SelectButton)
    app.component('Password', Password)
    app.component('Chip', Chip)
    app.component('Checkbox', Checkbox)
    app.component('Card', Card)
    app.component('DataTable', DataTable)
    app.component('Column', Column)
    app.component('Dialog', Dialog)
    app.component('Toast', Toast)
    app.component('ConfirmDialog', ConfirmDialog)
    app.component('ProgressSpinner', ProgressSpinner)
    app.component('Divider', Divider)
    app.component('Steps', Steps)
    app.component('Dropdown', Dropdown)
    app.component('TabView', TabView)
    app.component('TabPanel', TabPanel)
    app.component('TreeTable', TreeTable)
    app.component('Badge', Badge)
    app.component('OverlayPanel', OverlayPanel)
  },
}
