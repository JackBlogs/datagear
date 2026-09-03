<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDashboard,
  getDashboardResourceContent,
  saveDashboardResourceContent,
  parseDesignFromResource,
  serializeDesignToResource,
} from '@/api/dashboard'
import { chartPagingQueryData, type ChartEntity } from '@/api/chart'
import { useOperationMessage } from '@/composables/useOperationMessage'
import {
  newDesign,
  breakpointSize,
  nextWidgetId,
  type Breakpoint,
  type DashboardDesign,
  type DgWidget,
  type WidgetType,
} from '@/types/dashboardDesign'
import DesignToolbar from '@/components/dashboard/DesignToolbar.vue'
import WidgetLibrary from '@/components/dashboard/WidgetLibrary.vue'
import DesignCanvas from '@/components/dashboard/DesignCanvas.vue'
import PropertyPanel from '@/components/dashboard/PropertyPanel.vue'

/**
 * 看板设计器（三栏可视化拖拽）。设计产物序列化为看板 index.html 资源内容持久化。
 */
const route = useRoute()
const router = useRouter()
const dashboardId = route.params.id as string
const { success, fail } = useOperationMessage()

const name = ref('')
const widgets = ref<DgWidget[]>([])
const canvasConfig = ref(newDesign('desktop').canvas)
const breakpoint = ref<Breakpoint>('desktop')
const selectedId = ref<string | null>(null)
const charts = ref<ChartEntity[]>([])
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)
const codeMode = ref(false)
const rawHtml = ref('')
/** 最近一次草稿自动保存时间（对齐原型「草稿已自动保存 hh:mm:ss」） */
const savedAt = ref('')
let autosaveTimer: ReturnType<typeof setTimeout> | null = null

/* 撤销 / 重做快照 */
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

