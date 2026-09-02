import { defineStore } from 'pinia'
import { getMe, doLogout } from '@/api/auth'
import type { AuthMe, UserInfo } from '@/types'
import { usePermissionsStore } from './permissions'

/**
 * 当前用户 / 认证状态。
 * 阶段二已接通 GET /api/auth/me。
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserInfo | null,
    roles: [] as string[],
    anonymous: true,
    readonlyAction: true,
  }),
  getters: {
    isAnonymous: (state) => state.anonymous,
    isReadonlyAction: (state) => state.readonlyAction,
    isAdmin: (state) => !!state.user?.admin,
  },
  actions: {
    setAuthMe(me: AuthMe) {
      this.user = me.user
      this.roles = me.roles
      this.anonymous = me.anonymous
      this.readonlyAction = me.readonlyAction
      usePermissionsStore().setPermissions(me.modulePermissions)
    },
    /** 从 GET /api/auth/me 拉取当前用户 + 模块权限 */
    async fetchMe() {
      const me = await getMe()
      this.setAuthMe(me)
      return me
    },
    clear() {
      this.user = null
      this.roles = []
      this.anonymous = true
      this.readonlyAction = true
      usePermissionsStore().clear()
    },
    /** 退出登录：调用后端 /logout 清除会话，再清空本地状态 */
    async logout() {
      try {
        await doLogout()
      } catch {
        // 即使后端退出失败也清空本地状态
      }
      this.clear()
    },
  },
})
