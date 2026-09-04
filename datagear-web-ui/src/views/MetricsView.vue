<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  metricPagingQueryData,
  queryMetric,
  queryMetricValue,
  listMetricVersions,
  certifyMetric,
  saveMetric,
  type MetricEntity,
  type MetricQueryResult,
  type MetricVersion,
} from '@/api/metric'
import { dtbsSourcePagingQueryData, type DtbsSource } from '@/api/dtbsSource'
import { listTables, getTable, type SimpleTable, type ColumnMeta } from '@/api/dtbsSourceData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { init, use, type EChartsType } from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import '@/styles/datasource-page.css'

use([GraphChart, TooltipComponent, CanvasRenderer])

/**
 * 指标中心（1:1 对齐 prototypev2 metrics.html + PRD 10.3 语义层）：
 * 页头操作区（搜索防抖/口径冲突检测/新建）· 5 统计卡 · 业务域目录树 · 状态 tabs ·
 * 指标卡列表（迷你趋势/当前值/编辑）· 分页 · 消费拓扑 · 详情抽屉五节（定义/SQL 高亮/版本对比/血缘/消费方）。
 */
const router = useRouter()
const { success, fail } = useOperationMessage()

/* ================= 状态 ================= */
const metrics = ref<MetricEntity[]>([])
const loading = ref(false)
const keyword = ref('')
const activeDomain = ref('all')
const activeStatus = ref<'all' | 'certified' | 'pending'>('all')
const page = ref(1)
const PAGE_SIZE = 10

/** 逐卡实时取数缓存 */
const valueMap = ref<Record<string, unknown>>({})
/** 逐卡迷你趋势（按第一维度 Top6 分布）缓存 */
const sparkMap = ref<Record<string, number[]>>({})

