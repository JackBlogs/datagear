<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  analysisProjectPagingQueryData,
  deleteAnalysisProjects,
  type AnalysisProject,
} from '@/api/analysisProject'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 分析项目列表页：按「能源暗域 Energy Dark」风格重写（样板 DtbsSourceListView.vue）。
// 功能 100% 保留自旧 PrimeVue 版：关键字搜索（名称/描述）、后端分页（10/20/50 条/页）、
// 服务端排序（原 sort-mode="multiple" 改为表头点击单列升降序，orders 语义不变）、
// 多选 + 批量删除、增/改/查/删操作（路由与旧版一致）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（后端分页 + 关键字搜索） ----
const items = ref<AnalysisProject[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0) // 0-based，与后端 page 参数一致
const pageSize = ref(10)
const keyword = ref('')
const selectedIds = ref<string[]>([])

// ---- 排序：原页默认 [{ field: 'createTime', order: -1 }]；表头点击切换单列 ASC/DESC ----
const sortField = ref('createTime')
const sortType = ref<'ASC' | 'DESC'>('DESC')

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

function toOrders(): Order[] {
  return [{ name: sortField.value, type: sortType.value }]
}

async function load() {
  loading.value = true
  try {
    const data = await analysisProjectPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(),
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

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortType.value = sortType.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortField.value = field
    sortType.value = 'ASC'
  }
  page.value = 0
  load()
}

// ---- 多选 ----
function toggleSel(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

function toggleAll() {
  if (allChecked.value) {
    const pageIds = new Set(items.value.map((d) => d.id))
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
  } else {
    const merged = new Set([...selectedIds.value, ...items.value.map((d) => d.id)])
    selectedIds.value = [...merged]
  }
}

function clearSel() {
  selectedIds.value = []
}

// ---- 行操作（路由与旧版一致） ----
function onAdd() {
  router.push('/analysisProject/add')
}

function onEdit(d: AnalysisProject) {
  router.push(`/analysisProject/${d.id}/edit`)
}

function onView(d: AnalysisProject) {
  router.push({ path: `/analysisProject/${d.id}/view`, query: { mode: 'view' } })
}

async function deleteIds(ids: string[]) {
  try {
    await deleteAnalysisProjects(ids)
    success(t('deleteSuccess'))
    // 当前页删空且非第一页时回退一页，避免空页
    if (items.value.length === ids.length && page.value > 0) page.value -= 1
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function onDelete(d: AnalysisProject) {
  if (!window.confirm(t('analysisProjectPage.confirmDelete', { name: d.name }))) return
  await deleteIds([d.id])
}

async function onDeleteSelected() {
  if (!selectedIds.value.length) return
  if (!window.confirm(t('confirmDelSelectedAsk'))) return
  await deleteIds([...selectedIds.value])
}

// ---- 图标（24×24 stroke 风格，与样板一致） ----
const ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  layers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"/><path d="m3 12.5 9 4.5 9-4.5"/><path d="m3 17 9 4.5 9-4.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('analysisProjectPage.title') }}</div>
        <div class="page-desc">{{ t('analysisProjectPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('analysisProjectPage.newProject') }}
        </button>
      </div>
    </div>

    <!-- 统计卡 -->
    <section class="stat-grid mb-3">
      <div class="stat-card">
        <div class="s-label">
          <span style="display:inline-flex" v-html="ICONS.folder"></span>{{ t('analysisProjectPage.statTotal') }}
        </div>
        <div class="s-value">{{ total }}</div>
        <div class="s-foot">{{ t('analysisProjectPage.statTotalFoot') }}</div>
      </div>
      <div class="stat-card" style="--sc-glow: rgba(34,211,238,.12)">
        <div class="s-label">
          <span style="display:inline-flex" v-html="ICONS.layers"></span>{{ t('analysisProjectPage.statPage') }}
        </div>
        <div class="s-value">{{ items.length }}</div>
        <div class="s-foot">{{ t('analysisProjectPage.statPageFoot', { cur: page + 1, count: pageCount }) }}</div>
      </div>
    </section>

    <!-- 搜索条 + 已选操作条 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByNameOrDesc')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selectedIds.length" class="sel-bar">
        <span>
          {{ t('analysisProjectPage.selInfo') }} <span class="cnt">{{ selectedIds.length }}</span>
          {{ t('analysisProjectPage.selUnit') }}
        </span>
        <span class="link muted" @click="clearSel">{{ t('analysisProjectPage.cancelSel') }}</span>
        <button class="btn danger sm" type="button" @click="onDeleteSelected">
          {{ t('analysisProjectPage.batchDelete') }}
        </button>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">
        {{ t('analysisProjectPage.totalInfo', { n: total }) }}
      </span>
    </div>

    <!-- 项目表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:40px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('name')">
              {{ t('name') }}
              <span v-if="sortField === 'name'" style="font-size:10px">{{ sortType === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('description')">
              {{ t('description') }}
              <span v-if="sortField === 'description'" style="font-size:10px">{{ sortType === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('createTime')">
              {{ t('createTime') }}
              <span v-if="sortField === 'createTime'" style="font-size:10px">{{ sortType === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th style="width:170px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="tx-3" style="text-align:center">{{ t('loading') }}</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="5"><div class="empty">{{ t('analysisProjectPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in items" :key="d.id">
            <td><input type="checkbox" :checked="selectedIds.includes(d.id)" @change="toggleSel(d.id)" /></td>
            <td>
              <span class="cell-main ellipsis" style="max-width:260px;display:inline-block" :title="d.name">
                {{ d.name }}
              </span>
            </td>
            <td class="sm">
              <span class="ellipsis" style="max-width:340px;display:inline-block" :title="d.description">
                {{ d.description || '-' }}
              </span>
            </td>
            <td class="sm tx-3" style="white-space:nowrap">{{ d.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
              <span class="link danger" @click="onDelete(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页条 -->
    <div class="pager">
      <select
        v-model.number="pageSize"
        class="select"
        style="width:auto;padding:4px 8px;font-size:12.5px"
        @change="onPageSizeChange"
      >
        <option :value="10">10 {{ t('analysisProjectPage.perPage') }}</option>
        <option :value="20">20 {{ t('analysisProjectPage.perPage') }}</option>
        <option :value="50">50 {{ t('analysisProjectPage.perPage') }}</option>
      </select>
      <span>
        {{
          t('analysisProjectPage.pagerInfo', {
            from: total ? page * pageSize + 1 : 0,
            to: Math.min(total, (page + 1) * pageSize),
            total,
          })
        }}
      </span>
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
