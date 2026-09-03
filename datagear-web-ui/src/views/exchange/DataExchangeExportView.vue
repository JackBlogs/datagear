<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getAllTableNames,
  doExport,
  pollExportMessages,
  downloadAllUrl,
  downloadUrl,
  cancelExchange,
  getLogContent,
  newId,
  type ExportType,
  type DataFormat,
  type DataExportOption,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据导出向导，按原 dtbsSourceExchange/export_*.ftl 复刻：
// 表多选 + 每行自定义 SQL/文件名 + dataFormat/导出选项面板 + 按行下载 + 查看日志 + 取消。
// 第三轮：按原型「能源暗域」风格重排版式（steps/dst-type/.tbl/.progress/.sql-code），功能不变。
import '@/styles/datasource-page.css'

const route = useRoute()
const router = useRouter()
const dtbsSourceId = route.params.dtbsSourceId as string
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const tables = ref<string[]>([])
const tableKeyword = ref('')
const format = ref<ExportType>('csv')
const fileEncoding = ref('UTF-8')
const exporting = ref(false)
const finished = ref(false)
const messages = ref<unknown[]>([])
const dataExchangeId = ref('')

// 子交换条目（每行可改 文件名/查询 SQL；auto 标记文件名是否仍为自动生成）
interface SubRow {
  id: string
  fileName: string
  query: string
  auto: boolean
}
const subs = ref<SubRow[]>([])

// 数据格式（对应后端 DataFormat）
const dataFormat = ref<Required<DataFormat>>({
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm:ss',
  timestampFormat: 'yyyy-MM-dd HH:mm:ss',
  numberFormat: '#.##',
  binaryFormat: 'Hex',
})
// 导出选项（SQL：exportCreationSql；JSON：jsonDataFormat/prettyPrint）
const exportOption = ref<DataExportOption>({
  exportCreationSql: false,
  jsonDataFormat: 'TABLE_OBJECT',
  prettyPrint: true,
})
const showAdvanced = ref(false)

// 查看日志
const logVisible = ref(false)
const logContent = ref('')
const logLoading = ref(false)

const extMap: Record<ExportType, string> = { csv: 'csv', excel: 'xlsx', sql: 'sql', json: 'json' }
const formatCards: { value: ExportType; name: string; desc: string; color: string; bg: string }[] = [
  { value: 'csv', name: 'CSV', desc: '逗号分隔文本，通用交换', color: 'var(--coal)', bg: 'var(--coal-soft)' },
  { value: 'excel', name: 'Excel', desc: 'xlsx 工作簿，按表分 Sheet', color: 'var(--ok)', bg: 'var(--ok-soft)' },
  { value: 'sql', name: 'SQL', desc: 'INSERT 脚本，可选建表语句', color: 'var(--info)', bg: 'var(--info-soft)' },
  { value: 'json', name: 'JSON', desc: '表对象 / 行数组两种结构', color: 'var(--gas)', bg: 'var(--gas-soft)' },
]
const binaryFormatOptions = ['Hex', 'Base64', 'NULL']
const jsonDataFormatOptions = ['TABLE_OBJECT', 'ROW_ARRAY']

const filteredTables = computed(() => {
  const k = tableKeyword.value.trim().toLowerCase()
  if (!k) return tables.value
  return tables.value.filter((x) => x.toLowerCase().includes(k))
})

const zipUrl = computed(() =>
  dataExchangeId.value ? downloadAllUrl(dtbsSourceId, dataExchangeId.value, 'export.zip') : '',
)

// steps 状态：1 配置 → 2 执行 → 3 完成
const currentStep = computed(() => (finished.value ? 3 : exporting.value || messages.value.length ? 2 : 1))

function isSelected(tb: string): boolean {
  return subs.value.some((s) => s.query === `SELECT * FROM ${tb}`)
}

function toggleTable(tb: string) {
  const idx = subs.value.findIndex((s) => s.query === `SELECT * FROM ${tb}`)
  if (idx >= 0) {
    subs.value.splice(idx, 1)
  } else {
    subs.value.push({ id: newId(), fileName: `${tb}.${extMap[format.value]}`, query: `SELECT * FROM ${tb}`, auto: true })
  }
}

function removeSub(idx: number) {
  subs.value.splice(idx, 1)
}

function onFileNameInput(s: SubRow) {
  s.auto = false
}

