<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { rolePagingQueryData, deleteRoles, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 角色管理列表页：「能源暗域 Energy Dark」改造（原生 HTML + datasource-page.css）。
// 功能对照原 PrimeVue 版 100% 保留：关键字搜索、增/改/查/删、多选 + 批量删除、
// 后端分页（页码窗口 ±2、每页条数 10/20/50）、表头点击后端排序（id/name/enabled/description，沿用 toOrders）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（后端分页 + 关键字搜索 + 后端排序） ----
const items = ref<Role[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const selected = ref<Role[]>([])
const keyword = ref('')
// 排序元数据与原页 sortMeta 同构（field/order），PrimeVue 多列排序改为表头点击单列切换
const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'name', order: 1 }])

const headerCheck = ref<HTMLInputElement | null>(null)

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

const allSelected = computed(() => items.value.length > 0 && selected.value.length === items.value.length)

// 表头全选框的半选状态（indeterminate 只能以 DOM 属性设置）
watchEffect(() => {
  if (headerCheck.value) headerCheck.value.indeterminate = selected.value.length > 0 && !allSelected.value
})

async function load() {
  loading.value = true
  try {
    const data = await rolePagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(sortMeta.value),
    })
    items.value = data.items
    total.value = data.total
    selected.value = []
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

// ---- 表头点击排序：同列 ASC/DESC 切换，异列切为 ASC（沿用原 toOrders 逻辑） ----
function toggleSort(field: string) {
  const cur = sortMeta.value.find((m) => m.field === field)
  if (!cur) sortMeta.value = [{ field, order: 1 }]
  else sortMeta.value = [{ field, order: cur.order === 1 ? -1 : 1 }]
  page.value = 0
  load()
}

function sortArrow(field: string): string {
  const cur = sortMeta.value.find((m) => m.field === field)
  return cur ? (cur.order === 1 ? '▲' : '▼') : ''
}

// ---- 多选 ----
function isSelected(r: Role): boolean {
  return selected.value.some((s) => s.id === r.id)
}

function toggleRow(r: Role) {
  if (isSelected(r)) selected.value = selected.value.filter((s) => s.id !== r.id)
  else selected.value = [...selected.value, r]
}

function toggleAll() {
  selected.value = allSelected.value ? [] : [...items.value]
}

// ---- 行操作 ----
function onAdd() {
  router.push('/role/add')
}

function onEdit(r: Role) {
  router.push(`/role/${r.id}/edit`)
}

function onView(r: Role) {
  router.push({ path: `/role/${r.id}/view`, query: { mode: 'view' } })
}

async function onDeleteRow(r: Role) {
  if (!window.confirm(t('rolePage.confirmDelete', { name: r.name }))) return
  await doDelete([r.id])
}

async function onDeleteSelected() {
  const ids = selected.value.map((i) => i.id)
  if (!ids.length) return
  if (!window.confirm(t('confirmDelSelectedAsk'))) return
  await doDelete(ids)
}

async function doDelete(ids: string[]) {
  try {
    await deleteRoles(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

/** 角色名首字头像（空名兜底 ?） */
function nameAvatar(name: string | undefined): string {
  return (name || '?').trim().charAt(0).toUpperCase() || '?'
}

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
        <div class="page-title">{{ t('rolePage.title') }}</div>
        <div class="page-desc">{{ t('rolePage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:inline-flex" v-html="ICONS.plus"></span>{{ t('rolePage.newRole') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 + 已选操作条 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByNameOrDesc')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selected.length" class="sel-bar">
        <span>{{ t('rolePage.selectedPrefix') }} <span class="cnt">{{ selected.length }}</span> {{ t('rolePage.selectedSuffix') }}</span>
        <button class="btn danger sm" type="button" @click="onDeleteSelected">{{ t('delete') }}</button>
        <button class="btn ghost sm" type="button" @click="selected = []">{{ t('cancel') }}</button>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('rolePage.total', { n: total }) }}</span>
    </div>

    <!-- 角色表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px">
              <input ref="headerCheck" type="checkbox" :checked="allSelected" @change="toggleAll" />
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('name')">
              {{ t('rolePage.colName') }}<span style="font-size:9px;margin-left:3px">{{ sortArrow('name') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('id')">
              {{ t('id') }}<span style="font-size:9px;margin-left:3px">{{ sortArrow('id') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('enabled')">
              {{ t('rolePage.colStatus') }}<span style="font-size:9px;margin-left:3px">{{ sortArrow('enabled') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('description')">
              {{ t('description') }}<span style="font-size:9px;margin-left:3px">{{ sortArrow('description') }}</span>
            </th>
            <th style="width:170px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="6"><div class="empty">{{ t('rolePage.empty') }}</div></td>
          </tr>
          <tr v-for="r in items" :key="r.id">
            <td><input type="checkbox" :checked="isSelected(r)" @change="toggleRow(r)" /></td>
            <td>
              <div class="flex" style="gap:10px">
                <span class="avatar brand" style="width:30px;height:30px;border-radius:8px;font-size:12px">{{ nameAvatar(r.name) }}</span>
                <span class="cell-main ellipsis" style="max-width:220px" :title="r.name">{{ r.name }}</span>
              </div>
            </td>
            <td>
              <span
                class="sm tx-3 ellipsis"
                style="font-family:var(--font-mono);max-width:220px;display:inline-block;vertical-align:middle"
                :title="r.id"
                >{{ r.id }}</span
              >
            </td>
            <td>
              <span v-if="r.enabled" class="tag ok">{{ t('enable') }}</span>
              <span v-else class="tag">{{ t('rolePage.disabled') }}</span>
            </td>
            <td class="sm">{{ r.description || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(r)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(r)">{{ t('view') }}</span> ·
              <span class="link danger" @click="onDeleteRow(r)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 后端分页条（原生实现：每页条数 + 范围 + ‹ 页码 ›） -->
    <div class="pager">
      <select v-model.number="pageSize" class="select" style="width:auto;padding:4px 8px;font-size:12.5px" @change="onPageSizeChange">
        <option v-for="ps in pageSizeOptions" :key="ps" :value="ps">{{ ps }} {{ t('rolePage.perPage') }}</option>
      </select>
      <span>{{ total === 0 ? 0 : page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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
