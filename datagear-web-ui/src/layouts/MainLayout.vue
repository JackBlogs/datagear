<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTabsStore } from '@/stores/tabs'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

// 主布局：侧菜单 + 多标签页 + 头部。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const tabs = useTabsStore()
const auth = useAuthStore()
const theme = useThemeStore()

const tabTitles = computed(() => tabs.tabs.map((t) => t.title))

const menuItems = computed(() => [
  { path: '/', label: t('module.main'), icon: 'pi pi-home' },
  { path: '/dtbsSource', label: t('module.dtbsSource'), icon: 'pi pi-database' },
  { path: '/fileSource', label: t('module.fileSource'), icon: 'pi pi-folder' },
  { path: '/analysisProject', label: t('module.analysisProject'), icon: 'pi pi-th-large' },
  { path: '/dataSet', label: t('module.dataSet'), icon: 'pi pi-table' },
  { path: '/chart', label: t('module.chart'), icon: 'pi pi-chart-line' },
  { path: '/dashboard', label: t('module.dashboard'), icon: 'pi pi-images' },
  { path: '/dtbsSourceGuard', label: t('module.dtbsSourceGuard'), icon: 'pi pi-shield' },
  { path: '/driverEntity', label: t('module.driverEntity'), icon: 'pi pi-cog' },
  { path: '/chartPlugin', label: t('module.chartPlugin'), icon: 'pi pi-palette' },
  { path: '/role', label: t('module.role'), icon: 'pi pi-users' },
  { path: '/user', label: t('module.user'), icon: 'pi pi-user' },
])

const activePath = computed(() => route.path)

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout-root flex h-full">
    <aside class="layout-sidebar flex flex-column">
      <div class="layout-brand flex align-items-center px-3">
        <i class="pi pi-database mr-2"></i>
        <span class="font-bold">DataGear</span>
      </div>
      <nav class="layout-menu flex-1 overflow-y-auto">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu-item flex align-items-center px-3"
          :class="{ active: activePath === item.path }"
        >
          <i :class="item.icon" class="mr-2"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>
    <div class="layout-main flex flex-column flex-1">
      <header class="layout-header flex align-items-center justify-content-between px-3">
        <div class="font-semibold">{{ route.meta.title || 'DataGear' }}</div>
        <div class="flex align-items-center gap-2">
          <Button
            :icon="theme.theme === 'blue' ? 'pi pi-moon' : 'pi pi-sun'"
            :label="theme.theme === 'blue' ? '深色' : '浅色'"
            text
            size="small"
            @click="theme.toggle()"
          />
          <span v-if="auth.user" class="text-sm text-color-secondary">
            {{ auth.user.realName || auth.user.name }}
          </span>
          <Button :label="t('logout')" icon="pi pi-sign-out" text size="small" @click="logout" />
        </div>
      </header>
      <div class="layout-tabs flex align-items-center px-2 gap-2">
        <span class="text-xs text-color-secondary">标签页：</span>
        <span v-if="!tabTitles.length" class="text-xs text-color-secondary">无</span>
        <span v-for="title in tabTitles" :key="title" class="tab-title">{{ title }}</span>
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
  background: var(--surface-card);
  border-right: 1px solid var(--surface-border);
}
.layout-brand {
  height: 3.5rem;
  border-bottom: 1px solid var(--surface-border);
  font-size: 1.1rem;
}
.layout-menu {
  padding: 0.5rem 0;
}
.menu-item {
  height: 2.75rem;
  color: var(--text-color);
  text-decoration: none;
  transition: background 0.2s;
}
.menu-item:hover,
.menu-item.active {
  background: var(--surface-hover);
  color: var(--primary-color);
}
.layout-header {
  height: 3.5rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}
.layout-tabs {
  height: 2.5rem;
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
}
.tab-title {
  padding: 0.125rem 0.5rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  font-size: 0.75rem;
}
</style>
