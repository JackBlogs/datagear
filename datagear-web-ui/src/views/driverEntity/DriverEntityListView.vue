<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { listDriverEntities, deleteDriverEntities, type DriverEntity } from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据库驱动管理列表：按「能源暗域 Energy Dark」风格重写（参照 DtbsSourceListView.vue 样板）。
// 功能 100% 保留：list 全量加载 + 前端关键字过滤（名称/类名/数据库/显示文本/ID）、
// 新建/编辑/查看路由跳转、window.confirm 删除确认 + 成功/失败提示。原页无后端分页，故不加 .pager。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const items = ref<DriverEntity[]>([])
const loading = ref(false)
const keyword = ref('')
const { success, fail } = useOperationMessage()

// 关键字过滤：保持原有前端过滤语义（后端无 pagingQueryData 端点，仅 /api/driverEntity/list）
const filteredItems = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return items.value
  return items.value.filter((d) =>
    [d.displayName, d.driverClassName, d.databaseName, d.displayText, d.id]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(k)),
  )
})

async function load() {
  loading.value = true
  try {
    items.value = await listDriverEntities()
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

function editRow(id: string) {
  router.push(`/driverEntity/${id}/edit`)
}

function onView(id: string) {
  router.push(`/driverEntity/${id}/view`)
}

async function removeRow(d: DriverEntity) {
  if (!window.confirm(t('confirmDeleteDriverAsk', { name: d.displayName ?? d.id }))) return
  try {
    await deleteDriverEntities([d.id])
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

/** 驱动名称首字母图标块：取数据库名/显示名/ID 的首字符（ASCII 转大写） */
function avatarLetter(d: DriverEntity) {
  const ch = (d.databaseName || d.displayName || d.id || '?').trim().charAt(0)
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch
}

/** 版本列主文本：支持的数据库版本列表 */
function versionsText(d: DriverEntity) {
  return d.databaseVersions && d.databaseVersions.length ? d.databaseVersions.join(' / ') : '-'
}

// 图标（取自样板 DtbsSourceListView.vue 的 ICONS，24×24 stroke 风格）
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('driverPage.title') }}</div>
        <div class="page-desc">{{ t('driverPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="router.push('/driverEntity/add')">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('newDriver') }}
        </button>
      </div>
    </div>

    <!-- 搜索条（前端实时过滤，与原版一致；提交按钮仅保持骨架一致，无额外请求） -->
    <div class="flex mb-2" style="gap:10px">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent>
        <input v-model="keyword" class="input" :placeholder="t('driver.searchPlaceholder')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('driverPage.total', { n: filteredItems.length }) }}</span>
    </div>

    <!-- 驱动表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>{{ t('driverName') }}</th>
            <th>{{ t('displayName') }}</th>
            <th>{{ t('version') }}</th>
            <th>{{ t('driverClassName') }}</th>
            <th style="width:170px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!filteredItems.length">
            <td colspan="5"><div class="empty">{{ t('driverPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in filteredItems" :key="d.id">
            <td>
              <div class="flex" style="gap:10px">
                <span
                  style="width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--brand-grad);color:#241105;font-weight:700;font-size:13px;font-family:var(--font-num)"
                >{{ avatarLetter(d) }}</span>
                <span class="flex-col" style="gap:0;min-width:0">
                  <span class="cell-main ellipsis" style="max-width:200px" :title="d.databaseName || d.displayName || d.id">
                    {{ d.databaseName || d.displayName || d.id }}
                  </span>
                  <span class="sm tx-3 ellipsis" style="max-width:200px;font-family:var(--font-mono)" :title="d.id">{{ d.id }}</span>
                </span>
              </div>
            </td>
            <td>
              <div class="flex-col" style="gap:0;min-width:0">
                <span class="ellipsis" style="max-width:220px" :title="d.displayName">{{ d.displayName || '-' }}</span>
                <span v-if="d.displayDesc" class="sm tx-3 ellipsis" style="max-width:220px" :title="d.displayDesc">{{ d.displayDesc }}</span>
              </div>
            </td>
            <td>
              <span class="num">{{ versionsText(d) }}</span>
              <span v-if="d.jreVersion" class="sm tx-3" style="margin-left:6px">JRE {{ d.jreVersion }}</span>
            </td>
            <td class="sm" style="font-family:var(--font-mono)">
              <span class="ellipsis" style="max-width:280px;display:inline-block;vertical-align:bottom" :title="d.driverClassName">
                {{ d.driverClassName || '-' }}
              </span>
            </td>
            <td>
              <span class="link" @click="editRow(d.id)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(d.id)">{{ t('view') }}</span> ·
              <span class="link danger" @click="removeRow(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
