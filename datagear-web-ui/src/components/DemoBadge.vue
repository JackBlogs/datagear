<script setup lang="ts">
import { useDemoData } from '@/composables/useDemoData'

/**
 * 演示数据徽标：统一标注「本页为硬编码演示数据，尚无后端 API 支撑」。
 * 全局开关（useDemoData.DEMO_BADGE_ENABLED）关闭时自动隐藏。
 */
const { showBadge, label } = useDemoData()
</script>

<template>
  <span v-if="showBadge" class="demo-badge" title="本页为硬编码演示数据，尚无后端 API 支撑；真实化时仅替换页面数据源为 API 调用">
    {{ label }}
  </span>
</template>

<style scoped>
.demo-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--brand-soft, rgba(255, 138, 61, 0.14));
  color: var(--brand, #ff8a3d);
  border: 1px solid var(--brand-line, rgba(255, 138, 61, 0.35));
  white-space: nowrap;
  vertical-align: middle;
  cursor: help;
}
</style>
