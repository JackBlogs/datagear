<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getSqlDataSet,
  previewSqlDataSet,
  saveSqlDataSet,
  saveSqlDataSetEdit,
  type DataSetParam,
  type SqlDataSetForm,
  type SqlDataSetPreviewResult,
} from '@/api/dataSet'
import { dtbsSourcePagingQueryData, type DtbsSource } from '@/api/dtbsSource'
import CodeEditor from '@/components/CodeEditor.vue'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// SQL 数据集表单（范式 C 独立表单页），按原 dataSet_form_SQL.ftl 复刻：
// 名称 + 数据源选择 + SQL 编辑器 + 参数表 + 保存/预览。
const route = useRoute()
const router = useRouter()
const { success, fail } = useOperationMessage()
const { t } = useI18n()

const id = (route.params.id as string) ?? ''
// 支持 ?mode=view 查询参数，也兼容 /dataSet/:id/view/sql 路径语义
const mode = (route.query.mode as string) || (route.path.includes('/view/') ? 'view' : 'edit')
const isEdit = computed(() => !!id)
const isReadonly = computed(() => mode === 'view')

const loading = ref(false)
const saving = ref(false)

const form = ref<SqlDataSetForm>({
  id: '',
  name: '',
  sql: '',
  dataSetType: 'SQL',
  mutableModel: false,
  params: [],
  dtbsCnFty: { dtbsSource: { id: '', title: '' } },
})

// 数据源选择
const dtbsSourceDialog = ref(false)
const dtbsSources = ref<DtbsSource[]>([])
const dtbsSourceLoading = ref(false)
const selectedDtbsSource = ref<DtbsSource | null>(null)

// 参数编辑
const paramDialog = ref(false)
const paramEditing = ref(false)
const paramForm = ref<DataSetParam>(newParam())
const selectedParams = ref<DataSetParam[]>([])

// 预览
const previewDialog = ref(false)
const previewing = ref(false)
const previewResult = ref<SqlDataSetPreviewResult | null>(null)
const previewError = ref('')

const booleanOptions = [
  { name: t('yes'), value: true },
  { name: t('no'), value: false },
]

const paramTypeOptions = [
  { name: t('dataSetParam.DataType.STRING'), value: 'string' },
  { name: t('dataSetParam.DataType.INTEGER'), value: 'integer' },
  { name: t('dataSetParam.DataType.NUMBER'), value: 'number' },
  { name: t('dataSetParam.DataType.BOOLEAN'), value: 'boolean' },
  { name: t('dataSetParam.DataType.OBJECT'), value: 'object' },
]

const paramInputTypeOptions = [
  { name: t('dataSetParam.InputType.TEXT'), value: 'text' },
  { name: t('dataSetParam.InputType.SELECT'), value: 'select' },
  { name: t('singleSelect'), value: 'radio' },
  { name: t('dataSetParam.InputType.CHECKBOX'), value: 'checkbox' },
  { name: t('dataSetParam.InputType.TEXTAREA'), value: 'textarea' },
  { name: t('dataSetParam.InputType.DATE'), value: 'date' },
  { name: t('dataSetParam.InputType.TIME'), value: 'time' },
  { name: t('dataSetParam.InputType.DATETIME'), value: 'datetime' },
]

const title = computed(() => {
  const label = t('module.dataSet.SQL')
  if (isReadonly.value) return t('view') + label
  return (isEdit.value ? t('edit') : t('new')) + label
})

const dtbsSourceDisplay = computed(
  () => form.value.dtbsCnFty.dtbsSource.title || form.value.dtbsCnFty.dtbsSource.id || '',
)

const previewRows = computed<Record<string, unknown>[]>(() => {
  const data = previewResult.value?.result?.data
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : []
})

const previewColumns = computed<{ name: string; label: string }[]>(() => {
  const fields = previewResult.value?.fields
  if (fields && fields.length) return fields.map((f) => ({ name: f.name, label: f.label || f.name }))
  const first = previewRows.value[0]
  if (first && typeof first === 'object') return Object.keys(first).map((k) => ({ name: k, label: k }))
  return []
})

