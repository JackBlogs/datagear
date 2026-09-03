<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  dashboardPagingQueryData,
  saveDashboard,
  deleteDashboards,
  type DashboardListItem,
} from '@/api/dashboard'
import { useOperationMessage } from '@/composables/useOperationMessage'
import type { Order } from '@/types'
import '@/styles/datasource-page.css'

// 看板页（对齐原型 dashboards.html）：行业筛选 + 三 Tab（我的看板=真实数据 / 行业模板库=一键套用生成可编辑副本 / 回收站=演示数据）。
// 旧版能力 100% 保留：搜索、增、导入、改、设计、查、分享、删、多选批量删、排序、分页。

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  import:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/></svg>',
  board:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
}

/* ================= 行业识别（按名称关键词，避免后端改动） ================= */
type IndKey = 'oil' | 'gas' | 'chem' | 'coal' | 'cross'
const IND_WORDS: [IndKey, string[]][] = [
  ['chem', ['甲醇', '化工', '烯烃', '炼化', '乙烯', '催化']],
  ['gas', ['天然气', '气管', '储气', '管输', '门站']],
  ['coal', ['煤']],
  ['oil', ['石油', '油田', '采油', '油气', '井']],
]
function industryOf(name: string): IndKey | '' {
  for (const [key, words] of IND_WORDS) {
    if (words.some((w) => name.includes(w))) {
      // 同时命中煤与油/气时视为跨产业
      if (name.includes('煤') && key !== 'coal') return 'cross'
      return key
    }
  }
  return ''
}
const INDUSTRY_SEGS: { key: IndKey | 'all'; label: string }[] = [
  { key: 'all', label: t('dashboardPage.industryAll') },
  { key: 'oil', label: t('ind.oil') },
  { key: 'gas', label: t('ind.gas') },
  { key: 'chem', label: t('ind.chem') },
  { key: 'coal', label: t('ind.coal') },
]

/* ================= Tab 状态 ================= */
type TabKey = 'mine' | 'tpl' | 'trash'
const activeTab = ref<TabKey>('tpl')
const tabCount = computed(() => ({ mine: total.value, tpl: TEMPLATES.length, trash: TRASH_ROWS.length }))

/* ================= 我的看板（真实数据） ================= */
const items = ref<DashboardListItem[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50]
const selectedIds = ref<string[]>([])
const keyword = ref('')
const industry = ref<IndKey | 'all'>('all')

const sortMeta = ref<{ field: string; order: number }[]>([{ field: 'createTime', order: -1 }])

function toOrders(meta: { field: string; order: number }[]): Order[] {
  return meta.map((m) => ({ name: m.field, type: m.order === 1 ? 'ASC' : 'DESC' }))
}

const filteredItems = computed(() =>
  industry.value === 'all' ? items.value : items.value.filter((d) => industryOf(d.name) === industry.value),
)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageNumbers = computed(() => {
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})
const allChecked = computed(
  () => filteredItems.value.length > 0 && filteredItems.value.every((d) => selectedIds.value.includes(d.id)),
)

