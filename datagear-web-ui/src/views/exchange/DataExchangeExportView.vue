<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getAllTableNames,
  doExport,
  pollExportMessages,
  downloadAllUrl,
  newId,
  type ExportType,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 5a 数据交换导出向导（Vue 重写）：选表 → 选格式 → 导出 → 轮询进度 → 下载 ZIP。
const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string

const tables = ref<string[]>([])
const selected = ref<string[]>([])
const format = ref<ExportType>('csv')
const exporting = ref(false)
const messages = ref<unknown[]>([])
const dataExchangeId = ref('')
const { fail } = useOperationMessage()

const extMap: Record<ExportType, string> = { csv: 'csv', excel: 'xlsx', sql: 'sql', json: 'json' }
const downloadUrl = computed(() =>
  dataExchangeId.value ? downloadAllUrl(dtbsSourceId, dataExchangeId.value, 'export.zip') : '',
)

async function loadTables() {
  try {
    tables.value = await getAllTableNames(dtbsSourceId)
  } catch (e) {
    fail((e as Error).message || '加载表失败')
  }
}

function toggleTable(t: string) {
  selected.value = selected.value.includes(t)
    ? selected.value.filter((x) => x !== t)
    : [...selected.value, t]
}

async function run() {
  if (!selected.value.length) {
    fail('请先选择要导出的表')
    return
  }
  exporting.value = true
  messages.value = []
  const id = newId()
  dataExchangeId.value = id
  try {
    const form = {
      dataExchangeId: id,
      fileEncoding: 'UTF-8',
      subDataExchanges: selected.value.map((t) => ({
        id: newId(),
        fileName: `${t}.${extMap[format.value]}`,
        query: `SELECT * FROM ${t}`,
      })),
      dataFormat: {},
      exportOption: {},
    }
    await doExport(dtbsSourceId, format.value, form)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      messages.value = await pollExportMessages(dtbsSourceId, id, 50)
      if (messages.value.some((m) => (m as { type?: string }).type === 'FinishMessage')) break
    }
  } catch (e) {
    fail((e as Error).message || '导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(loadTables)
</script>

<template>
  <div class="p-4">
    <h3>数据导出向导（5a Vue 重写）</h3>
    <div class="flex align-items-center gap-2 mb-2">
      <label>格式</label>
      <select v-model="format">
        <option value="csv">CSV</option>
        <option value="excel">Excel</option>
        <option value="sql">SQL</option>
        <option value="json">JSON</option>
      </select>
      <Button label="导出" :loading="exporting" @click="run" />
      <a v-if="downloadUrl" :href="downloadUrl" class="download-link">下载 ZIP</a>
    </div>

    <div v-if="tables.length === 0" class="text-color-secondary">暂无表</div>
    <div v-else class="table-list">
      <label v-for="t in tables" :key="t" class="table-item flex align-items-center gap-1">
        <Checkbox :model-value="selected.includes(t)" :binary="true" @update:model-value="toggleTable(t)" />
        {{ t }}
      </label>
    </div>

    <div v-if="messages.length" class="messages mt-2">
      <div v-for="(m, i) in messages" :key="i" class="message">{{ m }}</div>
    </div>
  </div>
</template>

<style scoped>
.table-list {
  max-height: 320px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
}
.table-item {
  cursor: pointer;
  padding: 3px 0;
}
.download-link {
  color: #6366f1;
}
.messages {
  border-top: 1px solid #e0e0e0;
}
.message {
  padding: 3px 6px;
  background: #f7f7f7;
  border-radius: 4px;
  margin: 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
