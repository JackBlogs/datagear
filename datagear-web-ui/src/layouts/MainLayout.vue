<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'

// 骨架期主布局：侧菜单 + 多标签页 + 头部（阶段三按菜单权限渲染，见《方案》§6.4）。
const tabs = useTabsStore()
const tabTitles = computed(() => tabs.tabs.map((t) => t.title))
</script>

<template>
  <div class="layout-root flex h-full">
    <aside class="layout-sidebar">
      <router-link class="menu-item" to="/">首页</router-link>
      <router-link class="menu-item" to="/dtbsSource">数据源</router-link>
      <router-link class="menu-item" to="/fileSource">文件源</router-link>
      <router-link class="menu-item" to="/analysisProject">分析项目</router-link>
      <router-link class="menu-item" to="/dataSet">数据集</router-link>
      <router-link class="menu-item" to="/chart">图表</router-link>
      <router-link class="menu-item" to="/dashboard">看板</router-link>
      <router-link class="menu-item" to="/dtbsSourceGuard">数据源防护</router-link>
      <router-link class="menu-item" to="/role">角色管理</router-link>
      <router-link class="menu-item" to="/user">用户管理</router-link>
    </aside>
    <div class="layout-main flex flex-column flex-1">
      <header class="layout-header">
        DataGear
        <Button label="退出" text size="small" />
      </header>
      <div class="layout-tabs">
        多标签页（tabs store + KeepAlive）：
        <span v-if="tabTitles.length" class="tab-titles">{{ tabTitles.join(' / ') }}</span>
      </div>
      <main class="layout-content flex-1 overflow-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-sidebar {
  width: 220px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}
.menu-item {
  padding: 10px 16px;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid #f0f0f0;
}
.menu-item.router-link-active {
  background: #eef2ff;
  color: #6366f1;
}
.layout-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e0e0e0;
}
.layout-tabs {
  height: 40px;
  border-bottom: 1px solid #e0e0e0;
}
</style>
