<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bigScreenPagingQueryData, deleteBigScreens, type BigScreenEntity } from '@/api/bigScreen'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 数据大屏管理列表：搜索、新增、设计、查看、编辑、删除、排序、分页。
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const items = ref<BigScreenEntity[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<BigScreenEntity[]>([])
const keyword = ref('')
const sortMeta = ref<any[]>([{ field: 'createTime', order: -1 }])

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({ name: m.field, type: m.order === 1 ? 'ASC' : 'DESC' }))
}

async function load() {
  loading.value = true
  try {
    const data = await bigScreenPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(sortMeta.value),
    })
    items.value = data.items
    total.value = data.total
    selected.value = []
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

function onPage(event: { page: number; rows: number }) {
  page.value = event.page
  pageSize.value = event.rows
  load()
}
function onSort(event: any) {
  sortMeta.value = event.multiSortMeta
  load()
}
function search() {
  page.value = 0
  load()
}
function onAdd() {
  router.push('/screen/add')
}
function onEdit() {
  const id = selected.value[0]?.id
  if (!id) return
  router.push(`/screen/${id}/edit`)
}
function onDesign() {
  const id = selected.value[0]?.id
  if (!id) return
  router.push(`/screen/${id}/design`)
}
function onView() {
  const id = selected.value[0]?.id
  if (!id) return
  router.push(`/screen/${id}/viewer`)
}
async function onDelete() {
  const ids = selected.value.map((i) => i.id)
  if (!ids.length) return
  try {
    await deleteBigScreens(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}
onMounted(load)
</script>

<template>
  <div class="page page-manager page-table h-full flex flex-column overflow-auto p-1">
    <div class="page-header grid grid-nogutter align-items-center p-1 flex-grow-0">
      <div class="col-12 md:col-4">
        <form class="flex gap-1" @submit.prevent="search">
          <InputText v-model="keyword" :placeholder="t('searchByName')" class="flex-1" />
          <Button type="submit" icon="pi pi-search" :label="t('query')" size="small" />
        </form>
      </div>
      <div class="operations col-12 flex gap-1 flex-wrap md:justify-content-end md:col-8">
        <Button :label="t('add')" size="small" @click="onAdd" />
        <Button :label="t('edit')" size="small" :disabled="selected.length !== 1" @click="onEdit" />
        <Button label="设计" size="small" :disabled="selected.length !== 1" @click="onDesign" />
        <Button :label="t('view')" size="small" class="p-button-secondary" :disabled="selected.length !== 1" @click="onView" />
        <Button :label="t('delete')" size="small" class="p-button-danger" :disabled="!selected.length" @click="onDelete" />
      </div>
    </div>
    <div class="page-content flex-grow-1 overflow-auto">
      <DataTable
        :value="items"
        :scrollable="true"
        scroll-height="flex"
        :paginator="true"
        :first="page * pageSize"
        :rows="pageSize"
        :rows-per-page-options="[10, 20, 50]"
        :current-page-report-template="'{first} 到 {last} 条，共 {totalRecords} 条'"
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        :loading="loading"
        :lazy="true"
        :total-records="total"
        sort-mode="multiple"
        :multi-sort-meta="sortMeta"
        data-key="id"
        striped-rows
        v-model:selection="selected"
        selection-mode="multiple"
        @page="onPage"
        @sort="onSort"
      >
        <Column selection-mode="multiple" class="col-check" />
        <Column field="id" :header="t('id')" class="col-id" />
        <Column field="name" :header="t('name')" sortable class="col-name" />
        <Column field="description" :header="t('description')" sortable class="col-name" />
        <Column field="theme" :header="t('theme')" sortable class="col-version" />
        <Column field="createTime" :header="t('createTime')" sortable class="col-datetime col-last" />
      </DataTable>
    </div>
  </div>
</template>
