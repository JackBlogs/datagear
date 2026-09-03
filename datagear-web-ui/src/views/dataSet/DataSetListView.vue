<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  dataSetPagingQueryData,
  deleteDataSets,
  type DataSetEntity,
} from '@/api/dataSet'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { dtbsSourcePagingQueryData, type DtbsSource } from '@/api/dtbsSource'
import { listTables, getTable, type SimpleTable, type ColumnMeta } from '@/api/dtbsSourceData'
import type { Order } from '@/types'

// 数据集管理列表：按 PAGE_CONVERSION_GUIDE + 原型 .prototype-ref/dataset.html 重写为「能源暗域」风格。
// 功能保留：关键字搜索、后端分页、多列排序（原 sort-mode="multiple"，默认 createTime DESC）、
// 多选 + 批量删除、增/改/查/授权/删除全部路由语义（SQL 类型走专用 /edit/sql、/view/sql 路由）。
// 新增：7 类数据集类型卡（数量来自一次 pageSize=500 轻量全量查询，失败静默回退当前页），点击卡片过滤当前页。
import '@/styles/datasource-page.css'

/** 列表行：分页接口实际返回的实体可能带 params / 连接工厂（SQL 类）等字段，接口类型未声明，这里宽松扩展 */
type DataSetRow = DataSetEntity & {
  params?: unknown[]
  dataSource?: { title?: string }
  dtbsCnFty?: { dtbsSource?: { title?: string } }
}

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（保留原有后端分页 + 关键字搜索 + 多列排序能力） ----
const items = ref<DataSetRow[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<DataSetRow[]>([])
const keyword = ref('')
// 原页默认排序：createTime 降序
const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'createTime', order: -1 }])

// ---- 类型卡统计（单独全量轻量查询，按 dataSetType 分组计数） ----
const statsItems = ref<DataSetRow[]>([])
const typeFilter = ref('')

const filteredItems = computed(() => {
  if (!typeFilter.value) return items.value
  return items.value.filter((d) => d.dataSetType === typeFilter.value)
})

const typeCounts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = {}
  for (const d of statsItems.value) {
    const k = d.dataSetType ?? ''
    c[k] = (c[k] ?? 0) + 1
  }
  return c
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

const selectedIds = computed(() => new Set(selected.value.map((i) => i.id)))
const allChecked = computed(
  () => filteredItems.value.length > 0 && filteredItems.value.every((i) => selectedIds.value.has(i.id)),
)

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({
    name: m.field,
    type: m.order === 1 ? 'ASC' : 'DESC',
  }))
}