function onFormatChange() {
  // 格式变化时，仅重生成仍为自动命名的文件后缀
  for (const s of subs.value) {
    if (s.auto) {
      const base = s.fileName.replace(/\.[^.]*$/, '')
      s.fileName = `${base}.${extMap[format.value]}`
    }
  }
}

function pickFormat(f: ExportType) {
  format.value = f
  onFormatChange()
}

async function loadTables() {
  try {
    tables.value = await getAllTableNames(dtbsSourceId)
    // 数据管理「导出」入口带 ?query= 时，预填单条自定义查询（对应旧版 export.ftl?query= 行为）
    const q = route.query.query ? String(route.query.query) : ''
    if (q && !subs.value.length) {
      subs.value.push({ id: newId(), fileName: `query-result.${extMap[format.value]}`, query: q, auto: true })
    }
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  }
}

async function run() {
  if (!subs.value.length) {
    fail(t('pleaseSelectTable'))
    return
  }
  exporting.value = true
  finished.value = false
  messages.value = []
  const id = newId()
  dataExchangeId.value = id
  try {
    await doExport(dtbsSourceId, format.value, {
      dataExchangeId: id,
      fileEncoding: fileEncoding.value,
      subDataExchanges: subs.value.map((s) => ({ id: s.id, fileName: s.fileName, query: s.query })),
      dataFormat: { ...dataFormat.value },
      exportOption: buildExportOption(),
    })
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => setTimeout(r, 500))
      messages.value = await pollExportMessages(dtbsSourceId, id, 50)
      if (messages.value.some((m) => (m as { type?: string }).type === 'FinishMessage')) break
    }
    finished.value = true
    success(t('exchange.finished'))
  } catch (e) {
    fail((e as Error).message || t('exportFail'))
  } finally {
    exporting.value = false
  }
}

function buildExportOption(): DataExportOption {
  if (format.value === 'sql') return { exportCreationSql: exportOption.value.exportCreationSql }
  if (format.value === 'json')
    return { jsonDataFormat: exportOption.value.jsonDataFormat, prettyPrint: exportOption.value.prettyPrint }
  return {}
}

async function onCancel() {
  if (!dataExchangeId.value) return
  try {
    await cancelExchange(dtbsSourceId, dataExchangeId.value, subs.value.map((s) => s.id))
    success(t('exchange.cancelled'))
  } catch (e) {
    fail((e as Error).message || t('exportFail'))
  }
}

async function viewLog(s: SubRow) {
  logVisible.value = true
  logLoading.value = true
  logContent.value = ''
  try {
    logContent.value = await getLogContent(dtbsSourceId, dataExchangeId.value, s.id)
  } catch (e) {
    logContent.value = (e as Error).message || t('exchange.logEmpty')
  } finally {
    logLoading.value = false
  }
}

function rowDownloadUrl(s: SubRow): string {
  return downloadUrl(dtbsSourceId, dataExchangeId.value, s.fileName)
}

function msgText(m: unknown): string {
  if (typeof m === 'string') return m
  try {
    return JSON.stringify(m)
  } catch {
    return String(m)
  }
}