const IND_COLOR: Record<string, string> = { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', common: '#60A5FA' }
const IND_NAME: Record<string, string> = { oil: '石油', gas: '天然气', chem: '化工', coal: '煤矿', common: '通用' }

function indOf(name: string): string {
  if (/油|井|采油/.test(name)) return 'oil'
  if (/气|管网|管输/.test(name)) return 'gas'
  if (/化工|甲醇|炼化|烯烃/.test(name)) return 'chem'
  if (/煤|矿|瓦斯/.test(name)) return 'coal'
  return 'common'
}
function metricCode(m: MetricEntity): string {
  return 'M-' + m.id.slice(-6).toUpperCase()
}
function parseDims(m: MetricEntity): string[] {
  try { return JSON.parse(m.dimensionsJson || '[]') } catch { return [] }
}

/* ================= 口径冲突（同名不同口径，FR-SEM-03） ================= */
interface ConflictPair { name: string; items: MetricEntity[] }
const conflictPairs = computed<ConflictPair[]>(() => {
  const byName = new Map<string, MetricEntity[]>()
  for (const m of metrics.value) {
    const key = m.name.trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(m)
  }
  const out: ConflictPair[] = []
  for (const [name, list] of byName) {
    const calibers = new Set(list.map((m) => (m.caliber || '').trim()))
    if (calibers.size > 1) out.push({ name, items: list })
  }
  return out
})
const conflictCount = computed(() => conflictPairs.value.length)
function hasConflict(m: MetricEntity): boolean {
  return conflictPairs.value.some((p) => p.name === m.name.trim())
}

/* ================= 统计卡 ================= */
const stats = computed(() => {
  const certified = metrics.value.filter((m) => m.certified).length
  return {
    total: metrics.value.length,
    certified,
    pending: metrics.value.length - certified,
    conflicts: conflictCount.value,
    coverage: metrics.value.length ? Math.round((certified / metrics.value.length) * 1000) / 10 : 0,
  }
})

/* ================= 业务域目录（bizDomain 聚合，本地适配 /semantics/catalog） ================= */
const domains = computed(() => {
  const map = new Map<string, number>()
  for (const m of metrics.value) {
    const d = m.bizDomain || '未分类'
    map.set(d, (map.get(d) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
})

/* ================= 过滤 + 分页 ================= */
const filteredMetrics = computed(() => {
  let list = metrics.value
  if (activeDomain.value !== 'all') list = list.filter((m) => (m.bizDomain || '未分类') === activeDomain.value)
  if (activeStatus.value === 'certified') list = list.filter((m) => m.certified)
  if (activeStatus.value === 'pending') list = list.filter((m) => !m.certified)
  const kw = keyword.value.trim().toLowerCase()
  if (kw)
    list = list.filter(
      (m) => m.name.toLowerCase().includes(kw) || metricCode(m).toLowerCase().includes(kw) || (m.caliber || '').toLowerCase().includes(kw),
    )
  return [...list].sort((a, b) => (b.certified || 0) - (a.certified || 0))
})
const pageRows = computed(() => filteredMetrics.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredMetrics.value.length / PAGE_SIZE)))
function gotoPage(p: number) {
  page.value = p
}

/* ================= 数据加载 ================= */
async function load() {
  loading.value = true
  try {
    const data = await metricPagingQueryData({ page: 1, pageSize: 500, orders: [{ name: 'createTime', type: 'DESC' }] })
    metrics.value = data.items
    page.value = 1
    await loadCardData()
    await nextTick()
    renderTopo()
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

/** 逐卡实时取数 + 迷你趋势（第一维度 Top6 分布，真实查询） */
async function loadCardData() {
  const targets = filteredMetrics.value
  await Promise.allSettled(
    targets.map(async (m) => {
      try {
        const v = await queryMetricValue(m.id, {})
        valueMap.value[m.id] = v.value
      } catch { valueMap.value[m.id] = null }
      const dims = parseDims(m)
      if (dims.length) {
        try {
          const dist = await queryMetric(m.id, { dimensions: [dims[0]], orderBy: 'value', limit: 6 })
          sparkMap.value[m.id] = dist.rows.map((r) => Number(r[1])).filter((n) => Number.isFinite(n))
        } catch { sparkMap.value[m.id] = [] }
      } else {
        sparkMap.value[m.id] = []
      }
    }),
  )
}

/* ================= 迷你趋势（SVG sparkline，免 echarts 实例开销） ================= */
function sparkPoints(id: string, w = 150, h = 36): string {
  const arr = sparkMap.value[id] || []
  if (arr.length < 2) return ''
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const span = max - min || 1
  return arr
    .map((v, i) => {
      const x = (i / (arr.length - 1)) * (w - 4) + 2
      const y = h - 3 - ((v - min) / span) * (h - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
function sparkColor(m: MetricEntity): string {
  return IND_COLOR[indOf(m.name)] || '#60A5FA'
}

/* ================= 消费拓扑（echarts graph，真实指标节点） ================= */
const topoEl = ref<HTMLElement>()
let topoChart: EChartsType | null = null

function renderTopo() {
  if (!topoEl.value || !metrics.value.length) return
  if (!topoChart) topoChart = init(topoEl.value)
  const C = { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', info: '#60A5FA', warn: '#FBBF24', common: '#60A5FA' }
  const sources = new Map<string, { x: number; y: number }>()
  metrics.value.forEach((m) => {
    const key = m.sourceId || '—'
    if (!sources.has(key)) sources.set(key, { x: 70, y: 80 + sources.size * 90 })
  })
  const nodes: Record<string, unknown>[] = []
  const links: { source: string; target: string }[] = []
  for (const [sid, pos] of sources) {
    nodes.push({ name: `数据源 · ${sid.slice(-6)}`, x: pos.x, y: pos.y, sz: 26, ntype: '上游数据源', itemStyle: { color: C.info } })
  }
  metrics.value.slice(0, 8).forEach((m, i) => {
    const nm = m.name
    const isCert = !!m.certified
    nodes.push({
      name: nm,
      x: 330,
      y: 70 + i * 88,
      sz: isCert ? 40 : 32,
      ntype: '语义层指标',
      itemStyle: {
        color: C[indOf(m.name) as keyof typeof C] || C.common,
        ...(isCert ? { shadowBlur: 16, shadowColor: 'rgba(255,138,61,.5)' } : {}),
      },
      label: isCert ? { fontWeight: 700, color: '#F2F5FA' } : undefined,
    })
    const srcNode = [...sources.keys()].find((k) => k.includes(m.sourceId?.slice(-6) || '§'))
    if (srcNode) links.push({ source: srcNode, target: nm })
  })
  nodes.push({ name: '看板消费（设计器拖入）', x: 640, y: 90, sz: 28, ntype: '看板消费', itemStyle: { color: C.gas } })
  nodes.push({ name: '告警订阅（待接入）', x: 640, y: 210, sz: 26, ntype: '告警消费', itemStyle: { color: C.warn } })
  nodes.push({ name: '问数（Phase 2）', x: 640, y: 320, sz: 26, ntype: '问数消费', itemStyle: { color: C.chem } })
  if (metrics.value[0]) links.push({ source: metrics.value[0].name, target: '看板消费（设计器拖入）' })

  const option: EChartsCoreOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: false,
        symbolSize: (_v: number, p: { data?: { sz?: number } }) => p.data?.sz || 32,
        label: { show: true, color: '#B9C2D4', fontSize: 11, position: 'bottom', distance: 4 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        lineStyle: { color: 'rgba(255,255,255,.22)', width: 1.2, curveness: 0.12 },
        emphasis: { lineStyle: { color: '#FF8A3D', width: 2 } },
        data: nodes,
        links,
      },
    ],
  }
  topoChart.setOption(option, true)
}

/* ================= 详情抽屉（五节） ================= */
const drawerMetric = ref<MetricEntity | null>(null)
const drawerValue = ref<{ value: unknown; sql: string; costMs: number } | null>(null)
const drawerVersions = ref<MetricVersion[]>([])
const drawerDist = ref<MetricQueryResult | null>(null)
const drawerLoading = ref(false)

async function openDrawer(m: MetricEntity) {
  drawerMetric.value = m
  drawerValue.value = null
  drawerVersions.value = []
  drawerDist.value = null
  drawerLoading.value = true
  const dims = parseDims(m)
  try {
    const [value, versions] = await Promise.all([queryMetricValue(m.id, {}), listMetricVersions(m.id)])
    drawerValue.value = value
    drawerVersions.value = versions
    if (dims.length) drawerDist.value = await queryMetric(m.id, { dimensions: [dims[0]], orderBy: 'value', limit: 20 })
  } catch (e) {
    fail((e as Error).message || '指标试算失败')
  } finally {
    drawerLoading.value = false
  }
}
function closeDrawer() {
  drawerMetric.value = null
}

/** SQL 语法高亮（对齐原型 hlSql：关键字橙/函数青/注释灰/参数黄） */
function hlSql(sql: string): string {
  return String(sql || '-- 暂无')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('--')) return `<span class="cm">${line}</span>`
      return line
        .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|BETWEEN|AND|IN|AS|DESC|DISTINCT)\b/g, '<span class="kw">$1</span>')
        .replace(/\b(SUM|AVG|COUNT|MAX|MIN)\(/g, '<span class="fn">$1</span>(')
        .replace(/\$\{[^}]*\}/g, (mm: string) => `<span class="pc">${mm}</span>`)
    })
    .join('\n')
}

/* ---------- 版本对比 modal ---------- */
const compareOpen = ref(false)
const compareOld = ref<MetricVersion | null>(null)
function parseSnapshot(v?: MetricVersion): Partial<MetricEntity> | null {
  if (!v?.snapshot) return null
  try { return JSON.parse(v.snapshot) as Partial<MetricEntity> } catch { return null }
}
function openCompare(v: MetricVersion) {
  compareOld.value = v
  compareOpen.value = true
}
function compareRows(): [string, string, string][] {
  const old = compareOld.value
  const cur = drawerMetric.value
  if (!old || !cur) return []
  const snap = parseSnapshot(old)
  const rows: [string, string, string][] = [
    ['口径描述', snap?.caliber || '—', cur.caliber || '—'],
    ['统计维度', (snap ? parseDims(snap as MetricEntity) : []).join(' / ') || '—', parseDims(cur).join(' / ') || '—'],
    ['聚合方式', snap?.aggType || '—', cur.aggType],
    ['数值字段', snap?.valueField ? `${snap.tableName}.${snap.valueField}` : snap?.tableName || '—', `${cur.tableName}.${cur.valueField}`],
    ['负责人', snap?.owner || '—', cur.owner || '—'],
  ]
  return rows
}

/* ---------- 口径冲突 modal ---------- */
const conflictOpen = ref(false)
function openConflict() {
  conflictOpen.value = true
}

/* ---------- 认证发布 ---------- */
async function doCertify(m: MetricEntity) {
  if (m.certified) {
    fail('该指标已是已认证状态')
    return
  }
  if (!window.confirm(`确认将「${m.name}」认证发布？发布后口径锁定，下游消费方统一按新口径生效。`)) return
  try {
    await certifyMetric(m.id, true, '口径已评审')
    success('已认证发布')
    await load()
    const fresh = metrics.value.find((x) => x.id === m.id)
    if (fresh && drawerMetric.value?.id === m.id) {
      drawerMetric.value = fresh
      drawerVersions.value = await listMetricVersions(m.id)
    }
  } catch (e) {
    fail((e as Error).message || '认证失败')
  }
}

/* ================= 新建 / 编辑表单弹窗（源→表→字段联动） ================= */
const formOpen = ref(false)
const formSaving = ref(false)
const form = ref({
  id: '',
  name: '',
  bizDomain: '',
  sourceId: '',
  tableName: '',
  valueField: '',
  aggType: 'SUM',
  dimensions: [] as string[],
  caliber: '',
  owner: '',
})
const formSources = ref<DtbsSource[]>([])
const formTables = ref<SimpleTable[]>([])
const formColumns = ref<ColumnMeta[]>([])
const NUMERIC_HINT = /(INT|DECIMAL|NUMERIC|NUMBER|DOUBLE|FLOAT|REAL|BIGINT|SMALLINT|LONG)/i
function isNumericColumn(c: ColumnMeta): boolean {
  return NUMERIC_HINT.test(c.typeName || '') || NUMERIC_HINT.test(String(c.type))
}

async function openForm(m?: MetricEntity) {
  formOpen.value = true
  if (!formSources.value.length) {
    try {
      const data = await dtbsSourcePagingQueryData({ page: 1, pageSize: 100 })
      formSources.value = data.items
    } catch { formSources.value = [] }
  }
  fillForm(m)
}
async function fillForm(m?: MetricEntity) {
  if (!m) {
    form.value = { id: '', name: '', bizDomain: '', sourceId: '', tableName: '', valueField: '', aggType: 'SUM', dimensions: [], caliber: '', owner: 'admin' }
    formTables.value = []
    formColumns.value = []
    return
  }
  form.value = {
    id: m.id,
    name: m.name,
    bizDomain: m.bizDomain,
    sourceId: m.sourceId,
    tableName: m.tableName,
    valueField: m.valueField,
    aggType: m.aggType,
    dimensions: parseDims(m),
    caliber: m.caliber,
    owner: m.owner,
  }
  try {
    formTables.value = await listTables(m.sourceId)
    const meta = await getTable(m.sourceId, m.tableName)
    formColumns.value = meta.columns ?? []
  } catch {
    formTables.value = []
    formColumns.value = []
  }
}
async function onFormSourceChange() {
  form.value.tableName = ''
  form.value.valueField = ''
  form.value.dimensions = []
  formColumns.value = []
  if (!form.value.sourceId) return
  try { formTables.value = await listTables(form.value.sourceId) } catch { formTables.value = [] }
}
async function onFormTableChange() {
  form.value.valueField = ''
  form.value.dimensions = []
  if (!form.value.tableName) return
  try {
    const meta = await getTable(form.value.sourceId, form.value.tableName)
    formColumns.value = meta.columns ?? []
  } catch { formColumns.value = [] }
}
function toggleFormDim(c: string) {
  const i = form.value.dimensions.indexOf(c)
  if (i >= 0) form.value.dimensions.splice(i, 1)
  else form.value.dimensions.push(c)
}
async function submitForm() {
  if (!form.value.name.trim() || !form.value.sourceId || !form.value.tableName || !form.value.valueField) {
    fail('请完整填写名称、数据源、数据表与数值字段')
    return
  }
  formSaving.value = true
  try {
    await saveMetric({
      id: form.value.id || (undefined as unknown as string),
      name: form.value.name.trim(),
      caliber: form.value.caliber.trim(),
      metricType: 'atomic',
      sourceId: form.value.sourceId,
      tableName: form.value.tableName,
      valueField: form.value.valueField,
      aggType: form.value.aggType,
      dimensionsJson: JSON.stringify(form.value.dimensions),
      timeField: '',
      bizDomain: form.value.bizDomain.trim(),
      owner: form.value.owner.trim(),
      certified: 0,
    })
    formOpen.value = false
    success(form.value.id ? '指标已保存，列表已刷新' : '指标已创建（草稿），已插入列表顶部')
    await load()
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    formSaving.value = false
  }
}

/* ---------- 删除 ---------- */
async function onDelete(m: MetricEntity) {
  if (!window.confirm(`确定删除指标「${m.name}」吗？删除后引用它的看板/图表将无法取数。`)) return
  const { deleteMetrics } = await import('@/api/metric')
  try {
    await deleteMetrics([m.id])
    success('删除成功')
    closeDrawer()
    await load()
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

/* ---------- 搜索 300ms 防抖 ---------- */
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1 }, 300)
}

/* ---------- ESC 关抽屉 ---------- */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await load()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  topoChart?.dispose()
  topoChart = null
})
</script>

