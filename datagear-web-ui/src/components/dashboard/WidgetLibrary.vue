<script setup lang="ts">
import { ref } from 'vue'
import type { WidgetType } from '@/types/dashboardDesign'

/**
 * 设计器左侧部件库：图表 / 组件 / 文本 三 Tab，点击部件拖入画布（此处点击即添加）。
 */
const emit = defineEmits<{ (e: 'addWidget', payload: { type: WidgetType; n: number }): void }>()

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
    { type: 'progress', name: '进度环', icon: 'pi-spinner', w: 220, h: 200 },
  ],
  comp: [
    { type: 'filter', name: '筛选器', icon: 'pi-sliders-h', w: 300, h: 90 },
    { type: 'tab', name: 'Tab容器', icon: 'pi-th-large', w: 320, h: 160 },
    { type: 'image', name: '图片', icon: 'pi-image', w: 300, h: 200 },
    { type: 'iframe', name: 'iframe', icon: 'pi-window-maximize', w: 560, h: 320 },
  ],
  text: [
    { type: 'title', name: '标题', icon: 'pi-align-left', w: 420, h: 50 },
    { type: 'text', name: '富文本', icon: 'pi-pencil', w: 420, h: 90 },
    { type: 'text', name: '时间', icon: 'pi-clock', w: 220, h: 60 },
    { type: 'divider', name: '分隔线', icon: 'pi-minus', w: 420, h: 20 },
  ],
}

const tabs: { key: Kind; label: string }[] = [
  { key: 'chart', label: '图表' },
  { key: 'comp', label: '组件' },
  { key: 'text', label: '文本' },
]

function add(item: LibItem) {
  seq++
  emit('addWidget', { type: item.type, n: seq })
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
</style>
