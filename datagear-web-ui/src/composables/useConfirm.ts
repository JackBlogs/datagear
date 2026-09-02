import { useConfirm as usePrimeConfirm } from 'primevue/useconfirm'

/**
 * P1 组合函数：动态确认对话框。
 * 替代旧 $.confirm（见《方案》§6.3）。
 */
export function useConfirm() {
  const confirm = usePrimeConfirm()

  function confirmAction(message: string, onAccept: () => void) {
    confirm.require({
      message,
      header: '确认',
      acceptLabel: '确定',
      rejectLabel: '取消',
      accept: onAccept,
    })
  }

  return { confirmAction }
}
