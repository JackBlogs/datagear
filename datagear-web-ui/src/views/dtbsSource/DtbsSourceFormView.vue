<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDtbsSource,
  saveDtbsSource,
  testDtbsSourceConnection,
  listDriverEntities,
  type DtbsSource,
  type DriverEntity,
} from '@/api/dtbsSource'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'
import DriverSelectDialog from '@/components/DriverSelectDialog.vue'
import DtbsSourceUrlBuilderDialog from '@/components/DtbsSourceUrlBuilderDialog.vue'

// 数据源表单（新增/编辑/查看共用），按原 dtbsSource_form.ftl 复刻。
// 复制功能：路由 query copyFrom=<id>（对应旧版 /dtbsSource/copy 服务端渲染预填页）。
// 第三轮：按原型「能源暗域」风格重排版式（page-head + card 分区 + .input/.tbl/.btn），功能不变。
import '@/styles/datasource-page.css'

const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
const copyFrom = (route.query.copyFrom as string) || ''
const mode = (route.query.mode as string) || 'edit'
const isEdit = computed(() => !!id)
const isReadonly = computed(() => mode === 'view')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const drivers = ref<DriverEntity[]>([])

const form = ref<DtbsSource>({
  id: '',
  title: '',
  url: '',
  user: '',
  password: '',
  schemaName: '',
  driverEntity: { id: '', displayName: '' },
  properties: [],
})

const selectedProperties = ref<string[]>([])
const propertyDialogVisible = ref(false)
const propertyDialogMode = ref<'add' | 'edit'>('add')
const propertyForm = ref({ name: '', value: '' })
const driverDialogVisible = ref(false)
const urlBuilderVisible = ref(false)

const driverDisplayName = computed(() => form.value.driverEntity?.displayName || '')

const pageTitle = computed(() =>
  isReadonly.value ? t('dsForm.viewTitle') : isEdit.value ? t('dsForm.editTitle') : t('dsForm.addTitle'),
)

