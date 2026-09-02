import { ref, computed } from 'vue'

/**
 * P2 组合函数：向导步条（数据交换导入/导出向导用）。
 * 替代旧 page_steps 骨架（见《方案》§6.3）。
 */
export function useSteps(steps: string[], initial = 0) {
  const current = ref(initial)

  const isFirst = computed(() => current.value === 0)
  const isLast = computed(() => current.value === steps.length - 1)
  const currentStep = computed(() => steps[current.value])

  function next() {
    if (!isLast.value) current.value++
  }
  function prev() {
    if (!isFirst.value) current.value--
  }
  function go(index: number) {
    current.value = index
  }

  return { current, currentStep, isFirst, isLast, next, prev, go }
}
