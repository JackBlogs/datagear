<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LegacyIframe from '@/components/LegacyIframe.vue'

// 5c 看板设计器「包装迁移」外壳：SPA 外壳 + iframe 内嵌旧 /dashboard/design/{id}。
const route = useRoute()
const src = computed(() => `/dashboard/design/${route.params.id}`)
</script>

<template>
  <LegacyIframe :src="src" />
</template>