async function load() {
  loading.value = true
  try {
    drivers.value = await listDriverEntities()
    if (isEdit.value) {
      form.value = await getDtbsSource(id)
      if (!form.value.properties) form.value.properties = []
      if (!form.value.driverEntity) form.value.driverEntity = { id: '', displayName: '' }
    } else if (copyFrom) {
      // 复制：加载源实体，清空 ID/密码，标题加副本后缀
      const src = await getDtbsSource(copyFrom)
      form.value = {
        ...src,
        id: '',
        title: (src.title ?? '') + t('dsPage.copySuffix'),
        password: '',
      }
      if (!form.value.properties) form.value.properties = []
      if (!form.value.driverEntity) form.value.driverEntity = { id: '', displayName: '' }
    }
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function driverLabel(d: DriverEntity): string {
  return d.displayName ?? d.displayText ?? d.driverClassName ?? d.id
}

function onDriverPicked(d: DriverEntity | null) {
  if (d) {
    form.value.driverEntity = { id: d.id, displayName: driverLabel(d) }
  } else {
    form.value.driverEntity = { id: '', displayName: '' }
  }
}

function onClearDriver() {
  form.value.driverEntity = { id: '', displayName: '' }
}

function onUrlApplied(url: string) {
  form.value.url = url
}

function toggleProperty(name: string) {
  selectedProperties.value = selectedProperties.value.includes(name)
    ? selectedProperties.value.filter((x) => x !== name)
    : [...selectedProperties.value, name]
}

function openPropertyDialog(action: 'add' | 'edit') {
  propertyDialogMode.value = action
  if (action === 'edit') {
    const sp = (form.value.properties ?? []).find((p) => p.name === selectedProperties.value[0])
    if (!sp) return
    propertyForm.value = { name: sp.name, value: sp.value }
  } else {
    propertyForm.value = { name: '', value: '' }
  }
  propertyDialogVisible.value = true
}

function submitPropertyForm() {
  if (!propertyForm.value.name.trim()) {
    fail(t('propertyNameExists'))
    return
  }
  const props = form.value.properties ?? []
  if (propertyDialogMode.value === 'add') {
    if (props.some((p) => p.name === propertyForm.value.name)) {
      fail(t('propertyNameExists'))
      return
    }
    props.push({ ...propertyForm.value })
  } else {
    const idx = props.findIndex((p) => p.name === selectedProperties.value[0])
    if (idx >= 0) {
      props[idx] = { ...propertyForm.value }
    }
  }
  form.value.properties = props
  selectedProperties.value = []
  propertyDialogVisible.value = false
}

function onDeleteProperty() {
  const sps = selectedProperties.value
  if (!sps.length) return
  form.value.properties = (form.value.properties ?? []).filter((p) => !sps.includes(p.name))
  selectedProperties.value = []
}

async function testConnection() {
  if (!form.value.title || !form.value.url) {
    fail(t('pleaseFillTitleAndUrl'))
    return
  }
  testing.value = true
  try {
    await testDtbsSourceConnection(form.value)
    success(t('connectSuccess'))
  } catch (e) {
    fail((e as Error).message || t('connectFail'))
  } finally {
    testing.value = false
  }
}

async function save() {
  if (!form.value.title || !form.value.url) {
    fail(t('pleaseFillTitleAndUrl'))
    return
  }
  saving.value = true
  try {
    await saveDtbsSource(form.value)
    success(t('saveSuccess'))
    router.push('/dtbsSource')
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ pageTitle }}</div>
        <div class="page-desc">{{ t('dsForm.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/dtbsSource')">{{ t('back') }}</button>
      </div>
    </div>

    <div v-if="loading" class="tx-3">{{ t('loading') }}…</div>
    <form v-else @submit.prevent="save">
      <!-- 基本信息 -->
      <div class="card mb-2">
        <div class="card-title"><span class="bar"></span>{{ t('dsForm.basicInfo') }}</div>
        <div class="form-item">
          <label class="form-label"><span class="req">*</span>{{ t('name') }}</label>
          <input v-model="form.title" class="input" type="text" required maxlength="100" :readonly="isReadonly" />
        </div>
        <div class="form-item">
          <label class="form-label"><span class="req">*</span>{{ t('url') }}</label>
          <div class="flex" style="gap:8px">
            <input v-model="form.url" class="input grow" type="text" required maxlength="2000" :placeholder="t('dsForm.urlPh')" :readonly="isReadonly" />
            <button v-if="!isReadonly" class="btn" type="button" @click="urlBuilderVisible = true">{{ t('builder') }}</button>
          </div>
        </div>
        <div class="flex" style="gap:14px;align-items:flex-start">
          <div class="form-item grow">
            <label class="form-label">{{ t('username') }}</label>
            <input v-model="form.user" class="input" type="text" maxlength="200" autocomplete="off" :readonly="isReadonly" />
          </div>
          <div v-if="!isReadonly" class="form-item grow">
            <label class="form-label">{{ t('password') }}</label>
            <input v-model="form.password" class="input" type="password" maxlength="100" autocomplete="new-password" />
            <div class="sm tx-3" style="margin-top:4px">{{ t('dtbsSource.password.input.desc') }}</div>
          </div>
        </div>
        <div class="form-item" style="margin-bottom:0">
          <label class="form-label">Schema</label>
          <input v-model="form.schemaName" class="input" type="text" maxlength="100" :readonly="isReadonly" />
        </div>
      </div>

      <!-- 连接属性 -->
      <div class="card mb-2">
        <div class="card-title">
          <span class="bar"></span>{{ t('dsForm.properties') }}
          <span v-if="!isReadonly" class="more" style="display:flex;gap:12px">
            <span class="link" @click="openPropertyDialog('add')">{{ t('add') }}</span>
            <span class="link" :class="{ muted: selectedProperties.length !== 1 }" @click="openPropertyDialog('edit')">{{ t('edit') }}</span>
            <span class="link danger" :class="{ muted: !selectedProperties.length }" @click="onDeleteProperty">{{ t('delete') }}</span>
          </span>
        </div>
        <div class="table-wrap" style="border-radius:var(--r-m)">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:36px"></th>
                <th>{{ t('propertyName') }}</th>
                <th>{{ t('propertyValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!(form.properties ?? []).length">
                <td colspan="3" class="tx-3" style="text-align:center">—</td>
              </tr>
              <tr v-for="p in form.properties" :key="p.name" @click="!isReadonly && toggleProperty(p.name)" :style="{ cursor: isReadonly ? 'default' : 'pointer' }">
                <td>
                  <input type="checkbox" :checked="selectedProperties.includes(p.name)" :disabled="isReadonly" @click.stop="toggleProperty(p.name)" />
                </td>
                <td class="cell-main">{{ p.name }}</td>
                <td>{{ p.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 数据库驱动 -->
      <div class="card mb-2">
        <div class="card-title"><span class="bar"></span>{{ t('dsForm.driverSec') }}</div>
        <div class="flex" style="gap:10px">
          <div class="grow flex" style="gap:8px;align-items:center">
            <span v-if="driverDisplayName" class="tag info">{{ driverDisplayName }}</span>
            <span v-else class="tx-3 sm">{{ t('dsForm.noDriver') }}</span>
          </div>
          <template v-if="!isReadonly">
            <button class="btn sm" type="button" @click="driverDialogVisible = true">{{ t('select') }}</button>
            <button v-if="driverDisplayName" class="btn sm ghost" type="button" @click="onClearDriver">{{ t('clear') }}</button>
          </template>
        </div>
      </div>

      <!-- 创建信息（查看模式） -->
      <div v-if="isReadonly" class="card mb-2">
        <div class="card-title"><span class="bar"></span>{{ t('dsForm.metaSec') }}</div>
        <div class="kv"><span class="k">{{ t('createUser') }}</span><span class="v">{{ form.createUser?.nameLabel || form.createUser?.realName || '-' }}</span></div>
        <div class="kv"><span class="k">{{ t('createTime') }}</span><span class="v">{{ form.createTime || '-' }}</span></div>
      </div>

      <!-- 底部操作 -->
      <div v-if="!isReadonly" class="flex mt-2" style="justify-content:center;gap:12px">
        <button class="btn primary" type="submit" :disabled="saving">{{ saving ? t('loading') : t('save') }}</button>
        <button class="btn" type="button" :disabled="testing" @click="testConnection">
          {{ testing ? t('loading') : t('testConnection') }}
        </button>
      </div>
    </form>

    <!-- 属性编辑弹窗（原型 .modal 风格） -->
    <div v-if="propertyDialogVisible" class="modal-mask" @click.self="propertyDialogVisible = false">
      <div class="modal">
        <div class="flex-between">
          <div style="font-size:15px;font-weight:700">
            {{ (propertyDialogMode === 'add' ? t('add') : t('edit')) + t('property') }}
          </div>
          <button class="drawer-close" type="button" @click="propertyDialogVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mt-2">
          <div class="form-item">
            <label class="form-label"><span class="req">*</span>{{ t('propertyName') }}</label>
            <input v-model="propertyForm.name" class="input" type="text" maxlength="100" />
          </div>
          <div class="form-item" style="margin-bottom:0">
            <label class="form-label">{{ t('propertyValue') }}</label>
            <input v-model="propertyForm.value" class="input" type="text" maxlength="500" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" type="button" @click="propertyDialogVisible = false">{{ t('cancel') }}</button>
          <button class="btn primary" type="button" @click="submitPropertyForm">{{ t('confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 驱动选择弹窗（共享组件，暗色覆盖由 .ds-page .p-dialog 提供） -->
    <DriverSelectDialog
      v-model:visible="driverDialogVisible"
      :drivers="drivers"
      :selected-id="form.driverEntity?.id"
      @select="onDriverPicked"
    />

    <!-- URL 构建器弹窗（应用后直接回填 URL 输入框） -->
    <DtbsSourceUrlBuilderDialog
      v-model:visible="urlBuilderVisible"
      :initial-url="form.url"
      @apply="onUrlApplied"
    />
  </div>
</template>
