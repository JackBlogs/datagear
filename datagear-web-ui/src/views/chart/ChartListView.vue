<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { chartPagingQueryData, deleteCharts, type ChartEntity } from '@/api/chart'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 图表管理列表页：「能源暗域 Energy Dark」重写（原生 HTML + src/styles/datasource-page.css）。
// 功能 100% 对齐旧 PrimeVue 版（chart_table.ftl 复刻版）：关键字搜索、后端分页（10/20/50 条/页）、
// 表头点击排序（Shift+点击多列，默认创建时间倒序）、多选 + 批量删除、
// 行内 增/改/查/授权/删除（授权路由沿用原页 /authorization/Chart/:id）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（后端分页 + 关键字搜索，同原页） ----
const items = ref<ChartEntity[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<ChartEntity[]>([])
const keyword = ref('')
// 多列排序：默认创建时间倒序（同原页 sortMeta 初值）
const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'createTime', order: -1 }])

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({
    name: m.field,
    type: m.order === 1 ? 'ASC' : 'DESC',
  }))
}

async function load() {
  loading.value = true
  try {
    const data = await chartPagingQueryData({
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

// ---- 分页（.pager 原生实现，含首页/末页/页大小，对齐原 paginator 能力） ----
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

function gotoPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  page.value = p - 1
  load()
}

function onPageSizeChange() {
  page.value = 0
  load()
}

// ---- 排序（点击表头 升/降 切换；Shift+点击追加/移除排序列，对应原 multi-sort） ----
function onSort(field: string, ev: MouseEvent) {
  const idx = sortMeta.value.findIndex((m) => m.field === field)
  if (ev.shiftKey) {
    if (idx === -1) sortMeta.value.push({ field, order: 1 })
    else if (sortMeta.value[idx].order === 1) sortMeta.value[idx] = { field, order: -1 }
    else sortMeta.value.splice(idx, 1)
  } else {
    const curOrder = idx === 0 && sortMeta.value.length === 1 ? sortMeta.value[0].order : 0
    sortMeta.value = curOrder === 1 ? [{ field, order: -1 }] : [{ field, order: 1 }]
  }
  load()
}

function sortArrow(field: string): string {
  const m = sortMeta.value.find((x) => x.field === field)
  if (!m) return ''
  return m.order === 1 ? '▲' : '▼'
}

// ---- 多选 ----
const allChecked = computed(
  () => items.value.length > 0 && items.value.every((i) => selected.value.some((s) => s.id === i.id)),
)

function toggleAll() {
  selected.value = allChecked.value ? [] : [...items.value]
}

function isSel(id: string): boolean {
  return selected.value.some((s) => s.id === id)
}

function toggleRow(c: ChartEntity) {
  const i = selected.value.findIndex((s) => s.id === c.id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(c)
}

function clearSel() {
  selected.value = []
}

// ---- 行操作（路由与原页完全一致） ----
function onAdd() {
  // 新建图表 → 图表设计器（后端 /api/chart/saveAdd 已实现，设计器内保存新增）
  router.push('/chart/add')
}

function onEdit(c: ChartEntity) {
  router.push(`/chart/${c.id}/design`)
}

function onView(c: ChartEntity) {
  router.push(`/chart/${c.id}/design`)
}

// 授权路由照原代码：/authorization/Chart/:id
function onShare(c: ChartEntity) {
  router.push(`/authorization/Chart/${c.id}`)
}

async function doDelete(ids: string[]) {
  try {
    await deleteCharts(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function onDeleteOne(c: ChartEntity) {
  if (!window.confirm(t('chartPage.confirmDelete', { name: c.name }))) return
  await doDelete([c.id])
}

async function onDeleteSelected() {
  const ids = selected.value.map((i) => i.id)
  if (!ids.length) return
  if (!window.confirm(t('confirmDelSelectedAsk'))) return
  await doDelete(ids)
}

// ---- 展示格式化 ----
/** 更新间隔：毫秒转可读；语义同原页（undefined/负数=不更新，0=实时），其余由毫秒折算为秒/分钟/小时 */
function formatInterval(v: number | undefined): string {
  if (v === undefined || v < 0) return t('noUpdate')
  if (v === 0) return t('realtime')
  if (v < 1000) return `${v} ${t('millisecond')}`
  if (v < 60000) return `${trimNum(v / 1000)} ${t('second')}`
  if (v < 3600000) return `${trimNum(v / 60000)} ${t('chartPage.unitMinute')}`
  return `${trimNum(v / 3600000)} ${t('chartPage.unitHour')}`
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** 图表类型：plugin 的 nameLabel（无则 id），再没有返回 null（界面显示 -） */
function pluginLabel(e: ChartEntity): string | null {
  return e.pluginVo?.nameLabel?.value || e.pluginVo?.id || null
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
        <div class="page-title">{{ t('chartPage.title') }}</div>
        <div class="page-desc">{{ t('chartPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('chartPage.newChart') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 + 已选操作条 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByChartName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selected.length" class="sel-bar">
        <span>{{ t('chartPage.selInfo', { n: selected.length }) }}</span>
        <button class="btn sm danger" type="button" @click="onDeleteSelected">{{ t('chartPage.batchDelete') }}</button>
        <span class="link muted" @click="clearSel">{{ t('chartPage.clearSel') }}</span>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('chartPage.total', { n: total }) }}</span>
    </div>

    <!-- 图表表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:38px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th style="cursor:pointer;user-select:none" @click="onSort('name', $event)">
              {{ t('name') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('name') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="onSort('pluginVo.id', $event)">
              {{ t('type') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('pluginVo.id') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="onSort('updateInterval', $event)">
              {{ t('updateInterval') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('updateInterval') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="onSort('analysisProject.name', $event)">
              {{ t('ownerProject') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('analysisProject.name') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="onSort('createUser.realName', $event)">
              {{ t('createUser') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('createUser.realName') }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="onSort('createTime', $event)">
              {{ t('createTime') }}<span style="font-size:10px;margin-left:3px;color:var(--tx-4)">{{ sortArrow('createTime') }}</span>
            </th>
            <th style="width:230px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="8"><div class="empty">{{ t('chartPage.empty') }}</div></td>
          </tr>
          <tr v-for="c in items" :key="c.id">
            <td><input type="checkbox" :checked="isSel(c.id)" @change="toggleRow(c)" /></td>
            <td>
              <span class="cell-main ellipsis" style="max-width:260px;display:inline-block;vertical-align:middle" :title="c.name">
                {{ c.name }}
              </span>
            </td>
            <td>
              <span v-if="pluginLabel(c)" class="tag info">{{ pluginLabel(c) }}</span>
              <span v-else>-</span>
            </td>
            <td class="num sm">{{ formatInterval(c.updateInterval) }}</td>
            <td>{{ c.analysisProject?.name || '-' }}</td>
            <td>{{ c.createUser?.realName || c.createUser?.name || '-' }}</td>
            <td class="sm tx-3">{{ c.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(c)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(c)">{{ t('view') }}</span> ·
              <span class="link" @click="onShare(c)">{{ t('module.authorization') }}</span> ·
              <span class="link danger" @click="onDeleteOne(c)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页条（首页/上一页/页码/下一页/末页 + 页大小，对齐原 paginator） -->
    <div class="pager">
      <span>{{ total === 0 ? 0 : page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
      <button class="pg-btn" type="button" :disabled="page <= 0" @click="gotoPage(1)">«</button>
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
      <button class="pg-btn" type="button" :disabled="page + 1 >= pageCount" @click="gotoPage(pageCount)">»</button>
      <select v-model.number="pageSize" class="select" style="width:auto;padding:5px 8px;font-size:12.5px" @change="onPageSizeChange">
        <option v-for="s in PAGE_SIZE_OPTIONS" :key="s" :value="s">{{ s }} {{ t('chartPage.rowsPerPage') }}</option>
      </select>
    </div>
  </div>
</template>