<template>
  <div class="ds-page" @click="drawerMetric && closeDrawer()">
    <!-- 页头 + 操作区 -->
    <div class="page-head" @click.stop>
      <div>
        <div class="page-title">指标中心</div>
        <div class="page-desc">指标的唯一定义与消费中心 —— 一个指标，一个口径（PRD 10.3 · 语义层核心）</div>
      </div>
      <div class="page-actions">
        <span class="top-search">
          <i class="pi pi-search" style="font-size: 12px"></i>
          <input v-model="keyword" placeholder="搜索指标名称 / 编号…（300ms 防抖）" @input="onSearch" />
        </span>
        <button class="btn" type="button" @click="openConflict">
          口径冲突检测 <span class="tag danger" style="margin-left: 2px">{{ conflictCount }}</span>
        </button>
        <button class="btn" type="button" @click="router.push('/metric/add')">向导定义</button>
        <button class="btn primary" type="button" @click="openForm()">
          <i class="pi pi-plus" style="font-size: 12px"></i> 新建指标
        </button>
      </div>
    </div>

    <!-- 统计条（5 卡） -->
    <section class="stat-grid mb-3">
      <div class="stat-card">
        <div class="s-label">指标总数</div>
        <div class="s-value num">{{ stats.total }} <small>个</small></div>
        <div class="s-sub">语义层唯一事实源</div>
      </div>
      <div class="stat-card">
        <div class="s-label">已认证指标</div>
        <div class="s-value num" style="color: #34d399">{{ stats.certified }} <small>个</small></div>
        <div class="s-sub">认证覆盖率 {{ stats.coverage }}% · 目标 80%</div>
      </div>
      <div class="stat-card">
        <div class="s-label">草稿</div>
        <div class="s-value num" style="color: #7c88a0">0 <small>个</small></div>
        <div class="s-sub">保存即自动版本快照</div>
      </div>
      <div class="stat-card">
        <div class="s-label">待认证</div>
        <div class="s-value num" style="color: #fbbf24">{{ stats.pending }} <small>个</small></div>
        <div class="s-sub">平均认证周期 2.3 天</div>
      </div>
      <div class="stat-card">
        <div class="s-label">口径冲突告警</div>
        <div class="s-value num" style="color: #f87171">{{ stats.conflicts }} <small>处</small></div>
        <div class="s-sub"><span class="tag danger" style="font-size: 10.5px">同名不同口径</span> 需治理委员仲裁</div>
      </div>
    </section>

    <!-- 三栏工作台：目录树 + 列表 -->
    <div class="metric-bench" @click.stop>
      <div class="card domain-tree">
        <div class="card-title" style="margin-bottom: 8px"><i class="bar"></i>业务域</div>
        <div
          class="dt-item"
          :class="{ active: activeDomain === 'all' }"
          @click="activeDomain = 'all'; page = 1"
        >
          <span class="dt-dot" style="background: var(--brand)"></span>全部指标<span class="dt-cnt">{{ metrics.length }}</span>
        </div>
        <div
          v-for="d in domains"
          :key="d.name"
          class="dt-item"
          :class="{ active: activeDomain === d.name }"
          @click="activeDomain = d.name; page = 1"
        >
          <span class="dt-dot" :style="{ background: IND_COLOR[indOf(d.name)] }"></span>{{ d.name }}<span class="dt-cnt">{{ d.count }}</span>
        </div>
      </div>

      <div class="flex-col">
        <!-- 状态 tabs -->
        <div class="tabs-row">
          <div class="tab-item" :class="{ active: activeStatus === 'all' }" @click="activeStatus = 'all'; page = 1">
            全部 <em>{{ activeDomain === 'all' ? metrics.length : metrics.filter((m) => (m.bizDomain || '未分类') === activeDomain).length }}</em>
          </div>
          <div class="tab-item" :class="{ active: activeStatus === 'certified' }" @click="activeStatus = 'certified'; page = 1">
            已认证 <em>{{ metrics.filter((m) => m.certified).length }}</em>
          </div>
          <div class="tab-item" :class="{ active: activeStatus === 'pending' }" @click="activeStatus = 'pending'; page = 1">
            待认证 <em>{{ metrics.filter((m) => !m.certified).length }}</em>
          </div>
        </div>

        <!-- 指标卡列表 -->
        <div v-if="loading" class="empty">数据加载中…</div>
        <div v-else-if="!pageRows.length" class="empty">该筛选条件下暂无指标</div>

        <div v-for="m in pageRows" :key="m.id" class="card metric-card" :class="{ selected: drawerMetric?.id === m.id }" @click.stop="openDrawer(m)">
          <div class="mc-head">
            <span class="mc-name">{{ m.name }}</span>
            <span class="mc-code">{{ metricCode(m) }}</span>
            <span class="ind-tag" :style="{ '--c': IND_COLOR[indOf(m.name)] }">{{ IND_NAME[indOf(m.name)] }}</span>
            <span v-if="m.certified" class="tag ok">已认证</span>
            <span v-else class="tag warn">待认证</span>
            <span v-if="hasConflict(m)" class="tag danger" style="font-size: 10.5px">口径冲突</span>
            <span class="sm tx-3" style="margin-left: auto">统计周期：{{ m.timeField ? '按 ' + m.timeField : '—' }}</span>
          </div>
          <div class="mc-desc">
            {{ m.caliber || '（暂无口径说明）' }}
            <span v-if="hasConflict(m)" style="color: #f87171"> ⚠ 同名指标存在不同口径定义，待治理仲裁。</span>
          </div>
          <div class="mc-body">
            <svg class="mc-spark" viewBox="0 0 150 36" preserveAspectRatio="none">
              <template v-if="sparkPoints(m.id)">
                <polyline :points="sparkPoints(m.id)" fill="none" :stroke="sparkColor(m)" stroke-width="1.8" />
                <polygon :points="`2,33 ${sparkPoints(m.id)} 148,33`" :fill="sparkColor(m)" opacity="0.14" />
              </template>
              <text v-else x="75" y="22" text-anchor="middle" fill="#525D75" font-size="10">暂无趋势数据</text>
            </svg>
            <div class="mc-meta">
              <span>当前值<br /><b class="num">{{ valueMap[m.id] !== undefined && valueMap[m.id] !== null ? valueMap[m.id] : '…' }}</b></span>
              <span>同比<br /><b class="tx-3">—</b></span>
              <span>被引用<br /><b>—</b></span>
              <span class="mc-owner"><span class="avatar">{{ (m.owner || '管')[0] }}</span>{{ m.owner || '未指定' }}</span>
              <span class="link-btn" @click.stop="router.push(`/metric/${m.id}/edit`)">编辑</span>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="filteredMetrics.length > PAGE_SIZE" class="pager">
          <button class="pg-btn" type="button" :disabled="page <= 1" @click="gotoPage(page - 1)">‹</button>
          <button
            v-for="p in pageCount"
            :key="p"
            class="pg-btn"
            :class="{ cur: p === page }"
            type="button"
            @click="gotoPage(p)"
          >
            {{ p }}
          </button>
          <button class="pg-btn" type="button" :disabled="page >= pageCount" @click="gotoPage(page + 1)">›</button>
        </div>
      </div>
    </div>

    <!-- 指标消费拓扑 -->
    <div class="card topo-wrap" style="margin-top: 14px" @click.stop>
      <div class="card-title">
        <i class="bar"></i>指标消费拓扑
        <span class="tag brand">语义层一处定义 · 处处消费</span>
      </div>
      <div class="topo-legend">
        <span><i style="background: #ff8a3d"></i>指标</span>
        <span><i style="background: #22d3ee"></i>看板/图表</span>
        <span><i style="background: #fbbf24"></i>告警</span>
        <span><i style="background: #a78bfa"></i>问数/报表</span>
        <span><i style="background: #60a5fa"></i>API/数据源</span>
      </div>
      <div v-if="!metrics.length" class="empty">暂无指标，无法生成拓扑</div>
      <div v-show="metrics.length" ref="topoEl" class="topo-chart"></div>
    </div>

    <!-- ===== 详情抽屉 ===== -->
    <Teleport to="body">
    <div v-if="drawerMetric" class="drawer-mask">
      <div class="drawer" @click.stop>
        <div class="drawer-head">
          <div>
            <div class="flex" style="gap: 8px; flex-wrap: wrap">
              <b class="d-name-b">{{ drawerMetric.name }}</b>
              <span class="mc-code">{{ metricCode(drawerMetric) }}</span>
              <span class="ind-tag" :style="{ '--c': IND_COLOR[indOf(drawerMetric.name)] }">{{ IND_NAME[indOf(drawerMetric.name)] }}</span>
              <span class="tag" :class="drawerMetric.certified ? 'ok' : 'warn'">{{ drawerMetric.certified ? '已认证' : '待认证' }}</span>
            </div>
            <div class="sm tx-3" style="margin-top: 4px">{{ drawerMetric.caliber || '（暂无口径说明）' }}</div>
          </div>
          <button class="btn sm ghost d-close" type="button" @click="closeDrawer()">✕</button>
        </div>

        <div class="drawer-body">
          <!-- 1 指标定义 -->
          <div class="d-sec">
            <div class="d-sec-t">指标定义（语义层模型）</div>
            <dl class="def-grid">
              <dt>度量</dt>
              <dd>{{ drawerMetric.aggType }}({{ drawerMetric.valueField }})</dd>
              <dt>数据表</dt>
              <dd>{{ drawerMetric.tableName }}</dd>
              <dt>维度</dt>
              <dd>{{ parseDims(drawerMetric).join(' / ') || '—' }}</dd>
              <dt>统计周期</dt>
              <dd>{{ drawerMetric.timeField ? '按 ' + drawerMetric.timeField : '—' }}</dd>
              <dt>负责人</dt>
              <dd>{{ drawerMetric.owner || '—' }}</dd>
              <dt>当前值</dt>
              <dd><b class="num">{{ drawerValue?.value ?? '…' }}</b>　<span class="tx-3 sm">{{ drawerValue?.costMs }}ms</span></dd>
              <dt>业务域</dt>
              <dd>{{ drawerMetric.bizDomain || '未分类' }}</dd>
              <dt>权限</dt>
              <dd>
                <span class="tag info">行级权限继承</span>
                <span v-if="hasConflict(drawerMetric)" class="tag danger">口径冲突待仲裁</span>
                <span v-else class="tag warn">单井级敏感</span>
              </dd>
            </dl>
          </div>

          <!-- 2 编译 SQL -->
          <div class="d-sec">
            <div class="d-sec-t">指标查询引擎 · 编译 SQL 预览</div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="code-block" v-html="hlSql(drawerValue?.sql || '')"></div>
          </div>

          <!-- 3 版本历史 -->
          <div class="d-sec">
            <div class="d-sec-t">版本历史 <span class="sm tx-3" style="letter-spacing: 0">（点击版本 → 与当前版本口径对比）</span></div>
            <div v-if="!drawerVersions.length" class="sm tx-3">暂无版本记录</div>
            <div v-for="v in drawerVersions" :key="v.id" class="ver-item" @click="openCompare(v)">
              <span class="v-no">v{{ v.versionNo }}</span>
              <div class="grow">
                <b>{{ v.versionNo === drawerVersions[0]?.versionNo ? '当前版本 · ' : '' }}{{ v.changeNote }}</b>
                <div class="sm tx-3">{{ v.createTime }} · {{ v.createUserId }}</div>
              </div>
              <span class="tag" :class="v.versionNo === drawerVersions[0]?.versionNo ? 'ok' : ''">{{ v.versionNo === drawerVersions[0]?.versionNo ? '最新' : '历史' }}</span>
            </div>
          </div>

          <!-- 4 数据血缘 -->
          <div class="d-sec">
            <div class="d-sec-t">数据血缘（上游 → 下游消费）</div>
            <div class="lineage-row">
              <span class="lineage-node" style="border-color: rgba(96, 165, 250, 0.4); color: #60a5fa">数据源 · {{ drawerMetric.sourceId.slice(-6) }}</span>
              <span class="lineage-arrow">→</span>
              <span class="lineage-node" style="border-color: rgba(96, 165, 250, 0.4); color: #60a5fa">{{ drawerMetric.tableName }}</span>
              <span class="lineage-arrow">→</span>
              <span class="lineage-node" style="border-color: var(--brand-line); color: var(--brand)">指标 · {{ drawerMetric.name }}</span>
            </div>
            <div class="lineage-row">
              <span class="lineage-node" style="border-color: var(--brand-line); color: var(--brand)">指标 · {{ drawerMetric.name }}</span>
              <span class="lineage-arrow">→</span>
              <span class="lineage-node" style="border-color: rgba(34, 211, 238, 0.4); color: #22d3ee">看板设计器（拖入消费）</span>
              <span class="lineage-arrow">→</span>
              <span class="lineage-node" style="border-color: rgba(251, 191, 36, 0.4); color: #fbbf24">告警（待接入）</span>
            </div>
          </div>

          <!-- 5 消费方 -->
          <div class="d-sec">
            <div class="d-sec-t">消费方</div>
            <div class="row-item">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #22d3ee; flex: none"></span>
              <div class="grow">
                <div style="font-size: 12.5px">看板消费</div>
                <div class="sm tx-3">在看板设计器左栏「可拖入指标」拖入后即计入引用</div>
              </div>
              <span class="lineage-arrow">→</span>
            </div>
            <div class="row-item">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; flex: none"></span>
              <div class="grow">
                <div style="font-size: 12.5px">告警订阅</div>
                <div class="sm tx-3">告警规则绑定指标后自动计入（告警模块接入后生效）</div>
              </div>
              <span class="lineage-arrow">→</span>
            </div>
          </div>
        </div>

        <div class="drawer-foot">
          <button class="btn sm" type="button" @click="compareOpen = true">版本对比</button>
          <button class="btn sm" type="button" @click="router.push(`/metric/${drawerMetric.id}/edit`)">编辑指标</button>
          <button v-if="!drawerMetric.certified" class="btn sm primary" type="button" @click="doCertify(drawerMetric)">认证发布</button>
          <button class="btn sm danger" type="button" @click="onDelete(drawerMetric)">删除</button>
        </div>
      </div>
    </div>

    </Teleport>
    <!-- 版本对比 modal -->
    <Teleport to="body">
    <div v-if="compareOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="compareOpen = false">
      <div class="modal" style="width: 720px" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">版本口径对比 · v{{ compareOld?.versionNo }} ↔ 当前</div>
          <button class="btn sm ghost" type="button" @click="compareOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width: 92px">对比项</th>
                  <th>v{{ compareOld?.versionNo }}（历史）</th>
                  <th>当前</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in compareRows()" :key="row[0]" :style="row[1] !== row[2] ? 'background:var(--brand-soft);box-shadow:inset 3px 0 0 var(--brand)' : ''">
                  <td class="cell-main">{{ row[0] }}<span v-if="row[1] !== row[2]" class="tag brand" style="font-size: 10px; margin-left: 4px">差异</span></td>
                  <td style="font-size: 12px">{{ row[1] }}</td>
                  <td style="font-size: 12px">{{ row[2] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="sm tx-3" style="margin-top: 10px">品牌色高亮行为两版本差异项；口径快照在保存 / 认证时自动写入（FR-SEM-05）。</div>
        </div>
      </div>
    </div>

    </Teleport>
    <!-- 口径冲突 modal -->
    <Teleport to="body">
    <div v-if="conflictOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="conflictOpen = false">
      <div class="modal" style="width: 740px" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">口径冲突检测 · 同名不同口径</div>
          <button class="btn sm ghost" type="button" @click="conflictOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="sm tx-3 mb-2">
            已扫描 <b class="num">{{ metrics.length }}</b> 个指标，发现
            <b style="color: #f87171">{{ conflictPairs.length }} 处</b> 同名近义指标口径冲突。
          </div>
          <div v-if="!conflictPairs.length" class="empty">未发现口径冲突 —— 同名指标的口径定义一致</div>
          <div v-for="p in conflictPairs" :key="p.name" class="conflict-pair">
            <div class="conflict-col" style="margin-bottom: 10px">
              <b>{{ p.name }}</b> —— {{ p.items.length }} 个同名指标，口径描述不一致：
            </div>
            <div class="conflict-grid">
              <div v-for="(m, i) in p.items" :key="m.id" class="conflict-col" :style="{ borderColor: i === 0 ? 'rgba(255,138,61,.4)' : 'rgba(248,113,113,.4)' }">
                <div class="flex" style="gap: 8px; flex-wrap: wrap">
                  <b>{{ m.name }}</b><span class="mc-code">{{ metricCode(m) }}</span>
                  <span class="tag" :class="m.certified ? 'ok' : 'warn'">{{ m.certified ? '已认证' : '待认证' }}</span>
                </div>
                <dl class="def-grid" style="grid-template-columns: 76px 1fr; font-size: 12px; margin-top: 8px">
                  <dt>口径</dt><dd>{{ m.caliber || '—' }}</dd>
                  <dt>数据表</dt><dd>{{ m.tableName }}</dd>
                  <dt>负责人</dt><dd>{{ m.owner || '—' }}</dd>
                  <dt>当前值</dt><dd class="num">{{ valueMap[m.id] ?? '—' }}</dd>
                </dl>
              </div>
            </div>
            <div class="arb-hint">
              仲裁建议：同名近义指标需治理委员会（张总工）裁定归并方案 —— 保留一个主指标，其余更名挂接质量校验规则（FR-SEM-08）。
            </div>
          </div>
          <div class="flex" style="gap: 10px; margin-top: 14px; justify-content: flex-end">
            <button class="btn" type="button" @click="conflictOpen = false">关 闭</button>
            <button class="btn primary" type="button" @click="success('已发起治理仲裁：待治理委员会 5 个工作日内裁定（FR-SEM-08）')">发起治理仲裁</button>
          </div>
        </div>
      </div>
    </div>

    </Teleport>
    <!-- 新建 / 编辑指标 formModal -->
    <Teleport to="body">
    <div v-if="formOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="formOpen = false">
      <div class="modal" style="width: 600px" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ form.id ? '编辑指标 · ' + form.name : '新建指标（FR-SEM-01 语义定义）' }}</div>
          <button class="btn sm ghost" type="button" @click="formOpen = false">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">指标名称 *</label><input v-model="form.name" class="input" placeholder="如：井口综合含水率" /></div>
          <div class="form-item"><label class="form-label">业务域</label><input v-model="form.bizDomain" class="input" placeholder="如：油气勘探开发" /></div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">数据源 *</label>
              <select v-model="form.sourceId" class="input" @change="onFormSourceChange">
                <option value="">请选择…</option>
                <option v-for="s in formSources" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
            </div>
            <div class="form-item grow"><label class="form-label">数据表 *</label>
              <select v-model="form.tableName" class="input" :disabled="!form.sourceId" @change="onFormTableChange">
                <option value="">请选择…</option>
                <option v-for="t in formTables" :key="t.name" :value="t.name">{{ t.name }}</option>
              </select>
            </div>
          </div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">数值字段（度量）*</label>
              <select v-model="form.valueField" class="input" :disabled="!form.tableName">
                <option value="">请选择…</option>
                <option v-for="c in formColumns" :key="c.name" :value="c.name">{{ c.name }}（{{ c.typeName }}）{{ isNumericColumn(c) ? ' ✓数值' : '' }}</option>
              </select>
            </div>
            <div class="form-item" style="width: 170px"><label class="form-label">聚合方式 *</label>
              <select v-model="form.aggType" class="input">
                <option value="SUM">SUM</option><option value="AVG">AVG</option><option value="COUNT">COUNT</option>
                <option value="COUNT_DISTINCT">COUNT_DISTINCT</option><option value="MAX">MAX</option><option value="MIN">MIN</option>
              </select>
            </div>
          </div>
          <div class="form-item"><label class="form-label">可用维度（点击多选）</label>
            <div class="chip-zone">
              <span
                v-for="c in formColumns"
                :key="c.name"
                class="z-chip"
                :class="{ dim: form.dimensions.includes(c.name) }"
                @click="toggleFormDim(c.name)"
              >{{ c.name }}</span>
              <span v-if="!formColumns.length" class="tx-4 sm">选择数据表后展示可选维度</span>
            </div>
          </div>
          <div class="form-item"><label class="form-label">口径描述</label>
            <textarea v-model="form.caliber" class="input" rows="3" placeholder="业务口径、包含 / 排除范围、统计粒度与更新频率…"></textarea>
          </div>
          <div class="form-item"><label class="form-label">负责人</label><input v-model="form.owner" class="input" placeholder="如：admin" /></div>
          <div class="flex" style="gap: 10px; margin-top: 14px">
            <button class="btn primary grow" type="button" :disabled="formSaving" @click="submitForm">
              {{ formSaving ? '保存中…' : form.id ? '保存修改' : '创建指标' }}
            </button>
            <button class="btn" type="button" @click="formOpen = false">取消</button>
            <button v-if="!form.id" class="btn ghost" type="button" @click="formOpen = false; router.push('/metric/add')">高级向导 ›</button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ---- 三栏工作台 ---- */
