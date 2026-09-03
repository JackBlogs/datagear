<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DgWidget } from '@/types/dashboardDesign'
import ChartPreview from '@/components/chart/ChartPreview.vue'
import { queryMetricValue } from '@/api/metric'

/**
 * 画布里单个部件的内容渲染器。
 * 图表部件用 ChartPreview（/api/chart/preview/{id} 取数）；
 * 绑定语义指标的指标卡用 /api/metric/queryValue 实时取数（FR-SEM-06 看板消费）；
 * 其余（标题/文本/分隔线等）为内置组件。
 */
const props = defineProps<{ widget: DgWidget }>()

const st = computed(() => props.widget.style ?? {})
const isChart = computed(() => (props.widget.type === 'chart' || props.widget.type === 'map') && !!props.widget.chartId)

/* ---------- 语义指标卡：实时取数 ---------- */
const metricLoading = ref(false)
const metricValue = ref<unknown>(null)
const metricError = ref('')

async function loadMetric() {
  const id = props.widget.metricId
  if (props.widget.type !== 'kpi' || !id) return
  metricLoading.value = true
  metricError.value = ''
  try {
    const res = await queryMetricValue(id, {})
    metricValue.value = res.value
  } catch (e) {
    metricError.value = (e as Error).message || '取数失败'
  } finally {
    metricLoading.value = false
  }
}
watch(() => props.widget.metricId, loadMetric, { immediate: true })

const fontPx = computed(() => {
  const m = st.value.fontSize ?? 'medium'
  return m === 'small' ? 12 : m === 'large' ? 20 : 16
})

const trendUp = computed(() => (props.widget.trend ?? 0) >= 0)

/** 未实现真实渲染的类型：专属图标与说明（拖入即可见，绑定数据后逐步真实化） */
const FALLBACK_ICONS: Record<string, { icon: string; hint: string }> = {
  map: { icon: 'pi-globe', hint: '地图GIS · 绑定地图图表后展示产区分布' },
  radar: { icon: 'pi-compass', hint: '雷达图 · 绑定图表后展示多维对比' },
  funnel: { icon: 'pi-filter', hint: '漏斗图 · 绑定图表后展示转化流程' },
  progress: { icon: 'pi-spinner', hint: '进度环 · 数据面板可配置完成率' },
  gauge: { icon: 'pi-dollar', hint: '仪表盘 · 绑定图表后展示指标数值' },
  '3d': { icon: 'pi-box', hint: '三维场景 · 预留扩展位' },
  video: { icon: 'pi-video', hint: '视频 · 样式面板可配置播放源' },
  marquee: { icon: 'pi-angle-double-right', hint: '跑马灯 · 滚动展示通知/指标' },
  filter: { icon: 'pi-sliders-h', hint: '筛选器 · 联动过滤画布内图表' },
  tab: { icon: 'pi-th-large', hint: 'Tab容器 · 承载多页内容' },
  image: { icon: 'pi-image', hint: '图片 · 样式面板可配置图片源' },
  iframe: { icon: 'pi-window-maximize', hint: 'iframe · 嵌入外部页面' },
}
const fallback = computed(() => FALLBACK_ICONS[props.widget.type] ?? null)

function kpiValue(): string {
  // 绑定语义指标：优先展示实时取数值
  if (props.widget.metricId) {
    if (metricLoading.value) return '…'
    if (metricError.value) return '—'
    const v = metricValue.value
    if (v === undefined || v === null || v === '') return '—'
    return String(v)
  }
  const v = props.widget.value
  if (v === undefined || v === null || v === '') return '—'
  return String(v)
}
</script>

