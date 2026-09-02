import { defineStore } from 'pinia'
import type { ModulePermissions } from '@/types'

/**
 * 模块可见性 / isReadonlyAction 权限缓存。
 * 数据源来自 GET /api/auth/me 的 modulePermissions（阶段二实现）。
 */
export const usePermissionsStore = defineStore('permissions', {
  state: () => ({
    modulePermissions: null as ModulePermissions | null,
  }),
  actions: {
    setPermissions(perms: ModulePermissions) {
      this.modulePermissions = perms
    },
    clear() {
      this.modulePermissions = null
    },
  },
})
