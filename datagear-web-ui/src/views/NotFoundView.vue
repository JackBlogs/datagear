<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// SPA 路由兜底 404（API 错误一律 JSON，页面 404/500 由前端路由兜底，见《方案》§5.1.8）。
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-column align-items-center justify-content-center h-full gap-3">
    <h1>404</h1>
    <p>{{ t('pageNotFound') }}</p>
    <router-link to="/">{{ t('backToHome') }}</router-link>
  </div>
</template>
