<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  executeSql,
  sendCommand,
  pollMessages,
  selectData,
  sqlHistoryData,
  newSqlpadId,
  type CommitMode,
  type SqlCommand,
  type ExceptionHandleMode,
  type SqlpadMessage,
  type SqlHistory,
} from '@/api/sqlpad'
import { useOperationMessage } from '@/composables/useOperationMessage'
import CodeEditor from '@/components/CodeEditor.vue'

// SQL 工作台，按原 dtbsSourceSqlpad.ftl 复刻核心工具栏 + 消息 + 结果。
// 第三轮：按原型「能源暗域」风格重排版式（page-head/.btn/.tabs/.tbl/.sql-code + CodeMirror 深色），功能不变。
import '@/styles/datasource-page.css'

const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string
const dtbsSourceTitle = (route.query.title as string) || '数据源'

const sql = ref('SELECT 1 AS demo;')
const sqlDelimiter = ref(';')
const sqlpadId = ref(newSqlpadId())
const commitMode = ref<CommitMode>('AUTO')
const exceptionHandleMode = ref<ExceptionHandleMode>('ABORT')
const resultsetFetchSize = ref(100)
const overTimeThreashold = ref(0)
const messages = ref<SqlpadMessage[]>([])
const executing = ref(false)
const waitCommitOrRollback = ref(false)

interface ResultTab {
  title: string
  sql: string
  updateCount: number | null
  columns: string[]
  rows: Record<string, unknown>[]
  nextStartRow: number | null
}

const resultTabs = ref<ResultTab[]>([])
const activeResultIndex = ref(0)

const showHistory = ref(false)
const history = ref<SqlHistory[]>([])
const historyLoading = ref(false)
const showSettings = ref(false)

// 查看单元格完整值
const fullValue = ref<{ field: string; value: string } | null>(null)

