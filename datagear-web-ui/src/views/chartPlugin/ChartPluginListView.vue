<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listChartPlugins,
  deleteChartPlugins,
  uploadChartPluginFile,
  saveChartPluginUpload,
  type ChartPluginItem,
} from '@/api/chartPlugin'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 图表插件管理：列表 + 上传 + 删除。
const items = ref<ChartPluginItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const { success, fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    items.value = await listChartPlugins()
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

async function removeRow(p: ChartPluginItem) {
  if (!window.confirm(`确认删除插件「${p.name}」？`)) return
  try {
    await deleteChartPlugins([p.id])
    success('删除成功')
    load()
  } catch (e) {
    fail((e as Error).message || '删除失败')
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
    success('上传成功')
    load()
  } catch (err) {
    fail((err as Error).message || '上传失败')
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
        {{ uploading ? '上传中…' : '上传插件' }}
        <input type="file" accept=".zip" class="hidden" :disabled="uploading" @change="onFileChange" />
      </label>
    </div>
    <DataTable :value="items" :loading="loading" data-key="id">
      <Column field="id" header="ID" />
      <Column field="name" header="名称" />
      <Column header="操作">
        <template #body="slotProps">
          <Button label="删除" size="small" text severity="danger" @click="removeRow(slotProps.data)" />
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
