<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Sortable from 'sortablejs'
import {
  getDashboard,
  getDashboardResourceContent,
  saveDashboardResourceContent,
  parseChartWidgets,
  reorderChartWidgets,
} from '@/api/dashboard'
import { createPagingLoader, type EntityRecord } from '@/api/paging'
import { useOperationMessage } from '@/composables/useOperationMessage'
import ChartPreview from '@/components/chart/ChartPreview.vue'

// 看板设计器「画布」：Vue 编辑图表挂件（插入/移除），图表卡片以 ECharts（ChartPreview）渲染，已完全脱离 iframe。
// 拖拽重排为后续（可引入 sortablejs）。
const route = useRoute()
const dashboardId = route.params.id as string

const name = ref('')
const templateHtml = ref('')
const widgets = ref<string[]>([])
const charts = ref<EntityRecord[]>([])
const selectedChartId = ref('')
const loading = ref(false)
const saving = ref(false)
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const previewKey = ref(0)
const gridEl = ref<HTMLElement>()
let sortable: Sortable | null = null

async function load() {
  loading.value = true
  try {
    const d = await getDashboard(dashboardId)
    name.value = d.name
    const res = await getDashboardResourceContent(dashboardId, 'index.html')
    templateHtml.value = res.resourceContent ?? ''
    widgets.value = parseChartWidgets(templateHtml.value)
    const data = await createPagingLoader('chart')({ page: 1, pageSize: 500 })
    charts.value = data.items
    await nextTick()
    initSortable()
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function initSortable() {
  if (!gridEl.value || sortable) return
  sortable = Sortable.create(gridEl.value, {
    animation: 150,
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      const moved = widgets.value.splice(oldIndex, 1)[0]
      widgets.value.splice(newIndex, 0, moved)
    },
  })
}

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})

function chartName(id: string): string {
  const c = charts.value.find((x) => x.id === id)
  return c ? String((c as { name?: string }).name ?? c.id) : id
}

function insertChart() {
  if (!selectedChartId.value) {
    fail(t('pleaseSelectChart'))
    return
  }
  const empty = widgets.value.findIndex((w) => !w)
  if (empty >= 0) {
    widgets.value[empty] = selectedChartId.value
  } else {
    templateHtml.value = templateHtml.value.replace(
      '</body>',
      `<div class="chart" dg-chart-widget="${selectedChartId.value}"></div>\n</body>`,
    )
    widgets.value.push(selectedChartId.value)
  }
  selectedChartId.value = ''
}

function removeChart(index: number) {
  widgets.value[index] = ''
}

async function save() {
  saving.value = true
  try {
    const html = reorderChartWidgets(templateHtml.value, widgets.value)
    await saveDashboardResourceContent(dashboardId, 'index.html', html)
    success(t('saveSuccess'))
    previewKey.value++
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-column h-full">
    <div class="toolbar flex align-items-center gap-2 p-2">
      <span class="flex-1">{{ t('dashboardCanvas') }}：{{ name }}</span>
      <Dropdown
        v-model="selectedChartId"
        :options="charts"
        option-value="id"
        :placeholder="t('selectChartPlaceholder')"
        class="select"
      >
        <template #option="slotProps">
          <span>{{ chartName(slotProps.option.id) }}</span>
        </template>
      </Dropdown>
      <Button :label="t('insertChart')" size="small" @click="insertChart" />
      <Button :label="t('save')" :loading="saving" @click="save" />
    </div>

    <div v-if="loading" class="p-4 text-color-secondary">{{ t('loading') }}</div>
    <div v-else ref="gridEl" class="canvas-grid p-2">
      <div v-for="(w, i) in widgets" :key="i" class="chart-card">
        <template v-if="w">
          <div class="card-frame">
            <ChartPreview :key="previewKey + '-' + w" :chart-id="w" />
          </div>
        </template>
        <div v-else class="empty-slot">{{ t('emptySlot') }}</div>
        <div class="card-footer flex align-items-center gap-1">
          <span class="flex-1 text-overflow">{{ w ? chartName(w) : t('unbound') }}</span>
          <Button v-if="w" :label="t('remove')" size="small" text @click="removeChart(i)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  border-bottom: 1px solid #e0e0e0;
}
.select {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 6px;
}
.canvas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  overflow: auto;
}
.chart-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card-frame {
  width: 100%;
  height: 200px;
  border: 0;
}
.empty-slot {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  background: #fafafa;
}
.card-footer {
  padding: 4px 8px;
  border-top: 1px solid #eee;
  font-size: 12px;
}
.text-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
