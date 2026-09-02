<script setup lang="ts">
import type { ChartInteraction } from '@/types/dashboard'

/** 图表交互面板（5c「交互」分组重写，常用交互开关） */
const props = defineProps<{ modelValue: ChartInteraction }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ChartInteraction): void }>()

function patch(p: Partial<ChartInteraction>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}
</script>

<template>
  <div class="ci-panel">
    <label class="flex align-items-center gap-1 ci-row">
      <Checkbox :model-value="!!modelValue.showTooltip" :binary="true" @update:model-value="patch({ showTooltip: $event as boolean })" />
      显示提示框（tooltip）
    </label>
    <label class="flex align-items-center gap-1 ci-row">
      <Checkbox :model-value="!!modelValue.showLegend" :binary="true" @update:model-value="patch({ showLegend: $event as boolean })" />
      显示图例（legend）
    </label>
    <label class="flex align-items-center gap-1 ci-row">
      <Checkbox :model-value="!!modelValue.showDataZoom" :binary="true" @update:model-value="patch({ showDataZoom: $event as boolean })" />
      显示数据缩放（dataZoom）
    </label>
  </div>
</template>

<style scoped>
.ci-row {
  cursor: pointer;
  padding: 4px 0;
}
</style>