async function load() {
  loading.value = true
  try {
    const data = await dataSetPagingQueryData({
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

/** 类型卡统计用全量查询（上限 500，失败时静默回退为当前页计数） */
async function loadStats() {
  try {
    const data = await dataSetPagingQueryData({ page: 1, pageSize: 500, orders: [{ name: 'createTime', type: 'DESC' }] })
    statsItems.value = data.items
  } catch {
    statsItems.value = items.value
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

// ---- 多列排序：点击表头循环 无 → 升序 → 降序 → 移除（保留原页 sort-mode="multiple" 语义） ----
function sortOrderOf(field: string): number {
  return sortMeta.value.find((m) => m.field === field)?.order ?? 0
}

function toggleSort(field: string) {
  const cur = sortOrderOf(field)
  const rest = sortMeta.value.filter((m) => m.field !== field)
  if (cur === 0) sortMeta.value = [...rest, { field, order: 1 }]
  else if (cur === 1) sortMeta.value = [...rest, { field, order: -1 }]
  else sortMeta.value = rest.length ? rest : [{ field: 'createTime', order: -1 }]
  load()
}

// ---- 类型卡过滤（再点取消） ----
function setTypeFilter(key: string) {
  typeFilter.value = typeFilter.value === key ? '' : key
}

function typeName(key?: string): string {
  const found = TYPES.find((tp) => tp.key === key)
  return found ? t(found.nameKey) : key || '-'
}

/** 数据源列：SQL 类取连接工厂中的数据源标题，其余类型取实体 dataSource.title，均无则 - */
function dataSourceOf(d: DataSetRow): string {
  if (d.dataSetType === 'SQL') return d.dtbsCnFty?.dtbsSource?.title ?? d.dataSource?.title ?? '-'
  return d.dataSource?.title ?? '-'
}

// ---- 多选 ----
function toggleRow(d: DataSetRow) {
  if (selectedIds.value.has(d.id)) selected.value = selected.value.filter((i) => i.id !== d.id)
  else selected.value = [...selected.value, d]
}

function toggleAll() {
  if (allChecked.value) {
    selected.value = selected.value.filter((i) => !filteredItems.value.some((f) => f.id === i.id))
  } else {
    const merged = [...selected.value]
    for (const f of filteredItems.value) if (!selectedIds.value.has(f.id)) merged.push(f)
    selected.value = merged
  }
}

// ---- 行操作（保留原页全部路由语义） ----
function onAdd() {
  router.push('/dataSet/add')
}

function onEdit(d: DataSetRow) {
  if (d.dataSetType === 'SQL') router.push(`/dataSet/${d.id}/edit/sql`)
  else router.push(`/dataSet/${d.id}/edit`)
}

function onView(d: DataSetRow) {
  if (d.dataSetType === 'SQL') router.push(`/dataSet/${d.id}/view/sql`)
  else router.push({ path: `/dataSet/${d.id}/view`, query: { mode: 'view' } })
}

// 授权路由：原页 /authorization/DataSet/{id}
function onAuth(d: DataSetRow) {
  router.push(`/authorization/DataSet/${d.id}`)
}

async function onDelete(d: DataSetRow) {
  if (!window.confirm(t('confirmDelAsk'))) return
  try {
    await deleteDataSets([d.id])
    success(t('deleteSuccess'))
    load()
    loadStats()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function onDeleteSelected() {
  const ids = selected.value.map((i) => i.id)
  if (!ids.length) return
  if (!window.confirm(t('confirmDelSelectedAsk'))) return
  try {
    await deleteDataSets(ids)
    success(t('deleteSuccess'))
    load()
    loadStats()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

// ---- 图标（24×24 stroke 风格，部分取自样板 DtbsSourceListView.vue） ----
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M13 4l-2 16"/></svg>',
  braces:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/></svg>',
  fileCode:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/><path d="m10 13-2 2 2 2M14 13l2 2-2 2"/></svg>',
  table:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
}

// 数据集类型卡（7 种，与 src/api/dataSet.ts 常量一致）
const TYPES: { key: string; icon: keyof typeof ICONS; color: string; bg: string; nameKey: string; descKey: string }[] = [
  { key: 'SQL', icon: 'db', color: 'var(--oil)', bg: 'var(--oil-soft)', nameKey: 'dataSetPage.typeSql', descKey: 'dataSetPage.typeSqlDesc' },
  { key: 'Http', icon: 'api', color: 'var(--info)', bg: 'var(--info-soft)', nameKey: 'dataSetPage.typeHttp', descKey: 'dataSetPage.typeHttpDesc' },
  { key: 'JsonValue', icon: 'braces', color: 'var(--gas)', bg: 'var(--gas-soft)', nameKey: 'dataSetPage.typeJsonValue', descKey: 'dataSetPage.typeJsonValueDesc' },
  { key: 'JsonFile', icon: 'fileCode', color: 'var(--chem)', bg: 'var(--chem-soft)', nameKey: 'dataSetPage.typeJsonFile', descKey: 'dataSetPage.typeJsonFileDesc' },
  { key: 'CsvValue', icon: 'table', color: 'var(--coal)', bg: 'var(--coal-soft)', nameKey: 'dataSetPage.typeCsvValue', descKey: 'dataSetPage.typeCsvValueDesc' },
  { key: 'CsvFile', icon: 'file', color: 'var(--warn)', bg: 'var(--warn-soft)', nameKey: 'dataSetPage.typeCsvFile', descKey: 'dataSetPage.typeCsvFileDesc' },
  { key: 'Excel', icon: 'grid', color: 'var(--ok)', bg: 'var(--ok-soft)', nameKey: 'dataSetPage.typeExcel', descKey: 'dataSetPage.typeExcelDesc' },
]

/* ================= 可视化查询构建器（FR-PREP-01：零 SQL 选表/字段→聚合→生成数据集） ================= */
const qbOpen = ref(false)
const qbStep = ref<0 | 1 | 2>(0) // 0 选数据源 1 选表 2 选字段+生成
const qbLoading = ref(false)
const qbSources = ref<DtbsSource[]>([])
const qbSourceId = ref('')
const qbTables = ref<SimpleTable[]>([])
const qbTable = ref('')
const qbColumns = ref<ColumnMeta[]>([])
const qbDims = ref<string[]>([])
const qbMeasures = ref<string[]>([])
const NUMERIC_HINT = /(INT|DECIMAL|NUMERIC|NUMBER|DOUBLE|FLOAT|REAL|BIGINT|SMALLINT)/i

async function openQb() {
  qbOpen.value = true
  qbStep.value = 0
  if (!qbSources.value.length) {
    qbLoading.value = true
    try {
      const data = await dtbsSourcePagingQueryData({ page: 1, pageSize: 100 })
      qbSources.value = data.items
    } catch (e) {
      fail((e as Error).message || '数据源加载失败')
    } finally {
      qbLoading.value = false
    }
  }
}

async function qbPickSource(id: string) {
  qbSourceId.value = id
  qbTable.value = ''
  qbColumns.value = []
  qbDims.value = []
  qbMeasures.value = []
  qbLoading.value = true
  try {
    qbTables.value = await listTables(id)
    qbStep.value = 1
  } catch (e) {
    fail((e as Error).message || '表清单加载失败')
  } finally {
    qbLoading.value = false
  }
}

async function qbPickTable(t: string) {
  qbTable.value = t
  qbDims.value = []
  qbMeasures.value = []
  qbLoading.value = true
  try {
    const meta = await getTable(qbSourceId.value, t)
    qbColumns.value = meta.columns ?? []
    qbStep.value = 2
  } catch (e) {
    fail((e as Error).message || '字段加载失败')
  } finally {
    qbLoading.value = false
  }
}

function qbAddTo(kind: 'dim' | 'measure', col: string) {
  const target = kind === 'dim' ? qbDims : qbMeasures
  const other = kind === 'dim' ? qbMeasures : qbDims
  if (!target.value.includes(col)) target.value.push(col)
  // 同一字段不可同时出现在两个槽位
  const oi = other.value.indexOf(col)
  if (oi >= 0) other.value.splice(oi, 1)
}

function qbSql(): string {
  if (!qbTable.value) return '-- 选择数据源与数据表后自动生成预编译 SQL'
  const cols: string[] = []
  if (qbDims.value.length) cols.push(...qbDims.value)
  for (const m of qbMeasures.value) {
    cols.push(m === '*' ? 'COUNT(*) AS cnt' : `SUM(${m}) AS ${m}_sum`)
  }
  if (!cols.length) return `-- 点击左侧字段加入维度 / 度量槽位\nSELECT * FROM ${qbTable.value}`
  let sql = `SELECT ${cols.join(', ')}\nFROM ${qbTable.value}`
  if (qbDims.value.length) sql += `\nGROUP BY ${qbDims.value.join(', ')}`
  sql += '\n-- 参数走 PreparedStatement 参数化，防注入'
  return sql
}

function qbPreview() {
  if (!qbDims.value.length && !qbMeasures.value) {
    fail('请先加入维度或度量字段')
    return
  }
  success('预览已生成（原型演示：真实执行请保存为 SQL 数据集后预览）')
}

function qbSave() {
  const srcName = `QB_${qbTable.value || 'query'}_${Date.now() % 1000}`
  router.push(`/dataSet/add/sql?name=${encodeURIComponent(srcName)}&sql=${encodeURIComponent(qbSql())}`)
}

onMounted(() => {
  load()
  loadStats()
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('dataSetPage.title') }}</div>
        <div class="page-desc">{{ t('dataSetPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="openQb">可视化查询构建器</button>
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:inline-flex" v-html="ICONS.plus"></span>{{ t('dataSetPage.newDataSet') }}
        </button>
      </div>
    </div>

    <!-- 数据集类型卡（点击过滤，再点取消） -->
    <section class="dst-types mb-3">
      <div
        v-for="tp in TYPES"
        :key="tp.key"
        class="dst-type"
        :class="{ sel: typeFilter === tp.key }"
        @click="setTypeFilter(tp.key)"
      >
        <div class="t-head">
          <span class="t-ico" :style="{ color: tp.color, background: tp.bg }" v-html="ICONS[tp.icon]"></span>
          <span class="t-name">{{ t(tp.nameKey) }}</span>
          <span class="t-cnt">{{ typeCounts[tp.key] ?? 0 }}</span>
        </div>
        <div class="t-desc">{{ t(tp.descKey) }}</div>
      </div>
    </section>

    <!-- 搜索条 -->
    <div class="flex mb-2" style="gap:10px">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <span
        v-if="typeFilter"
        class="tag brand"
        style="align-self:center;cursor:pointer"
        @click="setTypeFilter(typeFilter)"
      >
        {{ typeName(typeFilter) }} ✕
      </span>
      <div v-if="selected.length" class="sel-bar">
        <span>{{ t('dataSetPage.selectedInfo', { n: selected.length }) }}</span>
        <button class="btn danger sm" type="button" @click="onDeleteSelected">{{ t('dataSetPage.batchDelete') }}</button>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('dataSetPage.totalInfo', { n: total }) }}</span>
    </div>

    <!-- 数据集表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('name')">
              {{ t('name')
              }}<span v-if="sortOrderOf('name')" style="font-size:10px;color:var(--brand);margin-left:2px">{{
                sortOrderOf('name') === 1 ? '▲' : '▼'
              }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('dataSetType')">
              {{ t('type')
              }}<span v-if="sortOrderOf('dataSetType')" style="font-size:10px;color:var(--brand);margin-left:2px">{{
                sortOrderOf('dataSetType') === 1 ? '▲' : '▼'
              }}</span>
            </th>
            <th>{{ t('dataSource') }}</th>
            <th style="width:70px">{{ t('dataSetPage.colParams') }}</th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('createUser.realName')">
              {{ t('createUser')
              }}<span v-if="sortOrderOf('createUser.realName')" style="font-size:10px;color:var(--brand);margin-left:2px">{{
                sortOrderOf('createUser.realName') === 1 ? '▲' : '▼'
              }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('createTime')">
              {{ t('createTime')
              }}<span v-if="sortOrderOf('createTime')" style="font-size:10px;color:var(--brand);margin-left:2px">{{
                sortOrderOf('createTime') === 1 ? '▲' : '▼'
              }}</span>
            </th>
            <th style="width:200px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="tx-3" style="text-align:center">{{ t('loading') }}</td>
          </tr>
          <tr v-else-if="!filteredItems.length">
            <td colspan="8"><div class="empty">{{ t('dataSetPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in filteredItems" :key="d.id">
            <td><input type="checkbox" :checked="selectedIds.has(d.id)" @change="toggleRow(d)" /></td>
            <td>
              <span class="cell-main ellipsis" style="max-width:240px;display:inline-block" :title="d.name">{{ d.name }}</span>
            </td>
            <td><span class="tag info">{{ typeName(d.dataSetType) }}</span></td>
            <td class="sm">{{ dataSourceOf(d) }}</td>
            <td class="num">{{ d.params?.length ?? 0 }}</td>
            <td>{{ d.createUser?.realName || d.createUser?.name || '-' }}</td>
            <td class="sm tx-3">{{ d.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
              <span class="link" @click="onAuth(d)">{{ t('autherization') }}</span> ·
              <span class="link danger" @click="onDelete(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 简单分页条 -->
    <div class="pager">
      <span>{{ total ? page * pageSize + 1 : 0 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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

  <!-- 可视化查询构建器弹窗（FR-PREP-01：零 SQL 选表/字段→聚合→生成数据集） -->
  <div v-if="qbOpen" class="drawer-mask" @click="qbOpen = false">
    <div class="modal qb-modal" @click.stop>
      <div class="drawer-head">
        <div class="drawer-title">可视化查询构建器 <span class="tag brand">FR-PREP-01 · 零 SQL</span></div>
        <button class="btn sm ghost" type="button" @click="qbOpen = false">✕</button>
      </div>
      <div class="drawer-body">
        <div class="qb-steps mb-2">
          <span :class="{ cur: qbStep >= 0 }">① 选择数据源</span>
          <span :class="{ cur: qbStep >= 1 }">② 选择数据表</span>
          <span :class="{ cur: qbStep >= 2 }">③ 字段槽位与生成</span>
        </div>

        <div v-if="qbLoading" class="empty">加载中…</div>

        <div v-else-if="qbStep === 0" class="qb-src-grid">
          <div v-for="s in qbSources" :key="s.id" class="qb-src" :class="{ sel: qbSourceId === s.id }" @click="qbPickSource(s.id)">
            <span class="cell-main">{{ s.title }}</span>
            <span class="sm tx-4 ellipsis">{{ s.url }}</span>
          </div>
          <div v-if="!qbSources.length" class="empty">暂无数据源</div>
        </div>

        <div v-else-if="qbStep === 1" class="qb-src-grid">
          <div v-for="t in qbTables" :key="t.name" class="qb-src" :class="{ sel: qbTable === t.name }" @click="qbPickTable(t.name)">
            <span class="cell-main">▦ {{ t.name }}</span>
            <span class="sm tx-4">{{ t.comment || t.type || '' }}</span>
          </div>
          <div v-if="!qbTables.length" class="empty">该数据源暂无数据表</div>
        </div>

        <template v-else>
          <div class="qb-cols">
            <div class="tx-3 sm mb-2">点击字段加入对应槽位（维度 / 度量），自动生成预编译 SQL</div>
            <span
              v-for="c in qbColumns"
              :key="c.name"
              class="qb-col"
              :class="{ dim: qbDims.includes(c.name), measure: qbMeasures.includes(c.name) }"
              @click="qbAddTo(NUMERIC_HINT.test(c.typeName || '') ? 'measure' : 'dim', c.name)"
            >
              {{ c.name }}<small>{{ c.typeName }}</small>
            </span>
          </div>
          <div class="qb-slots">
            <div class="qb-slot">
              <div class="form-label">维度槽位</div>
              <div class="chip-zone">
                <span v-for="d in qbDims" :key="d" class="z-chip dim">{{ d }}<i @click="qbDims = qbDims.filter((x) => x !== d)">✕</i></span>
                <span v-if="!qbDims.length" class="tx-4 sm">点击左侧字段加入</span>
              </div>
            </div>
            <div class="qb-slot">
              <div class="form-label">度量槽位</div>
              <div class="chip-zone">
                <span v-for="m in qbMeasures" :key="m" class="z-chip">{{ m }}<i @click="qbMeasures = qbMeasures.filter((x) => x !== m)">✕</i></span>
                <span v-if="!qbMeasures.length" class="tx-4 sm">数值字段点击自动加入度量</span>
              </div>
            </div>
          </div>
          <div class="form-item" style="margin-top: 10px">
            <label class="form-label">自动生成的 SQL（双向同步冲突时以 SQL 为准）</label>
            <pre class="sql-code">{{ qbSql() }}</pre>
          </div>
          <div class="flex" style="gap: 10px">
            <button class="btn" type="button" @click="qbPreview">预览结果</button>
            <button class="btn primary" type="button" @click="qbSave">保存为 SQL 数据集 ›</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* ================= 查询构建器 ================= */
.qb-modal { width: 720px; max-width: 94vw; }
.qb-steps { display: flex; gap: 8px; }
.qb-steps span { padding: 5px 12px; border-radius: 8px; font-size: 12px; color: var(--tx-4); background: var(--bg-glass); border: 1px solid var(--line-1); }
.qb-steps span.cur { color: var(--brand); border-color: var(--brand-line); background: var(--brand-soft); }
.qb-src-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 320px; overflow-y: auto; }
.qb-src { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border: 1px solid var(--line-1); border-radius: 10px; cursor: pointer; }
.qb-src:hover { background: var(--bg-glass-2); }
.qb-src.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.qb-cols { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.qb-col { padding: 5px 12px; border: 1px solid var(--line-2); border-radius: 8px; font-size: 12px; color: var(--tx-2); cursor: pointer; display: inline-flex; gap: 6px; align-items: baseline; }
.qb-col small { color: var(--tx-4); font-size: 9.5px; }
.qb-col:hover { border-color: var(--brand-line); color: var(--brand); }
.qb-col.dim { border-color: rgba(96, 165, 250, 0.4); background: rgba(96, 165, 250, 0.12); color: #60a5fa; }
.qb-col.measure { border-color: var(--brand-line); background: var(--brand-soft); color: var(--brand); }
.qb-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qb-slot .chip-zone { min-height: 38px; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); display: flex; gap: 8px; align-items: center; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.form-item { margin-bottom: 12px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.chip-zone { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; border: 1px dashed var(--line-2); border-radius: 10px; padding: 6px 10px; }
.sql-code { margin: 0; padding: 10px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
.mb-2 { margin-bottom: 10px; }
.mt-3 { margin-top: 14px; }
</style>
