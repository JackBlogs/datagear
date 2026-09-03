<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBigScreen, getBigScreenDesign } from '@/api/bigScreen'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { type DashboardDesign } from '@/types/dashboardDesign'
import ChartPreview from '@/components/chart/ChartPreview.vue'
import WidgetRenderer from '@/components/dashboard/WidgetRenderer.vue'

/**
 * 数据大屏展示页：1920×1080 舞台按视口等比缩放置中，图表真实取数，四角装饰 + 全屏切换。
 */
const route = useRoute()
const router = useRouter()
const screenId = route.params.id as string
const { success } = useOperationMessage()

const name = ref('')
const design = ref<DashboardDesign | null>(null)
const loading = ref(false)
const scale = ref(1)
const containerEl = ref<HTMLElement>()

async function load() {
  loading.value = true
  try {
    const d = await getBigScreen(screenId)
    name.value = d.name
    const json = await getBigScreenDesign(screenId)
    if (json) {
      try {
        const obj = JSON.parse(json)
        if (obj && obj.version === '1.0' && Array.isArray(obj.widgets)) design.value = obj as DashboardDesign
      } catch {
        design.value = null
      }
    }
    await nextTick()
    computeScale()
  } catch (e) {
    design.value = null
  } finally {
    loading.value = false
  }
}

function computeScale() {
  if (!containerEl.value || !design.value) return
  const cw = containerEl.value.clientWidth || 1200
  const ch = containerEl.value.clientHeight || 700
  scale.value = Math.min(cw / design.value.canvas.width, ch / design.value.canvas.height, 1)
}

const stageStyle = computed(() => {
  const d = design.value
  if (!d) return {}
  return {
    width: d.canvas.width + 'px',
    height: d.canvas.height + 'px',
    transform: `scale(${scale.value})`,
  }
})

function onResize() {
  computeScale()
}

function fullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => success('已尝试进入全屏'))
}
function back() {
  router.push('/screen')
}

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="screen-wrap">
    <div v-if="loading" class="loading">加载中…</div>

    <div v-else-if="design" ref="containerEl" class="viewport">
      <div class="stage" :style="stageStyle">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>

        <div
          v-for="w in design.widgets"
          :key="w.id"
          class="vw"
          :style="{ left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' }"
        >
          <div class="vw-body">
            <ChartPreview v-if="w.type === 'chart' && w.chartId" :chart-id="w.chartId" />
            <WidgetRenderer v-else :widget="w" />
          </div>
        </div>
      </div>

      <button class="back-btn" @click="back">返回列表</button>
      <button class="full-btn" @click="fullscreen">全屏</button>
    </div>

    <div v-else class="loading">该大屏暂无可展示内容</div>
  </div>
</template>

<style scoped>
.screen-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05070D;
  color: #F2F5FA;
  --brand: #FF8A3D;
  --line-2: rgba(255,255,255,.12);
}
.loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #7C88A0; }
.viewport {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.stage {
  flex: none; position: relative;
  transform-origin: center center; overflow: hidden;
  background:
    linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 100% 54px,
    linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 96px 100%,
    radial-gradient(1200px 500px at 50% 42%, rgba(255,138,61,.05), transparent 65%),
    #05070D;
}
.corner { position: absolute; width: 42px; height: 42px; z-index: 5; pointer-events: none; opacity: .8; }
.corner.tl { left: 10px; top: 10px; border-left: 2px solid var(--brand); border-top: 2px solid var(--brand); }
.corner.tr { right: 10px; top: 10px; border-right: 2px solid var(--brand); border-top: 2px solid var(--brand); }
.corner.bl { left: 10px; bottom: 10px; border-left: 2px solid var(--brand); border-bottom: 2px solid var(--brand); }
.corner.br { right: 10px; bottom: 10px; border-right: 2px solid var(--brand); border-bottom: 2px solid var(--brand); }
.vw {
  position: absolute;
  background: rgba(17,26,42,.62);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  overflow: hidden;
}
.vw-body { width: 100%; height: 100%; padding: 6px 10px; }
.back-btn, .full-btn {
  position: fixed; z-index: 50;
  font-size: 12px; color: #B9C2D4; padding: 6px 14px; border-radius: 16px;
  background: rgba(13,20,32,.8); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(8px);
  cursor: pointer;
}
.back-btn { left: 18px; bottom: 18px; }
.full-btn { right: 18px; bottom: 18px; }
.back-btn:hover, .full-btn:hover { color: #FF8A3D; border-color: rgba(255,138,61,.35); }
</style>
