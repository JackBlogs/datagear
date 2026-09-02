<script setup lang="ts">
import { usePagingTable } from '@/composables/usePagingTable'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { PagingQuery, PagingData } from '@/types'

export interface PagingColumn {
  field: string
  header: string
  sortable?: boolean
}

const props = defineProps<{
  title?: string
  loader: (query: PagingQuery) => Promise<PagingData<unknown>>
  columns: PagingColumn[]
  rowActions?: { label: string; path: (id: string) => string }[]
}>()

const { fail } = useOperationMessage()

const { items, total, loading, pageSize, onPage, onSort } = usePagingTable({
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
</script>

<template>
  <div class="p-4">
    <h3 v-if="title">{{ title }}（/api 接口）</h3>
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
          <router-link
            v-for="a in rowActions"
            :key="a.label"
            :to="a.path(rowId(data))"
            class="row-action"
          >
            {{ a.label }}
          </router-link>
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
}
.row-action:hover {
  text-decoration: underline;
}
</style>
