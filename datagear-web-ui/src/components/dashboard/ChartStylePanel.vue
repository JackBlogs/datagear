<script setup lang="ts">
import type { ChartStyle } from '@/types/dashboard'

/** 图表样式面板（5c「样式」分组重写，基础字段） */
const props = defineProps<{ modelValue: ChartStyle }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ChartStyle): void }>()

function patch(p: Partial<ChartStyle>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}
</script>

<template>
  <div class="cs-panel">
    <div class="cs-row flex align-items-center gap-2">
      <label class="cs-label">标题</label>
      <input
        class="cs-input flex-1"
        :value="modelValue.name ?? ''"
        placeholder="图表名称"
        @change="patch({ name: ($event.target as HTMLInputElement).value })"
      />
    </div>
    <div class="cs-row flex align-items-center gap-2">
      <label class="cs-label">宽度</label>
      <input
        class="cs-input"
        type="number"
        :value="modelValue.width ?? ''"
        placeholder="px"
        @change="patch({ width: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>
    <div class="cs-row flex align-items-center gap-2">
      <label class="cs-label">高度</label>
      <input
        class="cs-input"
        type="number"
        :value="modelValue.height ?? ''"
        placeholder="px"
        @change="patch({ height: Number(($event.target as HTMLInputElement).value) })"
      />
    </div>
    <div class="cs-row flex align-items-center gap-2">
      <label class="cs-label">背景色</label>
      <input
        type="color"
        :value="modelValue.backgroundColor ?? '#ffffff'"
        @change="patch({ backgroundColor: ($event.target as HTMLInputElement).value })"
      />
    </div>
  </div>
</template>

<style scoped>
.cs-row {
  margin-bottom: 8px;
}
.cs-label {
  min-width: 56px;
  font-weight: 600;
}
.cs-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 6px;
}
</style>
