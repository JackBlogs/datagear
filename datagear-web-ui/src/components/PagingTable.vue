<script setup lang="ts">
import { usePagingTable } from '@/composables/usePagingTable'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { PagingQuery, PagingData } from '@/types'

export interface PagingColumn {
  field: string
  header: string
  sortable?: boolean
}

export interface RowAction {
  label: string
  /** 跳转路由（编辑等） */
  path?: (id: string) => string
  /** 操作回调（删除等），执行后自动刷新列表 */
  action?: (id: string) => void | Promise<void>
}

const props = defineProps<{
  title?: string
  loader: (query: PagingQuery) => Promise<PagingData<unknown>>
  columns: PagingColumn[]
  rowActions?: RowAction[]
}>()

const { fail } = useOperationMessage()

const { items, total, loading, pageSize, onPage, onSort, load } = usePagingTable({
  query: async (query) => {
    try {
      return await props.loader(query)
    } catch (e) {
      fail((e as Error).message || '查询失败')
      return { total: 0, items: [], pages: 0, page: 1, pageSize: query.pageSize }
    }
  },
})

function rowId(data: unknown): string {
  return (data as { id?: string })?.id ?? ''
}

async function runAction(a: RowAction, id: string) {
  if (!a.action) return
  if (!window.confirm(`确认${a.label}？`)) return
  try {
    await a.action(id)
    await load()
  } catch (e) {
    fail((e as Error).message || '操作失败')
  }
}
</script>

<template>
  <div class="p-4">
    <h3 v-if="title">{{ title }}</h3>
    <DataTable
      :value="items"
      :lazy="true"
      :total-records="total"
      :loading="loading"
      paginator
      :rows="pageSize"
      :rows-per-page-options="[5, 10, 20]"
      data-key="id"
      @page="onPage"
      @sort="onSort"
    >
      <Column
        v-for="c in columns"
        :key="c.field"
        :field="c.field"
        :header="c.header"
        :sortable="c.sortable ?? false"
      />
      <Column v-if="rowActions?.length" header="操作">
        <template #body="{ data }">
          <template v-for="a in rowActions" :key="a.label">
            <router-link v-if="a.path" :to="a.path(rowId(data))" class="row-action">
              {{ a.label }}
            </router-link>
            <button v-else type="button" class="row-action" @click="runAction(a, rowId(data))">
              {{ a.label }}
            </button>
          </template>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.row-action {
  margin-right: 8px;
  color: #6366f1;
  text-decoration: none;
  background: none;
  border: 0;
  padding: 0;
  font-size: inherit;
  cursor: pointer;
}
.row-action:hover {
  text-decoration: underline;
}
</style>