function cellValue(row: Record<string, unknown>, field: string): string {
  const v = row[field]
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function viewFullValue(row: Record<string, unknown>, field: string) {
  fullValue.value = { field, value: cellValue(row, field) }
}

const pollTimer = ref<number | null>(null)
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const logs = computed(() => messages.value.filter((m) => m.type !== 'SqlSuccessMessage'))
const activeTab = computed(() => resultTabs.value[activeResultIndex.value])
const hasResultTabs = computed(() => resultTabs.value.length > 0)

const commitModeOptions = computed(() => [
  { name: t('sqlpad.auto'), value: 'AUTO' as CommitMode },
  { name: t('sqlpad.manual'), value: 'MANUAL' as CommitMode },
])
const exceptionModeOptions = computed(() => [
  { name: t('sqlpad.abort'), value: 'ABORT' as ExceptionHandleMode },
  { name: t('sqlpad.ignore'), value: 'IGNORE' as ExceptionHandleMode },
  { name: t('sqlpad.rollback'), value: 'ROLLBACK' as ExceptionHandleMode },
])

function messageText(m: SqlpadMessage): string {
  switch (m.type) {
    case 'StartMessage':
      return t('sqlpadStart', { count: m.sqlCount ?? 0 })
    case 'SqlSuccessMessage':
      return m.updateCount != null && m.updateCount >= 0
        ? t('sqlpadAffectRows', { count: m.updateCount })
        : t('sqlpadSuccess')
    case 'ExceptionMessage':
      return t('sqlpadError', { message: m.message ?? t('unknownError') })
    case 'FinishMessage':
      return t('sqlpadFinish')
    case 'TextMessage':
      return m.text ?? ''
    default:
      return m.type
  }
}

function messageClass(m: SqlpadMessage): string {
  if (m.type === 'ExceptionMessage') return 'msg-error'
  if (m.type === 'FinishMessage') return 'msg-success'
  return 'msg-info'
}

function extractResults(list: SqlpadMessage[]): void {
  resultTabs.value = []
  list.forEach((m) => {
    if (m.type !== 'SqlSuccessMessage') return
    const r = m.sqlSelectResult
    const idx = resultTabs.value.length + 1
    if (r?.rows?.length) {
      resultTabs.value.push({
        title: `#${m.sqlStatementIndex ?? idx}`,
        sql: r.sql ?? '',
        updateCount: m.updateCount ?? null,
        columns: r.table?.columns?.map((c) => c.name) ?? [],
        rows: r.rows,
        nextStartRow: r.nextStartRow ?? null,
      })
    } else {
      resultTabs.value.push({
        title: `#${m.sqlStatementIndex ?? idx}`,
        sql: '',
        updateCount: m.updateCount ?? null,
        columns: [],
        rows: [],
        nextStartRow: null,
      })
    }
  })
  if (activeResultIndex.value >= resultTabs.value.length) activeResultIndex.value = 0
}

function stopPoll() {
  if (pollTimer.value) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function poll() {
  try {
    const list = await pollMessages(dtbsSourceId, sqlpadId.value, 100)
    messages.value = list
    extractResults(list)
    if (list.some((m) => m.type === 'FinishMessage')) {
      executing.value = false
      stopPoll()
      if (showHistory.value) loadHistory()
    }
    if (list.some((m) => m.type === 'TextMessage' && m.text === 'WAIT_COMMIT_OR_ROLLBACK')) {
      waitCommitOrRollback.value = true
    }
  } catch (e) {
    fail((e as Error).message || t('pollFail'))
    executing.value = false
    stopPoll()
  }
}

async function run() {
  if (!sql.value) {
    fail(t('pleaseInputSql'))
    return
  }
  executing.value = true
  waitCommitOrRollback.value = false
  messages.value = []
  resultTabs.value = []
  activeResultIndex.value = 0
  stopPoll()
  try {
    await executeSql(dtbsSourceId, sqlpadId.value, sql.value, {
      commitMode: commitMode.value,
      exceptionHandleMode: exceptionHandleMode.value,
      resultsetFetchSize: resultsetFetchSize.value,
      overTimeThreashold: overTimeThreashold.value || undefined,
      sqlDelimiter: sqlDelimiter.value,
    })
    pollTimer.value = window.setInterval(poll, 400)
  } catch (e) {
    executing.value = false
    fail((e as Error).message || t('executeFail'))
  }
}

async function sendCmd(command: SqlCommand) {
  try {
    await sendCommand(dtbsSourceId, sqlpadId.value, command)
    success(`已发送 ${command}`)
    if (command === 'COMMIT' || command === 'ROLLBACK') waitCommitOrRollback.value = false
  } catch (e) {
    fail((e as Error).message || t('commandFail'))
  }
}

function insertDelimiter() {
  sql.value += '\n' + sqlDelimiter.value + '\n'
}

function defineDelimiter() {
  const d = window.prompt(t('sqlpad.defineDelimiterAsk'), sqlDelimiter.value)
  if (d !== null) sqlDelimiter.value = d
}

function clearSql() {
  sql.value = ''
}

async function loadMore() {
  const tab = activeTab.value
  if (!tab || tab.nextStartRow == null || !tab.sql) return
  try {
    const r = await selectData(dtbsSourceId, {
      sqlpadId: sqlpadId.value,
      sql: tab.sql,
      startRow: tab.nextStartRow,
      fetchSize: resultsetFetchSize.value,
    })
    tab.rows.push(...(r.rows ?? []))
    tab.nextStartRow = r.nextStartRow ?? null
  } catch (e) {
    fail((e as Error).message || t('sqlpad.loadMoreFail'))
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const data = await sqlHistoryData(dtbsSourceId, { page: 1, pageSize: 50 })
    history.value = data.items
  } catch (e) {
    fail((e as Error).message || t('sqlpad.loadHistoryFail'))
  } finally {
    historyLoading.value = false
  }
}

function fillFromHistory(h: SqlHistory) {
  sql.value = h.sql
  showHistory.value = false
}

onMounted(() => {
  if (route.query.sql) sql.value = String(route.query.sql)
})

onBeforeUnmount(stopPoll)
</script>

<template>
  <div class="ds-page" style="display:flex;flex-direction:column;overflow:hidden">
    <!-- 页头 -->
    <div class="page-head" style="margin-bottom:12px">
      <div>
        <div class="page-title">{{ t('sqlpad.title') }}<span class="tx-3" style="font-size:15px;font-weight:400"> · {{ dtbsSourceTitle }}</span></div>
        <div class="page-desc">{{ t('sqlpad.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="showHistory = !showHistory; showHistory && loadHistory()">{{ t('sqlpad.history') }}</button>
        <button class="btn" type="button" @click="showSettings = !showSettings">{{ t('sqlpad.settings') }}</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="flex mb-2" style="gap:8px;flex-wrap:wrap;flex:none">
      <button class="btn primary" type="button" :disabled="executing" @click="run">
        {{ executing ? t('loading') : t('sqlpad.execute') }}
      </button>
      <button class="btn" type="button" @click="sendCmd('STOP')">{{ t('sqlpad.stop') }}</button>
      <button class="btn" :class="{ primary: waitCommitOrRollback }" type="button" @click="sendCmd('COMMIT')">{{ t('sqlpad.commit') }}</button>
      <button class="btn" :class="{ primary: waitCommitOrRollback }" type="button" @click="sendCmd('ROLLBACK')">{{ t('sqlpad.rollback') }}</button>
      <span class="flex" style="gap:6px;margin-left:8px">
        <input v-model="sqlDelimiter" class="input" style="width:70px;padding:6px 10px" :title="t('sqlpad.delimiter')" />
        <button class="btn sm" type="button" :title="t('defineDelimiter')" @click="defineDelimiter">{{ t('sqlpad.define') }}</button>
        <button class="btn sm" type="button" :title="t('insertDelimiter')" @click="insertDelimiter">{{ t('sqlpad.insert') }}</button>
      </span>
      <button class="btn danger sm" type="button" style="margin-left:auto" @click="clearSql">{{ t('clear') }}</button>
    </div>

    <!-- 历史面板 -->
    <div v-if="showHistory" class="card mb-2" style="flex:none;max-height:200px;overflow-y:auto;padding:10px 14px">
      <div class="card-title" style="margin-bottom:8px">
        <span class="bar"></span>{{ t('sqlHistory') }}
        <span class="more" @click="loadHistory">{{ t('refresh') }}</span>
      </div>
      <div v-if="historyLoading" class="tx-3 sm">{{ t('loading') }}…</div>
      <div v-else-if="!history.length" class="tx-3 sm">{{ t('noHistory') }}</div>
      <div v-for="(h, i) in history" v-else :key="i" class="row-item" style="padding:7px 10px" @click="fillFromHistory(h)">
        <span class="ellipsis grow" style="font-family:var(--font-mono);font-size:12px">{{ h.sql }}</span>
        <span class="tx-3 sm" style="flex:none">{{ h.createTime }}</span>
      </div>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="card mb-2" style="flex:none;padding:12px 14px">
      <div class="flex" style="gap:22px;flex-wrap:wrap;align-items:center">
        <span class="flex" style="gap:8px">
          <label class="form-label" style="margin:0">{{ t('commitMode') }}</label>
          <span class="seg">
            <span v-for="o in commitModeOptions" :key="o.value" class="seg-item" :class="{ active: commitMode === o.value }" @click="commitMode = o.value">{{ o.name }}</span>
          </span>
        </span>
        <span class="flex" style="gap:8px">
          <label class="form-label" style="margin:0">{{ t('exceptionHandleMode') }}</label>
          <span class="seg">
            <span v-for="o in exceptionModeOptions" :key="o.value" class="seg-item" :class="{ active: exceptionHandleMode === o.value }" @click="exceptionHandleMode = o.value">{{ o.name }}</span>
          </span>
        </span>
        <span class="flex" style="gap:8px">
          <label class="form-label" style="margin:0">{{ t('resultFetchSize') }}</label>
          <select v-model="resultsetFetchSize" class="select" style="width:100px;padding:5px 10px">
            <option v-for="n in [10, 50, 100, 200, 500]" :key="n" :value="n">{{ n }}</option>
          </select>
        </span>
        <span class="flex" style="gap:8px">
          <label class="form-label" style="margin:0">{{ t('overTimeThreshold') }}</label>
          <select v-model="overTimeThreashold" class="select" style="width:100px;padding:5px 10px">
            <option :value="0">{{ t('sqlpad.noLimit') }}</option>
            <option :value="5">5s</option>
            <option :value="10">10s</option>
            <option :value="30">30s</option>
            <option :value="60">60s</option>
          </select>
        </span>
      </div>
    </div>

    <!-- 编辑器 -->
    <div style="flex:1;min-height:180px;overflow:hidden" class="mb-1">
      <CodeEditor v-model="sql" style="height:100%;display:block" />
    </div>

    <!-- 消息区（.sql-code 风格，保留分类着色） -->
    <div v-if="logs.length" class="sql-code wrap mb-1" style="flex:none;max-height:150px;overflow-y:auto;padding:10px 14px">
      <div v-for="(m, i) in logs" :key="i" class="msg-line" :class="messageClass(m)">
        <span class="msg-time">{{ m.timeText }}</span><span>{{ messageText(m) }}</span>
      </div>
    </div>

    <!-- 结果区（.tabs + .tbl） -->
    <div v-if="hasResultTabs" class="qb-pane" style="flex:none;min-height:0;display:flex;flex-direction:column;max-height:42vh">
      <div class="tabs" style="margin-bottom:10px">
        <span
          v-for="(tab, i) in resultTabs"
          :key="i"
          class="tab"
          :class="{ active: activeResultIndex === i }"
          @click="activeResultIndex = i"
        >{{ tab.title }}<span v-if="tab.rows.length" class="cnt">{{ tab.rows.length }}</span></span>
        <span v-if="activeTab?.nextStartRow != null" class="link" style="margin-left:auto;align-self:center" @click="loadMore">{{ t('loadMore') }}</span>
      </div>
      <div v-if="activeTab && activeTab.updateCount != null && !activeTab.rows.length" class="tx-3 sm">
        {{ t('affectRows', { count: activeTab.updateCount }) }}
      </div>
      <div v-else-if="activeTab" class="table-wrap" style="border-radius:var(--r-m);overflow:auto;min-height:0">
        <table class="tbl" style="font-size:12px">
          <thead>
            <tr><th v-for="c in activeTab.columns" :key="c">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in activeTab.rows" :key="ri">
              <td v-for="c in activeTab.columns" :key="c">
                <span class="cell-link" @click="viewFullValue(row, c)">{{ cellValue(row, c) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 单元格完整值弹窗（.modal 风格） -->
    <div v-if="fullValue" class="modal-mask" @click.self="fullValue = null">
      <div class="modal" style="width:640px">
        <div class="flex-between">
          <div style="font-size:15px;font-weight:700;font-family:var(--font-mono)">{{ fullValue.field }}</div>
          <button class="drawer-close" type="button" @click="fullValue = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="sql-code wrap mt-2" style="max-height:56vh;overflow:auto">{{ fullValue.value }}</div>
        <div class="modal-foot">
          <button class="btn" type="button" @click="fullValue = null">{{ t('close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cell-link {
  cursor: pointer;
  display: inline-block;
  max-width: 22ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.cell-link:hover {
  color: var(--brand);
  text-decoration: underline;
}
</style>
