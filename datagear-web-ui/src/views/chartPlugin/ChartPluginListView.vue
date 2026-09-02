<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  listChartPlugins,
  deleteChartPlugins,
  uploadChartPluginFile,
  saveChartPluginUpload,
  type ChartPluginItem,
} from '@/api/chartPlugin'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 图表插件管理：列表 + 上传 + 删除。
const router = useRouter()
const { t } = useI18n()
const items = ref<ChartPluginItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const { success, fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    items.value = await listChartPlugins()
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

function onView(p: ChartPluginItem) {
  router.push({ path: `/chartPlugin/${p.id}/view`, query: { mode: 'view' } })
}

async function removeRow(p: ChartPluginItem) {
  if (!window.confirm(t('confirmDeletePluginAsk', { name: p.name }))) return
  try {
    await deleteChartPlugins([p.id])
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const { pluginFileName } = await uploadChartPluginFile(file)
    await saveChartPluginUpload(pluginFileName)
    success(t('uploadSuccess'))
    load()
  } catch (err) {
    fail((err as Error).message || t('uploadFail'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">图表插件管理</h3>
      <label class="upload-btn">
        {{ uploading ? t('uploading') : t('uploadPlugin') }}
        <input type="file" accept=".zip" class="hidden" :disabled="uploading" @change="onFileChange" />
      </label>
    </div>
    <DataTable :value="items" :loading="loading" data-key="id">
      <Column field="id" :header="t('id')" />
      <Column field="name" :header="t('name')" />
      <Column :header="t('operation')">
        <template #body="slotProps">
          <Button :label="t('view')" size="small" text @click="onView(slotProps.data)" />
          <Button :label="t('delete')" size="small" text severity="danger" @click="removeRow(slotProps.data)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.upload-btn {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
}
.upload-btn:hover {
  border-color: #6366f1;
}
.hidden {
  display: none;
}
</style>
