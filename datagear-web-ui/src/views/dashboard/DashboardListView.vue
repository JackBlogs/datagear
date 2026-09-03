<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  dashboardPagingQueryData,
  deleteDashboards,
  type DashboardListItem,
} from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 看板管理列表页：按「能源暗域 Energy Dark」风格重写（功能 100% 保留，仅换 UI）。
// 旧版能力来源：dashboard_table.ftl / 原 PrimeVue DataTable 版 ——
// 搜索、增、导入、改、设计、查、分享（/authorization/Dashboard/{id}）、删、多选批量删、排序、分页。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（保留原有后端分页 + 关键字搜索能力） ----
const items = ref<DashboardListItem[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const selectedIds = ref<string[]>([])
const keyword = ref('')

// 排序：沿用原页默认值 createTime DESC；原页 sortable 列改为表头点击切换（▲/▼）。
const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'createTime', order: -1 }])

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({
    name: m.field,
    type: m.order === 1 ? 'ASC' : 'DESC',
  }))
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

const allChecked = computed(
  () => items.value.length > 0 && items.value.every((d) => selectedIds.value.includes(d.id)),
)

async function load() {
  loading.value = true
  try {
    const data = await dashboardPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(sortMeta.value),
    })
    items.value = data.items
    total.value = data.total
    selectedIds.value = []
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 0
  load()
}

function gotoPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  page.value = p - 1
  load()
}

function onPageSizeChange() {
  page.value = 0
  load()
}

function sortIcon(field: string) {
  const m = sortMeta.value.find((s) => s.field === field)
  if (!m) return ''
  return m.order === 1 ? '▲' : '▼'
}

function toggleSort(field: string) {
  const m = sortMeta.value.find((s) => s.field === field)
  sortMeta.value = [{ field, order: m ? (m.order === 1 ? -1 : 1) : 1 }]
  page.value = 0
  load()
}

// ---- 多选 ----
function toggleAll() {
  selectedIds.value = allChecked.value ? [] : items.value.map((d) => d.id)
}

function toggleRow(d: DashboardListItem) {
  const i = selectedIds.value.indexOf(d.id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(d.id)
}

// ---- 页头 / 行操作（路由与原页完全一致） ----
function onAdd() {
  router.push('/dashboard/add')
}

function onImport() {
  router.push('/dashboard/import')
}

function onEdit(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/edit`)
}

function onDesign(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/design`)
}

function onView(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/viewer`)
}

// 分享：原页即跳转授权路由（/authorization/Dashboard/{id}，对应 DashboardShareSet 的授权管理页），照原逻辑保留
function onShare(d: DashboardListItem) {
  router.push(`/authorization/Dashboard/${d.id}`)
}

async function deleteIds(ids: string[], confirmMsg: string) {
  if (!ids.length) return
  if (!window.confirm(confirmMsg)) return
  try {
    await deleteDashboards(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

function onDeleteOne(d: DashboardListItem) {
  deleteIds([d.id], t('dashboardPage.confirmDelete', { name: d.name }))
}

function onDeleteSelected() {
  deleteIds([...selectedIds.value], t('confirmDelSelectedAsk'))
}

// ---- 图标（24×24 stroke 风格，同 DtbsSourceListView 样板） ----
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  import:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/></svg>',
  board:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('dashboardPage.title') }}</div>
        <div class="page-desc">{{ t('dashboardPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="onImport">
          <span style="display:flex" v-html="ICONS.import"></span>{{ t('importDashboard') }}
        </button>
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('dashboardPage.newDashboard') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 + 已选操作条 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selectedIds.length" class="sel-bar">
        <span>{{ t('dashboardPage.selectedCount') }}<b class="cnt">{{ selectedIds.length }}</b></span>
        <button class="btn danger sm" type="button" @click="onDeleteSelected">
          {{ t('dashboardPage.batchDelete') }}
        </button>
        <span class="link muted" @click="selectedIds = []">{{ t('dashboardPage.clearSel') }}</span>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">
        {{ t('dashboardPage.totalCount', { n: total }) }}
      </span>
    </div>

    <!-- 看板表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px">
              <input type="checkbox" :checked="allChecked" @change="toggleAll" />
            </th>
            <th style="cursor:pointer" @click="toggleSort('name')">
              {{ t('name') }}<span v-if="sortIcon('name')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('name') }}</span>
            </th>
            <th style="cursor:pointer" @click="toggleSort('createUser.realName')">
              {{ t('createUser') }}<span v-if="sortIcon('createUser.realName')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('createUser.realName') }}</span>
            </th>
            <th style="cursor:pointer" @click="toggleSort('createTime')">
              {{ t('createTime') }}<span v-if="sortIcon('createTime')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('createTime') }}</span>
            </th>
            <th style="width:250px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="5"><div class="empty">{{ t('dashboardPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in items" :key="d.id">
            <td>
              <input
                type="checkbox"
                :checked="selectedIds.includes(d.id)"
                @change="toggleRow(d)"
              />
            </td>
            <td>
              <div class="flex" style="gap:10px">
                <span
                  style="width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--brand);background:var(--brand-soft)"
                  v-html="ICONS.board"
                ></span>
                <span class="cell-main ellipsis" style="max-width:260px" :title="d.name">{{ d.name }}</span>
                <span v-if="d.apiVersion" class="tag brand" style="flex:none">v{{ d.apiVersion }}</span>
              </div>
            </td>
            <td>{{ d.createUser?.realName || d.createUser?.name || '-' }}</td>
            <td class="sm tx-3">{{ d.createTime || '-' }}</td>
            <td>
              <span class="link" style="font-weight:700" @click="onDesign(d)">{{ t('design') }}</span> ·
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
              <span class="link" @click="onShare(d)">{{ t('share') }}</span> ·
              <span class="link danger" @click="onDeleteOne(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 简单分页条（含原页 rows-per-page 能力） -->
    <div class="pager">
      <span>{{ total === 0 ? 0 : page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
      <select
        class="select"
        style="width:auto;padding:4px 8px;font-size:12.5px"
        :value="pageSize"
        @change="pageSize = Number(($event.target as HTMLSelectElement).value); onPageSizeChange()"
      >
        <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}{{ t('dashboardPage.perPageSuffix') }}</option>
      </select>
      <button class="pg-btn" type="button" :disabled="page <= 0" @click="gotoPage(page)">‹</button>
      <button
        v-for="p in pageNumbers"
        :key="p"
        class="pg-btn"
        :class="{ cur: p === page + 1 }"
        type="button"
        @click="gotoPage(p)"
      >
        {{ p }}
      </button>
      <button class="pg-btn" type="button" :disabled="page + 1 >= pageCount" @click="gotoPage(page + 2)">›</button>
    </div>
  </div>
</template>
