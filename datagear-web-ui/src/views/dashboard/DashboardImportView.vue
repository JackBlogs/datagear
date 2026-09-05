<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { uploadDashboardImportFile, saveDashboardImport } from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

// 看板导入（能源暗域）：上传 zip → 填名称 → 保存。
const router = useRouter()
const { t } = useI18n()
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
    fail((err as Error).message || t('uploadFail'))
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function save() {
  if (!dashboardFileName.value || !templates.value.length) {
    fail(t('pleaseUploadDashboard'))
    return
  }
  if (!name.value) {
    fail(t('pleaseFillName'))
    return
  }
  saving.value = true
  try {
    await saveDashboardImport({
      name: name.value,
      template: templates.value.join(','),
      dashboardFileName: dashboardFileName.value,
    })
    success(t('importSuccess'))
    router.push('/dashboard')
  } catch (e) {
    fail((e as Error).message || t('importFail'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('importDashboard') }} <span class="tag brand">zip</span></div>
        <div class="page-desc">上传看板压缩包，导入为可编辑副本</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/dashboard')">{{ t('back') }}</button>
      </div>
    </div>

    <div class="card form-card">
      <div class="card-title"><i class="bar"></i>导入看板</div>
      <div class="form-item">
        <label class="form-label">{{ t('file') }}</label>
        <label class="upload-btn">
          {{ uploading ? t('uploading') : t('selectZipFile') }}
          <input type="file" accept=".zip" class="hidden" :disabled="uploading" @change="onFileChange" />
        </label>
      </div>
      <div v-if="templates.length" class="form-item">
        <label class="form-label">{{ t('parsedTemplates') }}</label>
        <div class="tpl-tags">
          <span v-for="tpl in templates" :key="tpl" class="tag info">{{ tpl }}</span>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">{{ t('name') }}</label>
        <input v-model="name" type="text" class="input" :placeholder="t('dashboardName')" maxlength="100" />
      </div>
      <div class="flex" style="margin-top: 16px">
        <button class="btn primary" type="button" :disabled="saving" @click="save">
          {{ saving ? '导入中…' : t('import') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card { padding: 16px 18px; max-width: 640px; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.upload-btn {
  display: inline-block; border: 1px dashed var(--line-2); border-radius: 10px;
  padding: 10px 18px; cursor: pointer; font-size: 13px; color: var(--tx-2);
  background: var(--bg-glass); transition: border-color 0.15s;
}
.upload-btn:hover { border-color: var(--brand-line); color: var(--brand); }
.hidden { display: none; }
.tpl-tags { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
