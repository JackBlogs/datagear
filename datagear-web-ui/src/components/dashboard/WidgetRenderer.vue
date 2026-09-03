<script setup lang="ts">
import { computed } from 'vue'
import type { DgWidget } from '@/types/dashboardDesign'
import ChartPreview from '@/components/chart/ChartPreview.vue'

/**
 * 画布里单个部件的内容渲染器。
 * 图表部件用 ChartPreview（/api/chart/preview/{id} 取数），KPI/标题/文本/分隔线等为内置组件。
 */
const props = defineProps<{ widget: DgWidget }>()

const st = computed(() => props.widget.style ?? {})
const isChart = computed(() => props.widget.type === 'chart' && !!props.widget.chartId)

const fontPx = computed(() => {
  const m = st.value.fontSize ?? 'medium'
  return m === 'small' ? 12 : m === 'large' ? 20 : 16
})

const trendUp = computed(() => (props.widget.trend ?? 0) >= 0)

function kpiValue(): string {
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

    <!-- 表格占位（静态示例列） -->
    <div v-else-if="widget.type === 'table'" class="w-table">
      <div v-if="st.title" class="wt-head">{{ st.title }}</div>
      <div class="wt-empty">表格部件：请在数据面板绑定数据集展示行数据</div>
    </div>

    <!-- 其它展示类（仪表环/雷达/漏斗/进度环/地图/图片/iframe/筛选器/Tab） -->
    <div v-else class="w-other">
      <span class="w-other-label">{{ st.title || widget.name }}</span>
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
.w-chart-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 6px; padding: 8px; text-align: center;
  border: 1px dashed var(--line-2); border-radius: 8px;
}
.wce-name { font-size: 12.5px; color: var(--tx-2); font-weight: 600; }
.wce-hint { font-size: 11px; color: var(--tx-4); line-height: 1.5; }
.w-other { display: flex; align-items: center; justify-content: center; height: 100%; }
.w-other-label { font-size: 12px; color: var(--tx-3); }
</style>