async function load() {
  loading.value = true
  try {
    const data = await dashboardPagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: toOrders(sortMeta.value),
    })
    items.value = data.items
    total.value = data.total
    selectedIds.value = []
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
function sortIcon(field: string) {
  const m = sortMeta.value.find((s) => s.field === field)
  return m ? (m.order === 1 ? '▲' : '▼') : ''
}
function toggleSort(field: string) {
  const m = sortMeta.value.find((s) => s.field === field)
  sortMeta.value = [{ field, order: m ? (m.order === 1 ? -1 : 1) : 1 }]
  page.value = 0
  load()
}
function toggleAll() {
  selectedIds.value = allChecked.value ? [] : filteredItems.value.map((d) => d.id)
}
function toggleRow(d: DashboardListItem) {
  const i = selectedIds.value.indexOf(d.id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(d.id)
}

/* ================= 行操作（与原页路由一致） ================= */
function onAdd() {
  router.push('/dashboard/add')
}
function onImport() {
  router.push('/dashboard/import')
}
function onEdit(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/edit`)
}
function onDesign(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/design`)
}
function onView(d: DashboardListItem) {
  router.push(`/dashboard/${d.id}/viewer`)
}
function onShare(d: DashboardListItem) {
  router.push(`/authorization/Dashboard/${d.id}`)
}
async function deleteIds(ids: string[], confirmMsg: string) {
  if (!ids.length) return
  if (!window.confirm(confirmMsg)) return
  try {
    await deleteDashboards(ids)
    success(t('deleteSuccess'))
    load()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}
function onDeleteOne(d: DashboardListItem) {
  deleteIds([d.id], t('dashboardPage.confirmDelete', { name: d.name }))
}
function onDeleteSelected() {
  deleteIds([...selectedIds.value], t('confirmDelSelectedAsk'))
}

/* ================= 行业模板库（一键套用 = 真实创建可编辑副本） ================= */
interface Tpl {
  name: string
  sub: string
  inds: IndKey[]
  badge?: string
  parts: number
  used: number
  cover: string
}
const TEMPLATES: Tpl[] = [
  {
    name: '油田生产驾驶舱',
    sub: '采油厂 · 区块 · 井场 · 注采比 · 含水率',
    inds: ['oil'],
    badge: '官方推荐',
    parts: 12,
    used: 38,
    cover:
      'linear-gradient(160deg,rgba(255,138,61,.34),rgba(244,99,58,.06) 65%),radial-gradient(260px 130px at 82% 12%,rgba(255,178,94,.4),transparent),linear-gradient(200deg,#1A1208,#0A0E17)',
  },
  {
    name: '天然气管网运行监控',
    sub: '管输量 · 门站压力 · 储气库 · 输差分析',
    inds: ['gas'],
    parts: 10,
    used: 21,
    cover:
      'linear-gradient(160deg,rgba(34,211,238,.3),rgba(34,211,238,.05) 65%),radial-gradient(260px 130px at 82% 12%,rgba(34,211,238,.35),transparent),linear-gradient(200deg,#08161A,#0A0E17)',
  },
  {
    name: '煤化工经营分析',
    sub: '甲醇 · 烯烃 · 产销存 · 优级品率',
    inds: ['chem'],
    parts: 14,
    used: 16,
    cover:
      'linear-gradient(160deg,rgba(167,139,250,.3),rgba(167,139,250,.05) 65%),radial-gradient(260px 130px at 82% 12%,rgba(167,139,250,.35),transparent),linear-gradient(200deg,#120E1E,#0A0E17)',
  },
  {
    name: '煤矿安全双重预防',
    sub: '瓦斯 · 顶板 · 人员定位 · 风险分级管控',
    inds: ['coal'],
    badge: '安全合规',
    parts: 11,
    used: 29,
    cover:
      'linear-gradient(160deg,rgba(232,179,60,.3),rgba(232,179,60,.05) 65%),radial-gradient(260px 130px at 82% 12%,rgba(232,179,60,.35),transparent),linear-gradient(200deg,#181206,#0A0E17)',
  },
  {
    name: '炼化装置实时监控',
    sub: '常减压 · 催化裂化 · 能耗 · 联锁状态',
    inds: ['chem', 'oil'],
    parts: 16,
    used: 12,
    cover:
      'linear-gradient(160deg,rgba(167,139,250,.22),rgba(255,138,61,.1) 55%),radial-gradient(260px 130px at 82% 12%,rgba(255,138,61,.3),transparent),linear-gradient(200deg,#14101C,#0A0E17)',
  },
  {
    name: '集团经营日报',
    sub: '油气化煤四产业 · 产量 · 成本 · 销售',
    inds: ['oil', 'gas'],
    badge: '跨产业',
    parts: 9,
    used: 45,
    cover:
      'linear-gradient(160deg,rgba(255,138,61,.2),rgba(34,211,238,.14) 60%),radial-gradient(280px 140px at 82% 12%,rgba(96,165,250,.28),transparent),linear-gradient(200deg,#10141C,#0A0E17)',
  },
]
const applying = ref('')
async function applyTemplate(tpl: Tpl) {
  if (applying.value) return
  applying.value = tpl.name
  try {
    const created = await saveDashboard({ name: `${tpl.name}-副本` } as never)
    success(t('dashboardPage.applyOk', { name: `${tpl.name}-副本` }))
    if (created?.id) router.push(`/dashboard/${created.id}/design`)
    else load()
  } catch (e) {
    fail((e as Error).message || t('saveFail'))
  } finally {
    applying.value = ''
  }
}

/* ================= 回收站（演示数据） ================= */
const TRASH_ROWS = [
  { name: '旧版原油生产周报', ind: 'oil' as IndKey, by: '李明', time: '2026-08-28 16:20', remain: '25 天' },
  { name: '门站压力测试看板', ind: 'gas' as IndKey, by: '周海峰', time: '2026-08-15 09:44', remain: '12 天' },
]

onMounted(() => {
  load()
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('dashboardPage.title') }}</div>
        <div class="page-desc">{{ t('dashboardPage.descFull') }}</div>
      </div>
      <div class="page-actions" style="align-items:center">
        <div class="seg" style="display:inline-flex;gap:2px;margin-right:10px">
          <span
            v-for="s in INDUSTRY_SEGS"
            :key="s.key"
            class="seg-item"
            :class="{ active: industry === s.key }"
            style="cursor:pointer"
            @click="industry = s.key"
          >{{ s.label }}</span>
        </div>
        <button class="btn" type="button" @click="onImport">
          <span style="display:flex" v-html="ICONS.import"></span>{{ t('importDashboard') }}
        </button>
        <button class="btn primary" type="button" @click="onAdd">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('dashboardPage.newDashboard') }}
        </button>
      </div>
    </div>

    <!-- Tab：我的看板 / 行业模板库 / 回收站 -->
    <div class="tabs" style="display:flex;gap:4px;margin-bottom:14px">
      <div class="tab" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
        {{ t('dashboardPage.tabMine') }} <span class="cnt">{{ tabCount.mine }}</span>
      </div>
      <div class="tab" :class="{ active: activeTab === 'tpl' }" @click="activeTab = 'tpl'">
        {{ t('dashboardPage.tabTpl') }} <span class="cnt">{{ tabCount.tpl }}</span>
      </div>
      <div class="tab" :class="{ active: activeTab === 'trash' }" @click="activeTab = 'trash'">
        {{ t('dashboardPage.tabTrash') }} <span class="cnt">{{ tabCount.trash }}</span>
      </div>
    </div>

    <!-- ============ 行业模板库 ============ -->
    <section v-show="activeTab === 'tpl'">
      <div class="tpl-grid">
        <div v-for="tpl in TEMPLATES" :key="tpl.name" class="tpl-card" :style="{ background: tpl.cover }" @click="applyTemplate(tpl)">
          <span v-if="tpl.badge" class="c-badge">{{ tpl.badge }}</span>
          <div class="mini-grid">
            <i></i><i></i><i></i><i style="grid-column:span 2"></i>
          </div>
          <div class="c-cover">
            <div class="c-name">{{ tpl.name }}</div>
            <div class="c-sub">{{ tpl.sub }}</div>
          </div>
          <div class="c-foot">
            <span v-for="ind in tpl.inds" :key="ind" class="ind-tag">{{ t('ind.' + ind) }}</span>
            <span class="f-meta">{{ tpl.parts }} 部件 · 被套用 {{ tpl.used }} 次</span>
            <button class="btn sm primary" style="margin-left:auto" type="button" @click.stop="applyTemplate(tpl)">
              {{ applying === tpl.name ? t('loading') : t('dashboardPage.applyTpl') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 我的看板（真实数据） ============ -->
    <section v-show="activeTab === 'mine'">
      <!-- 搜索条 + 已选操作条 -->
      <div class="flex mb-2" style="gap:10px;flex-wrap:wrap">
        <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
          <input v-model="keyword" class="input" :placeholder="t('searchByName')" />
          <button class="btn" type="submit">{{ t('query') }}</button>
        </form>
        <div v-if="selectedIds.length" class="sel-bar">
          <span>{{ t('dashboardPage.selectedCount') }}<b class="cnt">{{ selectedIds.length }}</b></span>
          <button class="btn danger sm" type="button" @click="onDeleteSelected">{{ t('dashboardPage.batchDelete') }}</button>
          <span class="link muted" @click="selectedIds = []">{{ t('dashboardPage.clearSel') }}</span>
        </div>
        <span class="tx-3 sm" style="align-self:center;margin-left:auto">
          {{ t('dashboardPage.totalCount', { n: total }) }}
        </span>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:36px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th style="cursor:pointer" @click="toggleSort('name')">
                {{ t('name') }}<span v-if="sortIcon('name')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('name') }}</span>
              </th>
              <th>{{ t('dashboardPage.colIndustry') }}</th>
              <th style="cursor:pointer" @click="toggleSort('createUser.realName')">
                {{ t('createUser') }}<span v-if="sortIcon('createUser.realName')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('createUser.realName') }}</span>
              </th>
              <th style="cursor:pointer" @click="toggleSort('createTime')">
                {{ t('createTime') }}<span v-if="sortIcon('createTime')" style="font-size:9px;color:var(--brand);margin-left:3px">{{ sortIcon('createTime') }}</span>
              </th>
              <th style="width:250px">{{ t('operation') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
            </tr>
            <tr v-else-if="!filteredItems.length">
              <td colspan="6"><div class="empty">{{ t('dashboardPage.empty') }}</div></td>
            </tr>
            <tr v-for="d in filteredItems" :key="d.id">
              <td><input type="checkbox" :checked="selectedIds.includes(d.id)" @change="toggleRow(d)" /></td>
              <td>
                <div class="flex" style="gap:10px">
                  <span
                    style="width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--brand);background:var(--brand-soft)"
                    v-html="ICONS.board"
                  ></span>
                  <span class="cell-main ellipsis" style="max-width:260px" :title="d.name">{{ d.name }}</span>
                  <span v-if="d.apiVersion" class="tag brand" style="flex:none">v{{ d.apiVersion }}</span>
                </div>
              </td>
              <td>
                <span v-if="industryOf(d.name)" class="ind-tag">{{ t('ind.' + industryOf(d.name)) }}</span>
                <span v-else class="tx-3">-</span>
              </td>
              <td>{{ d.createUser?.realName || d.createUser?.name || '-' }}</td>
              <td class="sm tx-3">{{ d.createTime || '-' }}</td>
              <td>
                <span class="link" style="font-weight:700" @click="onDesign(d)">{{ t('design') }}</span> ·
                <span class="link" @click="onView(d)">{{ t('view') }}</span> ·
                <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
                <span class="link" @click="onShare(d)">{{ t('share') }}</span> ·
                <span class="link danger" @click="onDeleteOne(d)">{{ t('delete') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页条 -->
      <div class="pager">
        <span>{{ total === 0 ? 0 : page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
        <select
          class="select"
          style="width:auto;padding:4px 8px;font-size:12.5px"
          :value="pageSize"
          @change="pageSize = Number(($event.target as HTMLSelectElement).value); onPageSizeChange()"
        >
          <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}{{ t('dashboardPage.perPageSuffix') }}</option>
        </select>
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
    </section>

    <!-- ============ 回收站（演示数据） ============ -->
    <section v-show="activeTab === 'trash'">
      <div class="flex mb-2" style="justify-content:flex-end">
        <span class="tx-3 sm">{{ t('dashboardPage.trashDemoNote') }}</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('name') }}</th>
              <th>{{ t('dashboardPage.colIndustry') }}</th>
              <th>{{ t('dashboardPage.deleteUser') }}</th>
              <th>{{ t('dashboardPage.deleteTime') }}</th>
              <th>{{ t('dashboardPage.trashColRemain') }}</th>
              <th style="width:180px">{{ t('operation') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in TRASH_ROWS" :key="r.name">
              <td class="cell-main">{{ r.name }}</td>
              <td><span class="ind-tag">{{ t('ind.' + r.ind) }}</span></td>
              <td>{{ r.by }}</td>
              <td class="sm tx-3">{{ r.time }}</td>
              <td><span class="tag warn">{{ r.remain }}</span></td>
              <td>
                <span class="link muted" @click="success(t('dashboardPage.trashRestored'))">{{ t('dashboardPage.trashRestore') }}</span>
                <span class="link danger" @click="success(t('dashboardPage.trashDemoNote'))">{{ t('dashboardPage.trashPurge') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 模板卡片（对齐原型 dashboards.html） */
.tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.tpl-card {
  position: relative; border-radius: 14px; overflow: hidden; cursor: pointer;
  border: 1px solid var(--line-1); height: 190px; display: flex; flex-direction: column;
  transition: all 0.18s;
}
.tpl-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45); border-color: var(--line-3); }
.c-cover { position: relative; flex: 1; padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.c-cover .c-name { font-size: 15px; font-weight: 700; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); }
.c-cover .c-sub { font-size: 11.5px; color: var(--tx-2); }
.c-badge {
  position: absolute; top: 12px; left: 14px; z-index: 2; font-size: 10.5px; padding: 2px 8px; border-radius: 8px;
  background: rgba(5, 8, 14, 0.55); border: 1px solid rgba(255, 255, 255, 0.18); backdrop-filter: blur(4px);
}
.mini-grid {
  position: absolute; top: 40px; right: 14px; display: grid; grid-template-columns: repeat(3, 26px); gap: 4px; opacity: 0.55;
}
.mini-grid i { height: 18px; border-radius: 4px; background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.25); }
.c-foot {
  flex: none; display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: rgba(10, 14, 23, 0.72); border-top: 1px solid var(--line-1);
}
.f-meta { font-size: 11px; color: var(--tx-3); }
.ind-tag {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--tx-2);
  padding: 2px 9px; border-radius: 9px; background: var(--bg-glass-2, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--line-2); white-space: nowrap;
}
.ind-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--brand); }
@media (max-width: 1100px) { .tpl-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
