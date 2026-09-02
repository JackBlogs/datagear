import { ref, type Ref } from 'vue'

/**
 * P1 组合函数：搜索表单骨架（折叠、重置、条件装配）。
 * 替代旧 page_search_form 骨架（见《方案》§6.3）。
 */
export function useSearchForm<T extends Record<string, unknown>>(initial: T = {} as T) {
  const collapsed = ref(false)
  const model = ref<T>({ ...initial }) as Ref<T>

  function reset() {
    model.value = { ...initial }
  }

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, model, reset, toggle }
}
