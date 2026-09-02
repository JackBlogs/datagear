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

// 数据源表单（新增/编辑/查看共用），按原 dtbsSource_form.ftl 复刻。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
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

const selectedProperties = ref<{ name: string; value: string }[]>([])
const propertyDialogVisible = ref(false)
const propertyDialogTitle = ref('')
const propertyForm = ref({ name: '', value: '' })

const driverDisplayName = computed(() => form.value.driverEntity?.displayName || '')

async function load() {
  loading.value = true
  try {
    drivers.value = await listDriverEntities()
    if (isEdit.value) {
      form.value = await getDtbsSource(id)
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

function onSelectDriver() {
  // 简单实现：从下拉列表中选择一个驱动
  const items = drivers.value.map((d) => `${d.id}:${driverLabel(d)}`).join('\n')
  const selected = window.prompt(`请选择驱动（输入 ID）：\n${items || '无可用驱动'}`, form.value.driverEntity?.id || '')
  if (selected === null) return
  const d = drivers.value.find((x) => x.id === selected)
  if (d) {
    form.value.driverEntity = { id: d.id, displayName: driverLabel(d) }
  } else if (selected === '') {
    form.value.driverEntity = { id: '', displayName: '' }
  } else {
    fail(t('driverNotFound'))
  }
}

function onClearDriver() {
  form.value.driverEntity = { id: '', displayName: '' }
}

function openPropertyDialog(action: 'add' | 'edit') {
  if (action === 'edit') {
    if (!selectedProperties.value.length) return
    const sp = selectedProperties.value[0]
    propertyForm.value = { name: sp.name, value: sp.value }
    propertyDialogTitle.value = t('edit') + t('property')
  } else {
    propertyForm.value = { name: '', value: '' }
    propertyDialogTitle.value = t('add') + t('property')
  }
  propertyDialogVisible.value = true
}

function submitPropertyForm() {
  const props = form.value.properties ?? []
  if (propertyDialogTitle.value === t('add') + t('property')) {
    if (props.some((p) => p.name === propertyForm.value.name)) {
      fail(t('propertyNameExists'))
      return
    }
    props.push({ ...propertyForm.value })
  } else {
    const idx = props.findIndex((p) => p.name === selectedProperties.value[0]?.name)
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
  form.value.properties = (form.value.properties ?? []).filter((p) => !sps.some((s) => s.name === p.name))
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
  <div class="page page-form h-full page-form-dtbsSource p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + t('module.dtbsSource') }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/dtbsSource')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="ds-title" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ds-title"
              v-model="form.title"
              type="text"
              class="input w-full"
              required
              maxlength="100"
              :readonly="isReadonly"
              autofocus
            />
          </div>
        </div>
        <div class="field grid">
          <label for="ds-url" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="jdbc:...">{{ t('url') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="p-inputgroup">
              <InputText
                id="ds-url"
                v-model="form.url"
                type="text"
                class="input flex-1"
                required
                maxlength="2000"
                placeholder="jdbc:"
                :readonly="isReadonly"
              />
              <Button
                v-if="!isReadonly"
                type="button"
                :label="t('builder')"
                class="p-button-secondary"
                size="small"
                @click="router.push('/dtbsSourceUrlBuilder')"
              />
            </div>
          </div>
        </div>
        <div class="field grid">
          <label for="ds-user" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="数据库用户名">{{ t('username') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ds-user"
              v-model="form.user"
              type="text"
              class="input w-full"
              maxlength="200"
              autocomplete="off"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div v-if="!isReadonly" class="field grid">
          <label for="ds-password" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="数据库密码">{{ t('password') }}</label>
          <div class="field-input col-12 md:col-9">
            <Password
              id="ds-password"
              v-model="form.password"
              class="input w-full"
              input-class="w-full"
              toggle-mask
              :feedback="false"
              :pt="{ input: { name: 'password', maxlength: '100', autocomplete: 'new-password' } }"
            />
            <div class="desc text-color-secondary">
              <small>编辑时留空表示不修改密码</small>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label for="ds-schemaName" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="Schema/库名">Schema</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ds-schemaName"
              v-model="form.schemaName"
              type="text"
              class="input w-full"
              maxlength="100"
              :readonly="isReadonly"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0" title="连接属性">{{ t('property') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="p-component p-inputtext p-2">
              <div v-if="!isReadonly" class="flex flex-row pb-2 gap-1">
                <Button type="button" :label="t('add')" size="small" @click="openPropertyDialog('add')" />
                <Button type="button" :label="t('edit')" size="small" class="p-button-secondary" @click="openPropertyDialog('edit')" />
                <Button type="button" :label="t('delete')" size="small" class="p-button-danger" @click="onDeleteProperty" />
              </div>
              <div class="properties-wrapper input w-full overflow-auto">
                <DataTable
                  :value="form.properties"
                  :scrollable="true"
                  v-model:selection="selectedProperties"
                  selection-mode="multiple"
                  data-key="name"
                  striped-rows
                  class="properties-table table-sm"
                >
                  <Column selection-mode="multiple" class="col-check" />
                  <Column field="name" :header="t('propertyName')" />
                  <Column field="value" :header="t('propertyValue')" />
                </DataTable>
              </div>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label for="ds-driver" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="数据库驱动">{{ t('driver') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="p-inputgroup">
              <div class="p-input-icon-right flex-grow-1">
                <i v-if="!isReadonly && driverDisplayName" class="pi pi-times cursor-pointer opacity-60" @click="onClearDriver"></i>
                <InputText
                  id="ds-driver"
                  :value="driverDisplayName"
                  type="text"
                  class="input w-full border-noround-right"
                  readonly
                  placeholder="（自动检测）"
                />
              </div>
              <Button v-if="!isReadonly" type="button" :label="t('select')" class="p-button-secondary" size="small" @click="onSelectDriver" />
            </div>
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createUser') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="form.createUser?.nameLabel || form.createUser?.realName || ''" class="input w-full" readonly />
          </div>
        </div>
        <div v-if="isReadonly" class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('createTime') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText :value="form.createTime" class="input w-full" readonly />
          </div>
        </div>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button
          v-if="!isReadonly"
          type="button"
          :label="t('testConnection')"
          class="p-button-secondary"
          :loading="testing"
          @click="testConnection"
        />
        <Button v-if="!isReadonly" type="button" :label="t('save')" :loading="saving" @click="save" />
      </div>
    </form>

    <Dialog v-model:visible="propertyDialogVisible" :header="propertyDialogTitle" :modal="true" :dismissable-mask="true">
      <div class="flex flex-column gap-3 p-2" style="min-width: 320px">
        <div class="field">
          <label for="prop-name" class="field-label">{{ t('propertyName') }}</label>
          <InputText id="prop-name" v-model="propertyForm.name" class="input w-full" required maxlength="100" autofocus />
        </div>
        <div class="field">
          <label for="prop-value" class="field-label">{{ t('propertyValue') }}</label>
          <InputText id="prop-value" v-model="propertyForm.value" class="input w-full" maxlength="100" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('cancel')" text size="small" @click="propertyDialogVisible = false" />
        <Button :label="t('confirm')" size="small" @click="submitPropertyForm" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.properties-wrapper {
  max-height: 240px;
}
.properties-table :deep(.p-datatable-table) {
  font-size: 0.875rem;
}
</style>
