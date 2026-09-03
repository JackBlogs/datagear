<script setup lang="ts">
import { ref } from 'vue'
import type { WidgetType } from '@/types/dashboardDesign'

/**
 * 设计器左侧部件库（对齐原型 designer.html）：图表 / 组件 / 文本 三 Tab + 「可拖入指标（语义层）」列表。
 * 点击部件即添加画布；点击语义指标添加绑定该指标的指标卡部件（指标中心真实化后自动切真实 API）。
 */
const emit = defineEmits<{
  (e: 'addWidget', payload: { type: WidgetType; n: number }): void
  (e: 'addMetric', payload: { metric: SemanticMetric; n: number }): void
}>()

type Kind = 'chart' | 'comp' | 'text'
const kind = ref<Kind>('chart')
let seq = 0

interface LibItem {
  type: WidgetType
  name: string
  icon: string
  w: number
  h: number
}
const LIB: Record<Kind, LibItem[]> = {
  chart: [
    { type: 'chart', name: '折线图', icon: 'pi-chart-line', w: 420, h: 300 },
    { type: 'chart', name: '柱状图', icon: 'pi-chart-bar', w: 420, h: 300 },
    { type: 'chart', name: '饼环图', icon: 'pi-chart-pie', w: 320, h: 300 },
    { type: 'radar', name: '雷达图', icon: 'pi-compass', w: 320, h: 320 },
    { type: 'kpi', name: '指标卡', icon: 'pi-arrow-up-right', w: 300, h: 140 },
    { type: 'table', name: '表格', icon: 'pi-table', w: 560, h: 220 },
    { type: 'funnel', name: '漏斗图', icon: 'pi-filter', w: 320, h: 300 },
    { type: 'map', name: '地图GIS', icon: 'pi-globe', w: 560, h: 360 },
    { type: 'progress', name: '进度环', icon: 'pi-spinner', w: 220, h: 200 },
  ],
  comp: [
    { type: 'filter', name: '筛选器', icon: 'pi-sliders-h', w: 300, h: 90 },
    { type: 'tab', name: 'Tab容器', icon: 'pi-th-large', w: 320, h: 160 },
    { type: 'image', name: '图片', icon: 'pi-image', w: 300, h: 200 },
    { type: 'iframe', name: 'iframe', icon: 'pi-window-maximize', w: 560, h: 320 },
    { type: '3d', name: '三维场景', icon: 'pi-box', w: 480, h: 320 },
    { type: 'video', name: '视频', icon: 'pi-video', w: 420, h: 260 },
  ],
  text: [
    { type: 'title', name: '标题', icon: 'pi-align-left', w: 420, h: 50 },
    { type: 'text', name: '富文本', icon: 'pi-pencil', w: 420, h: 90 },
    { type: 'marquee', name: '跑马灯', icon: 'pi-angle-double-right', w: 560, h: 40 },
    { type: 'text', name: '时间', icon: 'pi-clock', w: 220, h: 60 },
    { type: 'divider', name: '分隔线', icon: 'pi-minus', w: 420, h: 20 },
  ],
}

const tabs: { key: Kind; label: string }[] = [
  { key: 'chart', label: '图表' },
  { key: 'comp', label: '组件' },
  { key: 'text', label: '文本' },
]

/** 可拖入指标（语义层）：指标中心真实化后从 /api/metric 拉取 */
interface SemanticMetric {
  code: string
  name: string
  ind: 'oil' | 'gas' | 'chem' | 'coal'
}
const METRICS: SemanticMetric[] = [
  { code: 'M-OIL-001', name: '原油产量', ind: 'oil' },
  { code: 'M-OIL-014', name: '吨油完全成本', ind: 'oil' },
  { code: 'M-OIL-027', name: '井口综合含水率', ind: 'oil' },
  { code: 'M-GAS-002', name: '管输量', ind: 'gas' },
  { code: 'M-CHEM-011', name: '甲醇优级品率', ind: 'chem' },
  { code: 'M-COAL-001', name: '原煤产量', ind: 'coal' },
]

function add(item: LibItem) {
  seq++
  emit('addWidget', { type: item.type, n: seq })
}
function addMetric(m: SemanticMetric) {
  seq++
  emit('addMetric', { metric: m, n: seq })
}
</script>

<template>
  <div class="widget-lib">
    <div class="tabs">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: kind === t.key }"
        @click="kind = t.key"
      >
        {{ t.label }}
      </div>
    </div>
    <div class="lib-scroll">
      <div class="wt-grid">
        <div
          v-for="item in LIB[kind]"
          :key="item.name"
          class="wt-item"
          :title="`拖入「${item.name}」`"
          @click="add(item)"
        >
          <i class="pi" :class="item.icon"></i>
          <span>{{ item.name }}</span>
          <em class="wt-size">{{ item.w }}×{{ item.h }}</em>
        </div>
      </div>

      <!-- 可拖入指标（语义层） -->
      <div class="lib-sec-t">可拖入指标（语义层）</div>
      <div class="m-list">
        <div v-for="m in METRICS" :key="m.code" class="m-item" :title="`添加绑定「${m.name}」的指标卡`" @click="addMetric(m)">
          <span class="m-ind" :class="m.ind"></span>
          <span class="m-name">{{ m.name }}</span>
          <span class="m-code">{{ m.code }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget-lib { display: flex; flex-direction: column; min-height: 0; }
.tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.tab { padding: 6px 12px; font-size: 12.5px; border-radius: 8px; color: var(--tx-2); cursor: pointer; }
.tab:hover { color: var(--tx-1); }
.tab.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.lib-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.wt-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.wt-item {
  display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px 8px;
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-m);
  cursor: pointer; font-size: 11px; color: var(--tx-3); transition: all .18s; position: relative;
}
.wt-item:hover { border-color: var(--brand-line); color: var(--tx-1); transform: translateY(-1px); }
.wt-item .pi { font-size: 18px; color: var(--tx-2); }
.wt-item:hover .pi { color: var(--brand); }
.wt-size { position: absolute; right: 5px; top: 5px; font-size: 8.5px; font-family: var(--font-num, monospace); color: var(--tx-4); font-style: normal; }

.lib-sec-t { margin: 14px 0 8px; font-size: 11px; color: var(--tx-4); letter-spacing: 0.5px; }
.m-list { display: flex; flex-direction: column; gap: 5px; }
.m-item {
  display: flex; align-items: center; gap: 7px; padding: 6px 9px; font-size: 11.5px; color: var(--tx-2);
  background: var(--bg-glass); border: 1px dashed var(--line-2); border-radius: 8px;
  cursor: grab; transition: all 0.18s;
}
.m-item:hover { border-color: var(--brand-line); color: var(--tx-1); background: var(--brand-soft); }
.m-ind { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.m-ind.oil { background: #ff8a3d; }
.m-ind.gas { background: #22d3ee; }
.m-ind.chem { background: #a78bfa; }
.m-ind.coal { background: #e8b33c; }
.m-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-code { font-size: 9.5px; font-family: var(--font-num, monospace); color: var(--tx-4); }
</style>
