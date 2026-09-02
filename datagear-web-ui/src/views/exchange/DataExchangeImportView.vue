<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  uploadImportFile,
  doImport,
  pollExportMessages,
  newId,
  type ImportType,
  type DataImportFileInfo,
} from '@/api/dataExchange'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据导入向导，按原 dtbsSourceExchange/import_*.ftl 复刻核心结构。
const route = useRoute()
const dtbsSourceId = route.params.dtbsSourceId as string
const { t } = useI18n()

const type = ref<ImportType>('csv')
const tableName = ref('')
const fileEncoding = ref('UTF-8')
const file = ref<File | null>(null)
const fileInfos = ref<DataImportFileInfo[]>([])
const importing = ref(false)
const messages = ref<unknown[]>([])
const { fail } = useOperationMessage()

const typeOptions = [
  { name: 'CSV', value: 'csv' },
  { name: 'Excel', value: 'excel' },
  { name: 'JSON', value: 'json' },
  { name: 'SQL', value: 'sql' },
]

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  fileInfos.value = []
}

async function upload() {
  if (!file.value) {
    fail(t('pleaseSelectFile'))
    return
  }
  try {
    fileInfos.value = await uploadImportFile(dtbsSourceId, type.value, newId(), file.value)
  } catch (e) {
    fail((e as Error).message || t('uploadFail'))
  }
}

async function run() {
  if (!fileInfos.value.length) {
    fail(t('pleaseUploadFile'))
    return
  }
  if (!tableName.value) {
    fail(t('pleaseFillTableName'))
    return
  }
  importing.value = true
  messages.value = []
  const id = newId()
  try {
    const form = {
      dataExchangeId: id,
      fileEncoding: fileEncoding.value,
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
    fail((e as Error).message || t('importFail'))
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="page page-form h-full p-1">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">{{ t('dataImportWizard') }}</h3>
    </div>
    <div class="page-form-content flex-grow-1 px-2 py-1 overflow-y-auto">
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('importFormat') }}</label>
        <div class="field-input col-12 md:col-9">
          <SelectButton v-model="type" :options="typeOptions" option-label="name" option-value="value" class="input" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('fileEncoding') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText v-model="fileEncoding" class="input w-full" maxlength="20" />
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('uploadFile') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="flex align-items-center gap-2">
            <input type="file" @change="onFileChange" />
            <Button :label="t('upload')" size="small" @click="upload" />
          </div>
          <div v-if="fileInfos.length" class="mt-2">
            <div class="text-color-secondary">{{ t('uploadedFiles') }}：</div>
            <div v-for="(f, i) in fileInfos" :key="i" class="file-info">{{ f.name ?? f.fileName }}</div>
          </div>
        </div>
      </div>
      <div class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('targetTableName') }}</label>
        <div class="field-input col-12 md:col-9">
          <InputText v-model="tableName" class="input w-full" maxlength="200" :placeholder="t('importToTable')" />
        </div>
      </div>
      <div v-if="messages.length" class="field grid">
        <label class="field-label col-12 mb-2 md:col-3 md:mb-0">{{ t('importLog') }}</label>
        <div class="field-input col-12 md:col-9">
          <div class="messages p-2">
            <div v-for="(m, i) in messages" :key="i" class="message">{{ m }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-form-foot flex-grow-0 flex justify-content-center gap-2 pt-2">
      <Button :label="t('import')" :loading="importing" @click="run" />
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
.file-info {
  padding: 2px 0;
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