onMounted(loadTables)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('ex.exportTitle') }}</div>
        <div class="page-desc">{{ t('ex.exportDesc') }}</div>
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
      <div class="card-title"><span class="bar"></span>{{ t('ex.configSec') }}</div>
      <div class="form-item">
        <label class="form-label">{{ t('exportFormat') }}</label>
        <div class="dst-types">
          <div
            v-for="f in formatCards"
            :key="f.value"
            class="dst-type"
            :class="{ sel: format === f.value }"
            @click="pickFormat(f.value)"
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
        <label class="form-label cursor-pointer" style="cursor:pointer" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? '▾' : '▸' }} {{ t('exchange.advanced') }}
        </label>
        <div v-if="showAdvanced" class="qb-pane mt-1">
          <div class="p-title">{{ t('exchange.dataFormat') }}</div>
          <div class="flex wrap" style="gap:12px;flex-wrap:wrap">
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
          <template v-if="format === 'sql' || format === 'json'">
            <div class="p-title mt-2">{{ t('exchange.exportOption') }}</div>
            <div v-if="format === 'sql'" class="flex-between">
              <span class="sm tx-2">{{ t('exchange.exportCreationSql') }}</span>
              <label class="switch"><input type="checkbox" v-model="exportOption.exportCreationSql" /><i></i></label>
            </div>
            <template v-if="format === 'json'">
              <div class="form-item" style="margin:8px 0 0;max-width:260px">
                <label class="form-label">{{ t('exchange.jsonDataFormat') }}</label>
                <select v-model="exportOption.jsonDataFormat" class="select">
                  <option v-for="o in jsonDataFormatOptions" :key="o" :value="o">{{ o }}</option>
                </select>
              </div>
              <div class="flex-between mt-1" style="max-width:260px">
                <span class="sm tx-2">{{ t('exchange.prettyPrint') }}</span>
                <label class="switch"><input type="checkbox" v-model="exportOption.prettyPrint" /><i></i></label>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 选择表 -->
    <div class="card mb-2">
      <div class="card-title">
        <span class="bar"></span>{{ t('selectTable') }}
        <span class="more">{{ subs.length }} / {{ tables.length }}</span>
      </div>
      <input v-model="tableKeyword" class="input mb-1" style="max-width:320px" :placeholder="t('searchTable')" />
      <div v-if="!tables.length" class="tx-3 sm">{{ t('noTable') }}</div>
      <div v-else style="max-height:200px;overflow-y:auto">
        <label v-for="tb in filteredTables" :key="tb" class="field-chip" style="cursor:pointer">
          <input type="checkbox" :checked="isSelected(tb)" @change="toggleTable(tb)" />
          <span class="ellipsis">{{ tb }}</span>
        </label>
      </div>
    </div>

    <!-- 子交换条目 -->
    <div v-if="subs.length" class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('exchange.subList') }}<span class="more">{{ subs.length }}</span></div>
      <div class="table-wrap" style="border-radius:var(--r-m)">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:220px">{{ t('ex.colFileName') }}</th>
              <th>{{ t('ex.colQuery') }}</th>
              <th style="width:170px">{{ t('ex.colOps') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in subs" :key="s.id">
              <td><input v-model="s.fileName" class="input" style="padding:5px 10px" @input="onFileNameInput(s)" /></td>
              <td><textarea v-model="s.query" class="code-input" rows="2"></textarea></td>
              <td>
                <a v-if="finished" :href="rowDownloadUrl(s)" class="link" target="_blank">{{ t('exchange.downloadRow') }}</a>
                <span v-if="finished"> · </span>
                <span v-if="dataExchangeId" class="link" @click="viewLog(s)">{{ t('exchange.viewLog') }}</span>
                <span v-if="dataExchangeId"> · </span>
                <span class="link danger" @click="removeSub(idx)">{{ t('exchange.removeSub') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 执行进度 -->
    <div v-if="exporting || messages.length" class="card mb-2">
      <div class="card-title">
        <span class="bar"></span>{{ t('ex.runSec') }}
        <span class="more">{{ exporting ? t('exchange.running') : finished ? t('exchange.finished') : '' }}</span>
      </div>
      <div class="progress mb-1" :class="{ indet: exporting }"><i :style="{ width: finished ? '100%' : exporting ? '60%' : '0%' }"></i></div>
      <div v-if="messages.length" class="sql-code wrap mt-1" style="max-height:200px;overflow-y:auto">
        <div v-for="(m, i) in messages" :key="i" class="msg-line msg-info">{{ msgText(m) }}</div>
      </div>
      <div class="flex mt-2" style="justify-content:flex-end;gap:10px">
        <button v-if="exporting" class="btn danger sm" type="button" @click="onCancel">{{ t('exchange.cancelTask') }}</button>
      </div>
    </div>
    <div v-else class="bound-bar" style="margin-top:0;margin-bottom:14px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>
      <span>{{ t('ex.waitRun') }}</span>
    </div>

    <!-- 完成 -->
    <div v-if="finished" class="card mb-2">
      <div class="card-title"><span class="bar"></span>{{ t('ex.doneSec') }}</div>
      <div class="flex-between" style="flex-wrap:wrap;gap:10px">
        <span class="tx-2 sm">{{ t('ex.doneOk') }}</span>
        <a :href="zipUrl" class="btn primary" style="text-decoration:none" target="_blank">{{ t('downloadZip') }}</a>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="flex mt-2" style="justify-content:center;gap:12px">
      <button class="btn primary lg" type="button" :disabled="exporting || !subs.length" @click="run">
        {{ exporting ? t('loading') : t('export') }}
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
