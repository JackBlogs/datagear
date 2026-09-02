import { useToast } from 'primevue/usetoast'

/**
 * OperationMessage 解包 + 统一提示（替代 po 框架的 $.confirm / 提示）。
 * P0 组合函数，见《方案》§6.3。
 */
export function useOperationMessage() {
  const toast = useToast()

  function success(message: string) {
    toast.add({ severity: 'success', summary: '成功', detail: message, life: 3000 })
  }

  function fail(message: string) {
    toast.add({ severity: 'error', summary: '失败', detail: message, life: 5000 })
  }

  return { success, fail, toast }
}
