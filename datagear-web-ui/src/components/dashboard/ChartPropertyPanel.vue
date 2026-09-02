<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listChartPlugins, getChartPluginDataSigns, type ChartPluginItem } from '@/api/chartPlugin'
import DataSetBindForm from './DataSetBindForm.vue'
import ChartStylePanel from './ChartStylePanel.vue'
import ChartInteractionPanel from './ChartInteractionPanel.vue'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { DataSign, ChartModel } from '@/types/dashboard'

/**
 * 图表属性面板（5c 看板设计器属性面板的分组重写容器）。
 * 分组：图表类型（插件选择）/ 数据绑定 / 样式。
 */
const props = defineProps<{ modelValue: ChartModel }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ChartModel): void }>()

const { fail } = useOperationMessage()

const activeTab = ref<'type' | 'dataBind' | 'style' | 'interaction'>('type')
const plugins = ref<ChartPluginItem[]>([])
const dataSigns = ref<DataSign[]>([])
const loadingSigns = ref(false)

function patchModel(p: Partial<ChartModel>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

async function loadPlugins() {
  try {
    plugins.value = await listChartPlugins()
  } catch (e) {
    fail((e as Error).message || '加载图表插件失败')
  }
}

async function onPluginChange(id: string) {
  patchModel({ pluginId: id, dataSetBinds: props.modelValue.dataSetBinds ?? [] })
  if (!id) {
    dataSigns.value = []
    return
  }
  loadingSigns.value = true
  try {
    dataSigns.value = await getChartPluginDataSigns(id)
  } catch (e) {
    fail((e as Error).message || '加载数据签名失败')
  } finally {
    loadingSigns.value = false
  }
}

onMounted(loadPlugins)
</script>

<template>
  <div class="cpp">
    <div class="cpp-tabs flex">
      <button class="cpp-tab" :class="{ active: activeTab === 'type' }" @click="activeTab = 'type'">图表类型</button>
      <button class="cpp-tab" :class="{ active: activeTab === 'dataBind' }" @click="activeTab = 'dataBind'">数据绑定</button>
      <button class="cpp-tab" :class="{ active: activeTab === 'style' }" @click="activeTab = 'style'">样式</button>
      <button class="cpp-tab" :class="{ active: activeTab === 'interaction' }" @click="activeTab = 'interaction'">交互</button>
    </div>

    <div v-if="activeTab === 'type'" class="cpp-section">
      <label>图表插件</label>
      <select :value="modelValue.pluginId ?? ''" @change="onPluginChange(($event.target as HTMLSelectElement).value)">
        <option value="">（选择图表插件）</option>
        <option v-for="p in plugins" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>

    <div v-else-if="activeTab === 'dataBind'" class="cpp-section">
      <div v-if="loadingSigns" class="text-color-secondary">加载数据签名…</div>
      <div v-else-if="!modelValue.pluginId" class="text-color-secondary">请先在「图表类型」选择图表插件</div>
      <DataSetBindForm
        v-else
        :model-value="modelValue.dataSetBinds"
        :data-signs="dataSigns"
        @update:model-value="patchModel({ dataSetBinds: $event })"
      />
    </div>

    <div v-else-if="activeTab === 'style'" class="cpp-section">
      <ChartStylePanel :model-value="modelValue.style" @update:model-value="patchModel({ style: $event })" />
    </div>

    <div v-else class="cpp-section">
      <ChartInteractionPanel :model-value="modelValue.interaction" @update:model-value="patchModel({ interaction: $event })" />
    </div>
  </div>
</template>

<style scoped>
.cpp-tabs {
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 8px;
}
.cpp-tab {
  border: 0;
  background: none;
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.cpp-tab.active {
  border-bottom-color: #6366f1;
  color: #6366f1;
  font-weight: 600;
}
.cpp-section {
  padding: 4px 0;
}
.cpp-section label {
  margin-right: 8px;
  font-weight: 600;
}
</style>
