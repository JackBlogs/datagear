<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDashboard,
  getDashboardResourceContent,
  parseDesignFromResource,
} from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { type DashboardDesign, type DgWidget } from '@/types/dashboardDesign'
import ChartPreview from '@/components/chart/ChartPreview.vue'
import WidgetRenderer from '@/components/dashboard/WidgetRenderer.vue'

/**
 * 看板展示页（发布后渲染）。从 index.html 资源解析可视化设计产物并渲染，
 * 支持断点等比缩放；若为原生模板（无可视化设计）则用 iframe 兜底渲染。
 */
const route = useRoute()
const router = useRouter()
const dashboardId = route.params.id as string
const { success } = useOperationMessage()

const name = ref('')
const design = ref<DashboardDesign | null>(null)
const nativeHtml = ref('')
const loading = ref(false)
const activeFilter = ref('')
const containerEl = ref<HTMLElement>()
const scale = ref(1)

async function load() {
  loading.value = true
  try {
    const d = await getDashboard(dashboardId)
    name.value = d.name
    const res = await getDashboardResourceContent(dashboardId, 'index.html')
    const raw = res.resourceContent ?? ''
    const parsed = parseDesignFromResource(raw)
    if (parsed) {
      design.value = parsed
    } else {
      nativeHtml.value = raw
      design.value = null
    }
    await nextTick()
    computeScale()
  } catch (e) {
    nativeHtml.value = ''
    design.value = null
  } finally {
    loading.value = false
  }
}

function computeScale() {
  if (!containerEl.value || !design.value) return
  const cw = containerEl.value.clientWidth || 1200
  scale.value = Math.min(1, cw / design.value.canvas.width)
}

function onResize() {
  computeScale()
}

/** 部件点击 → 参与联动（过滤目标 = 部件名） */
function onWidgetClick(w: DgWidget) {
  if (!w.link || !w.link.filters?.length) return
  activeFilter.value = activeFilter.value === w.name ? '' : w.name
  success(`联动过滤：${w.name}`)
}

function isHighlighted(w: DgWidget): boolean {
  return !!activeFilter.value && !!w.link?.filters?.includes(activeFilter.value)
}

const canvasStyle = computed(() => {
  const d = design.value
  if (!d) return {}
  return {
    width: d.canvas.width + 'px',
    height: d.canvas.height + 'px',
    transform: `scale(${scale.value})`,
    transformOrigin: 'top left',
  }
})

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

function goDesign() {
  router.push(`/dashboard/${dashboardId}/design`)
}
function back() {
  router.push('/dashboard')
}
function fullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => success('已尝试进入全屏'))
}

/** 画布尺寸显示 */
function canvasLabel(): string {
  const d = design.value
  if (!d) return ''
  return `${d.canvas.width}×${d.canvas.height}`
}
</script>

<template>
  <div class="viewer">
    <div class="v-toolbar">
      <Button text size="small" label="← 返回列表" @click="back" />
      <div class="v-name">{{ name }}</div>
      <div class="spacer"></div>
      <span class="v-meta">{{ canvasLabel() }}</span>
      <Button size="small" label="编辑设计" @click="goDesign" />
      <Button size="small" label="全屏" @click="fullscreen" />
    </div>

    <div v-if="loading" class="v-loading">加载中…</div>

    <!-- 可视化设计产物 -->
    <div v-else-if="design" ref="containerEl" class="v-stage-wrap">
      <div class="v-stage" :style="canvasStyle">
        <div
          v-for="w in design.widgets"
          :key="w.id"
          class="vw"
          :class="{ hl: isHighlighted(w) }"
          :style="{ left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' }"
          @click="onWidgetClick(w)"
        >
          <div class="vw-body">
            <ChartPreview v-if="w.type === 'chart' && w.chartId" :chart-id="w.chartId" />
            <WidgetRenderer v-else :widget="w" />
          </div>
        </div>
      </div>
    </div>

    <!-- 原生 HTML 模板兜底 -->
    <div v-else class="v-native">
      <iframe v-if="nativeHtml" :srcdoc="nativeHtml" class="v-native-frame" />
      <div v-else class="v-loading">该看板暂无可展示内容</div>
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #080B13;
  color: var(--tx-1);
  --bg-glass: rgba(255,255,255,.035);
  --line-1: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --tx-3: #7C88A0;
  --brand: #FF8A3D;
  --font-num: "Barlow","DIN Alternate",monospace;
}
.v-toolbar {
  flex: none; display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; border-bottom: 1px solid var(--line-1); background: rgba(10,14,23,.6);
}
.v-name { font-size: 15px; font-weight: 700; }
.spacer { flex: 1; }
.v-meta { font-size: 11px; color: var(--tx-3); font-family: var(--font-num, monospace); }
.v-loading { padding: 40px; text-align: center; color: var(--tx-3); }
.v-stage-wrap { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
.v-stage {
  position: relative;
  background:
    radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px) 0 0 / 22px 22px,
    linear-gradient(180deg,#0A0E17,#080B13);
  border: 1px solid var(--line-1); border-radius: 12px;
  margin: 0 auto;
}
.vw {
  position: absolute;
  background: rgba(17,26,42,.82);
  border: 1px solid var(--line-2); border-radius: 12px;
  overflow: hidden;
  transition: border-color .18s, box-shadow .18s;
}
.vw.hl { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand), 0 0 18px rgba(255,138,61,.4); }
.vw-body { width: 100%; height: 100%; padding: 6px 10px; }
.v-native { flex: 1; min-height: 0; }
.v-native-frame { width: 100%; height: 100%; border: 0; }
</style>