function newParam(): DataSetParam {
  return { name: '', type: 'string', required: true, label: '', desc: '', inputType: 'text', inputPayload: '' }
}

function extractError(e: unknown): string {
  const err = e as { response?: { data?: unknown }; message?: string }
  const body = err?.response?.data
  if (body) {
    if (typeof body === 'string') return body
    const b = body as { message?: string; data?: unknown; detail?: string }
    if (b.message) return b.message
    if (typeof b.data === 'string') return b.data
    if (b.detail) return b.detail
  }
  return err?.message || t('operationFail')
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const e = await getSqlDataSet(id)
    form.value = {
      id: e.id ?? id,
      name: e.name ?? '',
      sql: e.sql ?? '',
      dataSetType: e.dataSetType ?? 'SQL',
      mutableModel: e.mutableModel ?? false,
      params: e.params ?? [],
      dtbsCnFty: {
        dtbsSource: {
          id: e.dtbsCnFty?.dtbsSource?.id ?? '',
          title: e.dtbsCnFty?.dtbsSource?.title ?? '',
        },
      },
    }
  } catch (e) {
    fail(extractError(e))
  } finally {
    loading.value = false
  }
}

async function openDtbsSourceDialog() {
  selectedDtbsSource.value = null
  dtbsSourceDialog.value = true
  if (!dtbsSources.value.length) await loadDtbsSources()
}

async function loadDtbsSources() {
  dtbsSourceLoading.value = true
  try {
    const data = await dtbsSourcePagingQueryData({ page: 0, pageSize: 50 })
    dtbsSources.value = data.items ?? []
  } catch (e) {
    fail(extractError(e))
  } finally {
    dtbsSourceLoading.value = false
  }
}

function confirmDtbsSource() {
  if (!selectedDtbsSource.value) return
  form.value.dtbsCnFty.dtbsSource = { id: selectedDtbsSource.value.id, title: selectedDtbsSource.value.title }
  dtbsSourceDialog.value = false
}

function onAddParam() {
  paramEditing.value = false
  paramForm.value = newParam()
  paramDialog.value = true
}

function onEditParam() {
  const p = selectedParams.value[0]
  if (!p) return
  paramEditing.value = true
  paramForm.value = { ...p }
  paramDialog.value = true
}

function onDeleteParam() {
  const names = new Set(selectedParams.value.map((p) => p.name))
  form.value.params = (form.value.params ?? []).filter((p) => !names.has(p.name))
  selectedParams.value = []
}

function confirmParam() {
  const p = paramForm.value
  if (!p.name) {
    fail(t('paramNameRequired'))
    return
  }
  const params = form.value.params ?? (form.value.params = [])
  const oldName = paramEditing.value ? selectedParams.value[0]?.name : undefined
  const dup = params.some((x) => x.name.toLowerCase() === p.name.toLowerCase() && x.name !== oldName)
  if (dup) {
    fail(t('paramNameMustBeUniqueIgnoreCase'))
    return
  }
  if (paramEditing.value) {
    const idx = params.findIndex((x) => x.name === oldName)
    if (idx >= 0) params[idx] = { ...p }
  } else {
    params.push({ ...p })
  }
  paramDialog.value = false
  selectedParams.value = []
}

function formatParamType(type: string): string {
  return paramTypeOptions.find((o) => o.value === type)?.name ?? (type || '')
}

function formatParamInputType(type: string): string {
  return paramInputTypeOptions.find((o) => o.value === type)?.name ?? (type || '')
}

function formatParamRequired(v: boolean): string {
  return v ? t('yes') : t('no')
}

function formatPreviewValue(v: unknown): string {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 1000 ? s.slice(0, 1000) + '...' : s
}

function validateForm(): boolean {
  if (!form.value.name) {
    fail(t('pleaseFillName'))
    return false
  }
  if (!form.value.sql) {
    fail(t('pleaseFillSql'))
    return false
  }
  if (!form.value.dtbsCnFty.dtbsSource.id) {
    fail(t('pleaseSelectOneDtbsSource'))
    return false
  }
  return true
}

