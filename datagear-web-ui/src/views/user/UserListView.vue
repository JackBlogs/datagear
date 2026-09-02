<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userPagingQueryData, type User } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 用户管理列表（/api/user）+ 新建/编辑。
const router = useRouter()
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

function editRow(id: string) {
  router.push(`/user/${id}/edit`)
}

function changePassword(id: string) {
  router.push(`/user/${id}/password`)
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">用户管理</h3>
      <Button label="新建用户" size="small" @click="router.push('/user/add')" />
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
      <Column field="name" header="用户名" />
      <Column field="realName" header="姓名" />
      <Column field="email" header="邮箱" />
      <Column field="admin" header="管理员" />
      <Column header="操作">
        <template #body="slotProps">
          <div class="flex gap-1">
            <Button label="编辑" size="small" text @click="editRow(slotProps.data.id)" />
            <Button label="改密码" size="small" text @click="changePassword(slotProps.data.id)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
