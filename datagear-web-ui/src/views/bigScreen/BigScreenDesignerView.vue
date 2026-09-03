<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBigScreen, getBigScreenDesign, saveBigScreenDesign, saveBigScreen } from '@/api/bigScreen'
import { chartPagingQueryData, type ChartEntity } from '@/api/chart'
import { useOperationMessage } from '@/composables/useOperationMessage'
import {
  newScreenDesign,
  nextWidgetId,
  type DashboardDesign,
  type DgWidget,
  type WidgetType,
} from '@/types/dashboardDesign'
import WidgetLibrary from '@/components/dashboard/WidgetLibrary.vue'
import { metricPagingQueryData, type MetricEntity } from '@/api/metric'
import DesignCanvas from '@/components/dashboard/DesignCanvas.vue'
import PropertyPanel from '@/components/dashboard/PropertyPanel.vue'

/**
 * 数据大屏设计器：固定 1920×1080 舞台，复用看板可视化画布/部件库/属性面板，
 * 设计产物 JSON 通过 /api/bigScreen/saveDesign 持久化。
 */
const route = useRoute()
const router = useRouter()
/** 无 id 时为「新建模式」：首次保存创建大屏后原地接管（支持二级菜单直达 /screen/design） */
const screenId = ref<string>(route.params.id as string)
const { success, fail } = useOperationMessage()

const name = ref('')
const widgets = ref<DgWidget[]>([])
const canvasConfig = ref(newScreenDesign().canvas)
const selectedId = ref<string | null>(null)
const charts = ref<ChartEntity[]>([])
const libMetrics = ref<MetricEntity[]>([])
const libCharts = computed(() => charts.value.map((c) => ({ id: c.id, name: c.name })))
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)

const undoStack = ref<DgWidget[][]>([])
const redoStack = ref<DgWidget[][]>([])
let dragWidgetId: string | null = null

function cloneWidgets(): DgWidget[] {
  return JSON.parse(JSON.stringify(widgets.value))
}
function pushSnapshot() {
  undoStack.value.push(cloneWidgets())
  if (undoStack.value.length > 50) undoStack.value.shift()
  redoStack.value = []
}
function markDirty() {
  dirty.value = true
}

const design = computed<DashboardDesign>(() => ({
  version: '1.0',
  canvas: canvasConfig.value,
  widgets: widgets.value,
}))
const selectedWidget = computed<DgWidget | null>(
  () => widgets.value.find((it) => it.id === selectedId.value) ?? null,
)

/* ---------- load ---------- */
function parseDesignJson(json: string): DashboardDesign | null {
  if (!json) return null
  try {
    const obj = JSON.parse(json)
    if (!obj || obj.version !== '1.0' || !Array.isArray(obj.widgets)) return null
    return obj as DashboardDesign
  } catch {
    return null
  }
}

