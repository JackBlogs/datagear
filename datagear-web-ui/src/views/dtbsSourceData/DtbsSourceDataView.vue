<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const { success, fail } = useOperationMessage()

const dtbsSourceId = route.params.dtbsSourceId as string

const tables = ref<SimpleTable[]>([])
const selectedTable = ref('')
const table = ref<TableMeta | null>(null)
const rows = ref<DataRow[]>([])
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
    fail((e as Error).message || '加载表失败')
  }
}

async function loadData() {
  if (!selectedTable.value) return
  loading.value = true
  try {
    table.value = await getTable(dtbsSourceId, selectedTable.value)
    const data = await pagingQueryData(dtbsSourceId, selectedTable.value, page.value, pageSize.value)
    rows.value = data.items ?? []
    total.value = data.total
  } catch (e) {
    fail((e as Error).message || '加载数据失败')
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
    success('保存成功')
    showForm.value = false
    await loadData()
  } catch (e) {
    fail((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function removeRow(row: DataRow) {
  if (!window.confirm('确认删除该行？')) return
  try {
    await deleteRows(dtbsSourceId, selectedTable.value, [row])
    success('删除成功')
    await loadData()
  } catch (e) {
    fail((e as Error).message || '删除失败')
  }
}

onMounted(loadTables)
</script>

<template>
  <div class="p-4">
    <div class="flex align-items-center gap-2 mb-3">
      <h3 class="flex-1">数据管理</h3>
      <Button label="返回" text @click="router.push('/dtbsSource')" />
    </div>

    <div class="toolbar flex align-items-center gap-2 mb-2">
      <label class="label">数据表</label>
      <select v-model="selectedTable" class="input flex-1" @change="onSelectTable">
        <option value="">（选择数据表）</option>
        <option v-for="t in tables" :key="t.name" :value="t.name">{{ t.name }}</option>
      </select>
      <Button label="新增行" size="small" :disabled="!selectedTable" @click="openAdd" />
    </div>

    <DataTable
      v-if="selectedTable"
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
      <Column v-for="c in table?.columns ?? []" :key="c.name" :field="c.name" :header="c.name" />
      <Column header="操作">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button label="编辑" size="small" text @click="openEdit(data)" />
            <Button label="删除" size="small" text severity="danger" @click="removeRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <div v-if="showForm" class="form-panel">
      <div class="flex align-items-center gap-2 mb-2">
        <span class="flex-1">{{ editing ? '编辑行' : '新增行' }}</span>
        <Button label="取消" size="small" text @click="showForm = false" />
      </div>
      <div class="form-grid">
        <div v-for="c in table?.columns ?? []" :key="c.name" class="flex align-items-center gap-2">
          <label class="col-label">{{ c.name }}</label>
          <input v-model="form[c.name]" class="input flex-1" :placeholder="c.typeName ?? ''" />
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <Button label="保存" :loading="saving" @click="submit" />
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
