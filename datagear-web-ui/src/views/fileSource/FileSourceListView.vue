<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  fileSourcePagingQueryData,
  deleteFileSources,
  fileSourceFilePagingQueryData,
  type FileSource,
  type FileSourceFileItem,
} from '@/api/fileSource'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'

// 文件数据源列表页：按「能源暗域 Energy Dark」风格重写（样板 DtbsSourceListView.vue）。
// 功能 100% 保留自原 PrimeVue 版：关键字搜索、名称/描述排序、后端分页（含每页条数）、
// 新建/编辑/查看/浏览文件/删除、多选 + 批量删除；文件浏览弹窗改为 .modal-mask + .modal 原生弹窗。
// 文件浏览沿用旧端点 /fileSource/file/pagingQueryData（面包屑 + 进入子目录 + 关键字过滤 + 分页）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

// ---- 列表数据（后端分页 + 关键字搜索 + 排序） ----
const items = ref<FileSource[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<FileSource[]>([])
const keyword = ref('')
// 原页默认排序：name ASC（名称/描述两列可点击切换升降序）
const sortField = ref<'name' | 'description'>('name')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')

// ---- 文件浏览弹窗 ----
const browseVisible = ref(false)
const browseSource = ref<FileSource | null>(null)
const browsePath = ref('')
const browseKeyword = ref('')
const browseItems = ref<FileSourceFileItem[]>([])
const browseTotal = ref(0)
const browsePage = ref(1)
const browsePageSize = ref(20)
const browseLoading = ref(false)

// 面包屑段（根目录 + 逐级路径）
const breadcrumbs = computed(() => {
  const segs = browsePath.value ? browsePath.value.split('/').filter(Boolean) : []
  const crumbs: { label: string; path: string }[] = [{ label: t('fileSource.root'), path: '' }]
  let acc = ''
  for (const s of segs) {
    acc = acc ? `${acc}/${s}` : s
    crumbs.push({ label: s, path: acc })
  }
  return crumbs
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

const browsePageCount = computed(() => Math.max(1, Math.ceil(browseTotal.value / browsePageSize.value)))

const browsePageNumbers = computed(() => {
  const cur = browsePage.value
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(browsePageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

// ---- 多选 ----
const selectedIds = computed(() => new Set(selected.value.map((s) => s.id)))
const allChecked = computed(() => items.value.length > 0 && items.value.every((i) => selectedIds.value.has(i.id)))
const someChecked = computed(() => selected.value.length > 0 && !allChecked.value)

function toggleAll() {
  selected.value = allChecked.value ? [] : [...items.value]
}

function toggleRow(fs: FileSource) {
  selected.value = selectedIds.value.has(fs.id)
    ? selected.value.filter((s) => s.id !== fs.id)
    : [...selected.value, fs]
}

function toOrders(): Order[] {
  return [{ name: sortField.value, type: sortOrder.value }]
}

async function load() {
  loading.value = true
  try {
    const data = await fileSourcePagingQueryData({
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

function gotoPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  page.value = p - 1
  load()
}

function onPageSizeChange() {
  page.value = 0
  load()
}

/** 表头点击排序：同列切换升/降，异列切到该列升序 */
function toggleSort(field: 'name' | 'description') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortField.value = field
    sortOrder.value = 'ASC'
  }
  page.value = 0
  load()
}

function sortArrow(field: string) {
  if (sortField.value !== field) return ''
  return sortOrder.value === 'ASC' ? '▲' : '▼'
}

// ---- 行操作 ----
function onAdd() {
  router.push('/fileSource/add')
}

function onEdit(d: FileSource) {
  router.push(`/fileSource/${d.id}/edit`)
}

function onView(d: FileSource) {
  router.push({ path: `/fileSource/${d.id}/view`, query: { mode: 'view' } })
}

async function onDeleteOne(d: FileSource) {
  if (!window.confirm(t('fileSourcePage.confirmDeleteOne', { name: d.name }))) return
  try {
    await deleteFileSources([d.id])
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

async function onDeleteSelected() {
  const ids = selected.value.map((i) => i.id)
  if (!ids.length) return
  if (!window.confirm(t('confirmDelSelectedAsk'))) return
  try {
    await deleteFileSources(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

// ---- 文件浏览 ----
function openBrowse(d: FileSource) {
  browseSource.value = d
  browsePath.value = ''
  browseKeyword.value = ''
  browsePage.value = 1
  browseVisible.value = true
  void loadBrowse()
}

function closeBrowse() {
  browseVisible.value = false
}

async function loadBrowse() {
  if (!browseSource.value) return
  browseLoading.value = true
  try {
    const data = await fileSourceFilePagingQueryData(browseSource.value.id, {
      keyword: browseKeyword.value || undefined,
      path: browsePath.value || undefined,
      queryRange: 'children',
      page: browsePage.value,
      pageSize: browsePageSize.value,
    })
    browseItems.value = data.items ?? []
    browseTotal.value = data.total ?? 0
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    browseLoading.value = false
  }
}

function enterDir(f: FileSourceFileItem) {
  if (!f.directory) return
  browsePath.value = f.path ?? f.name
  browsePage.value = 1
  void loadBrowse()
}

function gotoCrumb(path: string) {
  browsePath.value = path
  browsePage.value = 1
  void loadBrowse()
}

function onBrowseSearch() {
  browsePage.value = 1
  void loadBrowse()
}

function gotoBrowsePage(p: number) {
  if (p < 1 || p > browsePageCount.value) return
  browsePage.value = p
  void loadBrowse()
}

function onBrowsePageSizeChange() {
  browsePage.value = 1
  void loadBrowse()
}

// ---- 图标（24×24 stroke 风格） ----
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('fileSourcePage.title') }}</div>
        <div class="page-desc">{{ t('fileSourcePage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('fileSourcePage.newSource') }}
        </button>
      </div>
    </div>

    <!-- 搜索条 + 已选操作条 -->
    <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByNameOrDesc')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selected.length" class="sel-bar">
        <span>{{ t('fileSourcePage.selPrefix') }}&nbsp;<span class="cnt">{{ selected.length }}</span>&nbsp;{{ t('fileSourcePage.selSuffix') }}</span>
        <button class="btn danger sm" type="button" @click="onDeleteSelected">{{ t('delete') }}</button>
        <span class="link muted" @click="selected = []">{{ t('fileSourcePage.clearSel') }}</span>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('fileSourcePage.total', { n: total }) }}</span>
    </div>

    <!-- 文件源表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px">
              <input type="checkbox" :checked="allChecked" :indeterminate="someChecked" @change="toggleAll" />
            </th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('name')">
              {{ t('name') }}<span style="font-size:10px;margin-left:3px">{{ sortArrow('name') }}</span>
            </th>
            <th>{{ t('path') }}</th>
            <th style="cursor:pointer;user-select:none" @click="toggleSort('description')">
              {{ t('description') }}<span style="font-size:10px;margin-left:3px">{{ sortArrow('description') }}</span>
            </th>
            <th>{{ t('createTime') }}</th>
            <th style="width:220px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="6"><div class="empty">{{ t('fileSourcePage.empty') }}</div></td>
          </tr>
          <tr v-for="d in items" :key="d.id">
            <td>
              <input type="checkbox" :checked="selectedIds.has(d.id)" @change="toggleRow(d)" />
            </td>
            <td>
              <div class="flex" style="gap:10px">
                <span
                  style="width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--brand);background:var(--brand-soft)"
                  v-html="ICONS.folder"
                ></span>
                <span class="cell-main ellipsis" style="max-width:220px" :title="d.name">{{ d.name }}</span>
              </div>
            </td>
            <td class="sm" style="font-family:var(--font-mono);font-size:12px">{{ d.directory || '-' }}</td>
            <td>
              <span class="ellipsis" style="display:inline-block;max-width:260px" :title="d.description">{{ d.description || '-' }}</span>
            </td>
            <td class="sm tx-3">{{ d.createTime || '-' }}</td>
            <td>
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
              <span class="link" @click="openBrowse(d)">{{ t('fileSource.browse') }}</span> ·
              <span class="link danger" @click="onDeleteOne(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页条 -->
    <div class="pager">
      <select v-model.number="pageSize" class="select" style="width:auto;padding:4px 8px" @change="onPageSizeChange">
        <option :value="10">10 / {{ t('fileSourcePage.perPage') }}</option>
        <option :value="20">20 / {{ t('fileSourcePage.perPage') }}</option>
        <option :value="50">50 / {{ t('fileSourcePage.perPage') }}</option>
      </select>
      <span>{{ total === 0 ? 0 : page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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

    <!-- 文件浏览弹窗（原生 .modal-mask + .modal，旧端点 /fileSource/file/pagingQueryData） -->
    <div v-if="browseVisible" class="modal-mask" @click.self="closeBrowse">
      <div class="modal" style="width:720px">
        <div class="flex" style="align-items:flex-start;gap:12px">
          <div class="grow" style="min-width:0">
            <div style="font-size:15px;font-weight:700;margin-bottom:8px">
              {{ t('fileSource.browseTitle') }}{{ browseSource?.name ? ' · ' + browseSource.name : '' }}
            </div>
            <!-- 目录面包屑（各段可点击回到对应层级） -->
            <div class="crumbs" style="flex-wrap:wrap;row-gap:4px">
              <template v-for="(c, i) in breadcrumbs" :key="c.path">
                <span v-if="i > 0" style="display:inline-flex;color:var(--tx-4)" v-html="ICONS.chevron"></span>
                <b v-if="i === breadcrumbs.length - 1">{{ c.label }}</b>
                <span v-else class="link" @click="gotoCrumb(c.path)">{{ c.label }}</span>
              </template>
            </div>
          </div>
          <button class="drawer-close" type="button" style="flex:none" @click="closeBrowse" v-html="ICONS.close"></button>
        </div>

        <!-- 目录内关键字过滤 -->
        <form class="flex mt-2 mb-2" style="gap:10px" @submit.prevent="onBrowseSearch">
          <input v-model="browseKeyword" class="input" :placeholder="t('searchByName')" />
          <button class="btn" type="submit">{{ t('query') }}</button>
        </form>

        <!-- 文件表格 -->
        <div class="table-wrap" style="max-height:44vh">
          <table class="tbl">
            <thead>
              <tr>
                <th>{{ t('fileSource.fileName') }}</th>
                <th style="width:140px">{{ t('fileSource.fileSize') }}</th>
                <th style="width:180px">{{ t('fileSource.lastModified') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="browseLoading">
                <td colspan="3" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
              </tr>
              <tr v-else-if="!browseItems.length">
                <td colspan="3"><div class="empty" style="padding:32px 20px">{{ t('fileSourcePage.browseEmpty') }}</div></td>
              </tr>
              <tr
                v-for="f in browseItems"
                :key="f.path || f.name"
                :style="f.directory ? 'cursor:pointer' : ''"
                @click="enterDir(f)"
              >
                <td>
                  <span class="flex" style="gap:8px">
                    <span
                      style="display:inline-flex;width:16px;height:16px;flex:none"
                      :style="f.directory ? 'color:var(--brand)' : 'color:var(--tx-3)'"
                      v-html="f.directory ? ICONS.folder : ICONS.file"
                    ></span>
                    <span :class="f.directory ? 'cell-main ellipsis' : 'ellipsis'" style="max-width:340px" :title="f.displayName || f.name">
                      {{ f.displayName || f.name }}
                    </span>
                  </span>
                </td>
                <td class="sm num">{{ f.directory ? '-' : f.size || f.bytes || '-' }}</td>
                <td class="sm tx-3">{{ f.displayLastModified || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 弹窗分页条 -->
        <div class="pager">
          <select v-model.number="browsePageSize" class="select" style="width:auto;padding:4px 8px" @change="onBrowsePageSizeChange">
            <option :value="10">10 / {{ t('fileSourcePage.perPage') }}</option>
            <option :value="20">20 / {{ t('fileSourcePage.perPage') }}</option>
            <option :value="50">50 / {{ t('fileSourcePage.perPage') }}</option>
          </select>
          <span>{{ browseTotal === 0 ? 0 : (browsePage - 1) * browsePageSize + 1 }}-{{ Math.min(browseTotal, browsePage * browsePageSize) }} / {{ browseTotal }}</span>
          <button class="pg-btn" type="button" :disabled="browsePage <= 1" @click="gotoBrowsePage(browsePage - 1)">‹</button>
          <button
            v-for="p in browsePageNumbers"
            :key="p"
            class="pg-btn"
            :class="{ cur: p === browsePage }"
            type="button"
            @click="gotoBrowsePage(p)"
          >
            {{ p }}
          </button>
          <button class="pg-btn" type="button" :disabled="browsePage >= browsePageCount" @click="gotoBrowsePage(browsePage + 1)">›</button>
        </div>
      </div>
    </div>
  </div>
</template>
