<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userPagingQueryData, type User } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 与 RoleListView 同构的列表页（后续沉淀为 usePagingTable() 组合函数）。
const items = ref<User[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(5)
const { fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    const data = await userPagingQueryData({ page: page.value, pageSize: pageSize.value })
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
    <h3>用户管理（/api/user）</h3>
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
      <Column field="name" header="用户名" />
      <Column field="realName" header="姓名" />
      <Column field="email" header="邮箱" />
      <Column field="admin" header="管理员" />
    </DataTable>
  </div>
</template>
