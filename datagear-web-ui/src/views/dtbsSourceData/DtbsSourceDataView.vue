<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  listTables,
  getTable,
  pagingQueryData,
  saveRow,
  updateRow,
  deleteRows,
  type SimpleTable,
  type TableMeta,
  type DataRow,
} from '@/api/dtbsSourceData'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据管理：选表 → 浏览数据（分页）→ 新增/编辑/删除行。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const dtbsSourceId = route.params.dtbsSourceId as string

const tables = ref<SimpleTable[]>([])
const selectedTable = ref('')
const table = ref<TableMeta | null>(null)
const rows = ref<DataRow[]>([])
const selectedRows = ref<DataRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const saving = ref(false)

const showForm = ref(false)
const editing = ref(false)
const form = ref<DataRow>({})
const originalRow = ref<DataRow>({})

async function loadTables() {
  try {
    tables.value = await listTables(dtbsSourceId)
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  }
}

async function loadData() {
  if (!selectedTable.value) return
  loading.value = true
  try {
    table.value = await getTable(dtbsSourceId, selectedTable.value)
    const data = await pagingQueryData(dtbsSourceId, selectedTable.value, page.value, pageSize.value)
    rows.value = data.items ?? []
    selectedRows.value = []
    total.value = data.total
  } catch (e) {
    fail((e as Error).message || t('loadFail'))
  } finally {
    loading.value = false
  }
}

function onSelectTable() {
  page.value = 1
  void loadData()
}

function onPage(event: { page: number; rows: number }) {
  page.value = event.page + 1
  pageSize.value = event.rows
  void loadData()
}

function openAdd() {
  editing.value = false
  originalRow.value = {}
  form.value = {}
  for (const c of table.value?.columns ?? []) {
    form.value[c.name] = ''
  }
  showForm.value = true
}

function openEdit(row: DataRow) {
  editing.value = true
  originalRow.value = { ...row }
  form.value = { ...row }
  showForm.value = true
}

async function submit() {
  saving.value = true
  try {
    if (editing.value) {
      await updateRow(dtbsSourceId, selectedTable.value, originalRow.value, form.value)
    } else {
      await saveRow(dtbsSourceId, selectedTable.value, form.value)
    }
    success(t('saveSuccess'))
    showForm.value = false
    await loadData()
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    saving.value = false
  }
}

async function removeRow(row: DataRow) {
  if (!window.confirm('确认删除该行？')) return
  try {
    await deleteRows(dtbsSourceId, selectedTable.value, [row])
    success(t('deleteSuccess'))
    await loadData()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function removeSelected() {
  if (!selectedRows.value.length) {
    fail(t('pleaseSelectRows'))
    return
  }
  if (!window.confirm(t('confirmDeleteSelectedAsk', { count: selectedRows.value.length }))) return
  try {
    await deleteRows(dtbsSourceId, selectedTable.value, selectedRows.value)
    success(t('deleteSuccess'))
    selectedRows.value = []
    await loadData()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

onMounted(loadTables)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">{{ t('dataManagement') }}</h3>
      <Button :label="t('back')" text @click="router.push('/dtbsSource')" />
    </div>

    <div class="toolbar flex align-items-center gap-2 mb-2">
      <label class="label">{{ t('table') }}</label>
      <Dropdown
        v-model="selectedTable"
        :options="tables"
        option-label="name"
        option-value="name"
        :placeholder="t('selectTablePlaceholder')"
        class="input flex-1"
        filter
        :filter-fields="['name', 'comment']"
        @change="onSelectTable"
      />
      <Button :label="t('addRow')" size="small" :disabled="!selectedTable" @click="openAdd" />
      <Button :label="t('deleteSelected')" size="small" severity="danger" :disabled="!selectedRows.length" @click="removeSelected" />
    </div>

    <DataTable
      v-if="selectedTable"
      v-model:selection="selectedRows"
      :value="rows"
      :lazy="true"
      :total-records="total"
      :loading="loading"
      paginator
      :rows="pageSize"
      :rows-per-page-options="[10, 20, 50]"
      data-key="__rowid"
      @page="onPage"
    >
      <Column selection-mode="multiple" header-style="width:3rem" />
      <Column v-for="c in table?.columns ?? []" :key="c.name" :field="c.name" :header="c.name" />
      <Column :header="t('operation')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button :label="t('edit')" size="small" text @click="openEdit(data)" />
            <Button :label="t('delete')" size="small" text severity="danger" @click="removeRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <div v-if="showForm" class="form-panel">
      <div class="flex align-items-center gap-2 mb-2">
        <span class="flex-1">{{ editing ? t('editRow') : t('addRow') }}</span>
        <Button :label="t('cancel')" size="small" text @click="showForm = false" />
      </div>
      <div class="form-grid">
        <div v-for="c in table?.columns ?? []" :key="c.name" class="flex align-items-center gap-2">
          <label class="col-label">{{ c.name }}</label>
          <InputText
            :model-value="String(form[c.name] ?? '')"
            class="input flex-1"
            :placeholder="c.typeName ?? ''"
            @update:model-value="(v: string | undefined) => (form[c.name] = v)"
          />
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <Button :label="t('save')" :loading="saving" @click="submit" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.label {
  min-width: 56px;
  font-weight: 600;
}
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
.form-panel {
  margin-top: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.col-label {
  min-width: 80px;
  font-weight: 600;
  font-size: 12px;
}
</style>
