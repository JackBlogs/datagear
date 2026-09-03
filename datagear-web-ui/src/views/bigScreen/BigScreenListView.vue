<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bigScreenPagingQueryData, deleteBigScreens, type BigScreenEntity } from '@/api/bigScreen'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'
import '@/styles/datasource-page.css'

// 数据大屏管理列表（能源暗域风格）：搜索、排序、多选批量删除、新增、设计、编辑、查看、分页。
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const ICONS = {
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  screen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
}

const items = ref<BigScreenEntity[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<BigScreenEntity[]>([])
const keyword = ref('')
const sortField = ref('createTime')
const sortAsc = ref(false)

function toOrders(): Order[] {
  return [{ name: sortField.value, type: sortAsc.value ? 'ASC' : 'DESC' }]
}

async function load() {
  loading.value = true
  try {
    const data = await bigScreenPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(),
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

function search() {
  page.value = 0
  load()
}

function toggleSort(field: string) {
  if (sortField.value === field) sortAsc.value = !sortAsc.value
  else {
    sortField.value = field
    sortAsc.value = false
  }
  load()
}

function sortArrow(field: string): string {
  if (sortField.value !== field) return ''
  return sortAsc.value ? ' ▲' : ' ▼'
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageNumbers = computed(() => {
  const cur = page.value + 1
  const end = Math.min(pageCount.value, Math.max(1, cur - 2) + 4)
  const arr: number[] = []
  for (let i = Math.max(1, end - 4); i <= end; i++) arr.push(i)
  return arr
})
function gotoPage(p: number) {
  page.value = p - 1
  load()
}
function changePageSize(e: Event) {
  pageSize.value = Number((e.target as HTMLSelectElement).value)
  page.value = 0
  load()
}

function allChecked(): boolean {
  return items.value.length > 0 && selected.value.length === items.value.length
}
function toggleAll() {
  selected.value = allChecked() ? [] : [...items.value]
}
function isChecked(item: BigScreenEntity): boolean {
  return selected.value.some((s) => s.id === item.id)
}
function toggleOne(item: BigScreenEntity) {
  selected.value = isChecked(item) ? selected.value.filter((s) => s.id !== item.id) : [...selected.value, item]
}

function onAdd() {
  router.push('/screen/add')
}
function onDesign(item: BigScreenEntity) {
  router.push(`/screen/${item.id}/design`)
}
function onEdit(item: BigScreenEntity) {
  router.push(`/screen/${item.id}/edit`)
}
function onView(item: BigScreenEntity) {
  router.push(`/screen/${item.id}/viewer`)
}
async function doDelete(ids: string[]) {
  try {
    await deleteBigScreens(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}
function onDelete(item: BigScreenEntity) {
  if (!window.confirm(t('scr.confirmDelOne'))) return
  doDelete([item.id])
}
function onDeleteSelected() {
  if (!selected.value.length) return
  if (!window.confirm(t('scr.confirmDelSelected'))) return
  doDelete(selected.value.map((i) => i.id))
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('scr.title') }}</div>
        <div class="page-desc">{{ t('scr.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display: inline-flex" v-html="ICONS.plus"></span>{{ t('scr.newScreen') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 -->
    <div class="flex mb-2" style="gap: 10px">
      <form class="flex grow" style="gap: 10px; max-width: 460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <span class="tx-3 sm" style="align-self: center; margin-left: auto">{{ t('scr.totalPrefix') }} {{ total }} {{ t('scr.totalSuffix') }}</span>
    </div>

    <!-- 已选操作条 -->
    <div v-if="selected.length" class="sel-bar mb-2">
      <span>{{ t('scr.selectedPrefix') }} {{ selected.length }} {{ t('scr.selectedSuffix') }}</span>
      <button class="btn danger sm" type="button" @click="onDeleteSelected">{{ t('scr.batchDelete') }}</button>
    </div>

    <!-- 大屏表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width: 36px">
              <input type="checkbox" :checked="allChecked()" @change="toggleAll" />
            </th>
            <th class="col-name" style="cursor: pointer" @click="toggleSort('name')">
              {{ t('name') }}<span style="font-size: 11px">{{ sortArrow('name') }}</span>
            </th>
            <th style="cursor: pointer" @click="toggleSort('description')">
              {{ t('description') }}<span style="font-size: 11px">{{ sortArrow('description') }}</span>
            </th>
            <th style="cursor: pointer" @click="toggleSort('theme')">
              {{ t('scr.theme') }}<span style="font-size: 11px">{{ sortArrow('theme') }}</span>
            </th>
            <th style="cursor: pointer" @click="toggleSort('createTime')">
              {{ t('createTime') }}<span style="font-size: 11px">{{ sortArrow('createTime') }}</span>
            </th>
            <th style="width: 220px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="tx-3" style="text-align: center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="6"><div class="empty">{{ t('scr.empty') }}</div></td>
          </tr>
          <tr v-for="s in items" :key="s.id">
            <td><input type="checkbox" :checked="isChecked(s)" @change="toggleOne(s)" /></td>
            <td>
              <div class="flex" style="gap: 10px">
                <span
                  style="width: 30px; height: 30px; border-radius: 8px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 138, 61, 0.14); color: var(--brand)"
                  v-html="ICONS.screen"
                ></span>
                <span class="cell-main ellipsis" style="max-width: 220px" :title="s.name">{{ s.name }}</span>
              </div>
            </td>
            <td class="sm tx-3 ellipsis" style="max-width: 260px" :title="s.description">{{ s.description || '-' }}</td>
            <td><span v-if="s.theme" class="tag brand">{{ s.theme }}</span><span v-else class="tx-3">-</span></td>
            <td class="sm tx-3">{{ s.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onDesign(s)">{{ t('design') }}</span> ·
              <span class="link" @click="onEdit(s)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(s)">{{ t('view') }}</span> ·
              <span class="link danger" @click="onDelete(s)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页条 -->
    <div class="pager">
      <span>{{ t('name') }} {{ page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
      <button class="pg-btn" type="button" :disabled="page <= 0" @click="gotoPage(page)">‹</button>
      <button
        v-for="p in pageNumbers"
        :key="p"
        class="pg-btn"
        :class="{ cur: p === page + 1 }"
        type="button"
        @click="gotoPage(p)"
      >
        {{ p }}
      </button>
      <button class="pg-btn" type="button" :disabled="page + 1 >= pageCount" @click="gotoPage(page + 2)">›</button>
      <select class="input" style="width: auto; padding: 2px 6px" :value="pageSize" @change="changePageSize">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </div>
  </div>
</template>
