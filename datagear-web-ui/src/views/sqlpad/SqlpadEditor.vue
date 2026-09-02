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
  const d = window.prompt('请输入新的 SQL 分隔符', sqlDelimiter.value)
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
    fail((e as Error).message || '加载更多失败')
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const data = await sqlHistoryData(dtbsSourceId, { page: 1, pageSize: 50 })
    history.value = data.items
  } catch (e) {
    fail((e as Error).message || '加载历史失败')
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
  <div class="page page-manager page-sqlpad h-full flex flex-column overflow-auto">
    <div class="page-header grid grid-nogutter align-items-center p-1 flex-grow-0">
      <div class="col-12 flex align-items-center mb-2">
        <i class="pi pi-database text-color-secondary text-sm"></i>
        <div class="text-color-secondary text-sm ml-1">{{ dtbsSourceTitle }}</div>
        <i class="pi pi-angle-right text-color-secondary text-sm mx-1"></i>
        <div class="text-color-secondary text-sm">{{ t('module.sqlpad') }}</div>
      </div>
      <div class="col-12 flex flex-wrap gap-1">
        <Button :icon="executing ? 'pi pi-pause' : 'pi pi-play'" :label="t('execute')" :loading="executing" @click="run" />
        <Button icon="pi pi-stop" :label="t('stop')" class="p-button-secondary" @click="sendCmd('STOP')" />
        <Button
          icon="pi pi-check"
          :label="t('commit')"
          :class="{ 'p-button-secondary': !waitCommitOrRollback }"
          @click="sendCmd('COMMIT')"
        />
        <Button
          icon="pi pi-undo"
          :label="t('rollback')"
          :class="{ 'p-button-secondary': !waitCommitOrRollback }"
          @click="sendCmd('ROLLBACK')"
        />
        <span class="p-inputgroup inline-flex w-auto ml-2">
          <InputText v-model="sqlDelimiter" style="width: 6rem" :title="t('sqlDelimiter')" />
          <Button icon="pi pi-flag" class="p-button-secondary" :title="t('defineDelimiter')" @click="defineDelimiter" />
          <Button icon="pi pi-flag-fill" class="p-button-secondary" :title="t('insertDelimiter')" @click="insertDelimiter" />
        </span>
        <Button icon="pi pi-trash" :label="t('clear')" class="p-button-secondary ml-2" @click="clearSql" />
        <div class="flex-grow-1"></div>
        <Button
          icon="pi pi-history"
          :label="t('history')"
          class="p-button-secondary"
          @click="showHistory = !showHistory; showHistory && loadHistory()"
        />
        <Button icon="pi pi-cog" :label="t('settings')" class="p-button-secondary" @click="showSettings = !showSettings" />
      </div>
    </div>

    <div v-if="showHistory" class="history p-2 overflow-auto flex-grow-0">
      <div class="flex align-items-center justify-content-between mb-1">
        <span class="text-sm">{{ t('sqlHistory') }}</span>
        <Button icon="pi pi-refresh" size="small" text :label="t('refresh')" @click="loadHistory" />
      </div>
      <div v-if="historyLoading" class="text-color-secondary">{{ t('loading') }}</div>
      <div v-else-if="history.length === 0" class="text-color-secondary">{{ t('noHistory') }}</div>
      <div v-for="(h, i) in history" :key="i" class="history-item" @click="fillFromHistory(h)">
        <div class="history-sql">{{ h.sql }}</div>
        <div class="history-time">{{ h.createTime }}</div>
      </div>
    </div>

    <div v-if="showSettings" class="settings p-2 flex-grow-0">
      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3 flex align-items-center gap-2">
          <label>{{ t('commitMode') }}</label>
          <SelectButton
            v-model="commitMode"
            :options="[
              { name: '自动', value: 'AUTO' },
              { name: '手动', value: 'MANUAL' },
            ]"
            option-label="name"
            option-value="value"
          />
        </div>
        <div class="col-12 md:col-6 lg:col-3 flex align-items-center gap-2">
          <label>{{ t('exceptionHandleMode') }}</label>
          <SelectButton
            v-model="exceptionHandleMode"
            :options="[
              { name: '中止', value: 'ABORT' },
              { name: '忽略', value: 'IGNORE' },
              { name: '回滚', value: 'ROLLBACK' },
            ]"
            option-label="name"
            option-value="value"
          />
        </div>
        <div class="col-12 md:col-6 lg:col-3 flex align-items-center gap-2">
          <label>{{ t('resultFetchSize') }}</label>
          <Dropdown v-model="resultsetFetchSize" :options="[10, 50, 100, 200, 500]" />
        </div>
        <div class="col-12 md:col-6 lg:col-3 flex align-items-center gap-2">
          <label>{{ t('overTimeThreshold') }}</label>
          <Dropdown
            v-model="overTimeThreashold"
            :options="[
              { name: '不限', value: 0 },
              { name: '5秒', value: 5 },
              { name: '10秒', value: 10 },
              { name: '30秒', value: 30 },
              { name: '60秒', value: 60 },
            ]"
            option-label="name"
            option-value="value"
          />
        </div>
      </div>
    </div>

    <div class="page-content flex-grow-1 overflow-hidden flex flex-column">
      <CodeEditor v-model="sql" class="sql-editor flex-1" />
      <div class="messages p-2 overflow-auto flex-grow-0">
        <div v-for="(m, i) in logs" :key="i" class="message" :class="messageClass(m)">
          <span class="msg-time">{{ m.timeText }}</span>
          <span>{{ messageText(m) }}</span>
        </div>
      </div>
      <div v-if="hasResultTabs" class="result p-2 flex-grow-0">
        <div class="flex align-items-center justify-content-between mb-2">
          <span>{{ t('queryResult') }}</span>
          <Button v-if="activeTab?.nextStartRow != null" :label="t('loadMore')" size="small" text @click="loadMore" />
        </div>
        <TabView v-model:active-index="activeResultIndex" :scrollable="true">
          <TabPanel v-for="(tab, i) in resultTabs" :key="i" :header="tab.title">
            <div v-if="tab.updateCount != null && !tab.rows.length" class="text-color-secondary p-2">
              {{ t('affectRows', { count: tab.updateCount }) }}
            </div>
            <DataTable v-else :value="tab.rows" class="p-datatable-sm" striped-rows scrollable scroll-height="220px" data-key="__rowid">
              <Column v-for="c in tab.columns" :key="c" :field="c" :header="c">
                <template #body="{ data }">
                  <span class="cell-value" @click="viewFullValue(data, c)">{{ cellValue(data, c) }}</span>
                </template>
              </Column>
            </DataTable>
          </TabPanel>
        </TabView>
      </div>
    </div>

    <Dialog
      :visible="!!fullValue"
      :header="fullValue?.field ?? ''"
      modal
      maximizable
      class="full-value-dialog"
      @update:visible="fullValue = null"
    >
      <pre class="full-value-content">{{ fullValue?.value }}</pre>
    </Dialog>
  </div>
</template>

<style scoped>
.sql-editor {
  font-family: monospace;
  font-size: 14px;
  border-top: 1px solid var(--surface-border);
  border-bottom: 1px solid var(--surface-border);
}
.messages {
  max-height: 200px;
  border-bottom: 1px solid var(--surface-border);
}
.message {
  padding: 3px 6px;
  border-radius: 4px;
}
.msg-time {
  margin-right: 8px;
  color: #888;
}
.msg-error {
  color: #b00020;
}
.msg-success {
  color: #2e7d32;
}
.msg-info {
  color: var(--text-color);
}
.history {
  max-height: 180px;
  border-bottom: 1px solid var(--surface-border);
}
.history-item {
  padding: 4px 6px;
  cursor: pointer;
  border-bottom: 1px dashed var(--surface-border);
}
.history-item:hover {
  background: var(--surface-hover);
}
.history-sql {
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-time {
  color: #999;
  font-size: 12px;
}
.settings {
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
}
.cell-value {
  cursor: pointer;
  display: inline-block;
  max-width: 18ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.cell-value:hover {
  color: var(--primary-color);
  text-decoration: underline;
}
.full-value-content {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
