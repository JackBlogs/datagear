<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadDashboardImportFile, saveDashboardImport } from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 看板导入：上传 zip → 填名称 → 保存。
const router = useRouter()
const { success, fail } = useOperationMessage()

const name = ref('')
const dashboardFileName = ref('')
const templates = ref<string[]>([])
const uploading = ref(false)
const saving = ref(false)

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const r = await uploadDashboardImportFile(file)
    dashboardFileName.value = r.dashboardFileName
    templates.value = r.templates ?? []
    if (!name.value) name.value = r.dashboardName ?? ''
  } catch (err) {
    fail((err as Error).message || '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function save() {
  if (!dashboardFileName.value || !templates.value.length) {
    fail('请先上传看板文件')
    return
  }
  if (!name.value) {
    fail('请填写名称')
    return
  }
  saving.value = true
  try {
    await saveDashboardImport({
      name: name.value,
      template: templates.value.join(','),
      dashboardFileName: dashboardFileName.value,
    })
    success('导入成功')
    router.push('/dashboard')
  } catch (e) {
    fail((e as Error).message || '导入失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">导入看板</h3>
      <Button label="返回" text @click="router.push('/dashboard')" />
    </div>
    <div class="form flex flex-column gap-3">
      <div class="flex align-items-center gap-2">
        <label class="label">文件</label>
        <label class="upload-btn">
          {{ uploading ? '上传中…' : '选择 zip 文件' }}
          <input type="file" accept=".zip" class="hidden" :disabled="uploading" @change="onFileChange" />
        </label>
      </div>
      <div v-if="templates.length" class="templates">
        已解析模板：{{ templates.join(', ') }}
      </div>
      <div class="flex align-items-center gap-2">
        <label class="label">名称</label>
        <input v-model="name" class="input flex-1" placeholder="看板名称" />
      </div>
      <div class="flex gap-2">
        <Button label="导入" :loading="saving" @click="save" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 56px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
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
.templates {
  color: #888;
  font-size: 12px;
}
</style>
