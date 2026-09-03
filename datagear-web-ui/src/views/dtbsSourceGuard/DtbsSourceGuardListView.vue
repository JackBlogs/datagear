<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  dtbsSourceGuardPagingQueryData,
  deleteDtbsSourceGuards,
  type DtbsSourceGuard,
} from '@/api/dtbsSourceGuard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

// 数据源防护列表：按 PAGE_CONVERSION_GUIDE 从 PrimeVue DataTable 重写为「能源暗域」原生表格。
// 功能保留：关键字搜索、后端分页、新增/编辑/查看/测试/删除、多选 + 批量删除。
// 原页 DataTable 未配置可排序列（sortMeta 恒为空），故 orders 沿用原默认值（空数组），不加表头排序交互。
const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const items = ref<DtbsSourceGuard[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const selected = ref<DtbsSourceGuard[]>([])
const keyword = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

const selectedIds = computed(() => new Set(selected.value.map((i) => i.id)))
const allChecked = computed(() => items.value.length > 0 && items.value.every((i) => selectedIds.value.has(i.id)))

async function load() {
  loading.value = true
  try {
    const data = await dtbsSourceGuardPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: [],
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

// ---- 多选 ----
function toggleRow(d: DtbsSourceGuard) {
  if (selectedIds.value.has(d.id)) selected.value = selected.value.filter((i) => i.id !== d.id)
  else selected.value = [...selected.value, d]
}

function toggleAll() {
  if (allChecked.value) selected.value = []
  else selected.value = [...items.value]
}

function clearSelected() {
  selected.value = []
}

// ---- 行操作（保留原页全部路由语义） ----
function onAdd() {
  router.push('/dtbsSourceGuard/add')
}

function onEdit(d: DtbsSourceGuard) {
  router.push(`/dtbsSourceGuard/${d.id}/edit`)
}

function onView(d: DtbsSourceGuard) {
  router.push({ path: `/dtbsSourceGuard/${d.id}/view`, query: { mode: 'view' } })
}

function onTest(d: DtbsSourceGuard) {
  router.push(`/dtbsSourceGuard/${d.id}/test`)
}

async function onDelete(d: DtbsSourceGuard) {
  if (!window.confirm(t('guardPage.confirmDelete', { name: d.name }))) return
  try {
    await deleteDtbsSourceGuards([d.id])
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
    await deleteDtbsSourceGuards(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

// ---- 图标（24×24 stroke 风格） ----
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"/><path d="M9.5 12l2 2 3.5-4"/></svg>',
}

onMounted(load)
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('guardPage.title') }}</div>
        <div class="page-desc">{{ t('guardPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:inline-flex" v-html="ICONS.plus"></span>{{ t('guardPage.newRule') }}
        </button>
      </div>
    </div>

    <!-- 业务规则提示条 -->
    <div class="rule-bar mb-3">
      <span style="display:inline-flex" v-html="ICONS.shield"></span>
      <span><b>{{ t('guardPage.ruleBarLabel') }}</b>：{{ t('guardPage.ruleBarText') }}</span>
    </div>

    <!-- 搜索条 -->
    <div class="flex mb-2" style="gap:10px">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByName')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <div v-if="selected.length" class="sel-bar">
        <span>{{ t('guardPage.selectedInfo') }} <span class="cnt">{{ selected.length }}</span></span>
        <span class="link danger" @click="onDeleteSelected">{{ t('delete') }}</span>
        <span class="link muted" @click="clearSelected">{{ t('guardPage.clearSel') }}</span>
      </div>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ t('guardPage.totalInfo', { n: total }) }}</span>
    </div>

    <!-- 防护规则表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th>{{ t('guardPage.colName') }}</th>
            <th>{{ t('guardPage.colPattern') }}</th>
            <th>{{ t('permit') }}</th>
            <th style="width:90px">{{ t('priority') }}</th>
            <th style="width:80px">{{ t('enable') }}</th>
            <th style="width:220px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="tx-3" style="text-align:center">{{ t('loading') }}</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="7"><div class="empty">{{ t('guardPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in items" :key="d.id">
            <td><input type="checkbox" :checked="selectedIds.has(d.id)" @change="toggleRow(d)" /></td>
            <td><span class="cell-main ellipsis" style="max-width:200px;display:inline-block" :title="d.name">{{ d.name }}</span></td>
            <td>
              <span class="sm ellipsis" style="font-family:var(--font-mono);max-width:280px;display:inline-block" :title="d.pattern">
                {{ d.pattern }}
              </span>
            </td>
            <td>
              <span class="tag" :class="d.permitted ? 'ok' : 'danger'">{{ d.permitted ? t('permit') : t('deny') }}</span>
            </td>
            <td class="num">{{ d.priority ?? '-' }}</td>
            <td>
              <span class="tag" :class="d.enabled ? 'ok' : ''">{{ d.enabled ? t('yes') : t('no') }}</span>
            </td>
            <td>
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onTest(d)">{{ t('test') }}</span> ·
              <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
              <span class="link danger" @click="onDelete(d)">{{ t('delete') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 简单分页条 -->
    <div class="pager">
      <span>{{ total ? page * pageSize + 1 : 0 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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
