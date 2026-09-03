<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  listTables,
  getTable,
  pagingQueryData,
  getQuerySql,
  saveRow,
  updateRow,
  deleteRows,
  type SimpleTable,
  type TableMeta,
  type DataRow,
} from '@/api/dtbsSourceData'
import { getDtbsSource } from '@/api/dtbsSource'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 数据源数据管理，按原 dtbsSource_tree.ftl 复刻「左侧表清单 / 右侧表数据」布局。
// 搜索区按旧版 dtbsSourceData_search_form.ftl：not-like 开关 + SQL WHERE 条件面板（Ctrl+Enter 搜索）。
// 第三轮：按原型「能源暗域」qb 双栏风格重排版式（qb-pane/field-chip/.tbl/.code-input/.pager），功能不变。
import '@/styles/datasource-page.css'

const route = useRoute()
const router = useRouter()
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

// 搜索表单：关键字 / not-like 开关 / WHERE 条件（对应后端 PagingQuery.keyword/notLike/condition）
const searchKeyword = ref('')
const searchNotLike = ref(false)
const searchCondition = ref('')
const conditionPanelShow = ref(false)

const showForm = ref(false)
const editing = ref(false)
const form = ref<DataRow>({})
const originalRow = ref<DataRow>({})
const showTableMeta = ref(false)

// 表结构（列）信息用于表头 / 行表单
const columns = computed(() => table.value?.columns ?? [])

const filteredTables = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return tables.value
  return tables.value.filter(
    (tb) => (tb.name ?? '').toLowerCase().includes(k) || (tb.comment ?? '').toLowerCase().includes(k),
  )
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  const cur = page.value
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

function isRowSelected(row: DataRow): boolean {
  return selectedRows.value.some((r) => rowDataKey(r) === rowDataKey(row))
}

function toggleRow(row: DataRow) {
  if (isRowSelected(row)) {
    selectedRows.value = selectedRows.value.filter((r) => rowDataKey(r) !== rowDataKey(row))
  } else {
    selectedRows.value = [...selectedRows.value, row]
  }
}

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
    const data = await pagingQueryData(dtbsSourceId, selectedTable.value, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      notLike: searchNotLike.value || undefined,
      condition: searchCondition.value.trim() || undefined,
    })
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

function onSearch() {
  page.value = 1
  conditionPanelShow.value = false
  void loadData()
}

function onConditionKeydown(e: KeyboardEvent) {
  // 旧版行为：Ctrl+Enter 触发搜索
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    onSearch()
  }
}

function clearCondition() {
  searchCondition.value = ''
}

function gotoPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  page.value = p
  void loadData()
}

