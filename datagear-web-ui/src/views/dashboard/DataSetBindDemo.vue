<script setup lang="ts">
import { ref } from 'vue'
import ChartPropertyPanel from '@/components/dashboard/ChartPropertyPanel.vue'
import { newChartModel, type ChartModel } from '@/types/dashboard'

// 图表属性面板演示（5c）：图表类型（插件选择）→ 数据绑定 → 样式，整体模型 ChartModel。
const model = ref<ChartModel>(newChartModel())
</script>

<template>
  <div class="p-4">
    <h3>图表属性面板（5c 分组重写演示）</h3>
    <p class="text-color-secondary">图表插件选择、数据签名加载、数据集字段绑定、样式，全链路接入真实后端。</p>
    <ChartPropertyPanel v-model="model" />
    <h4>图表模型（v-model 输出的 ChartModel）</h4>
    <pre class="result">{{ model }}</pre>
  </div>
</template>

<style scoped>
.result {
  background: #f7f7f7;
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
