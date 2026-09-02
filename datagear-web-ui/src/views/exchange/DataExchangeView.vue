<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LegacyIframe from '@/components/LegacyIframe.vue'

// 5a 数据交换「包装迁移」外壳：SPA 外壳 + iframe 内嵌旧 /dtbsSourceExchange/{id}/import。
const route = useRoute()
const src = computed(() => `/dtbsSourceExchange/${route.params.dtbsSourceId}/import`)
</script>

<template>
  <LegacyIframe :src="src" />
</template>