/* ---------------- 加载 ---------------- */
async function load() {
  loading.value = true
  try {
    const d = await getDashboard(dashboardId)
    name.value = d.name
    const res = await getDashboardResourceContent(dashboardId, 'index.html')
    const raw = res.resourceContent ?? ''
    rawHtml.value = raw
    const parsed = parseDesignFromResource(raw)
    if (parsed) {
      widgets.value = parsed.widgets
      canvasConfig.value = parsed.canvas
      breakpoint.value = parsed.canvas.breakpoint ?? 'desktop'
    } else if (raw) {
      // 原生模板（无可视化设计）：从空画布开始，保留原始 HTML 供源码模式编辑
      const nd = newDesign('desktop')
      widgets.value = []
      canvasConfig.value = nd.canvas
    } else {
      const nd = newDesign('desktop')
      widgets.value = []
      canvasConfig.value = nd.canvas
      rawHtml.value = serializeDesignToResource(nd, name.value)
    }
    const cd = await chartPagingQueryData({ page: 1, pageSize: 500 })
    charts.value = cd.items
    await nextTick()
  } catch (e) {
    fail((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

/* ---------------- 部件操作 ---------------- */
function newWidget(payload: { type: WidgetType; n: number }): DgWidget {
  const [cw] = breakpointSize(breakpoint.value)
  const w = payload.type === 'title' || payload.type === 'divider' || payload.type === 'filter' ? 420 : 300
  const h =
    payload.type === 'title' ? 50
    : payload.type === 'divider' ? 20
    : payload.type === 'kpi' ? 140
    : payload.type === 'filter' ? 90
    : 300
  const count = widgets.value.length
  const x = 24 + (count % 3) * 40
  const y = 24 + Math.floor(count / 3) * 40
  return {
    id: nextWidgetId(payload.n),
    type: payload.type,
    name: payload.type === 'chart' ? '新图表' : payload.type,
    x: Math.min(x, cw - w),
    y,
    w,
    h,
    data: { refresh: 300, inheritRowAuth: true, dims: [], measures: [] },
    style: { radius: 10, opacity: 85, fontSize: 'medium', showTrend: false, showMini: false, color: '#FF8A3D' },
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
function onAddMetric(payload: { metric: { code: string; name: string }; n: number }) {
  pushSnapshot()
  const wgt = newWidget({ type: 'kpi', n: payload.n })
  wgt.name = payload.metric.name
  wgt.style.title = `${payload.metric.name} · 昨日`
  wgt.data.measures = [`${payload.metric.name}（${payload.metric.code}）`]
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

function endDrag() {
  dragWidgetId = null
}

/* ---------------- 撤销 / 重做 ---------------- */
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

/* ---------------- 断点 ---------------- */
function onBreakpoint(bp: Breakpoint) {
  breakpoint.value = bp
  const [w, h] = breakpointSize(bp)
  canvasConfig.value = { ...canvasConfig.value, width: w, height: h, breakpoint: bp }
  markDirty()
}

/* ---------------- 保存 / 发布 / 预览 ---------------- */
function buildHtml(): string {
  if (codeMode.value) return rawHtml.value
  return serializeDesignToResource(design.value, name.value)
}

async function persistContent(html: string) {
  await saveDashboardResourceContent(dashboardId, 'index.html', html)
}

async function saveDraft(quiet = false) {
  saving.value = true
  try {
    const html = buildHtml()
    await persistContent(html)
    rawHtml.value = html
    dirty.value = false
    const now = new Date()
    savedAt.value = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':')
    if (!quiet) success('草稿已保存')
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

/* ---------------- 草稿自动保存（编辑停顿 2.5s 后静默保存） ---------------- */
watch(
  [widgets, name],
  () => {
    if (!dirty.value || loading.value) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null
      if (dirty.value && !saving.value) saveDraft(true)
    }, 2500)
  },
  { deep: true },
)

async function publish() {
  saving.value = true
  try {
    const html = buildHtml()
    await persistContent(html)
    rawHtml.value = html
    dirty.value = false
    success('发布成功：已生成看板链接')
    router.push(`/dashboard/${dashboardId}/viewer`)
  } catch (e) {
    fail((e as Error).message || '发布失败')
  } finally {
    saving.value = false
  }
}

function preview() {
  router.push(`/dashboard/${dashboardId}/viewer`)
}

function toggleCode() {
  codeMode.value = !codeMode.value
  if (codeMode.value) rawHtml.value = buildHtml()
}

/** 源码模式：将编辑后的 HTML 应用为可视化设计（可解析时） */
function applyRawToDesign() {
  const parsed = parseDesignFromResource(rawHtml.value)
  if (!parsed) {
    fail('当前源码不是可视化设计格式，无法解析到画布；可直接保存为原生模板')
    return
  }
  widgets.value = parsed.widgets
  canvasConfig.value = parsed.canvas
  breakpoint.value = parsed.canvas.breakpoint ?? 'desktop'
  markDirty()
  success('已应用源码到画布')
}

function addInitialDemo() {
  // 空白看板给一点默认示例，便于立即看到效果
  if (widgets.value.length) return
  pushSnapshot()
  const items: DgWidget[] = [
    { ...newWidget({ type: 'title', n: 1 }), name: '看板标题', text: '华北油田生产日报', style: { fontSize: 'large', color: '#FF8A3D' }, w: 560, h: 50 },
    { ...newWidget({ type: 'kpi', n: 2 }), name: '原油产量', value: '12.86', unit: '万吨', trend: 2.4, style: { fontSize: 'medium', color: '#FF8A3D', showTrend: true }, w: 300, h: 140 },
    { ...newWidget({ type: 'kpi', n: 3 }), name: '天然气', value: '4.32', unit: '亿方', trend: 8.6, style: { color: '#22D3EE', showTrend: true }, w: 300, h: 140 },
    { ...newWidget({ type: 'chart', n: 4 }), name: '产量趋势', w: 620, h: 320 },
  ]
  items.forEach((it, i) => {
    it.x = 24 + i * 40
    it.y = 24 + i * 40
    it.style = it.style ?? {}
  })
  // 示例图表部件绑定真实图表，画布立即呈现真实取数效果
  items
    .filter((it) => it.type === 'chart')
    .forEach((cw, i) => {
      const c = charts.value[i]
      if (c) {
        cw.chartId = c.id
        cw.name = c.name
      }
    })
  widgets.value = items
  selectedId.value = items[1]?.id ?? null
  markDirty()
}

watch(selectedId, () => endDrag())

onMounted(async () => {
  await load()
  if (!widgets.value.length) addInitialDemo()
})
</script>

<template>
  <div class="designer">
    <DesignToolbar
      :name="name"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :breakpoint="breakpoint"
      :dirty="dirty"
      :saving="saving"
      :saved-at="savedAt"
      @undo="undo"
      @redo="redo"
      @breakpoint="onBreakpoint"
      @preview="preview"
      @save-draft="saveDraft()"
      @publish="publish"
      @toggle-code="toggleCode"
    />

    <div class="d-bench">
      <!-- 左：部件库 -->
      <div class="card d-lib">
        <WidgetLibrary @add-widget="onAddWidget" @add-metric="onAddMetric" />
      </div>

      <!-- 中：画布 -->
      <div class="d-canvas-wrap">
        <div class="d-modebar">
          <i class="pi pi-info-circle"></i>
          支持 <b>原生 HTML 模板</b> + <b>可视化拖拽</b> 双模式（FR-DS）· 当前：<span class="tag info">{{ codeMode ? '源码模式' : '可视化模式' }}</span>
          <span class="bp-hint">栅格 12 列 · 吸附 8px · 断点 {{ breakpoint }}</span>
        </div>

        <!-- 源码模式 -->
        <div v-if="codeMode" class="code-pane">
          <Textarea v-model="rawHtml" rows="18" class="code-textarea" />
          <div class="code-actions">
            <Button label="应用为可视化设计" size="small" @click="applyRawToDesign" />
            <Button label="保存源码" size="small" @click="saveDraft" />
          </div>
        </div>

        <!-- 可视化画布 -->
        <template v-else>
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
          />
        </template>
      </div>

      <!-- 右：属性面板 -->
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
  --warn-soft: rgba(251,191,36,.13);
  --ok: #34D399;
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
.d-bench {
  flex: 1; min-height: 0;
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  gap: 10px;
}
.card {
  background: var(--bg-glass);
  border: 1px solid var(--line-1);
  border-radius: 14px;
  backdrop-filter: blur(10px);
}
.d-lib { display: flex; flex-direction: column; min-height: 0; padding: 12px; overflow: hidden; }
.d-prop { display: flex; flex-direction: column; min-height: 0; padding: 12px 14px; overflow: hidden; }
.d-canvas-wrap { display: flex; flex-direction: column; min-width: 0; gap: 8px; }
.d-modebar {
  flex: none; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--tx-3);
  border-radius: 12px; padding: 6px 14px;
}
.d-modebar .pi { color: var(--info, #60A5FA); }
.d-modebar b { color: var(--tx-1); }
.d-modebar .tag { font-size: 10.5px; }
.bp-hint { margin-left: auto; font-size: 11px; color: var(--tx-4); }
.code-pane { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
.code-textarea { flex: 1; font-family: monospace; font-size: 12px; }
.code-actions { display: flex; gap: 8px; }
.p-4 { padding: 16px; }
.text-color-secondary { color: var(--tx-3); }
</style>
