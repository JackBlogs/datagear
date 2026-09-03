<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  uploadImportFile,
  doImport,
  pollExportMessages,
  cancelExchange,
  getLogContent,
  newId,
  type ImportType,
  type DataFormat,
  type DataImportOption,
  type DataImportForm,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据导入向导，按原 dtbsSourceExchange/import_*.ftl 复刻：
// 多文件上传→多表映射（编号/依赖编号）+ dataFormat/导入选项面板 + 查看日志 + 取消。
// 第三轮：按原型「能源暗域」风格重排版式（steps/dst-type/.tbl/.progress/.sql-code），功能不变。
import '@/styles/datasource-page.css'

const route = useRoute()
const router = useRouter()
const dtbsSourceId = route.params.dtbsSourceId as string
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const type = ref<ImportType>('csv')
const fileEncoding = ref('UTF-8')
const importing = ref(false)
const uploading = ref(false)
const finished = ref(false)
const messages = ref<unknown[]>([])
// 一次向导共用一个 dataExchangeId（旧版行为：多文件逐个上传累积到同一批次）
const dataExchangeId = ref(newId())
const lastSubmittedId = ref('')

// 子交换条目：文件 → 表映射（编号必填，依赖编号可选）
interface SubRow {
  id: string
  fileName: string
  tableName: string
  number: string
  dependentNumber: string
}
const subs = ref<SubRow[]>([])

// 数据格式（SQL 导入不需要，后端 SqlFileBatchDataImportForm 无此字段）
const dataFormat = ref<Required<DataFormat>>({
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm:ss',
  timestampFormat: 'yyyy-MM-dd HH:mm:ss',
  numberFormat: '#.##',
  binaryFormat: 'Hex',
})
// 导入选项（DataImportOption.exceptionResolve + ValueDataImportOption 三开关 + JSON jsonDataFormat）
const importOption = ref<DataImportOption>({
  exceptionResolve: 'ABORT',
  ignoreInexistentColumn: false,
  nullForIllegalColumnValue: false,
  nullForEmptyImportKey: false,
  jsonDataFormat: 'TABLE_OBJECT',
})
const dependentNumberAuto = ref('')
const showAdvanced = ref(false)

// 查看日志
const logVisible = ref(false)
const logContent = ref('')
const logLoading = ref(false)

const typeCards: { value: ImportType; name: string; desc: string; color: string; bg: string }[] = [
  { value: 'csv', name: 'CSV', desc: '逗号分隔文本，首行表头', color: 'var(--coal)', bg: 'var(--coal-soft)' },
  { value: 'excel', name: 'Excel', desc: 'xlsx 工作簿，按 Sheet 导入', color: 'var(--ok)', bg: 'var(--ok-soft)' },
  { value: 'json', name: 'JSON', desc: '表对象 / 行数组两种结构', color: 'var(--gas)', bg: 'var(--gas-soft)' },
  { value: 'sql', name: 'SQL', desc: 'INSERT 脚本批量执行', color: 'var(--info)', bg: 'var(--info-soft)' },
]
const exceptionResolveOptions = [
  { name: t('exchange.exceptionAbort'), value: 'ABORT' },
  { name: t('exchange.exceptionIgnore'), value: 'IGNORE' },
  { name: t('exchange.exceptionRollback'), value: 'ROLLBACK' },
]
const binaryFormatOptions = ['Hex', 'Base64', 'NULL']
const jsonDataFormatOptions = ['TABLE_OBJECT', 'ROW_ARRAY']

const needTableName = computed(() => type.value !== 'sql')
const needDataFormat = computed(() => type.value !== 'sql')

