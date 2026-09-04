<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDataSet, saveDataSetAdd, saveDataSetEdit, type DataSetForm } from '@/api/dataSet'
import CodeEditor from '@/components/CodeEditor.vue'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'
import '@/styles/datasource-page.css'

// 非 SQL 数据集通用表单（能源暗域），按原 dataSet_form_{JsonValue,JsonFile,CsvValue,CsvFile,Excel,Http}.ftl 复刻：
// 新增 /dataSet/add/:type、编辑 /dataSet/:id/edit、查看 /dataSet/:id/view?mode=view 共用。
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

const type = ref((route.params.type as string) ?? '')

const form = ref<DataSetForm>({
  name: '',
  value: '',
  fileName: '',
  encoding: '',
  nameRow: 1,
  uri: '',
  requestMethod: 'GET',
  requestContent: '',
  resultJsonRule: {},
})

const typeLabel = computed(() => {
  const m: Record<string, string> = {
    JsonValue: t('module.dataSet.JsonValue'),
    JsonFile: t('module.dataSet.JsonFile'),
    Excel: t('module.dataSet.Excel'),
    CsvValue: t('module.dataSet.CsvValue'),
    CsvFile: t('module.dataSet.CsvFile'),
    Http: t('module.dataSet.Http'),
  }
  return m[type.value] ?? t('module.dataSet')
})

const isJsonValue = computed(() => type.value === 'JsonValue')
const isJsonFile = computed(() => type.value === 'JsonFile')
const isCsvValue = computed(() => type.value === 'CsvValue')
const isCsvFile = computed(() => type.value === 'CsvFile')
const isExcel = computed(() => type.value === 'Excel')
const isHttp = computed(() => type.value === 'Http')
const hasJsonRule = computed(() => isJsonValue.value || isJsonFile.value)

const requestMethodOptions = [
  { name: 'GET', value: 'GET' },
  { name: 'POST', value: 'POST' },
]

const encodingOptions = [
  'UTF-8',
  'GBK',
  'GB2312',
  'GB18030',
  'ISO-8859-1',
  'US-ASCII',
  'UTF-16',
  'UTF-16BE',
  'UTF-16LE',
  'BIG5',
  'Windows-1252',
]

// nameRow 为数字，但 InputText 以字符串交互，故做显式转换。
const nameRowText = computed(() => (form.value.nameRow != null ? String(form.value.nameRow) : ''))

function onNameRowInput(v: string | undefined) {
  const s = v ?? ''
  const n = Number(s)
  form.value.nameRow = s === '' || Number.isNaN(n) ? undefined : n
}

