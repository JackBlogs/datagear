import { ref, shallowRef } from 'vue'
import type { PagingData, PagingQuery } from '@/types'

export interface PagingTableOptions<T> {
  /** 分页查询函数（调用 /api/{module}/pagingQueryData） */
  query: (query: PagingQuery) => Promise<PagingData<T>>
  pageSize?: number
}

/**
 * P0 组合函数：PrimeVue DataTable 懒加载 ↔ 后端 PagingData。
 * 替代旧 po.setupAjaxTable（见《方案》§6.3）。
 */
export function usePagingTable<T>(options: PagingTableOptions<T>) {
  const items = shallowRef<T[]>([])
  const total = ref(0)
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? 5)
  const sortField = ref<string | null>(null)
  const sortOrder = ref<1 | -1 | null>(null)

  async function load() {
    loading.value = true
    try {
      const query: PagingQuery = { page: page.value, pageSize: pageSize.value }
      if (sortField.value) {
        query.orders = [{ name: sortField.value, type: sortOrder.value === -1 ? 'DESC' : 'ASC' }]
      }
      const data = await options.query(query)
      items.value = data.items
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  /** DataTable @page 事件（page 从 0 起） */
  function onPage(event: { page: number; rows: number }) {
    page.value = event.page + 1
    pageSize.value = event.rows
    void load()
  }

  /** DataTable @sort 事件（PrimeVue 3 DataTableSortEvent：sortField 可为 string/函数） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSort(event: any) {
    sortField.value = typeof event?.sortField === 'string' ? event.sortField : null
    sortOrder.value = event?.sortOrder === -1 ? -1 : event?.sortOrder === 1 ? 1 : null
    void load()
  }

  return { items, total, loading, page, pageSize, sortField, sortOrder, load, onPage, onSort }
}
