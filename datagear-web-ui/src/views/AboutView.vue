<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAbout, type AboutInfo } from '@/api/public'

const info = ref<AboutInfo>({ name: 'DataGear', version: '6.0.0' })

onMounted(async () => {
  try {
    info.value = await getAbout()
  } catch {
    // 保持默认值
  }
})
</script>

<template>
  <div class="about">
    <h1>{{ info.name }}</h1>
    <div class="version">版本 {{ info.version }}</div>
    <div class="desc">数据可视化分析平台 · 前后端分离（Vue 3 + Spring Boot）</div>
  </div>
</template>

<style scoped>
.about {
  padding: 40px 24px;
  text-align: center;
}
.version {
  margin-top: 8px;
  color: #6366f1;
  font-weight: 600;
}
.desc {
  margin-top: 12px;
  color: #888;
}
</style>
