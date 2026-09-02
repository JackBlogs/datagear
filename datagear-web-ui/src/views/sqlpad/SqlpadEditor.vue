<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  executeSql,
  pollMessages,
  selectData,
  sqlHistoryData,
  newSqlpadId,
  type SqlpadMessage,
  type SqlSelectResult,
  type SqlHistory,
} from '@/api/sqlpad'
import { useOperationMessage } from '@/composables/useOperationMessage'
import CodeEditor from '@/components/CodeEditor.vue'

// 5b SQL 工作台「逐步重写」：Vue 编辑器直接调端点，按消息类型渲染进度/结果/错误 + SQL 历史 + 结果分页。
const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string

const sql = ref('SELECT 1 AS demo;')
const sqlpadId = ref(newSqlpadId())
const messages = ref<SqlpadMessage[]>([])
const executing = ref(false)

const lastResult = ref<SqlSelectResult | null>(null)
const resultSql = ref('')
const nextStartRow = ref<number | null>(null)

const showHistory = ref(false)
const history = ref<SqlHistory[]>([])
const historyLoading = ref(false)

const { fail } = useOperationMessage()

const logs = computed(() => messages.value.filter((m) => m.type !== 'SqlSuccessMessage'))
const resultColumns = computed(() => lastResult.value?.table?.columns?.map((c) => c.name) ?? [])
const resultRows = computed(() => lastResult.value?.rows ?? [])

function messageText(m: SqlpadMessage): string {
  switch (m.type) {
    case 'StartMessage':
      return `开始执行 ${m.sqlCount ?? 0} 条 SQL`
    case 'SqlSuccessMessage':
      return m.updateCount != null && m.updateCount >= 0 ? `执行成功，影响 ${m.updateCount} 行` : '执行成功'
    case 'ExceptionMessage':
      return `错误：${m.message ?? '未知错误'}`
    case 'FinishMessage':
      return '执行完成'
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

function extractResult(list: SqlpadMessage[]): void {
  lastResult.value = null
  nextStartRow.value = null
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]
    if (m.type === 'SqlSuccessMessage' && m.sqlSelectResult?.rows?.length) {
      lastResult.value = m.sqlSelectResult
      nextStartRow.value = m.sqlSelectResult.nextStartRow ?? null
      return
    }
  }
}

async function run() {
  executing.value = true
  messages.value = []
  resultSql.value = sql.value
  try {
    await executeSql(dtbsSourceId, sqlpadId.value, sql.value)
    // 轮询直至 FinishMessage 或超时
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 400))
      messages.value = await pollMessages(dtbsSourceId, sqlpadId.value, 100)
      if (messages.value.some((m) => m.type === 'FinishMessage')) break
    }
    extractResult(messages.value)
  } catch (e) {
    fail((e as Error).message || '执行失败')
  } finally {
    executing.value = false
  }
}

async function loadMore() {
  if (nextStartRow.value == null || !resultSql.value) return
  try {
    const r = await selectData(dtbsSourceId, {
      sqlpadId: sqlpadId.value,
      sql: resultSql.value,
      startRow: nextStartRow.value,
      fetchSize: 50,
    })
    lastResult.value?.rows?.push(...(r.rows ?? []))
    nextStartRow.value = r.nextStartRow ?? null
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
</script>

<template>
  <div class="flex flex-column h-full">
    <div class="toolbar flex align-items-center gap-2 p-2">
      <span>SQL 工作台（Vue 重写）</span>
      <Button label="执行" :loading="executing" @click="run" />
      <Button label="历史" text @click="showHistory = !showHistory; showHistory && loadHistory()" />
    </div>

    <div v-if="showHistory" class="history p-2 overflow-auto">
      <div v-if="historyLoading" class="text-color-secondary">加载中…</div>
      <div v-else-if="history.length === 0" class="text-color-secondary">暂无历史</div>
      <div v-for="(h, i) in history" :key="i" class="history-item" @click="fillFromHistory(h)">
        <div class="history-sql">{{ h.sql }}</div>
        <div class="history-time">{{ h.createTime }}</div>
      </div>
    </div>

    <CodeEditor v-model="sql" class="sql-editor" />
    <div class="messages p-2 overflow-auto">
      <div v-for="(m, i) in logs" :key="i" class="message" :class="messageClass(m)">
        <span class="msg-time">{{ m.timeText }}</span>
        <span>{{ messageText(m) }}</span>
      </div>
    </div>
    <div v-if="resultColumns.length" class="result p-2">
      <div class="flex align-items-center justify-content-between mb-2">
        <span>查询结果</span>
        <Button v-if="nextStartRow != null" label="加载更多" size="small" text @click="loadMore" />
      </div>
      <DataTable :value="resultRows" class="p-datatable-sm" striped-rows>
        <Column v-for="c in resultColumns" :key="c" :field="c" :header="c" />
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.sql-editor {
  font-family: monospace;
  font-size: 14px;
  min-height: 120px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  resize: vertical;
}
.messages {
  max-height: 200px;
  border-top: 1px solid #e0e0e0;
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
  color: #333;
}
.history {
  max-height: 180px;
  border-bottom: 1px solid #e0e0e0;
}
.history-item {
  padding: 4px 6px;
  cursor: pointer;
  border-bottom: 1px dashed #e8e8e8;
}
.history-item:hover {
  background: #f5f5f5;
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
</style>