// steps 状态：1 配置 → 2 执行 → 3 完成
const currentStep = computed(() => (finished.value ? 3 : importing.value || messages.value.length ? 2 : 1))

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      // 旧版行为：逐个文件上传，服务端按 dataExchangeId 累积
      const infos = await uploadImportFile(dtbsSourceId, type.value, dataExchangeId.value, file)
      for (const info of infos) {
        subs.value.push({
          id: newId(),
          fileName: info.name ?? info.fileName ?? file.name,
          // 默认表名取文件名去扩展名
          tableName: (info.name ?? info.fileName ?? file.name).replace(/\.[^.]*$/, ''),
          number: String(subs.value.length + 1),
          dependentNumber: '',
        })
      }
    }
  } catch (err) {
    fail((err as Error).message || t('uploadFail'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeSub(idx: number) {
  subs.value.splice(idx, 1)
}

function buildForm(): DataImportForm {
  const form: DataImportForm = {
    dataExchangeId: dataExchangeId.value,
    fileEncoding: fileEncoding.value,
    subDataExchanges: subs.value.map((s) => ({
      id: s.id,
      fileName: s.fileName,
      tableName: needTableName.value ? s.tableName : undefined,
      number: s.number,
      dependentNumber: s.dependentNumber || undefined,
    })),
    dependentNumberAuto: dependentNumberAuto.value || undefined,
  }
  if (needDataFormat.value) form.dataFormat = { ...dataFormat.value }
  form.importOption =
    type.value === 'json'
      ? { ...importOption.value }
      : type.value === 'sql'
        ? { exceptionResolve: importOption.value.exceptionResolve }
        : {
            exceptionResolve: importOption.value.exceptionResolve,
            ignoreInexistentColumn: importOption.value.ignoreInexistentColumn,
            nullForIllegalColumnValue: importOption.value.nullForIllegalColumnValue,
            nullForEmptyImportKey: importOption.value.nullForEmptyImportKey,
          }
  return form
}

async function run() {
  if (!subs.value.length) {
    fail(t('pleaseUploadFile'))
    return
  }
  if (needTableName.value && subs.value.some((s) => !s.tableName.trim())) {
    fail(t('pleaseFillTableName'))
    return
  }
  importing.value = true
  finished.value = false
  messages.value = []
  try {
    await doImport(dtbsSourceId, type.value, buildForm())
    lastSubmittedId.value = dataExchangeId.value
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => setTimeout(r, 500))
      messages.value = await pollExportMessages(dtbsSourceId, lastSubmittedId.value, 50)
      if (messages.value.some((m) => (m as { type?: string }).type === 'FinishMessage')) break
    }
    finished.value = true
    success(t('exchange.finished'))
  } catch (e) {
    fail((e as Error).message || t('importFail'))
  } finally {
    importing.value = false
  }
}

async function onCancel() {
  const id = lastSubmittedId.value || dataExchangeId.value
  try {
    await cancelExchange(dtbsSourceId, id, subs.value.map((s) => s.id))
    success(t('exchange.cancelled'))
  } catch (e) {
    fail((e as Error).message || t('importFail'))
  }
}

async function viewLog(s: SubRow) {
  logVisible.value = true
  logLoading.value = true
  logContent.value = ''
  try {
    logContent.value = await getLogContent(dtbsSourceId, lastSubmittedId.value || dataExchangeId.value, s.id)
  } catch (e) {
    logContent.value = (e as Error).message || t('exchange.logEmpty')
  } finally {
    logLoading.value = false
  }
}

function msgText(m: unknown): string {
  if (typeof m === 'string') return m
  try {
    return JSON.stringify(m)
  } catch {
    return String(m)
  }
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('ex.importTitle') }}</div>
        <div class="page-desc">{{ t('ex.importDesc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/dtbsSource')">{{ t('back') }}</button>
      </div>
    </div>

    <!-- 步骤条 -->
    <div class="steps">
      <div v-for="(s, i) in [t('ex.step.config'), t('ex.step.run'), t('ex.step.done')]" :key="i"
        class="step" :class="{ active: currentStep === i + 1, done: currentStep > i + 1 }">
        <span class="s-dot">{{ i + 1 }}</span>{{ s }}
        <span v-if="i < 2" class="step-line"></span>
      </div>
    </div>

    <!-- 配置 -->
    <div class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('ex.configSecImport') }}</div>
      <div class="form-item">
        <label class="form-label">{{ t('importFormat') }}</label>
        <div class="dst-types">
          <div
            v-for="f in typeCards"
            :key="f.value"
            class="dst-type"
            :class="{ sel: type === f.value }"
            @click="type = f.value"
          >
            <div class="t-head">
              <span class="t-ico" :style="{ color: f.color, background: f.bg }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>
              </span>
              <span class="t-name">{{ f.name }}</span>
            </div>
            <div class="t-desc">{{ f.desc }}</div>
          </div>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">{{ t('fileEncoding') }}</label>
        <input v-model="fileEncoding" class="input" style="max-width:220px" maxlength="20" />
      </div>

      <!-- 高级选项 -->
      <div class="form-item" style="margin-bottom:0">
        <label class="form-label" style="cursor:pointer" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? '▾' : '▸' }} {{ t('exchange.advanced') }}
        </label>
        <div v-if="showAdvanced" class="qb-pane mt-1">
          <template v-if="needDataFormat">
            <div class="p-title">{{ t('exchange.dataFormat') }}</div>
            <div class="flex" style="gap:12px;flex-wrap:wrap">
              <div class="form-item" style="margin:0;min-width:200px">
                <label class="form-label">{{ t('exchange.dateFormat') }}</label>
                <input v-model="dataFormat.dateFormat" class="input" maxlength="50" />
              </div>
              <div class="form-item" style="margin:0;min-width:200px">
                <label class="form-label">{{ t('exchange.timeFormat') }}</label>
                <input v-model="dataFormat.timeFormat" class="input" maxlength="50" />
              </div>
              <div class="form-item" style="margin:0;min-width:200px">
                <label class="form-label">{{ t('exchange.timestampFormat') }}</label>
                <input v-model="dataFormat.timestampFormat" class="input" maxlength="50" />
              </div>
              <div class="form-item" style="margin:0;min-width:200px">
                <label class="form-label">{{ t('exchange.numberFormat') }}</label>
                <input v-model="dataFormat.numberFormat" class="input" maxlength="50" />
              </div>
              <div class="form-item" style="margin:0;min-width:200px">
                <label class="form-label">{{ t('exchange.binaryFormat') }}</label>
                <select v-model="dataFormat.binaryFormat" class="select">
                  <option v-for="o in binaryFormatOptions" :key="o" :value="o">{{ o }}</option>
                </select>
              </div>
            </div>
          </template>
          <div class="p-title mt-2">{{ t('exchange.importOption') }}</div>
          <div class="flex" style="gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="form-item" style="margin:0;min-width:180px">
              <label class="form-label">{{ t('exchange.exceptionResolve') }}</label>
              <select v-model="importOption.exceptionResolve" class="select">
                <option v-for="o in exceptionResolveOptions" :key="o.value" :value="o.value">{{ o.name }}</option>
              </select>
            </div>
            <div v-if="type === 'json'" class="form-item" style="margin:0;min-width:200px">
              <label class="form-label">{{ t('exchange.jsonDataFormat') }}</label>
              <select v-model="importOption.jsonDataFormat" class="select">
                <option v-for="o in jsonDataFormatOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </div>
            <div class="form-item" style="margin:0;min-width:180px">
              <label class="form-label">{{ t('exchange.dependentNumberAuto') }}</label>
              <input v-model="dependentNumberAuto" class="input" maxlength="20" />
            </div>
          </div>
          <div v-if="type !== 'sql'" class="flex mt-2" style="gap:22px;flex-wrap:wrap">
            <span class="flex-between" style="min-width:220px">
              <span class="sm tx-2">{{ t('exchange.nullForIllegalColumnValue') }}</span>
              <label class="switch"><input type="checkbox" v-model="importOption.nullForIllegalColumnValue" /><i></i></label>
            </span>
            <span class="flex-between" style="min-width:220px">
              <span class="sm tx-2">{{ t('exchange.ignoreInexistentColumn') }}</span>
              <label class="switch"><input type="checkbox" v-model="importOption.ignoreInexistentColumn" /><i></i></label>
            </span>
            <span class="flex-between" style="min-width:220px">
              <span class="sm tx-2">{{ t('exchange.nullForEmptyImportKey') }}</span>
              <label class="switch"><input type="checkbox" v-model="importOption.nullForEmptyImportKey" /><i></i></label>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传文件 -->
    <div class="card mb-2">
      <div class="card-title">
        <span class="bar"></span>{{ t('uploadFile') }}
        <span class="more">{{ t('ex.repick') }}</span>
      </div>
      <label class="file-pick">
        <span class="btn sm">{{ uploading ? t('loading') : t('ex.pickFiles') }}</span>
        <input type="file" multiple :disabled="uploading" @change="onFileChange" />
        <span class="tx-3 sm">{{ subs.length ? subs.length + ' ✓' : '' }}</span>
      </label>
    </div>

    <!-- 子交换条目：多文件 → 多表映射 -->
    <div v-if="subs.length" class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('exchange.subList') }}<span class="more">{{ subs.length }}</span></div>
      <div class="table-wrap" style="border-radius:var(--r-m)">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('ex.colFile') }}</th>
              <th v-if="needTableName" style="width:200px">{{ t('ex.colTable') }}</th>
              <th style="width:90px">{{ t('ex.colNumber') }}</th>
              <th style="width:110px">{{ t('ex.colDep') }}</th>
              <th style="width:150px">{{ t('ex.colOps') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in subs" :key="s.id">
              <td class="cell-main ellipsis" style="max-width:260px" :title="s.fileName">{{ s.fileName }}</td>
              <td v-if="needTableName"><input v-model="s.tableName" class="input" style="padding:5px 10px" maxlength="200" :placeholder="t('importToTable')" /></td>
              <td><input v-model="s.number" class="input" style="padding:5px 8px" maxlength="10" /></td>
              <td><input v-model="s.dependentNumber" class="input" style="padding:5px 8px" maxlength="10" /></td>
              <td>
                <span v-if="lastSubmittedId" class="link" @click="viewLog(s)">{{ t('exchange.viewLog') }}</span>
                <span v-if="lastSubmittedId"> · </span>
                <span class="link danger" @click="removeSub(idx)">{{ t('exchange.removeSub') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 执行进度 -->
    <div v-if="importing || messages.length" class="card mb-2">
      <div class="card-title">
        <span class="bar"></span>{{ t('ex.runSec') }}
        <span class="more">{{ importing ? t('exchange.running') : finished ? t('exchange.finished') : '' }}</span>
      </div>
      <div class="progress mb-1" :class="{ indet: importing }"><i :style="{ width: finished ? '100%' : importing ? '60%' : '0%' }"></i></div>
      <div v-if="messages.length" class="sql-code wrap mt-1" style="max-height:200px;overflow-y:auto">
        <div v-for="(m, i) in messages" :key="i" class="msg-line msg-info">{{ msgText(m) }}</div>
      </div>
      <div class="flex mt-2" style="justify-content:flex-end;gap:10px">
        <button v-if="importing" class="btn danger sm" type="button" @click="onCancel">{{ t('exchange.cancelTask') }}</button>
      </div>
    </div>
    <div v-else class="bound-bar" style="margin-top:0;margin-bottom:14px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>
      <span>{{ t('ex.waitRunImport') }}</span>
    </div>

    <!-- 完成 -->
    <div v-if="finished" class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('ex.doneSec') }}</div>
      <span class="tag ok">{{ t('ex.doneOkImport') }}</span>
    </div>

    <!-- 底部操作 -->
    <div class="flex mt-2" style="justify-content:center;gap:12px">
      <button class="btn primary" type="button" :disabled="importing || !subs.length" @click="run">
        {{ importing ? t('loading') : t('import') }}
      </button>
    </div>

    <!-- 日志弹窗（.modal 风格） -->
    <div v-if="logVisible" class="modal-mask" @click.self="logVisible = false">
      <div class="modal" style="width:760px">
        <div class="flex-between">
          <div style="font-size:15px;font-weight:700">{{ t('exchange.logTitle') }}</div>
          <button class="drawer-close" type="button" @click="logVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div v-if="logLoading" class="tx-3 mt-2">{{ t('loading') }}…</div>
        <div v-else-if="logContent" class="sql-code wrap mt-2" style="max-height:56vh;overflow:auto" v-html="logContent"></div>
        <div v-else class="tx-3 mt-2">{{ t('exchange.logEmpty') }}</div>
        <div class="modal-foot">
          <button class="btn" type="button" @click="logVisible = false">{{ t('close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
