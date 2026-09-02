<script setup lang="ts">
/**
 * 「包装迁移」外壳：内嵌旧后端渲染视图（双轨期）。
 * 阶段五复杂模块（看板设计器/SQL工作台/数据交换）先以 iframe 包装复用，后续逐步重写为 Vue 组件。
 */
defineProps<{ src: string }>()
</script>

<template>
  <iframe :src="src" class="legacy-iframe" />
</template>

<style scoped>
.legacy-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
