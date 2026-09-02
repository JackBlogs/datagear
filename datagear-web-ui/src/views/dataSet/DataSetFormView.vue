<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDataSet, saveDataSetAdd, saveDataSetEdit, type DataSetForm } from '@/api/dataSet'
import CodeEditor from '@/components/CodeEditor.vue'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { useI18n } from 'vue-i18n'

// 非 SQL 数据集通用表单，按原 dataSet_form_{JsonValue,JsonFile,CsvValue,CsvFile,Excel,Http}.ftl 复刻：
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
  <div class="page page-form h-full page-form-dataSet p-1">
    <form class="flex flex-column h-full" :class="{ readonly: isReadonly }" @submit.prevent="save">
      <div class="flex align-items-center gap-2 mb-2">
        <h3 class="flex-1">
          {{ (isReadonly ? t('view') : isEdit ? t('edit') : t('new')) + typeLabel }}
        </h3>
        <Button :label="t('back')" text size="small" @click="router.push('/dataSet')" />
      </div>
      <div v-if="loading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
        <!-- 名称（通用） -->
        <div class="field grid">
          <label for="ds-name" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('name') }}</label>
          <div class="field-input col-12 md:col-9">
            <InputText
              id="ds-name"
              v-model="form.name"
              type="text"
              class="input w-full"
              name="name"
              required
              maxlength="100"
              :readonly="isReadonly"
              autofocus
            />
          </div>
        </div>

        <!-- JSON 值 -->
        <template v-if="isJsonValue">
          <div class="field grid">
            <label for="ds-value" class="field-label col-12 mb-2"
              title="支持参数化语法，JSON对象、JSON对象数组">{{ t('jsonText') }}</label>
            <div class="field-input col-12">
              <div id="ds-value" class="value-editor-wrapper">
                <CodeEditor
                  :model-value="form.value ?? ''"
                  mode="application/json"
                  :readonly="isReadonly"
                  @update:model-value="form.value = $event"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- JSON 文件 -->
        <template v-else-if="isJsonFile">
          <div class="field grid">
            <label for="ds-fileName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileName') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-fileName"
                v-model="form.fileName"
                type="text"
                class="input w-full"
                name="fileName"
                maxlength="1000"
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-encoding" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileEncoding') }}</label>
            <div class="field-input col-12 md:col-9">
              <Dropdown
                v-model="form.encoding"
                :options="encodingOptions"
                placeholder="UTF-8"
                class="input w-full"
                :disabled="isReadonly"
              />
            </div>
          </div>
        </template>

        <!-- CSV 值 -->
        <template v-else-if="isCsvValue">
          <div class="field grid">
            <label for="ds-value" class="field-label col-12 mb-2"
              title="支持参数化语法，CSV逗号（,）分隔值文本">{{ t('csvText') }}</label>
            <div class="field-input col-12">
              <Textarea
                id="ds-value"
                v-model="form.value"
                rows="10"
                class="input w-full"
                name="value"
                required
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-nameRow" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-nameRow"
                :model-value="nameRowText"
                type="text"
                class="input w-full"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @update:model-value="onNameRowInput"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-encoding" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileEncoding') }}</label>
            <div class="field-input col-12 md:col-9">
              <Dropdown
                v-model="form.encoding"
                :options="encodingOptions"
                placeholder="UTF-8"
                class="input w-full"
                :disabled="isReadonly"
              />
            </div>
          </div>
        </template>

        <!-- CSV 文件 -->
        <template v-else-if="isCsvFile">
          <div class="field grid">
            <label for="ds-fileName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileName') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-fileName"
                v-model="form.fileName"
                type="text"
                class="input w-full"
                name="fileName"
                maxlength="1000"
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-nameRow" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-nameRow"
                :model-value="nameRowText"
                type="text"
                class="input w-full"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @update:model-value="onNameRowInput"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-encoding" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileEncoding') }}</label>
            <div class="field-input col-12 md:col-9">
              <Dropdown
                v-model="form.encoding"
                :options="encodingOptions"
                placeholder="UTF-8"
                class="input w-full"
                :disabled="isReadonly"
              />
            </div>
          </div>
        </template>

        <!-- Excel -->
        <template v-else-if="isExcel">
          <div class="field grid">
            <label for="ds-fileName" class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileName') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-fileName"
                v-model="form.fileName"
                type="text"
                class="input w-full"
                name="fileName"
                maxlength="1000"
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-nameRow" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="标题行号，将被解析为数据集字段名而非数据，小于1表示没有标题行">{{ t('titleRowNumber') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-nameRow"
                :model-value="nameRowText"
                type="text"
                class="input w-full"
                name="nameRow"
                required
                maxlength="10"
                :readonly="isReadonly"
                @update:model-value="onNameRowInput"
              />
            </div>
          </div>
        </template>

        <!-- HTTP 接口 -->
        <template v-else-if="isHttp">
          <div class="field grid">
            <label for="ds-uri" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="支持参数化语法，示例：http://127.0.0.1:50401/user/list">{{ t('requestURI') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-uri"
                v-model="form.uri"
                type="text"
                class="input w-full"
                name="uri"
                required
                maxlength="1000"
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('requestMethod') }}</label>
            <div class="field-input col-12 md:col-9">
              <SelectButton
                v-model="form.requestMethod"
                :options="requestMethodOptions"
                option-label="name"
                option-value="value"
                class="input w-full"
                :disabled="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-requestContent" class="field-label col-12 mb-2">{{ t('requestBody') }}</label>
            <div class="field-input col-12">
              <Textarea
                id="ds-requestContent"
                v-model="form.requestContent"
                rows="8"
                class="input w-full"
                name="requestContent"
                maxlength="10000"
                :readonly="isReadonly"
              />
            </div>
          </div>
        </template>

        <!-- JSON 数据路径（JsonValue / JsonFile） -->
        <template v-if="hasJsonRule">
          <div class="field grid">
            <label for="ds-dataJsonPath" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="读取原始数据中指定JSON路径的数据作为数据集结果数据，示例：orders、[0].products、data.stores[0].books">
              {{ t('dataJsonPath') }}
            </label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-dataJsonPath"
                v-model="form.resultJsonRule.dataJsonPath"
                type="text"
                class="input w-full"
                name="resultJsonRule.dataJsonPath"
                maxlength="200"
                :readonly="isReadonly"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="ds-additionJsonPath" class="field-label col-12 mb-2 md:col-3 md:mb-0"
              title="将原始数据中指定JSON路径的数据读取为数据集结果附加数据">{{ t('additionDataConfig') }}</label>
            <div class="field-input col-12 md:col-9">
              <InputText
                id="ds-additionJsonPath"
                v-model="form.resultJsonRule.additionJsonPath"
                type="text"
                class="input w-full"
                name="resultJsonRule.additionJsonPath"
                maxlength="500"
                :readonly="isReadonly"
              />
            </div>
          </div>
        </template>
      </div>
      <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
        <Button v-if="!isReadonly" type="submit" :label="t('save')" :loading="saving" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.value-editor-wrapper {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}
.value-editor-wrapper :deep(.CodeMirror) {
  min-height: 220px;
  height: auto;
}
</style>