function ensureResultJsonRule() {
  if (!form.value.resultJsonRule) form.value.resultJsonRule = {}
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const e = await getDataSet(id)
    type.value = e.dataSetType ?? type.value
    form.value = { ...form.value, ...e }
    ensureResultJsonRule()
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name) {
    fail(t('pleaseFillName'))
    return
  }
  if (isHttp.value && !form.value.uri) {
    fail(t('pleaseFillRequestUri'))
    return
  }
  if ((isJsonValue.value || isCsvValue.value) && !form.value.value) {
    fail(t('pleaseFillContent'))
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await saveDataSetEdit(type.value, { ...form.value, id })
    } else {
      await saveDataSetAdd(type.value, form.value)
    }
    success(t('saveSuccess'))
    router.push('/dataSet')
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
    <form @submit.prevent="save">
      <!-- 页头 -->
      <div class="page-head">
        <div>
          <div class="page-title">
            {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + typeLabel }}
            <span class="tag brand">{{ typeLabel }}</span>
            <span v-if="isReadonly" class="tag info">只读</span>
          </div>
          <div class="page-desc">非 SQL 数据集 —— 支持参数化语法</div>
        </div>
        <div class="page-actions">
          <button class="btn" type="button" @click="router.push('/dataSet')">{{ t('back') }}</button>
          <button v-if="!isReadonly" class="btn primary" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : t('save') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="empty">{{ t('loading') }}</div>

      <template v-else>
        <!-- 名称（通用） -->
        <div class="card form-card">
          <div class="card-title"><i class="bar"></i>{{ t('name') }}</div>
          <input
            v-model="form.name"
            type="text"
            class="input"
            name="name"
            required
            maxlength="100"
            :readonly="isReadonly"
            placeholder="数据集名称"
          />
        </div>

        <!-- 数据内容（按类型分支） -->
        <div class="card form-card">
          <div class="card-title"><i class="bar"></i>数据配置</div>

          <!-- JSON 值 -->
          <template v-if="isJsonValue">
            <div class="form-item">
              <label class="form-label" title="支持参数化语法，JSON对象、JSON对象数组">{{ t('jsonText') }}</label>
              <div class="value-editor-wrapper">
                <CodeEditor
                  :model-value="form.value ?? ''"
                  mode="application/json"
                  :readonly="isReadonly"
                  @update:model-value="form.value = $event"
                />
              </div>
            </div>
          </template>

          <!-- JSON 文件 -->
          <template v-else-if="isJsonFile">
            <div class="form-item">
              <label class="form-label">{{ t('fileName') }}</label>
              <input v-model="form.fileName" type="text" class="input" name="fileName" maxlength="1000" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('fileEncoding') }}</label>
              <select v-model="form.encoding" class="input" :disabled="isReadonly" placeholder="UTF-8">
                <option v-for="e in encodingOptions" :key="e" :value="e">{{ e }}</option>
              </select>
            </div>
          </template>

          <!-- CSV 值 -->
          <template v-else-if="isCsvValue">
            <div class="form-item">
              <label class="form-label" title="支持参数化语法，CSV逗号（,）分隔值文本">{{ t('csvText') }}</label>
              <textarea v-model="form.value" rows="10" class="input" name="value" required :readonly="isReadonly"></textarea>
            </div>
            <div class="form-item">
              <label class="form-label" title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
              <input
                :value="nameRowText"
                type="text"
                class="input"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @input="onNameRowInput(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('fileEncoding') }}</label>
              <select v-model="form.encoding" class="input" :disabled="isReadonly" placeholder="UTF-8">
                <option v-for="e in encodingOptions" :key="e" :value="e">{{ e }}</option>
              </select>
            </div>
          </template>

          <!-- CSV 文件 -->
          <template v-else-if="isCsvFile">
            <div class="form-item">
              <label class="form-label">{{ t('fileName') }}</label>
              <input v-model="form.fileName" type="text" class="input" name="fileName" maxlength="1000" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label" title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
              <input
                :value="nameRowText"
                type="text"
                class="input"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @input="onNameRowInput(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('fileEncoding') }}</label>
              <select v-model="form.encoding" class="input" :disabled="isReadonly" placeholder="UTF-8">
                <option v-for="e in encodingOptions" :key="e" :value="e">{{ e }}</option>
              </select>
            </div>
          </template>

          <!-- Excel -->
          <template v-else-if="isExcel">
            <div class="form-item">
              <label class="form-label">{{ t('fileName') }}</label>
              <input v-model="form.fileName" type="text" class="input" name="fileName" maxlength="1000" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label" title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
              <input
                :value="nameRowText"
                type="text"
                class="input"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @input="onNameRowInput(($event.target as HTMLInputElement).value)"
              />
            </div>
          </template>

          <!-- HTTP 接口 -->
          <template v-else-if="isHttp">
            <div class="form-item">
              <label class="form-label" title="支持参数化语法，示例：http://127.0.0.1:50401/user/list">{{ t('requestURI') }}</label>
              <input v-model="form.uri" type="text" class="input" name="uri" required maxlength="1000" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('requestMethod') }}</label>
              <div class="seg-row">
                <span
                  v-for="m in requestMethodOptions"
                  :key="m.value"
                  class="seg-item"
                  :class="{ active: form.requestMethod === m.value }"
                  @click="!isReadonly && (form.requestMethod = m.value)"
                >
                  {{ m.name }}
                </span>
              </div>
            </div>
            <div class="form-item">
              <label class="form-label">{{ t('requestBody') }}</label>
              <textarea v-model="form.requestContent" rows="8" class="input" name="requestContent" maxlength="10000" :readonly="isReadonly"></textarea>
            </div>
          </template>

          <!-- JSON 数据路径（JsonValue / JsonFile） -->
          <template v-if="hasJsonRule">
            <div class="form-item">
              <label
                class="form-label"
                title="读取原始数据中指定JSON路径的数据作为数据集结果数据，示例：orders、[0].products、data.stores[0].books"
              >
                {{ t('dataJsonPath') }}
              </label>
              <input v-model="form.resultJsonRule!.dataJsonPath" type="text" class="input" maxlength="200" :readonly="isReadonly" />
            </div>
            <div class="form-item">
              <label class="form-label" title="将原始数据中指定JSON路径的数据读取为数据集结果附加数据">{{ t('additionDataConfig') }}</label>
              <input v-model="form.resultJsonRule!.additionJsonPath" type="text" class="input" maxlength="500" :readonly="isReadonly" />
            </div>
          </template>
        </div>

        <div class="form-foot">
          <button v-if="!isReadonly" class="btn primary" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : t('save') }}
          </button>
        </div>
      </template>
    </form>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; margin-bottom: 14px; }
.form-card .input { margin-top: 4px; }
.form-item { margin-bottom: 14px; }
.form-item:last-child { margin-bottom: 0; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.form-foot { display: flex; justify-content: center; gap: 10px; padding-top: 6px; }
.value-editor-wrapper {
  border: 1px solid var(--line-2);
  border-radius: 10px;
  overflow: hidden;
}
.value-editor-wrapper :deep(.CodeMirror) {
  min-height: 220px;
  height: auto;
}
.value-editor-wrapper :deep(.CodeMirror-gutters) { background: #0a0e17; border-right: 1px solid var(--line-1); }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 18px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
</style>
