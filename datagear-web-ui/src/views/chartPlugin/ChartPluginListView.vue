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

// 图表插件管理：按「能源暗域 Energy Dark」风格重写（样板 DtbsSourceListView.vue）。
// 功能 100% 保留：列表加载 + zip 上传（原生 input type=file，选择后立即上传）+ 查看 + 删除。
// 原页无过滤/分页，故不加搜索条与 .pager；列表接口一次返回全量。
import '@/styles/datasource-page.css'

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

// ---- 图标（24×24 stroke 风格，同样板 ICONS 写法） ----
const ICONS = {
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
  puzzle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3H7a1 1 0 0 0-1 1v2.5a1.5 1.5 0 0 1 0 3V16a1 1 0 0 0 1 1h3v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3h3a1 1 0 0 0 1-1v-2.5a1.5 1.5 0 0 1 0-3V8a1 1 0 0 0-1-1h-3Z"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('pluginPage.title') }}</div>
        <div class="page-desc">{{ t('pluginPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <label class="btn primary file-pick" :style="uploading ? 'opacity:.6;pointer-events:none' : ''">
          <span style="display:inline-flex" v-html="ICONS.upload"></span>
          {{ uploading ? t('uploading') : t('uploadPlugin') }}
          <input type="file" accept=".zip" :disabled="uploading" @change="onFileChange" />
        </label>
      </div>
    </div>

    <!-- 计数条（原页无过滤，保留全量加载逻辑） -->
    <div class="flex mb-2">
      <span class="tx-3 sm" style="margin-left:auto">{{ t('pluginPage.total', { n: items.length }) }}</span>
    </div>

    <!-- 插件表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>{{ t('id') }}</th>
            <th>{{ t('name') }}</th>
            <th style="width:160px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="3" class="tx-3" style="text-align:center">{{ t('loading') }}</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="3">
              <div class="empty">
                <span style="display:inline-flex;width:26px;height:26px" v-html="ICONS.puzzle"></span>
                {{ t('pluginPage.empty') }}
              </div>
            </td>
          </tr>
          <tr v-for="p in items" :key="p.id">
            <td class="sm ellipsis" style="font-family:var(--font-mono);max-width:280px" :title="p.id">{{ p.id }}</td>
            <td><span class="cell-main ellipsis" style="max-width:320px" :title="p.name">{{ p.name }}</span></td>
            <td>
              <span class="link" @click="onView(p)">{{ t('view') }}</span> ·
              <span class="link danger" @click="removeRow(p)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
