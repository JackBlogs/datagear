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
import '@/styles/datasource-page.css'

// SQL 数据集表单（范式 C 独立表单页，能源暗域），按原 dataSet_form_SQL.ftl 复刻：
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
  <div class="ds-page">
    <form @submit.prevent="save">
      <!-- 页头 -->
      <div class="page-head">
        <div>
          <div class="page-title">
            {{ title }}
            <span class="tag brand">SQL</span>
            <span v-if="isReadonly" class="tag info">只读</span>
          </div>
          <div class="page-desc">SQL 查询 + 参数化定义，支持 ${'{'}pc(){'}'} 预编译防注入</div>
        </div>
        <div class="page-actions">
          <button class="btn" type="button" @click="router.push('/dataSet')">{{ t('back') }}</button>
          <template v-if="!isReadonly">
            <button class="btn" type="button" :disabled="previewing" @click="preview">
              {{ previewing ? '预览中…' : t('preview') }}
            </button>
            <button class="btn primary" type="submit" :disabled="saving">
              {{ saving ? '保存中…' : t('save') }}
            </button>
          </template>
        </div>
      </div>

      <div v-if="loading" class="empty">{{ t('loading') }}</div>

      <template v-else>
        <!-- 基本 -->
        <div class="card form-card">
          <div class="card-title"><i class="bar"></i>基本信息</div>
          <div class="qb-grid2">
            <div class="form-item">
              <label class="form-label" for="ds-name">{{ t('name') }} *</label>
              <input id="ds-name" v-model="form.name" type="text" class="input" required maxlength="100" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label" for="ds-dtbsSource">{{ t('dataSource') }} *</label>
              <div class="p-inputgroup">
                <input id="ds-dtbsSource" :value="dtbsSourceDisplay" type="text" class="input grow" readonly maxlength="200" />
                <button v-if="!isReadonly" class="btn sm" type="button" @click="openDtbsSourceDialog">{{ t('select') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- SQL -->
        <div class="card form-card">
          <div class="card-title"><i class="bar"></i>SQL 查询语句</div>
          <div class="code-editor-wrapper">
            <CodeEditor v-model="form.sql" :readonly="isReadonly" />
          </div>
        </div>

        <!-- 参数 -->
        <div class="card form-card">
          <div class="card-title">
            <i class="bar"></i>{{ t('parameter') }}
            <span class="sm tx-4">SQL 中的参数定义</span>
            <template v-if="!isReadonly">
              <button class="btn sm" style="margin-left: auto" type="button" @click="onAddParam">＋ {{ t('add') }}</button>
              <button class="btn sm" type="button" :disabled="selectedParams.length !== 1" @click="onEditParam">{{ t('edit') }}</button>
              <button class="btn sm danger" type="button" :disabled="!selectedParams.length" @click="onDeleteParam">{{ t('delete') }}</button>
            </template>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width: 34px"></th>
                  <th>{{ t('name') }}</th>
                  <th style="width: 90px">{{ t('type') }}</th>
                  <th style="width: 70px">{{ t('required') }}</th>
                  <th>{{ t('displayName') }}</th>
                  <th>{{ t('description') }}</th>
                  <th style="width: 110px">{{ t('inputType') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!(form.params ?? []).length"><td colspan="7"><div class="empty">暂无参数</div></td></tr>
                <tr
                  v-for="p in form.params ?? []"
                  :key="p.name"
                  :class="{ sel: selectedParams.some((x) => x.name === p.name) }"
                  @click="
                    () => {
                      const i = selectedParams.findIndex((x) => x.name === p.name)
                      if (i >= 0) selectedParams.splice(i, 1)
                      else selectedParams.push(p)
                    }
                  "
                >
                  <td><input type="checkbox" :checked="selectedParams.some((x) => x.name === p.name)" @click.prevent /></td>
                  <td><span class="cell-main">{{ p.name }}</span></td>
                  <td><span class="tag info">{{ formatParamType(p.type) }}</span></td>
                  <td class="sm">{{ formatParamRequired(p.required) }}</td>
                  <td class="sm">{{ p.label }}</td>
                  <td class="sm tx-3 ellipsis" style="max-width: 200px">{{ p.desc }}</td>
                  <td class="sm">{{ formatParamInputType(p.inputType ?? '') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </form>

    <!-- 数据源选择对话框 -->
    <div v-if="dtbsSourceDialog" class="drawer-mask" @click="dtbsSourceDialog = false">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ t('select') + t('dataSource') }}</div>
          <button class="btn sm ghost" type="button" @click="dtbsSourceDialog = false">✕</button>
        </div>
        <div class="drawer-body">
          <div v-if="dtbsSourceLoading" class="empty">{{ t('loading') }}</div>
          <div v-else class="ds-picker">
            <div
              v-for="s in dtbsSources"
              :key="s.id"
              class="qb-src"
              :class="{ sel: selectedDtbsSource?.id === s.id }"
              @click="selectedDtbsSource = s"
              @dblclick="confirmDtbsSource"
            >
              <span class="cell-main">{{ s.title }}</span>
              <span class="sm tx-4 ellipsis">{{ s.id }}</span>
            </div>
            <div v-if="!dtbsSources.length" class="empty">暂无数据源</div>
          </div>
        </div>
        <div class="drawer-foot">
          <button class="btn" type="button" @click="dtbsSourceDialog = false">{{ t('cancel') }}</button>
          <button class="btn primary" type="button" :disabled="!selectedDtbsSource" @click="confirmDtbsSource">{{ t('confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 参数编辑对话框 -->
    <div v-if="paramDialog" class="drawer-mask" @click="paramDialog = false">
      <div class="modal wizard-modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ paramEditing ? t('edit') + t('parameter') : t('add') + t('parameter') }}</div>
          <button class="btn sm ghost" type="button" @click="paramDialog = false">✕</button>
        </div>
        <form class="drawer-body" @submit.prevent="confirmParam">
          <div class="form-item"><label class="form-label" for="param-name">{{ t('name') }} *</label>
            <input id="param-name" v-model="paramForm.name" type="text" class="input" required maxlength="100" />
          </div>
          <div class="qb-grid2">
            <div class="form-item"><label class="form-label" for="param-type">{{ t('type') }}</label>
              <select id="param-type" v-model="paramForm.type" class="input">
                <option v-for="o in paramTypeOptions" :key="o.value" :value="o.value">{{ o.name }}</option>
              </select>
            </div>
            <div class="form-item"><label class="form-label">{{ t('required') }}</label>
              <div class="seg-row">
                <span v-for="b in booleanOptions" :key="String(b.value)" class="seg-item" :class="{ active: paramForm.required === b.value }" @click="paramForm.required = b.value">
                  {{ b.name }}
                </span>
              </div>
            </div>
          </div>
          <div class="qb-grid2">
            <div class="form-item"><label class="form-label" for="param-label">{{ t('displayName') }}</label>
              <input id="param-label" v-model="paramForm.label" type="text" class="input" maxlength="100" />
            </div>
            <div class="form-item"><label class="form-label" for="param-desc">{{ t('description') }}</label>
              <input id="param-desc" v-model="paramForm.desc" type="text" class="input" maxlength="100" />
            </div>
          </div>
          <div class="form-item"><label class="form-label" for="param-inputType">{{ t('inputType') }}</label>
            <select id="param-inputType" v-model="paramForm.inputType" class="input">
              <option v-for="o in paramInputTypeOptions" :key="o.value" :value="o.value">{{ o.name }}</option>
            </select>
          </div>
          <div class="form-item"><label class="form-label" for="param-inputPayload">{{ t('inputConfig') }}</label>
            <textarea id="param-inputPayload" v-model="paramForm.inputPayload" rows="3" class="input" maxlength="2000"></textarea>
          </div>
          <div class="flex" style="justify-content: flex-end; gap: 10px; margin-top: 14px">
            <button class="btn" type="button" @click="paramDialog = false">{{ t('cancel') }}</button>
            <button class="btn primary" type="submit">{{ t('confirm') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 预览结果对话框 -->
    <div v-if="previewDialog" class="drawer-mask" @click="previewDialog = false">
      <div class="modal preview-modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ t('preview') }}</div>
          <button class="btn sm ghost" type="button" @click="previewDialog = false">✕</button>
        </div>
        <div class="drawer-body">
          <div v-if="previewError"><pre class="sql-code" style="color: #f87171">{{ previewError }}</pre></div>
          <template v-else>
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th v-for="col in previewColumns" :key="col.name">{{ col.label }}</th></tr>
                </thead>
                <tbody>
                  <tr v-if="!previewRows.length"><td :colspan="previewColumns.length || 1"><div class="empty">无数据</div></td></tr>
                  <tr v-for="(row, i) in previewRows" :key="i">
                    <td v-for="col in previewColumns" :key="col.name" class="sm">{{ formatPreviewValue(row[col.name]) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="previewResult?.templateResult" style="margin-top: 12px">
              <div class="sm tx-3" style="margin-bottom: 4px">{{ t('parsedSql') }}</div>
              <pre class="sql-code">{{ previewResult.templateResult }}</pre>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; margin-bottom: 14px; }
.form-card .card-title { display: flex; gap: 8px; align-items: center; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.qb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.p-inputgroup { display: flex; gap: 8px; }
.code-editor-wrapper {
  border: 1px solid var(--line-2);
  border-radius: 10px;
  overflow: hidden;
}
.code-editor-wrapper :deep(.CodeMirror) {
  height: 260px;
}
.code-editor-wrapper :deep(.CodeMirror-gutters) { background: #0a0e17; border-right: 1px solid var(--line-1); }
.sql-code { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
.drawer-foot { flex: none; display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid var(--line-1); }
.preview-modal { width: 900px; max-width: 94vw; }
.wizard-modal { width: 660px; max-width: 94vw; }
tr.sel td { background: var(--brand-soft); }
.grow { flex: 1; min-width: 0; }
</style>