<template>
  <div class="wbody" :style="{ opacity: (st.opacity ?? 100) / 100 }">
    <!-- 图表（真实取数） -->
    <ChartPreview v-if="isChart" :chart-id="widget.chartId!" />

    <!-- KPI 指标卡 -->
    <div v-else-if="widget.type === 'kpi'" class="w-kpi" :style="{ fontSize: fontPx + 'px' }">
      <div class="k-label">{{ st.title || widget.name }}</div>
      <div class="k-value" :style="{ color: st.color || 'var(--brand)' }">
        {{ kpiValue() }}<span v-if="widget.unit" class="k-unit">{{ widget.unit }}</span>
      </div>
      <div v-if="widget.metricId && metricError" class="k-err" :title="metricError">取数失败 · 查看指标配置</div>
      <div v-if="st.showTrend && widget.trend !== undefined" class="k-foot">
        <span class="trend" :class="trendUp ? 'up' : 'down'">{{ trendUp ? '▲' : '▼' }} {{ Math.abs(widget.trend) }}%</span>
        <span class="tx-3">环比</span>
      </div>
      <div v-if="st.showMini" class="k-mini">
        <i v-for="i in 12" :key="i" :style="{ height: `${20 + ((i * 37) % 60)}%` }"></i>
      </div>
    </div>

    <!-- 标题 -->
    <div v-else-if="widget.type === 'title'" class="w-title" :style="{ fontSize: (fontPx + 4) + 'px' }">
      {{ st.title || widget.text || widget.name }}
    </div>

    <!-- 文本 -->
    <div v-else-if="widget.type === 'text'" class="w-text" :style="{ fontSize: fontPx + 'px' }">
      {{ widget.text || widget.name }}
    </div>

    <!-- 分隔线 -->
    <div v-else-if="widget.type === 'divider'" class="w-divider"></div>

    <!-- 图表未绑定：空态引导 -->
    <div v-else-if="widget.type === 'chart'" class="w-chart-empty">
      <span class="wce-name">{{ st.title || widget.name }}</span>
      <span class="wce-hint">选中部件，在右侧「数据」面板绑定图表后展示真实数据</span>
    </div>

    <!-- 表格部件（未绑定数据集时展示示例行，对齐原型明细表） -->
    <div v-else-if="widget.type === 'table'" class="w-table">
      <div v-if="st.title" class="wt-head">{{ st.title }}</div>
      <div class="wt-empty" style="padding:4px 6px 0">示例数据 · 绑定数据集后展示真实行</div>
      <table class="wt-tbl">
        <thead>
          <tr><th>井场</th><th>日产液(t)</th><th>含水率</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td>任11井场</td><td class="num">486.2</td><td class="num">86.1%</td><td><span class="wtag ok">运行</span></td></tr>
          <tr><td>霸州二联合站</td><td class="num">352.7</td><td class="num">89.4%</td><td><span class="wtag ok">运行</span></td></tr>
          <tr><td>岔河集一转油站</td><td class="num">301.5</td><td class="num">91.2%</td><td><span class="wtag warn">检修</span></td></tr>
          <tr><td>留路北井场</td><td class="num">268.9</td><td class="num">84.7%</td><td><span class="wtag danger">压力异常</span></td></tr>
        </tbody>
      </table>
    </div>

    <!-- 其它展示类：专属图标 + 部件名 + 说明 -->
    <div v-else class="w-other">
      <i v-if="fallback" class="pi w-other-ico" :class="fallback.icon"></i>
      <span class="w-other-label">{{ st.title || widget.name }}</span>
      <span v-if="fallback" class="w-other-hint">{{ fallback.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.wbody {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.w-kpi {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 2px 6px;
  position: relative;
}
.k-label { font-size: 12px; color: var(--tx-3); }
.k-err { font-size: 10px; color: #f87171; margin-top: 2px; }
.k-value { font-family: var(--font-num, "Barlow", sans-serif); font-weight: 700; line-height: 1.2; }
.k-unit { font-size: 12px; color: var(--tx-3); font-weight: 400; margin-left: 3px; }
.k-foot { font-size: 11px; margin-top: 2px; display: flex; gap: 6px; align-items: center; }
.k-mini { position: absolute; right: 8px; bottom: 6px; display: flex; align-items: flex-end; gap: 2px; height: 34px; }
.k-mini i { width: 3px; border-radius: 2px; background: rgba(255,138,61,.4); }
.trend.up { color: #34D399; }
.trend.down { color: #F87171; }
.tx-3 { color: var(--tx-3); }
.w-title { font-weight: 700; color: var(--tx-1); padding: 4px 6px; display: flex; align-items: center; height: 100%; }
.w-text { color: var(--tx-2); padding: 4px 6px; height: 100%; overflow: hidden; }
.w-divider { height: 2px; background: linear-gradient(90deg, transparent, var(--line-3), transparent); margin: auto 6px; }
.wt-head { font-size: 12px; color: var(--tx-2); padding: 4px 6px; border-bottom: 1px solid var(--line-1); }
.wt-empty { padding: 10px 6px; font-size: 11px; color: var(--tx-4); }
.wt-tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
.wt-tbl th, .wt-tbl td { border-bottom: 1px solid var(--line-1); padding: 5px 8px; text-align: left; color: var(--tx-2); white-space: nowrap; }
.wt-tbl th { color: var(--tx-3); font-weight: 600; background: var(--bg-glass); }
.wt-tbl .num { font-family: var(--font-num, monospace); text-align: right; }
.wtag { font-size: 9.5px; padding: 1px 6px; border-radius: 6px; }
.wtag.ok { background: rgba(52, 211, 153, 0.14); color: #34d399; }
.wtag.warn { background: rgba(251, 191, 36, 0.13); color: #fbbf24; }
.wtag.danger { background: rgba(248, 113, 113, 0.14); color: #f87171; }
.w-chart-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 6px; padding: 8px; text-align: center;
  border: 1px dashed var(--line-2); border-radius: 8px;
}
.wce-name { font-size: 12.5px; color: var(--tx-2); font-weight: 600; }
.wce-hint { font-size: 11px; color: var(--tx-4); line-height: 1.5; }
.w-other { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 100%; padding: 8px; text-align: center; }
.w-other-ico { font-size: 20px; color: var(--tx-4); }
.w-other-label { font-size: 12.5px; color: var(--tx-2); font-weight: 600; }
.w-other-hint { font-size: 10.5px; color: var(--tx-4); line-height: 1.5; }
</style>
