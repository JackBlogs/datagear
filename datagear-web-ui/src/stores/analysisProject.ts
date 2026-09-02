import { defineStore } from 'pinia'

/**
 * 当前分析项目。
 * 阶段二：与后端 AnalysisProjectAwareSupport 显式契约对齐（X-Analysis-Project-Id 请求头），
 * 由 axios 请求拦截器统一注入。
 */
export const useAnalysisProjectStore = defineStore('analysisProject', {
  state: () => ({
    analysisProjectId: '' as string,
  }),
  actions: {
    setAnalysisProjectId(id: string) {
      this.analysisProjectId = id
    },
  },
})