.metric-bench { display: grid; grid-template-columns: 220px 1fr; gap: 14px; align-items: start; }
.domain-tree { padding: 10px; }
.dt-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px;
  cursor: pointer; font-size: 13px; color: var(--tx-2); transition: all 0.15s;
}
.dt-item:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.dt-item.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.dt-item .dt-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dt-item .dt-cnt { margin-left: auto; font-size: 11px; color: var(--tx-4); }
.dt-item.active .dt-cnt { color: var(--brand); }
.flex-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.tabs-row { display: flex; gap: 4px; }
.tab-item { padding: 8px 16px; font-size: 13px; color: var(--tx-3); cursor: pointer; border-radius: 9px; display: inline-flex; gap: 6px; }
.tab-item:hover { color: var(--tx-1); }
.tab-item.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.tab-item em { font-style: normal; font-size: 11px; color: var(--tx-4); }
.tab-item.active em { color: var(--brand); }

/* ---- 指标卡 ---- */
.metric-card { cursor: pointer; position: relative; padding: 14px 16px; }
.metric-card:hover { border-color: var(--line-3); transform: translateY(-2px); }
.metric-card.selected { border-color: var(--brand-line); }
.mc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mc-name { font-size: 15px; font-weight: 700; }
.mc-code { font-size: 11px; font-family: var(--font-mono, monospace); color: var(--tx-4); }
.mc-desc { font-size: 12.5px; color: var(--tx-3); margin-top: 6px; }
.mc-body { display: flex; align-items: flex-end; gap: 16px; margin-top: 12px; }
.mc-spark { width: 150px; height: 36px; flex: none; }
.mc-meta { display: flex; gap: 14px; font-size: 11.5px; color: var(--tx-3); flex-wrap: wrap; margin-left: auto; text-align: right; }
.mc-meta b { color: var(--tx-1); font-weight: 600; font-size: 13px; }
.mc-owner { display: flex; align-items: center; gap: 6px; }
.avatar { width: 20px; height: 20px; font-size: 10px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
.link-btn { color: var(--tx-3); cursor: pointer; font-size: 12px; padding: 2px 8px; border-radius: 6px; flex: none; }
.link-btn:hover { color: var(--brand); background: var(--brand-soft); }
.ind-tag {
  font-size: 11px; padding: 2px 9px; border-radius: 7px; color: var(--c, var(--tx-2)); white-space: nowrap;
  background: color-mix(in srgb, var(--c, #888) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c, #888) 35%, transparent);
}

/* ---- 抽屉 ---- */
.drawer-mask { position: fixed; inset: 0; background: rgba(4, 6, 10, 0.6); z-index: 95; display: flex; justify-content: flex-end; }
.drawer { width: 460px; max-width: 94vw; height: 100%; background: #0d1420; border-left: 1px solid var(--line-2); box-shadow: 0 8px 30px rgba(0,0,0,.45); display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; padding: 18px 20px 14px; border-bottom: 1px solid var(--line-1); display: flex; align-items: flex-start; gap: 10px; }
.d-name-b { font-size: 16px; color: var(--tx-1); }
.d-close { margin-left: auto; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 24px; }
.drawer-foot { flex: none; padding: 12px 20px; border-top: 1px solid var(--line-1); display: flex; gap: 10px; justify-content: flex-end; }
.d-sec { margin-bottom: 20px; }
.d-sec-t { font-size: 12px; color: var(--tx-3); letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.d-sec-t::before { content: ''; width: 3px; height: 10px; border-radius: 2px; background: var(--brand-grad, #ff8a3d); }
.def-grid { display: grid; grid-template-columns: 84px 1fr; gap: 8px 12px; font-size: 12.5px; }
.def-grid dt { color: var(--tx-3); }
.def-grid dd { color: var(--tx-1); margin: 0; }
.code-block {
  background: rgba(5, 8, 14, 0.8); border: 1px solid var(--line-1); border-radius: 10px;
  padding: 12px 14px; font-family: var(--font-mono, monospace); font-size: 11.5px; line-height: 1.7;
  color: #c9d4e8; overflow-x: auto; white-space: pre;
}
.code-block :deep(.kw) { color: #ff8a3d; }
.code-block :deep(.fn) { color: #22d3ee; }
.code-block :deep(.cm) { color: #525d75; }
.code-block :deep(.pc) { color: #e8b33c; }
.ver-item { display: flex; gap: 12px; padding: 8px 10px; border-radius: 8px; margin: 0 -10px; font-size: 12.5px; cursor: pointer; }
.ver-item:hover { background: var(--bg-glass-2); }
.ver-item .v-no { font-family: var(--font-mono, monospace); color: var(--brand); flex: none; width: 44px; }
.lineage-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 0; flex-wrap: wrap; }
.lineage-node {
  padding: 3px 10px; border-radius: 8px; border: 1px solid var(--line-2);
  background: var(--bg-glass-2); font-size: 11.5px; white-space: nowrap;
}
.lineage-arrow { color: var(--tx-4); flex: none; }
.grow { flex: 1; min-width: 0; }

/* ---- 拓扑 ---- */
.topo-wrap { position: relative; padding: 14px; }
.topo-legend { position: absolute; right: 16px; top: 14px; display: flex; gap: 12px; font-size: 11.5px; color: var(--tx-3); z-index: 2; }
.topo-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.topo-chart { height: 340px; width: 100%; }

/* ---- 冲突 / 弹窗 ---- */
.modal { width: 600px; max-width: 94vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.conflict-pair { margin-bottom: 16px; }
.conflict-col { border-radius: 12px; padding: 14px 16px; border: 1px solid var(--line-2); background: var(--bg-glass); }
.conflict-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.arb-hint { border: 1px solid var(--line-1); border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: var(--tx-2); line-height: 1.8; }
.chip-zone { display: flex; gap: 6px; flex-wrap: wrap; }
.z-chip { font-size: 11px; padding: 3px 10px; border-radius: 7px; background: var(--bg-glass-2); color: var(--tx-2); border: 1px solid var(--line-2); cursor: pointer; }
.z-chip.dim { background: rgba(96, 165, 250, 0.12); color: #60a5fa; border-color: rgba(96, 165, 250, 0.35); }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.p-inputgroup { display: flex; gap: 6px; }
.p-inputgroup .input { flex: 1; }
.top-search {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 10px;
  border: 1px solid var(--line-2); background: var(--bg-glass); min-width: 240px;
}
.top-search input { border: none; outline: none; background: transparent; color: var(--tx-1); font-size: 12.5px; font-family: inherit; width: 100%; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 14px; }
@media (max-width: 1100px) { .metric-bench { grid-template-columns: 1fr; } }
</style>

<style>
/* Teleport 弹层（body 下）脱离 .ds-page 作用域：此处补弹层内所需的组件类样式 */
.drawer-mask .tag {
  display: inline-flex; align-items: center;
  font-size: 11px; line-height: 1.4; padding: 2px 9px; border-radius: 7px;
  background: rgba(124, 136, 160, 0.16); color: #b9c2d4; border: 1px solid rgba(124, 136, 160, 0.3);
  white-space: nowrap;
}
.drawer-mask .tag.ok { background: rgba(52, 211, 153, 0.13); color: #34d399; border-color: rgba(52, 211, 153, 0.35); }
.drawer-mask .tag.warn { background: rgba(251, 191, 36, 0.13); color: #fbbf24; border-color: rgba(251, 191, 36, 0.35); }
.drawer-mask .tag.danger { background: rgba(248, 113, 113, 0.13); color: #f87171; border-color: rgba(248, 113, 113, 0.35); }
.drawer-mask .tag.info { background: rgba(96, 165, 250, 0.13); color: #60a5fa; border-color: rgba(96, 165, 250, 0.35); }
.drawer-mask .tag.brand { background: rgba(255, 138, 61, 0.14); color: #ff8a3d; border-color: rgba(255, 138, 61, 0.35); }
.drawer-mask .btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-family: inherit; font-weight: 500;
  padding: 6px 14px; border-radius: 10px; cursor: pointer; transition: all 0.18s;
  border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.06); color: #f2f5fa;
  white-space: nowrap;
}
.drawer-mask .btn:hover { background: rgba(255, 255, 255, 0.09); border-color: rgba(255, 255, 255, 0.18); }
.drawer-mask .btn.primary { background: linear-gradient(135deg, #ffb25e 0%, #ff8a3d 45%, #f4633a 100%); border: none; color: #241105; font-weight: 600; }
.drawer-mask .btn.danger { color: #f87171; }
.drawer-mask .btn.ghost { background: transparent; border-color: transparent; }
.drawer-mask .btn.ghost:hover { background: rgba(255, 255, 255, 0.06); }
.drawer-mask .input, .drawer-mask .select {
  width: 100%; background: rgba(255, 255, 255, 0.035); color: #f2f5fa;
  border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px;
  padding: 7px 10px; font-size: 12.5px; font-family: inherit; outline: none;
}
.drawer-mask .input:focus, .drawer-mask .select:focus { border-color: rgba(255, 138, 61, 0.35); }
.drawer-mask .switch { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.drawer-mask .switch input { opacity: 0; position: absolute; width: 0; }
.drawer-mask .switch i { width: 34px; height: 19px; background: rgba(255, 255, 255, 0.12); border-radius: 99px; display: block; position: relative; transition: 0.18s; }
.drawer-mask .switch i::after { content: ""; width: 15px; height: 15px; background: #fff; border-radius: 50%; position: absolute; left: 2px; top: 2px; transition: 0.18s; }
.drawer-mask .switch input:checked + i { background: #ff8a3d; }
.drawer-mask .switch input:checked + i::after { left: 17px; }
.drawer-mask .seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: rgba(255, 255, 255, 0.035); border: 1px solid rgba(255, 255, 255, 0.07); }
.drawer-mask .seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: #7c88a0; cursor: pointer; }
.drawer-mask .seg-item.active { background: rgba(255, 138, 61, 0.14); color: #ff8a3d; }
.drawer-mask .chip-zone { display: flex; gap: 6px; flex-wrap: wrap; }
.drawer-mask .z-chip { font-size: 11px; padding: 3px 10px; border-radius: 7px; background: rgba(255, 255, 255, 0.06); color: #b9c2d4; border: 1px solid rgba(255, 255, 255, 0.12); cursor: pointer; }
.drawer-mask .z-chip.dim { background: rgba(96, 165, 250, 0.12); color: #60a5fa; border-color: rgba(96, 165, 250, 0.35); }
.drawer-mask .p-inputgroup { display: flex; gap: 6px; }
.drawer-mask .p-inputgroup .input { flex: 1; }
.drawer-mask .empty { padding: 40px 20px; text-align: center; color: #7c88a0; font-size: 12.5px; }
.drawer-mask .table-wrap { overflow-x: auto; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; }
.drawer-mask .tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.drawer-mask .tbl th, .drawer-mask .tbl td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #b9c2d4; }
.drawer-mask .tbl th { color: #7c88a0; font-weight: 600; font-size: 11.5px; white-space: nowrap; }
.drawer-mask .cell-main { color: #f2f5fa; font-weight: 600; font-size: 12.5px; }
</style>
