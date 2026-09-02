<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { rolePagingQueryData, deleteRoles, type Role } from '@/api/role'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 角色管理列表（/api/role）+ 新建/编辑/删除。
const router = useRouter()
const items = ref<Role[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(5)
const { success, fail } = useOperationMessage()

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

function editRow(id: string) {
  router.push(`/role/${id}/edit`)
}

async function removeRow(role: Role) {
  try {
    await deleteRoles([role.id])
    success('删除成功')
    load()
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">角色管理</h3>
      <Button label="新建角色" size="small" @click="router.push('/role/add')" />
    </div>
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
      <Column header="操作">
        <template #body="slotProps">
          <div class="flex gap-1">
            <Button label="编辑" size="small" text @click="editRow(slotProps.data.id)" />
            <Button label="删除" size="small" text severity="danger" @click="removeRow(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
