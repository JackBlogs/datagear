<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  uploadImportFile,
  doImport,
  pollExportMessages,
  newId,
  type ImportType,
  type DataImportFileInfo,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 5a 数据交换导入向导（Vue 重写第一步）：上传文件 → 表名 → 导入 → 轮询进度。
// TODO: 列映射（useImportKeys，importKeys 工具）；子任务启停。
const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string

const type = ref<ImportType>('csv')
const tableName = ref('')
const file = ref<File | null>(null)
const fileInfos = ref<DataImportFileInfo[]>([])
const importing = ref(false)
const messages = ref<unknown[]>([])
const { fail } = useOperationMessage()

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  fileInfos.value = []
}

async function upload() {
  if (!file.value) {
    fail('请先选择文件')
    return
  }
  try {
    fileInfos.value = await uploadImportFile(dtbsSourceId, type.value, newId(), file.value)
  } catch (e) {
    fail((e as Error).message || '上传失败')
  }
}

async function run() {
  if (!fileInfos.value.length) {
    fail('请先上传文件')
    return
  }
  if (!tableName.value) {
    fail('请填写目标表名')
    return
  }
  importing.value = true
  messages.value = []
  const id = newId()
  try {
    const form = {
      dataExchangeId: id,
      fileEncoding: 'UTF-8',
      subDataExchanges: fileInfos.value.map((f) => ({
        id: newId(),
        fileName: f.name ?? f.fileName ?? '',
        tableName: tableName.value,
      })),
      dataFormat: {},
      importOption: {},
    }
    await doImport(dtbsSourceId, type.value, form)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500))
      messages.value = await pollExportMessages(dtbsSourceId, id, 50)
      if (messages.value.some((m) => (m as { type?: string }).type === 'FinishMessage')) break
    }
  } catch (e) {
    fail((e as Error).message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <h3>数据导入向导（5a Vue 重写）</h3>
    <div class="flex align-items-center gap-2 mb-2">
      <label>格式</label>
      <select v-model="type">
        <option value="csv">CSV</option>
        <option value="excel">Excel</option>
        <option value="json">JSON</option>
        <option value="sql">SQL</option>
      </select>
    </div>
    <div class="flex align-items-center gap-2 mb-2">
      <input type="file" @change="onFileChange" />
      <Button label="上传" text @click="upload" />
    </div>
    <div v-if="fileInfos.length" class="mb-2">
      <div class="text-color-secondary">已上传文件：</div>
      <div v-for="(f, i) in fileInfos" :key="i" class="file-info">{{ f.name ?? f.fileName }}</div>
    </div>
    <div class="flex align-items-center gap-2 mb-2">
      <label>目标表名</label>
      <input v-model="tableName" class="input" placeholder="导入到表" />
      <Button label="导入" :loading="importing" @click="run" />
    </div>
    <div v-if="messages.length" class="messages">
      <div v-for="(m, i) in messages" :key="i" class="message">{{ m }}</div>
    </div>
  </div>
</template>

<style scoped>
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 6px;
}
.file-info {
  padding: 2px 0;
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
