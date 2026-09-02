<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { rolePagingQueryData, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 阶段二 POC：PrimeVue npm 版 DataTable 懒加载 ↔ 后端 PagingData（证伪点 #3）。
// 后续沉淀为 usePagingTable() 组合函数（《方案》§6.3 P0）。
const items = ref<Role[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(5)
const { fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    const data = await rolePagingQueryData({ page: page.value, pageSize: pageSize.value })
    items.value = data.items
    total.value = data.total
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

function onPage(event: { page: number; rows: number }) {
  page.value = event.page + 1
  pageSize.value = event.rows
  load()
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <h3>角色管理（/api/role）</h3>
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
    >
      <Column field="id" header="ID" />
      <Column field="name" header="名称" />
      <Column field="description" header="描述" />
      <Column field="enabled" header="启用" />
    </DataTable>
  </div>
</template>
