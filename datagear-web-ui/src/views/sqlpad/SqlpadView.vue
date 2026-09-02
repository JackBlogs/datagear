<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LegacyIframe from '@/components/LegacyIframe.vue'

// 5b SQL 工作台「包装迁移」外壳：SPA 外壳 + iframe 内嵌旧 /dtbsSourceSqlpad/{id}。
const route = useRoute()
const src = computed(() => `/dtbsSourceSqlpad/${route.params.dtbsSourceId}`)
</script>

<template>
  <LegacyIframe :src="src" />
</template>
