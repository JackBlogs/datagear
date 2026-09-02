<script setup lang="ts">
// SPA 路由兜底 404（API 错误一律 JSON，页面 404/500 由前端路由兜底，见《方案》§5.1.8）。
</script>

<template>
  <div class="flex flex-column align-items-center justify-content-center h-full gap-3">
    <h1>404</h1>
    <p>页面不存在</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>
