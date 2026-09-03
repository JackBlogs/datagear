<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
import { getDtbsSource } from '@/api/dtbsSource'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据源数据管理，按原 dtbsSource_tree.ftl 复刻「左侧表结构 / 右侧表数据」布局：
// 左侧可搜索的表列表（表结构），右侧所选表的数据表格（可增/改/删）。
const route = useRoute()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const dtbsSourceId = route.params.dtbsSourceId as string
const dtbsSourceTitle = ref(route.query.title ? String(route.query.title) : '')

const tables = ref<SimpleTable[]>([])
const keyword = ref('')
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

// 表结构（列）信息用于表头 / 行表单
const columns = computed(() => table.value?.columns ?? [])

const filteredTables = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return tables.value
  return tables.value.filter(
    (tb) => (tb.name ?? '').toLowerCase().includes(k) || (tb.comment ?? '').toLowerCase().includes(k),
  )
})

// 行唯一键（优先 __rowid，否则用所有列值拼接）
function rowDataKey(row: DataRow): string {
  if (row.__rowid != null) return String(row.__rowid)
  return columns.value.map((c) => String(row[c.name] ?? '')).join('|')
}

async function loadTitle() {
  try {
    if (!dtbsSourceTitle.value) {
      const d = await getDtbsSource(dtbsSourceId)
      dtbsSourceTitle.value = d.title ?? ''
    }
  } catch {
    // 忽略标题加载失败
  }
}

async function loadTables() {
  try {
    tables.value = await listTables(dtbsSourceId)
    if (tables.value.length && !selectedTable.value) {
      selectedTable.value = tables.value[0].name
      await loadData()
    }
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

function selectTable(name: string) {
  if (selectedTable.value === name) return
  selectedTable.value = name
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
  for (const c of columns.value) {
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
  if (!window.confirm(t('confirmDeleteRowAsk'))) return
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

function fieldLabel(c: { name: string; comment?: string }): string {
  return c.comment || c.name
}

onMounted(async () => {
  await Promise.all([loadTitle(), loadTables()])
})
</script>

<template>
  <div class="page page-manager page-dtbsSourcedata h-full flex flex-column overflow-hidden">
    <div class="page-header grid grid-nogutter align-items-center p-1 flex-grow-0">
      <div class="col-12 flex align-items-center mb-1">
        <i class="pi pi-database text-color-secondary text-sm"></i>
        <div class="text-color-secondary text-sm ml-1">{{ dtbsSourceTitle || t('dataManagement') }}</div>
        <i class="pi pi-angle-right text-color-secondary text-sm mx-1"></i>
        <div class="text-color-secondary text-sm">{{ selectedTable || t('table') }}</div>
      </div>
    </div>

    <div class="grid grid-nogutter m-0 flex-nowrap h-full overflow-hidden">
      <!-- 左侧：表结构（表列表） -->
      <aside class="col-3 border-right-1 surface-hover">
        <div class="flex flex-column h-full">
          <div class="p-1">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <InputText v-model="keyword" class="input w-full" :placeholder="t('searchTable')" />
            </span>
          </div>
          <div class="table-list flex-1 overflow-auto">
            <div
              v-for="tb in filteredTables"
              :key="tb.name"
              class="table-item flex align-items-center gap-2 py-2 px-2 cursor-pointer"
              :class="{ active: selectedTable === tb.name }"
              @click="selectTable(tb.name)"
              :title="tb.comment || tb.name"
            >
              <i class="pi pi-table text-sm"></i>
              <span class="flex-1 text-overflow">{{ tb.name }}</span>
              <span v-if="tb.comment" class="text-xs text-color-secondary text-overflow">{{ tb.comment }}</span>
            </div>
            <div v-if="filteredTables.length === 0" class="text-color-secondary text-sm p-2">{{ t('noTable') }}</div>
          </div>
        </div>
      </aside>

      <!-- 右侧：表数据 -->
      <div class="col-9 flex flex-column h-full overflow-hidden">
        <div class="operations flex flex-wrap gap-1 align-items-center p-1 flex-grow-0">
          <Button :label="t('add')" size="small" :disabled="!selectedTable" @click="openAdd" />
          <Button :label="t('edit')" size="small" :disabled="selectedRows.length !== 1" @click="openEdit(selectedRows[0])" />
          <Button :label="t('deleteSelected')" size="small" severity="danger" :disabled="!selectedRows.length" @click="removeSelected" />
          <Button :label="t('refresh')" size="small" text @click="loadData" />
          <div class="flex-grow-1"></div>
          <span class="text-color-secondary text-sm">{{ selectedTable }}</span>
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
          :data-key="rowDataKey"
          :scrollable="true"
          scroll-height="flex"
          striped-rows
          @page="onPage"
        >
          <Column selection-mode="multiple" header-style="width:3rem" />
          <Column v-for="c in columns" :key="c.name" :field="c.name" :header="fieldLabel(c)">
            <template #body="{ data }">
              <span :title="String(data[c.name] ?? '')">{{ String(data[c.name] ?? '') }}</span>
            </template>
          </Column>
          <Column :header="t('operation')">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button :label="t('edit')" size="small" text @click="openEdit(data)" />
                <Button :label="t('delete')" size="small" text severity="danger" @click="removeRow(data)" />
              </div>
            </template>
          </Column>
        </DataTable>
        <div v-else class="flex flex-1 align-items-center justify-content-center text-color-secondary">
          {{ t('pleaseSelectTableData') }}
        </div>
      </div>
    </div>

    <!-- 行编辑 Dialog -->
    <Dialog
      :visible="showForm"
      :header="editing ? t('editRow') : t('addRow')"
      modal
      :style="{ width: '50rem' }"
      @update:visible="showForm = $event"
    >
      <div class="form-grid">
        <div v-for="c in columns" :key="c.name" class="field grid align-items-center">
          <label class="col-label col-12 mb-1 md:col-3 md:mb-0" :title="c.comment || c.name">{{ fieldLabel(c) }}</label>
          <div class="col-12 md:col-9">
            <InputText
              :model-value="String(form[c.name] ?? '')"
              class="input w-full"
              :placeholder="c.typeName ?? ''"
              @update:model-value="(v: string | undefined) => (form[c.name] = v)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('cancel')" text @click="showForm = false" />
        <Button :label="t('save')" :loading="saving" @click="submit" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
}
.table-item {
  border-bottom: 1px solid var(--surface-border);
  transition: background 0.15s;
}
.table-item:hover {
  background: var(--surface-hover);
}
.table-item.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}
.table-item.active .text-color-secondary {
  color: var(--primary-color-text);
}
.text-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-label {
  font-weight: 600;
  font-size: 12px;
}
.form-grid {
  display: grid;
  gap: 8px;
}
</style>
