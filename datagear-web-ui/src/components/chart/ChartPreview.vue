<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart, PieChart, GaugeChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption, SeriesOption } from 'echarts'
import { previewChart, type ChartPreviewData } from '@/api/chart'

use([
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

/**
 * 图表预览（脱离 iframe）：调用 /api/chart/preview/{id} 执行数据，
 * 根据插件类型 + fieldSigns 生成 ECharts 通用渲染（柱状/折线/饼图/仪表盘/散点）。
 * 精确插件渲染逻辑位于冻结面 analysisapi（不迁移），此处提供等价的可视化渲染。
 */
const props = defineProps<{ chartId: string }>()

const el = ref<HTMLElement>()
const loading = ref(false)
const error = ref('')
let chart: EChartsType | null = null
let resizeObserver: ResizeObserver | null = null

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

function fieldWith(signs: Record<string, string[]>, wanted: string[]): string | null {
  for (const [field, sigs] of Object.entries(signs ?? {})) {
    if (sigs.some((s) => wanted.includes(s))) return field
  }
  return null
}

function fieldsWith(signs: Record<string, string[]>, wanted: string[]): string[] {
  return Object.entries(signs ?? {})
    .filter(([, sigs]) => sigs.some((s) => wanted.includes(s)))
    .map(([f]) => f)
}

function buildOption(d: ChartPreviewData): EChartsOption {
  const pluginId = d.pluginId ?? ''
  const signs = d.fieldSigns ?? {}
  const rows = d.rows ?? []
  const lower = pluginId.toLowerCase()

  const nameField = fieldWith(signs, ['name', 'x', 'category', 'label']) ?? d.columns[0]
  const valueFields = fieldsWith(signs, ['value', 'y'])
  const categoryField = fieldWith(signs, ['category', 'series'])
  const firstValue = valueFields[0] ?? d.columns[1] ?? d.columns[0]

  // 饼图 / 环形图
  if (lower.includes('pie') || lower.includes('rose')) {
    const data = rows.map((r) => ({ name: String(r[nameField] ?? ''), value: num(r[firstValue]) }))
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: lower.includes('ring') ? ['38%', '68%'] : '60%',
          data,
        },
      ],
    }
  }

  // 仪表盘
  if (lower.includes('gauge')) {
    const value = num(rows[0]?.[firstValue])
    return {
      series: [
        {
          type: 'gauge',
          progress: { show: true },
          data: [{ value: Number.isFinite(value) ? value : 0, name: String(rows[0]?.[nameField] ?? '') }],
        },
      ],
    }
  }

  // 散点
  if (lower.includes('scatter')) {
    const yField = valueFields[1] ?? firstValue
    const data = rows
      .map((r) => [num(r[nameField]), num(r[yField])])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    return {
      tooltip: {},
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{ type: 'scatter', data }],
    }
  }

  // 柱状 / 折线（含面积、堆叠）
  const isLine = lower.includes('line') || lower.includes('area')
  const isHorizontal = lower.includes('horizontal')
  const type: 'line' | 'bar' = isLine ? 'line' : 'bar'

  const categoryValues = [...new Set(rows.map((r) => String(r[nameField] ?? '')))]
  const names = categoryValues.length ? categoryValues : rows.map((r) => String(r[nameField] ?? ''))

  // 有类别字段：按类别分组为多系列
  if (categoryField && categoryField !== nameField && valueFields.length === 1) {
    const cats = [...new Set(rows.map((r) => String(r[categoryField] ?? '')))]
    const series: SeriesOption[] = cats.map((c) => ({
      name: c,
      type,
      data: names.map((n) => {
        const row = rows.find((r) => String(r[nameField] ?? '') === n && String(r[categoryField] ?? '') === c)
        return row ? num(row[firstValue]) : 0
      }),
    }))
    return {
      tooltip: { trigger: 'axis' },
      legend: {},
      xAxis: isHorizontal ? { type: 'value' } : { type: 'category', data: names },
      yAxis: isHorizontal ? { type: 'category', data: names } : { type: 'value' },
      series,
    }
  }

  // 默认：多值字段即多系列
  const valueCols = valueFields.length ? valueFields : [firstValue]
  const series: SeriesOption[] = valueCols.map((f) => ({
    name: f,
    type,
    smooth: lower.includes('smooth'),
    data: rows.map((r) => num(r[f])),
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: valueCols.length > 1 },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    xAxis: isHorizontal
      ? { type: 'value' }
      : { type: 'category', data: names },
    yAxis: isHorizontal
      ? { type: 'category', data: names }
      : { type: 'value' },
    series,
  }
}

async function load() {
  if (!props.chartId) return
  loading.value = true
  error.value = ''
  try {
    const d = await previewChart(props.chartId)
    await render(d)
  } catch (e) {
    error.value = (e as Error).message || '预览失败'
  } finally {
    loading.value = false
  }
}

async function render(d: ChartPreviewData) {
  if (!el.value) return
  if (!chart) {
    chart = init(el.value)
    if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => chart?.resize())
      resizeObserver.observe(el.value)
    }
  }
  chart.setOption(buildOption(d), true)
}

onMounted(load)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
watch(() => props.chartId, () => load())
</script>

<template>
  <div class="chart-preview">
    <div v-if="loading" class="placeholder">加载中…</div>
    <div v-else-if="error" class="placeholder error">{{ error }}</div>
    <div v-else ref="el" class="canvas"></div>
  </div>
</template>

<style scoped>
.chart-preview {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
.canvas {
  width: 100%;
  height: 100%;
}
.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}
.error {
  color: #d33;
}
</style>
