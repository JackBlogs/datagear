<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()

onMounted(() => {
  theme.init()
})
</script>

<template>
  <div class="app-root">
    <router-view />
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>