async function preview() {
  if (!validateForm()) return
  previewing.value = true
  previewError.value = ''
  try {
    previewResult.value = await previewSqlDataSet(form.value, { view: isReadonly.value })
    previewDialog.value = true
  } catch (e) {
    previewResult.value = null
    previewError.value = extractError(e)
    previewDialog.value = true
  } finally {
    previewing.value = false
  }
}

async function save() {
  if (!validateForm()) return
  saving.value = true
  try {
    if (isEdit.value) await saveSqlDataSetEdit(form.value)
    else await saveSqlDataSet(form.value)
    success(t('saveSuccess'))
    router.push('/dataSet')
  } catch (e) {
    fail(extractError(e))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page page-form h-full p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="save">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">{{ title }}</h3>
        <Button :label="t('back')" text size="small" @click="router.push('/dataSet')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <div class="field grid">
          <label for="ds-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ds-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              required
              maxlength="100"
              autofocus
              :readonly="isReadonly"
            />
          </div>
        </div>

        <div class="field grid">
          <label for="ds-dtbsSource" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('dataSource') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="p-inputgroup">
              <InputText
                id="ds-dtbsSource"
                :model-value="dtbsSourceDisplay"
                type="text"
                class="input flex-1"
                readonly
                maxlength="200"
              />
              <Button v-if="!isReadonly" type="button" :label="t('select')" @click="openDtbsSourceDialog" />
            </div>
          </div>
        </div>

        <div class="field grid">
          <label for="ds-sql" class="field-label col-12 mb-2 md:col-3 md:mb-0" title="SQL 查询语句">{{ t('sql') }}</label>
          <div class="field-input col-12 md:col-9">
            <div class="code-editor-wrapper input p-component p-inputtext w-full">
              <CodeEditor v-model="form.sql" :readonly="isReadonly" />
            </div>
          </div>
        </div>

        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">
            <div>{{ t('parameter') }}</div>
            <div class="text-xs text-color-secondary">SQL 中的参数定义</div>
          </label>
          <div class="field-input col-12 md:col-9">
            <div class="flex gap-1 pb-2" v-if="!isReadonly">
              <Button type="button" :label="t('add')" size="small" class="p-button-secondary" @click="onAddParam" />
              <Button
                type="button"
                :label="t('edit')"
                size="small"
                class="p-button-secondary"
                :disabled="selectedParams.length !== 1"
                @click="onEditParam"
              />
              <Button
                type="button"
                :label="t('delete')"
                size="small"
                class="p-button-danger"
                :disabled="!selectedParams.length"
                @click="onDeleteParam"
              />
            </div>
            <DataTable
              :value="form.params ?? []"
              data-key="name"
              striped-rows
              v-model:selection="selectedParams"
              selection-mode="multiple"
              :meta-key-selection="true"
              scrollable
              scroll-height="300px"
              class="table-sm"
            >
              <Column selection-mode="multiple" class="col-check" />
              <Column field="name" :header="t('name')" />
              <Column field="type" :header="t('type')">
                <template #body="{ data }">{{ formatParamType(data.type) }}</template>
              </Column>
              <Column field="required" :header="t('required')">
                <template #body="{ data }">{{ formatParamRequired(data.required) }}</template>
              </Column>
              <Column field="label" :header="t('displayName')" />
              <Column field="desc" :header="t('description')" />
              <Column field="inputType" :header="t('inputType')">
                <template #body="{ data }">{{ formatParamInputType(data.inputType) }}</template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>

      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <template v-if="!isReadonly">
          <Button type="button" :label="t('preview')" class="p-button-secondary" :loading="previewing" @click="preview" />
          <Button type="submit" :label="t('save')" :loading="saving" />
        </template>
      </div>
    </form>

    <!-- 数据源选择对话框 -->
    <Dialog
      v-model:visible="dtbsSourceDialog"
      :header="t('select') + t('dataSource')"
      :modal="true"
      :dismissable-mask="true"
      append-to="body"
      position="center"
      class="w-full md:w-6"
    >
      <DataTable
        :value="dtbsSources"
        data-key="id"
        striped-rows
        scrollable
        scroll-height="400px"
        :loading="dtbsSourceLoading"
        selection-mode="single"
        v-model:selection="selectedDtbsSource"
        @row-dblclick="confirmDtbsSource"
      >
        <Column field="title" :header="t('name')" />
        <Column field="id" :header="t('id')" />
      </DataTable>
      <template #footer>
        <Button :label="t('cancel')" class="p-button-secondary" size="small" @click="dtbsSourceDialog = false" />
        <Button :label="t('confirm')" size="small" :disabled="!selectedDtbsSource" @click="confirmDtbsSource" />
      </template>
    </Dialog>

    <!-- 参数编辑对话框 -->
    <Dialog
      v-model:visible="paramDialog"
      :header="paramEditing ? t('edit') + t('parameter') : t('add') + t('parameter')"
      :modal="true"
      :dismissable-mask="true"
      append-to="body"
      position="center"
      class="w-full md:w-7"
    >
      <form class="flex flex-column gap-3" @submit.prevent="confirmParam">
        <div class="field grid">
          <label for="param-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="param-name" v-model="paramForm.name" type="text" class="input w-full" required maxlength="100" autofocus />
          </div>
        </div>
        <div class="field grid">
          <label for="param-type" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('type') }}</label>
          <div class="field-input col-12 md:col-9">
            <Dropdown
              id="param-type"
              v-model="paramForm.type"
              :options="paramTypeOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('required') }}</label>
          <div class="field-input col-12 md:col-9">
            <SelectButton
              v-model="paramForm.required"
              :options="booleanOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="param-label" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('displayName') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="param-label" v-model="paramForm.label" type="text" class="input w-full" maxlength="100" />
          </div>
        </div>
        <div class="field grid">
          <label for="param-desc" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('description') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText id="param-desc" v-model="paramForm.desc" type="text" class="input w-full" maxlength="100" />
          </div>
        </div>
        <div class="field grid">
          <label for="param-inputType" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('inputType') }}</label>
          <div class="field-input col-12 md:col-9">
            <Dropdown
              id="param-inputType"
              v-model="paramForm.inputType"
              :options="paramInputTypeOptions"
              option-label="name"
              option-value="value"
              class="input w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="param-inputPayload" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('inputConfig') }}</label>
          <div class="field-input col-12 md:col-9">
            <Textarea
              id="param-inputPayload"
              v-model="paramForm.inputPayload"
              rows="3"
              class="input w-full"
              maxlength="2000"
            />
          </div>
        </div>
        <div class="flex justify-content-end gap-2">
          <Button :label="t('cancel')" type="button" class="p-button-secondary" size="small" @click="paramDialog = false" />
          <Button :label="t('confirm')" type="submit" size="small" />
        </div>
      </form>
    </Dialog>

    <!-- 预览结果对话框 -->
    <Dialog
      v-model:visible="previewDialog"
      :header="t('preview')"
      :modal="true"
      :dismissable-mask="true"
      append-to="body"
      position="center"
      class="w-full md:w-10"
    >
      <div v-if="previewError">
        <Textarea :model-value="previewError" class="w-full" rows="8" readonly />
      </div>
      <template v-else>
        <DataTable :value="previewRows" scrollable scroll-height="400px" striped-rows class="table-sm">
          <Column v-for="col in previewColumns" :key="col.name" :field="col.name" :header="col.label">
            <template #body="slotProps">{{ formatPreviewValue(slotProps.data[col.name]) }}</template>
          </Column>
        </DataTable>
        <div v-if="previewResult?.templateResult" class="mt-2">
          <div class="text-sm text-color-secondary mb-1">{{ t('parsedSql') }}</div>
          <Textarea :model-value="previewResult.templateResult" class="w-full" rows="4" readonly />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.code-editor-wrapper :deep(.CodeMirror) {
  height: 240px;
}
</style>