/** 导出：取当前查询 SQL（含关键字/条件/not-like），跳导出向导并预填（来源旧版 onExport） */
async function onExport() {
  try {
    const res = await getQuerySql(dtbsSourceId, selectedTable.value, {
      keyword: searchKeyword.value || undefined,
      notLike: searchNotLike.value || undefined,
      condition: searchCondition.value.trim() || undefined,
    })
    router.push({ path: `/dataExchange-export/${dtbsSourceId}`, query: { query: res.sql } })
  } catch (e) {
    fail((e as Error).message || t('exportFail'))
  }
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

function cellText(row: DataRow, name: string): string {
  const v = row[name]
  return v == null ? '' : String(v)
}

onMounted(async () => {
  await Promise.all([loadTitle(), loadTables()])
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('data.title') }}</div>
        <div class="page-desc">{{ t('data.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="router.push('/dtbsSource')">{{ t('back') }}</button>
      </div>
    </div>

    <div class="qb" style="grid-template-columns:280px 1fr;align-items:stretch">
      <!-- 左：表清单（qb-pane + field-chip） -->
      <div class="qb-pane" style="display:flex;flex-direction:column;max-height:calc(100vh - 210px)">
        <div class="p-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>
          {{ t('data.tables') }}
          <span class="p-side">{{ tables.length }}</span>
        </div>
        <input v-model="keyword" class="input" style="margin-bottom:10px" :placeholder="t('searchTable')" />
        <div style="flex:1;overflow-y:auto;min-height:0">
          <div
            v-for="tb in filteredTables"
            :key="tb.name"
            class="field-chip"
            :class="{ active: selectedTable === tb.name }"
            :title="tb.comment || tb.name"
            @click="selectTable(tb.name)"
          >
            <span class="f-type">{{ (tb.type || 'TABLE').slice(0, 4) }}</span>
            <span class="ellipsis">{{ tb.name }}</span>
            <span v-if="tb.comment" class="f-sub">{{ tb.comment }}</span>
          </div>
          <div v-if="!filteredTables.length" class="tx-3 sm" style="padding:8px 2px">{{ t('noTable') }}</div>
        </div>
      </div>

      <!-- 右：表数据 -->
      <div class="flex-col" style="min-width:0;gap:12px">
        <!-- 面包屑 + 工具栏 -->
        <div class="flex-between" style="flex-wrap:wrap;gap:10px">
          <div class="crumbs">
            <span>{{ dtbsSourceTitle || t('dataManagement') }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
            <b>{{ selectedTable || t('table') }}</b>
          </div>
          <div class="flex" style="gap:8px;flex-wrap:wrap">
            <button class="btn sm primary" type="button" :disabled="!selectedTable" @click="openAdd">{{ t('add') }}</button>
            <button class="btn sm" type="button" :disabled="selectedRows.length !== 1" @click="openEdit(selectedRows[0])">{{ t('edit') }}</button>
            <button class="btn sm danger" type="button" :disabled="!selectedRows.length" @click="removeSelected">{{ t('deleteSelected') }}</button>
            <button class="btn sm" type="button" :disabled="!selectedTable" @click="showTableMeta = true">{{ t('data.tableMeta') }}</button>
            <button class="btn sm" type="button" :disabled="!selectedTable" @click="onExport">{{ t('data.exportCurrent') }}</button>
            <button class="btn sm ghost" type="button" @click="loadData">{{ t('refresh') }}</button>
          </div>
        </div>

        <!-- 搜索区：关键字 + LIKE/NOT LIKE 分段 + WHERE 条件 -->
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <form class="flex grow" style="gap:8px;max-width:520px" @submit.prevent="onSearch">
            <input v-model="searchKeyword" class="input" :placeholder="t('search')" />
            <button class="btn" type="submit">{{ t('query') }}</button>
          </form>
          <div class="seg">
            <span class="seg-item" :class="{ active: !searchNotLike }" @click="searchNotLike = false">{{ t('data.like') }}</span>
            <span class="seg-item" :class="{ active: searchNotLike }" @click="searchNotLike = true">{{ t('data.notLike') }}</span>
          </div>
          <button class="btn sm" :class="{ primary: searchCondition || conditionPanelShow }" type="button" @click="conditionPanelShow = !conditionPanelShow">
            {{ t('data.whereCond') }}
          </button>
        </div>
        <div v-if="conditionPanelShow" class="qb-pane">
          <div class="p-title">{{ t('data.whereCond') }}<span class="p-side">Ctrl+Enter</span></div>
          <textarea
            v-model="searchCondition"
            class="code-input"
            rows="3"
            :placeholder="t('data.whereCondPlaceholder')"
            @keydown="onConditionKeydown"
          ></textarea>
          <div class="flex-between mt-1">
            <button class="btn sm ghost" type="button" @click="clearCondition">{{ t('clear') }}</button>
            <button class="btn sm primary" type="button" @click="onSearch">{{ t('query') }}</button>
          </div>
        </div>

        <!-- 数据表格 -->
        <div class="table-wrap" style="max-height:calc(100vh - 430px)">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:36px"></th>
                <th v-for="c in columns" :key="c.name">{{ fieldLabel(c) }}</th>
                <th style="width:110px">{{ t('operation') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="columns.length + 2" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
              </tr>
              <tr v-else-if="!selectedTable">
                <td :colspan="columns.length + 2"><div class="empty">{{ t('pleaseSelectTableData') }}</div></td>
              </tr>
              <tr v-else-if="!rows.length">
                <td :colspan="columns.length + 2" class="tx-3" style="text-align:center">—</td>
              </tr>
              <template v-else>
                <tr v-for="row in rows" :key="rowDataKey(row)">
                  <td>
                    <input type="checkbox" :checked="isRowSelected(row)" @change="toggleRow(row)" />
                  </td>
                  <td v-for="c in columns" :key="c.name">
                    <span :title="cellText(row, c.name)" class="ellipsis" style="display:inline-block;max-width:24ch;vertical-align:bottom">{{ cellText(row, c.name) }}</span>
                  </td>
                  <td>
                    <span class="link" @click="openEdit(row)">{{ t('edit') }}</span> ·
                    <span class="link danger" @click="removeRow(row)">{{ t('delete') }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 分页条 -->
        <div class="pager" style="margin-top:0">
          <span>{{ total }} · {{ page }}/{{ pageCount }}</span>
          <button class="pg-btn" type="button" :disabled="page <= 1" @click="gotoPage(page - 1)">‹</button>
          <button v-for="p in pageNumbers" :key="p" class="pg-btn" :class="{ cur: p === page }" type="button" @click="gotoPage(p)">{{ p }}</button>
          <button class="pg-btn" type="button" :disabled="page >= pageCount" @click="gotoPage(page + 1)">›</button>
        </div>
      </div>
    </div>

    <!-- 行编辑弹窗（.modal 风格） -->
    <div v-if="showForm" class="modal-mask" @click.self="showForm = false">
      <div class="modal" style="width:640px">
        <div class="flex-between">
          <div style="font-size:15px;font-weight:700">{{ editing ? t('editRow') : t('addRow') }}<span class="tx-3 sm"> · {{ selectedTable }}</span></div>
          <button class="drawer-close" type="button" @click="showForm = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="mt-2" style="max-height:56vh;overflow-y:auto">
          <div v-for="c in columns" :key="c.name" class="form-item">
            <label class="form-label" :title="c.comment || c.name">{{ fieldLabel(c) }}<span class="tx-3" style="margin-left:6px">{{ c.typeName }}</span></label>
            <input
              :value="cellText(form, c.name)"
              class="input"
              type="text"
              :placeholder="c.typeName ?? ''"
              @input="form[c.name] = ($event.target as HTMLInputElement).value"
            />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" type="button" @click="showForm = false">{{ t('cancel') }}</button>
          <button class="btn primary" type="button" :disabled="saving" @click="submit">{{ saving ? t('loading') : t('save') }}</button>
        </div>
      </div>
    </div>

    <!-- 表结构弹窗（.modal 风格） -->
    <div v-if="showTableMeta" class="modal-mask" @click.self="showTableMeta = false">
      <div class="modal" style="width:720px">
        <div class="flex-between">
          <div style="font-size:15px;font-weight:700">{{ t('data.tableMeta') }}<span class="tx-3 sm"> · {{ selectedTable }}</span></div>
          <button class="drawer-close" type="button" @click="showTableMeta = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="table-wrap mt-2" style="border-radius:var(--r-m);max-height:56vh">
          <table class="tbl">
            <thead>
              <tr>
                <th>{{ t('data.columnName') }}</th>
                <th>{{ t('data.columnType') }}</th>
                <th>{{ t('allowNull') }}</th>
                <th>{{ t('data.comment') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in columns" :key="c.name">
                <td class="cell-main">{{ c.name }}</td>
                <td><span class="tag">{{ c.typeName ?? c.type }}</span></td>
                <td>{{ c.nullable ? t('yes') : t('no') }}</td>
                <td class="tx-3">{{ c.comment || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-foot">
          <button class="btn" type="button" @click="showTableMeta = false">{{ t('close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
