<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getAllTableNames,
  doExport,
  pollExportMessages,
  downloadAllUrl,
  newId,
  type ExportType,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据导出向导，按原 dtbsSourceExchange/export.ftl 复刻核心结构。
const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string
const { t } = useI18n()

const tables = ref<string[]>([])
const selected = ref<string[]>([])
const format = ref<ExportType>('csv')
const fileEncoding = ref('UTF-8')
const exporting = ref(false)
const messages = ref<unknown[]>([])
const dataExchangeId = ref('')
const { fail } = useOperationMessage()

const extMap: Record<ExportType, string> = { csv: 'csv', excel: 'xlsx', sql: 'sql', json: 'json' }
const formatOptions = [
  { name: 'CSV', value: 'csv' },
  { name: 'Excel', value: 'excel' },
  { name: 'SQL', value: 'sql' },
  { name: 'JSON', value: 'json' },
]
const downloadUrl = computed(() =>
  dataExchangeId.value ? downloadAllUrl(dtbsSourceId, dataExchangeId.value, 'export.zip') : '',
)

async function loadTables() {
  try {
    tables.value = await getAllTableNames(dtbsSourceId)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  }
}

function toggleTable(t: string) {
  selected.value = selected.value.includes(t)
    ? selected.value.filter((x) => x !== t)
    : [...selected.value, t]
}

async function run() {
  if (!selected.value.length) {
    fail(t('pleaseSelectTable'))
    return
  }
  exporting.value = true
  messages.value = []
  const id = newId()
  dataExchangeId.value = id
  try {
    const form = {
      dataExchangeId: id,
      fileEncoding: fileEncoding.value,
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
    fail((e as Error).message || t('exportFail'))
  } finally {
    exporting.value = false
  }
}

onMounted(loadTables)
</script>

<template>
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('dataExportWizard') }}</h3>
    </div>
    <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('exportFormat') }}</label>
        <div class="field-input col-12 md:col-9">
          <SelectButton v-model="format" :options="formatOptions" option-label="name" option-value="value" class="input" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileEncoding') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText v-model="fileEncoding" class="input w-full" maxlength="20" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('selectTable') }}</label>
        <div class="field-input col-12 md:col-9">
          <div v-if="tables.length === 0" class="text-color-secondary">{{ t('noTable') }}</div>
          <div v-else class="table-list p-2">
            <label v-for="t in tables" :key="t" class="table-item flex align-items-center gap-2">
              <Checkbox :model-value="selected.includes(t)" :binary="true" @update:model-value="toggleTable(t)" />
              <span>{{ t }}</span>
            </label>
          </div>
        </div>
      </div>
      <div v-if="messages.length" class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('exportLog') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="messages p-2">
            <div v-for="(m, i) in messages" :key="i" class="message">{{ m }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
      <Button :label="t('export')" :loading="exporting" @click="run" />
      <a v-if="downloadUrl" :href="downloadUrl" class="download-link p-button p-button-secondary" target="_blank">{{ t('downloadZip') }}</a>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
.table-list {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
}
.table-item {
  cursor: pointer;
  padding: 3px 0;
}
.download-link {
  text-decoration: none;
}
.messages {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-section);
}
.message {
  padding: 3px 6px;
  background: var(--surface-card);
  border-radius: 4px;
  margin: 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