async function load() {
  // 新建模式（菜单直达，无大屏 id）：从示例画布开始，首次保存时创建大屏
  if (!screenId.value) {
    name.value = '未命名大屏'
    try {
      const cd = await chartPagingQueryData({ page: 1, pageSize: 500 })
      charts.value = cd.items
      metricPagingQueryData({ page: 1, pageSize: 100 }).then((md) => { libMetrics.value = md.items }).catch(() => {})
    } catch { /* ignore */ }
    addDemo()
    return
  }
  loading.value = true
  try {
    const d = await getBigScreen(screenId.value)
    name.value = d.name
    const json = await getBigScreenDesign(screenId.value)
    const parsed = parseDesignJson(json)
    if (parsed) {
      widgets.value = parsed.widgets
      canvasConfig.value = parsed.canvas
    } else {
      const nd = newScreenDesign()
      widgets.value = []
      canvasConfig.value = nd.canvas
    }
    const cd = await chartPagingQueryData({ page: 1, pageSize: 500 })
    charts.value = cd.items
    metricPagingQueryData({ page: 1, pageSize: 100 })
      .then((md) => { libMetrics.value = md.items })
      .catch(() => { /* 语义层未就绪时空态 */ })
    await nextTick()
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

/* ---------- widget ops ---------- */
function newWidget(payload: { type: WidgetType; n: number }): DgWidget {
  const h =
    payload.type === 'title' ? 56
    : payload.type === 'divider' ? 24
    : payload.type === 'kpi' ? 160
    : payload.type === 'filter' ? 100
    : 340
  const w = payload.type === 'chart' || payload.type === 'table' ? 460 : payload.type === 'title' ? 600 : 300
  const count = widgets.value.length
  const x = 40 + (count % 4) * 50
  const y = 40 + Math.floor(count / 4) * 50
  return {
    id: nextWidgetId(payload.n),
    type: payload.type,
    name: payload.type === 'chart' ? '新图表' : payload.type,
    x: Math.min(x, 1920 - w),
    y,
    w,
    h,
    data: { refresh: 300, inheritRowAuth: true, dims: [], measures: [] },
    style: { radius: 12, opacity: 85, fontSize: 'medium', showTrend: false, showMini: false, color: '#FF8A3D' },
    link: { filters: [] },
  }
}

function onAddWidget(payload: { type: WidgetType; n: number }) {
  pushSnapshot()
  const wgt = newWidget(payload)
  widgets.value.push(wgt)
  selectedId.value = wgt.id
  markDirty()
}

/** 从「可拖入指标（语义层）」添加绑定该指标的指标卡部件 */
function onAddMetric(payload: { metric: { id?: string; code?: string; name: string }; n: number }) {
  pushSnapshot()
  const wgt = newWidget({ type: 'kpi', n: payload.n })
  wgt.name = payload.metric.name
  wgt.metricId = payload.metric.id
  wgt.style!.title = `${payload.metric.name} · 实时`
  wgt.data!.measures = [`${payload.metric.name}（${payload.metric.id || payload.metric.code}）`]
  widgets.value.push(wgt)
  selectedId.value = wgt.id
  markDirty()
}

/** 组件库拖放到画布：按光标位置创建（部件中心对齐光标；8px 吸附已在画布侧完成） */
function onDropAdd(payload: Record<string, unknown>, x: number, y: number) {
  pushSnapshot()
  let wgt: DgWidget
  if (payload.kind === 'metric') {
    wgt = newWidget({ type: 'kpi', n: Date.now() % 100000 })
    wgt.name = String(payload.name ?? '指标卡')
    wgt.metricId = payload.metricId as string
    wgt.style!.title = `${payload.name} · 实时`
    wgt.data!.measures = [`${payload.name}（${payload.metricId}）`]
  } else {
    const type = payload.type as WidgetType
    wgt = newWidget({ type, n: Date.now() % 100000 })
    if (payload.name) wgt.name = String(payload.name)
    if (typeof payload.w === 'number') wgt.w = payload.w
    if (typeof payload.h === 'number') wgt.h = payload.h
  }
  wgt.x = Math.max(0, x - Math.round(wgt.w / 2))
  wgt.y = Math.max(0, y - Math.round(wgt.h / 2))
  widgets.value.push(wgt)
  selectedId.value = wgt.id
  markDirty()
}
/** 从「我的图表」添加绑定已有图表的部件 */
function onAddChart(payload: { chart: { id: string; name: string }; n: number }) {
  pushSnapshot()
  const wgt = newWidget({ type: 'chart', n: payload.n })
  wgt.name = payload.chart.name
  wgt.chartId = payload.chart.id
  wgt.style!.title = payload.chart.name
  widgets.value.push(wgt)
  selectedId.value = wgt.id
  markDirty()
}
function onSelect(id: string | null) {
  selectedId.value = id
}
function onMove(id: string, x: number, y: number) {
  const w = widgets.value.find((it) => it.id === id)
  if (!w) return
  if (dragWidgetId !== id) {
    pushSnapshot()
    dragWidgetId = id
  }
  w.x = Math.max(0, x)
  w.y = Math.max(0, y)
  markDirty()
}
function onResize(id: string, d: { x: number; y: number; w: number; h: number }) {
  const w = widgets.value.find((it) => it.id === id)
  if (!w) return
  if (dragWidgetId !== id) {
    pushSnapshot()
    dragWidgetId = id
  }
  w.x = Math.max(0, d.x)
  w.y = Math.max(0, d.y)
  w.w = Math.max(60, d.w)
  w.h = Math.max(32, d.h)
  markDirty()
}
function onRemove(id: string) {
  pushSnapshot()
  const idx = widgets.value.findIndex((it) => it.id === id)
  if (idx >= 0) widgets.value.splice(idx, 1)
  if (selectedId.value === id) selectedId.value = null
  markDirty()
}
function undo() {
  if (!undoStack.value.length) return
  redoStack.value.push(cloneWidgets())
  widgets.value = undoStack.value.pop()!
  markDirty()
}
function redo() {
  if (!redoStack.value.length) return
  undoStack.value.push(cloneWidgets())
  widgets.value = redoStack.value.pop()!
  markDirty()
}
const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

function addDemo() {
  if (widgets.value.length) return
  pushSnapshot()
  // 示例布局对齐原型 screen.html「集团能源生产运营驾驶舱」：
  // 顶部标题 + 四大产业 KPI 行 + 产量趋势/完成率（左） + 产区地图（中） + 告警/场站/能耗（右）
  // 大屏名称由展示页头部大标题承担（scr-head），画布不再放标题部件
  const items: DgWidget[] = [
    // 四大产业 KPI 行
    { ...newWidget({ type: 'kpi', n: 2 }), name: '原油产量', value: '12.86', unit: '万吨', trend: 5.1, x: 40, y: 120, w: 300, h: 160, style: { color: '#FF8A3D', showTrend: true, title: '原油产量 · 昨日' } },
    { ...newWidget({ type: 'kpi', n: 3 }), name: '天然气产量', value: '4.32', unit: '亿方', trend: 8.6, x: 360, y: 120, w: 300, h: 160, style: { color: '#22D3EE', showTrend: true, title: '天然气产量 · 昨日' } },
    { ...newWidget({ type: 'kpi', n: 4 }), name: '化工品产量', value: '3.15', unit: '万吨', trend: 3.2, x: 680, y: 120, w: 300, h: 160, style: { color: '#A78BFA', showTrend: true, title: '化工品产量 · 昨日' } },
    { ...newWidget({ type: 'kpi', n: 5 }), name: '原煤产量', value: '28.4', unit: '万吨', trend: 0.6, x: 1000, y: 120, w: 300, h: 160, style: { color: '#E8B33C', showTrend: true, title: '原煤产量 · 昨日' } },
    // 左侧：近30日产量趋势（绑定真实图表）
    { ...newWidget({ type: 'chart', n: 6 }), name: '近30日产量趋势', x: 40, y: 310, w: 620, h: 380, style: { title: '近30日产量趋势（万吨 / 亿方）' } },
    // 左下：月度生产完成率（进度环）
    { ...newWidget({ type: 'progress', n: 7 }), name: '月度生产完成率', x: 40, y: 710, w: 620, h: 320, style: { title: '月度生产完成率 · 截至昨日' } },
    // 中部：主力产区分布地图（绑定真实地图图表）
    { ...newWidget({ type: 'chart', n: 8 }), name: '主力产区分布与管网输送', x: 690, y: 310, w: 620, h: 720, style: { title: '主力产区分布与管网输送（气泡 = 日产量）' } },
    // 右侧：实时告警 / 场站状态 / 能耗排放
    { ...newWidget({ type: 'text', n: 9 }), name: '实时告警', x: 1340, y: 120, w: 540, h: 180, style: { title: '实时告警（3 未处理）' }, text: '【告警】长庆区块日产油量低于阈值 100 万吨 · 08:12\n【订阅】经营日报已推送至企业微信 · 08:00\n【质量】ODS_采油日报表 质量校验通过 98.6% · 昨日 22:00' },
    { ...newWidget({ type: 'table', n: 10 }), name: '场站 / 装置运行状态', x: 1340, y: 320, w: 540, h: 400, style: { title: '场站 / 装置运行状态（共 24 座）' } },
    { ...newWidget({ type: 'chart', n: 11 }), name: '能耗与排放', x: 1340, y: 740, w: 540, h: 290, style: { title: '能耗与排放（本月累计）' } },
  ]
  // 示例图表部件绑定真实图表，画布立即呈现真实取数效果
  const realCharts = charts.value
  const bindMap: Record<string, number> = { '近30日产量趋势': 0, '主力产区分布与管网输送': 2, 能耗与排放: 1 }
  for (const it of items) {
    if (it.type !== 'chart') continue
    const idx = bindMap[it.name]
    const c = idx !== undefined ? realCharts[idx] : undefined
    if (c) {
      it.chartId = c.id
      it.name = it.style!.title || it.name
    }
  }
  widgets.value = items
  selectedId.value = items[1]?.id ?? null
  markDirty()
}

/* ---------- save / preview ---------- */
async function saveDraft() {
  saving.value = true
  try {
    // 新建模式：先创建大屏实体再写设计 JSON，并原地接管路由
    if (!screenId.value) {
      const created = await saveBigScreen({ id: undefined as unknown as string, name: name.value || '未命名大屏' })
      screenId.value = created.id
      router.replace(`/screen/${created.id}/design`)
    }
    await saveBigScreenDesign(screenId.value, JSON.stringify(design.value))
    dirty.value = false
    success('大屏已保存')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}
function preview() {
  router.push(`/screen/${screenId.value}/viewer`)
}
function back() {
  router.push('/screen')
}

onMounted(async () => {
  await load()
  if (!widgets.value.length) addDemo()
})
</script>

<template>
  <div class="designer">
    <!-- 工具栏 -->
    <div class="d-toolbar">
      <div class="d-name">{{ name }} <span class="tag warn">{{ dirty ? '编辑中' : '已保存' }}</span></div>
      <div class="d-divider"></div>
      <button class="t-icon-btn" title="撤销" :disabled="!canUndo" @click="undo"><i class="pi pi-replay"></i></button>
      <button class="t-icon-btn" title="重做" :disabled="!canRedo" @click="redo"><i class="pi pi-forward"></i></button>
      <div class="d-divider"></div>
      <span class="d-meta">舞台 1920×1080 · 12 列栅格 · 吸附 8px</span>
      <div class="spacer"></div>
      <button class="btn sm ghost" @click="back">← 返回</button>
      <button class="btn sm ghost" @click="preview">全屏预览</button>
      <button class="btn sm primary" :disabled="saving" @click="saveDraft"><i class="pi pi-save"></i>保存</button>
    </div>

    <div class="d-bench">
      <div class="card d-lib">
        <WidgetLibrary :metrics="libMetrics" :charts="libCharts" @add-widget="onAddWidget" @add-metric="onAddMetric" @add-chart="onAddChart" />
      </div>

      <div class="d-canvas-wrap">
        <div class="d-modebar">
          <i class="pi pi-info-circle"></i>
          可视化拖拽模式（FR-SCREEN）· 当前：<span class="tag info">大屏设计</span>
          <span class="bp-hint">固定舞台 1920×1080 · 展示页等比缩放适配任意大屏</span>
        </div>
        <div v-if="loading" class="p-4 text-color-secondary">加载中…</div>
        <DesignCanvas
          v-else
          :design="design"
          :widgets="widgets"
          :selected-id="selectedId"
          @select="onSelect"
          @move="onMove"
          @resize="onResize"
          @remove="onRemove"
          @drop-add="onDropAdd"
        />
      </div>

      <div class="card d-prop">
        <PropertyPanel :widget="selectedWidget" :charts="charts" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.designer {
  --bg-glass: rgba(255,255,255,.035);
  --bg-glass-2: rgba(255,255,255,.06);
  --bg-glass-3: rgba(255,255,255,.09);
  --line-1: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --line-3: rgba(255,255,255,.18);
  --tx-1: #F2F5FA;
  --tx-2: #B9C2D4;
  --tx-3: #7C88A0;
  --tx-4: #525D75;
  --brand: #FF8A3D;
  --brand-grad: linear-gradient(135deg,#FFB25E 0%,#FF8A3D 45%,#F4633A 100%);
  --brand-soft: rgba(255,138,61,.14);
  --brand-line: rgba(255,138,61,.35);
  --info: #60A5FA;
  --info-soft: rgba(96,165,250,.12);
  --warn: #FBBF24;
  --r-m: 12px;
  --r-l: 14px;
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;

  /* 设计器是 MainLayout 之外的顶级路由，必须自带暗色底，否则玻璃面板落在浅色 body 上变白 */
  background:
    radial-gradient(1200px 500px at 85% -10%, rgba(255, 138, 61, 0.08), transparent 60%),
    radial-gradient(900px 420px at -10% 110%, rgba(34, 211, 238, 0.06), transparent 60%),
    #0a0e17;
  color: var(--tx-1);

  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
  padding: 12px 16px 16px;
}
.d-toolbar {
  flex: none; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-l);
  padding: 8px 14px;
}
.d-name { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.d-name .tag { font-weight: 400; font-size: 10.5px; }
.d-divider { width: 1px; height: 20px; background: var(--line-2); }
.d-meta { font-size: 11.5px; color: var(--tx-4); }
.spacer { flex: 1; }
.t-icon-btn {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; color: var(--tx-3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.t-icon-btn:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.t-icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-family: inherit; font-weight: 500;
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid var(--line-2); background: var(--bg-glass);
  color: var(--tx-1); cursor: pointer; transition: all .18s;
  white-space: nowrap;
}
.btn:hover { background: var(--bg-glass-3); border-color: var(--line-3); }
.btn.primary { background: var(--brand-grad); border: none; color: #241105; font-weight: 600; box-shadow: 0 4px 16px rgba(244,99,58,.3); }
.btn.sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
.btn.ghost { background: transparent; }
.d-bench { flex: 1; min-height: 0; display: grid; grid-template-columns: 220px 1fr 300px; gap: 10px; }
.card { background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: 14px; backdrop-filter: blur(10px); }
.d-lib { display: flex; flex-direction: column; min-height: 0; padding: 12px; overflow: hidden; }
.d-prop { display: flex; flex-direction: column; min-height: 0; padding: 12px 14px; overflow: hidden; }
.d-canvas-wrap { display: flex; flex-direction: column; min-width: 0; gap: 8px; }
.d-modebar {
  flex: none; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--tx-3);
  border-radius: 12px; padding: 6px 14px;
}
.d-modebar .pi { color: var(--info); }
.d-modebar .tag { font-size: 10.5px; }
.bp-hint { margin-left: auto; font-size: 11px; color: var(--tx-4); }
.p-4 { padding: 16px; }
.text-color-secondary { color: var(--tx-3); }
</style>
