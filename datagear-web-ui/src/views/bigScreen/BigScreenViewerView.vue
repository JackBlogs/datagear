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
  } catch (e) {
    design.value = null
  } finally {
    // 先关闭 loading 让 viewport 挂载，再计算缩放（否则 containerEl 不存在，scale 恒为 1）
    loading.value = false
    await nextTick()
    computeScale()
  }
}

/* ---------- 驾驶舱头部：实时时钟（对齐原型 screen.html） ---------- */
const clock = ref('--:--:--')
const dateTxt = ref('')
let clockTimer: ReturnType<typeof setInterval> | null = null
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
function tickClock() {
  const n = new Date()
  clock.value = [n.getHours(), n.getMinutes(), n.getSeconds()]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')
  dateTxt.value = `${n.getFullYear()}年${n.getMonth() + 1}月${n.getDate()}日 星期${WEEK[n.getDay()]}`
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
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="screen-wrap">
    <div v-if="loading" class="loading">加载中…</div>

    <div v-else-if="design" ref="containerEl" class="viewport">
      <div class="stage" :style="stageStyle">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>

        <!-- 驾驶舱标题栏（原型 screen.html scr-head）：系统标识 | 渐变大标题+装饰线 | 实时时钟 -->
        <header class="scr-head">
          <div class="scr-sys">
            <div class="logo-mark">DG</div>
            <div>
              DataGear <span class="sys-brand">能源BI</span>
              <div class="sys-sub">ENERGY INTELLIGENCE V4.1</div>
            </div>
          </div>
          <div class="scr-title">
            <span class="t-line l"></span>
            <h1>{{ name }}</h1>
            <span class="t-line r"></span>
          </div>
          <div class="scr-time">
            <div class="t-now">{{ clock }}</div>
            <div class="t-date">{{ dateTxt }}<span class="t-upd">数据更新 06:30</span></div>
          </div>
        </header>

        <div
          v-for="w in design.widgets"
          :key="w.id"
          class="vw"
          :style="{ left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' }"
        >
          <div v-if="w.style?.title && w.type !== 'kpi'" class="vw-title">{{ w.style.title }}</div>
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
/* 驾驶舱标题栏（原型 screen.html scr-head，86px 带） */
.scr-head {
  position: relative; z-index: 6; height: 86px; flex: none;
  display: flex; align-items: center; padding: 0 40px;
  background: linear-gradient(180deg, rgba(255,138,61,.06), transparent);
  pointer-events: none;
}
.scr-sys { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; width: 380px; }
.logo-mark {
  width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ffb25e, #f4633a); color: #241105; font-size: 13px; font-weight: 800;
  box-shadow: 0 0 18px rgba(255,138,61,.35);
}
.sys-brand { color: var(--brand); }
.sys-sub { font-size: 10px; letter-spacing: 2px; color: #7c88a0; font-weight: 400; }
.scr-title { flex: 1; text-align: center; position: relative; }
.scr-title h1 {
  font-size: 34px; font-weight: 800; letter-spacing: 6px; line-height: 1.2; margin: 0;
  background: linear-gradient(180deg, #FFF2E4 20%, #FFB25E 55%, #F4633A 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 40px rgba(255,138,61,.25);
}
.t-line {
  position: absolute; top: 50%; height: 1px; width: 240px;
  background: linear-gradient(90deg, transparent, rgba(255,138,61,.45), transparent);
}
.t-line.l { right: calc(50% + 320px); }
.t-line.r { left: calc(50% + 320px); }
.scr-time { width: 380px; text-align: right; font-family: 'Barlow', 'DIN Alternate', monospace; }
.t-now { font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #f2f5fa; }
.t-date { font-size: 12px; color: #7c88a0; margin-top: 2px; }
.t-upd {
  display: inline-block; font-size: 11px; color: #34d399; border: 1px solid rgba(52,211,153,.3);
  background: rgba(52,211,153,.12); border-radius: 10px; padding: 1px 10px; margin-left: 8px;
}
/* 面板标题 chrome（原型 sp-title） */
.vw { display: flex; flex-direction: column; }
.vw-title {
  flex: none; display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #f2f5fa;
  padding: 10px 14px 6px; position: relative;
}
.vw-title::before {
  content: ''; width: 4px; height: 15px; border-radius: 2px;
  background: linear-gradient(180deg, #FFB25E, #F4633A);
  box-shadow: 0 0 12px rgba(255,138,61,.55);
}
.vw {
  position: absolute;
  display: flex; flex-direction: column;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015));
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 40px rgba(255,255,255,.015);
  overflow: hidden;
}
/* 品牌角标（原型 scr-panel::before/::after） */
.vw::before, .vw::after {
  content: ""; position: absolute; width: 14px; height: 14px; pointer-events: none; z-index: 2; opacity: .7;
}
.vw::before { left: -1px; top: -1px; border-left: 2px solid var(--brand); border-top: 2px solid var(--brand); border-radius: 14px 0 0 0; }
.vw::after { right: -1px; bottom: -1px; border-right: 2px solid var(--brand); border-bottom: 2px solid var(--brand); border-radius: 0 0 14px 0; }
.vw-body { flex: 1; min-height: 0; width: 100%; padding: 6px 10px; }
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
