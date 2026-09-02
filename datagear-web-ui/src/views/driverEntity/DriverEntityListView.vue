<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { listDriverEntities, deleteDriverEntities, type DriverEntity } from '@/api/driverEntity'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据库驱动管理列表。
const router = useRouter()
const { t } = useI18n()
const items = ref<DriverEntity[]>([])
const loading = ref(false)
const { success, fail } = useOperationMessage()

async function load() {
  loading.value = true
  try {
    items.value = await listDriverEntities()
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

function editRow(id: string) {
  router.push(`/driverEntity/${id}/edit`)
}

function onView(id: string) {
  router.push(`/driverEntity/${id}/view`)
}

async function removeRow(d: DriverEntity) {
  if (!window.confirm(t('confirmDeleteDriverAsk', { name: d.displayName ?? d.id }))) return
  try {
    await deleteDriverEntities([d.id])
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-2">
      <h3 class="flex-1">驱动管理</h3>
      <Button :label="t('newDriver')" size="small" @click="router.push('/driverEntity/add')" />
    </div>
    <DataTable :value="items" :loading="loading" data-key="id">
      <Column field="id" :header="t('id')" />
      <Column field="displayName" :header="t('name')" />
      <Column field="driverClassName" :header="t('driverClassName')" />
      <Column field="databaseName" :header="t('database')" />
      <Column :header="t('operation')">
        <template #body="slotProps">
          <div class="flex gap-1">
            <Button :label="t('edit')" size="small" text @click="editRow(slotProps.data.id)" />
            <Button :label="t('view')" size="small" text @click="onView(slotProps.data.id)" />
            <Button :label="t('delete')" size="small" text severity="danger" @click="removeRow(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
