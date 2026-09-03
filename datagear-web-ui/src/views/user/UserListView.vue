<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { userPagingQueryData, deleteUsers, type User } from '@/api/user'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 用户管理列表页：「能源暗域 Energy Dark」风格重写（对齐 DtbsSourceListView.vue 样板）。
// 功能 100% 保留自旧 PrimeVue 版：关键字搜索、增/改/改密码/查/删、多选 + 批量删除、
// 多列排序（点击表头切换，Shift+点击追加多列排序）、后端分页（含 10/20/50 每页条数切换）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（后端分页 + 关键字搜索） ----
const items = ref<User[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<User[]>([])
const keyword = ref('')
const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'createTime', order: -1 }])

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({
    name: m.field,
    type: m.order === 1 ? 'ASC' : 'DESC',
  }))
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

// ---- 多选 ----
const selectedIds = computed(() => new Set(selected.value.map((u) => u.id)))
const allChecked = computed(() => items.value.length > 0 && items.value.every((u) => selectedIds.value.has(u.id)))
const someChecked = computed(() => selected.value.length > 0 && !allChecked.value)

// 原生 checkbox 的 indeterminate 只能走 DOM 属性，用局部指令设置（避免模板类型报错）
const vIndeterminate = {
  mounted(el: HTMLInputElement, binding: { value: boolean }) {
    el.indeterminate = binding.value
  },
  updated(el: HTMLInputElement, binding: { value: boolean }) {
    el.indeterminate = binding.value
  },
}

function toggleAll() {
  selected.value = allChecked.value ? [] : [...items.value]
}

function toggleRow(u: User) {
  selected.value = selectedIds.value.has(u.id)
    ? selected.value.filter((x) => x.id !== u.id)
    : [...selected.value, u]
}

async function load() {
  loading.value = true
  try {
    const data = await userPagingQueryData({
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

function search() {
  page.value = 0
  load()
}

function gotoPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  page.value = p - 1
  load()
}

function onPageSizeChange() {
  page.value = 0
  load()
}

// ---- 排序（点击表头切换升/降；Shift+点击追加多列排序，对齐旧版 sort-mode="multiple"） ----
function sortOrderOf(field: string): 'ASC' | 'DESC' | '' {
  const m = sortMeta.value.find((s) => s.field === field)
  return m ? (m.order === 1 ? 'ASC' : 'DESC') : ''
}

function toggleSort(field: string, ev: MouseEvent) {
  const idx = sortMeta.value.findIndex((m) => m.field === field)
  if (ev.shiftKey) {
    // 多列排序：已存在则翻转方向，否则追加
    const arr = [...sortMeta.value]
    if (idx >= 0) arr[idx] = { field, order: -arr[idx].order }
    else arr.push({ field, order: 1 })
    sortMeta.value = arr
  } else {
    // 单列排序：当前唯一排序列则翻转方向，否则替换为该列升序
    if (idx >= 0 && sortMeta.value.length === 1) sortMeta.value = [{ field, order: -sortMeta.value[idx].order }]
    else sortMeta.value = [{ field, order: 1 }]
  }
  page.value = 0
  load()
}

// ---- 行操作（路由与旧版一致） ----
function onAdd() {
  router.push('/user/add')
}

function onEdit(u: User) {
  router.push(`/user/${u.id}/edit`)
}

function onEditPassword(u: User) {
  router.push(`/user/${u.id}/password`)
}

function onView(u: User) {
  router.push(`/user/${u.id}/view`)
}

/** 删除（单个或批量共用）：确认 → 询问数据迁移目标用户 ID（留空直接删除，取消中止） */
async function doDelete(users: User[]) {
  const ids = users.map((i) => i.id)
  if (!ids.length) return
  if (!window.confirm(t('confirmDeleteUserAsk'))) return
  const migrateInput = window.prompt(t('userPage.migratePrompt'))
  if (migrateInput === null) return
  try {
    await deleteUsers(ids, migrateInput)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

function onDelete(u: User) {
  doDelete([u])
}

function onBatchDelete() {
  doDelete(selected.value)
}

/** 头像首字符：优先姓名，其次用户名 */
function avatarChar(u: User) {
  return (u.realName || u.name || '?').charAt(0).toUpperCase()
}

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('userPage.title') }}</div>
        <div class="page-desc">{{ t('userPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('userPage.newUser') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 + 已选操作条 + 总数 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByUsernameOrRealName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div class="flex" style="margin-left:auto;gap:12px">
        <div v-if="selected.length" class="sel-bar">
          <span>{{ t('userPage.selInfoPrefix') }} <b class="cnt">{{ selected.length }}</b> {{ t('userPage.selInfoSuffix') }}</span>
          <button class="btn danger sm" type="button" @click="onBatchDelete">{{ t('userPage.batchDelete') }}</button>
          <span class="link muted" @click="selected = []">{{ t('cancelSelect') }}</span>
        </div>
        <span class="tx-3 sm" style="align-self:center">{{ t('userPage.totalCount', { n: total }) }}</span>
      </div>
    </div>

    <!-- 用户表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px">
              <input type="checkbox" :checked="allChecked" v-indeterminate="someChecked" @change="toggleAll" />
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('name', $event)">
              {{ t('userPage.colUser') }}
              <span v-if="sortOrderOf('name')" style="font-size:10px;margin-left:2px">{{ sortOrderOf('name') === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('realName', $event)">
              {{ t('realName') }}
              <span v-if="sortOrderOf('realName')" style="font-size:10px;margin-left:2px">{{ sortOrderOf('realName') === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th>{{ t('userPage.colEmail') }}</th>
            <th>{{ t('module.role') }}</th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('createTime', $event)">
              {{ t('createTime') }}
              <span v-if="sortOrderOf('createTime')" style="font-size:10px;margin-left:2px">{{ sortOrderOf('createTime') === 'ASC' ? '▲' : '▼' }}</span>
            </th>
            <th style="width:230px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="tx-3" style="text-align:center">{{ t('loading') }}</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="7"><div class="empty">{{ t('userPage.empty') }}</div></td>
          </tr>
          <tr v-for="u in items" :key="u.id">
            <td>
              <input type="checkbox" :checked="selectedIds.has(u.id)" @change="toggleRow(u)" />
            </td>
            <td>
              <div class="flex" style="gap:10px">
                <span class="avatar">{{ avatarChar(u) }}</span>
                <span class="cell-main ellipsis" style="max-width:200px" :title="u.name">{{ u.name }}</span>
              </div>
            </td>
            <td>{{ u.realName || '-' }}</td>
            <td class="sm">{{ u.email || '-' }}</td>
            <td>
              <span v-if="u.admin" class="tag brand">{{ t('userPage.roleAdmin') }}</span>
              <span v-else class="tag">{{ t('userPage.roleNormal') }}</span>
            </td>
            <td class="sm tx-3">{{ u.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(u)">{{ t('edit') }}</span> ·
              <span class="link muted" @click="onEditPassword(u)">{{ t('editPassword') }}</span> ·
              <span class="link" @click="onView(u)">{{ t('view') }}</span> ·
              <span class="link danger" @click="onDelete(u)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页条（后端分页，含每页条数切换，保留旧版 10/20/50 选项） -->
    <div class="pager">
      <select v-model.number="pageSize" class="select" style="width:auto;padding:4px 8px" @change="onPageSizeChange">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
      <span>{{ page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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
    </div>
  </div>
</template>
