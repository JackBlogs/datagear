<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listDriverEntities, deleteDriverEntities, type DriverEntity } from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据库驱动管理列表。
const router = useRouter()
const items = ref<DriverEntity[]>([])
const loading = ref(false)
const { success, fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    items.value = await listDriverEntities()
  } catch (e) {
    fail((e as Error).message || '查询失败')
  } finally {
    loading.value = false
  }
}

function editRow(id: string) {
  router.push(`/driverEntity/${id}/edit`)
}

async function removeRow(d: DriverEntity) {
  if (!window.confirm(`确认删除驱动「${d.displayName ?? d.id}」？`)) return
  try {
    await deleteDriverEntities([d.id])
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
      <h3 class="flex-1">驱动管理</h3>
      <Button label="新建驱动" size="small" @click="router.push('/driverEntity/add')" />
    </div>
    <DataTable :value="items" :loading="loading" data-key="id">
      <Column field="id" header="ID" />
      <Column field="displayName" header="名称" />
      <Column field="driverClassName" header="驱动类" />
      <Column field="databaseName" header="数据库" />
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
