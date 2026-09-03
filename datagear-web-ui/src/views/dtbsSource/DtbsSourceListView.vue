<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  dtbsSourcePagingQueryData,
  deleteDtbsSources,
  testDtbsSourceConnection,
  getDtbsSourceTableCount,
  type DtbsSource,
} from '@/api/dtbsSource'
import { listAuthorizations } from '@/api/authorization'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { deriveDsType, CATEGORY_STYLE, type DsCategory } from './dsType'
import { useDsHealth } from './dsHealth'
import DsDrawer from './DsDrawer.vue'
import DsWizard from './DsWizard.vue'
import DsDbinfoDialog from './DsDbinfoDialog.vue'

// 数据源管理列表页：按原型 .prototype-ref/datasource.html 整体重写（「能源暗域」风格）。
// 不再使用 PrimeVue DataTable，表格/卡片/抽屉/向导均为原生 HTML + src/styles/datasource-page.css。
// 旧版能力来源：dtbsSource_table.ftl（增删改查/复制/授权）、原型新增入口（SQL工作台/导入/导出/数据库信息）。
import '@/styles/datasource-page.css'

const router = useRouter()
const { t } = useI18n()
const { success, fail } = useOperationMessage()
const { records: healthRecords, push: pushHealth } = useDsHealth()

// ---- 列表数据（保留原有后端分页 + 关键字搜索能力） ----
const items = ref<DtbsSource[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const pageSize = ref(10)
const keyword = ref('')

// ---- 分类统计（单独全量轻量查询，按 URL 推导类型实时计数） ----
const statsItems = ref<DtbsSource[]>([])
const catFilter = ref<'all' | DsCategory>('all')

// ---- 行状态（会话内）：测试连接结果 / 表数量 / 可见性（均懒加载，不编造历史数据） ----
const statusMap = reactive<Record<string, { ok: boolean; time: string }>>({})
const tableCountMap = reactive<Record<string, number>>({})
const visibilityMap = reactive<Record<string, 'private' | 'shared'>>({})
const testingId = ref('')

// ---- 抽屉 / 向导 / dbinfo / 更多菜单 ----
const drawerShow = ref(false)
const drawerDs = ref<DtbsSource | null>(null)
const wizardShow = ref(false)
const dbinfoShow = ref(false)
const dbinfoDs = ref<DtbsSource | null>(null)
const moreForId = ref('')
const morePos = reactive({ top: 0, left: 0 })

const filteredItems = computed(() => {
  if (catFilter.value === 'all') return items.value
  return items.value.filter((d) => deriveDsType(d.url).category === catFilter.value)
})

const catCounts = computed<Record<DsCategory, number>>(() => {
  const c: Record<DsCategory, number> = { db: 0, file: 0, http: 0, stream: 0 }
  for (const d of statsItems.value) c[deriveDsType(d.url).category] += 1
  return c
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageNumbers = computed(() => {
  // 当前页（1-based）±2 的窗口页码
  const cur = page.value + 1
  const nums: number[] = []
  for (let p = Math.max(1, cur - 2); p <= Math.min(pageCount.value, cur + 2); p++) nums.push(p)
  return nums
})

async function load() {
  loading.value = true
  try {
    const data = await dtbsSourcePagingQueryData({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      orders: [{ name: 'title', type: 'ASC' }],
    })
    items.value = data.items
    total.value = data.total
  } catch (e) {
    fail((e as Error).message || t('queryFail'))
  } finally {
    loading.value = false
  }
}

/** 分类统计用全量查询（上限 500，失败时静默回退为当前页计数） */
async function loadStats() {
  try {
    const data = await dtbsSourcePagingQueryData({ page: 1, pageSize: 500, orders: [{ name: 'title', type: 'ASC' }] })
    statsItems.value = data.items
  } catch {
    statsItems.value = items.value
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

function setCatFilter(c: 'all' | DsCategory) {
  catFilter.value = catFilter.value === c ? 'all' : c
}

function catStyle(c: DsCategory) {
  const s = CATEGORY_STYLE[c]
  return { '--cat-glow': s.glow } as Record<string, string>
}

function catIconStyle(c: DsCategory) {
  const s = CATEGORY_STYLE[c]
  return { color: s.color, background: s.bg }
}

function rowIconStyle(d: DtbsSource) {
  return catIconStyle(deriveDsType(d.url).category)
}

// ---- 导出清单：导出当前列表为 CSV ----
function exportCsv() {
  const rows = filteredItems.value
  const header = t('dsPage.csvHeader')
  const lines = rows.map((d) =>
    [d.title, d.url, deriveDsType(d.url).label, d.createUser?.realName ?? d.createUser?.name ?? '', d.createTime ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob(['﻿' + header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `datasources-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---- 行操作 ----
function onEdit(d: DtbsSource) {
  router.push(`/dtbsSource/${d.id}/edit`)
}

function onManageData(d: DtbsSource) {
  router.push(`/dtbsSourceData/${d.id}`)
}

function onSqlpad(d: DtbsSource) {
  router.push({ path: `/sqlpad/${d.id}`, query: { title: d.title } })
}

function onImport(d: DtbsSource) {
  router.push(`/dataExchange-import/${d.id}`)
}

function onExport(d: DtbsSource) {
  router.push(`/dataExchange-export/${d.id}`)
}

// 授权路由：/authorization/:resourceType/:resource；资源类型常量为后端 DtbsSource.AUTHORIZATION_RESOURCE_TYPE
function onAuth(d: DtbsSource) {
  router.push(`/authorization/DATA_SOURCE/${d.id}`)
}

// 复制：对应旧版 /dtbsSource/copy 页（服务端渲染表单预填），Vue 版由表单页按 copyFrom 参数实现
function onCopy(d: DtbsSource) {
  closeMore()
  router.push({ path: '/dtbsSource/add', query: { copyFrom: d.id } })
}

function onDbinfo(d: DtbsSource) {
  closeMore()
  dbinfoDs.value = d
  dbinfoShow.value = true
}

async function onDelete(d: DtbsSource) {
  closeMore()
  if (!window.confirm(t('dsPage.confirmDelete', { name: d.title }))) return
  try {
    await deleteDtbsSources([d.id])
    success(t('deleteSuccess'))
    load()
    loadStats()
  } catch (e) {
    fail((e as Error).message || t('deleteFail'))
  }
}

// 行内测试不带密码（列表查询不到可用密码）：后端 testConnection 在实体带 id 且密码为 null 时
// 会自动使用服务端存储的密码测试（DtbsSourceController.testConnection :289），有密码的数据源也可直接测通。
async function onTest(d: DtbsSource) {
  testingId.value = d.id
  try {
    await testDtbsSourceConnection({
      id: d.id,
      title: d.title,
      url: d.url,
      user: d.user,
      schemaName: d.schemaName,
      driverEntity: d.driverEntity,
      properties: d.properties,
    })
    statusMap[d.id] = { ok: true, time: new Date().toLocaleString() }
    pushHealth(d.id, true)
    success(t('dsPage.testOkMsg'))
  } catch (e) {
    statusMap[d.id] = { ok: false, time: new Date().toLocaleString() }
    pushHealth(d.id, false)
    fail((e as Error).message || t('dsPage.testFailMsg'))
  } finally {
    testingId.value = ''
  }
}

// ---- 抽屉 ----
function openDrawer(d: DtbsSource) {
  drawerDs.value = d
  drawerShow.value = true
  lazyLoadRowMeta(d.id)
}

function closeDrawer() {
  drawerShow.value = false
}

/** 行元数据懒加载：表数量 + 可见性（抽屉打开时触发，加载前列表显示 -） */
async function lazyLoadRowMeta(id: string) {
  if (!(id in tableCountMap)) {
    try {
      tableCountMap[id] = await getDtbsSourceTableCount(id)
    } catch {
      // 表数量加载失败保持 -（如连接不可用）
    }
  }
  if (!(id in visibilityMap)) {
    try {
      // 有按资源查询授权的端点：/api/authorization/DATA_SOURCE/{id}/list
      const list = await listAuthorizations('DATA_SOURCE', id)
      visibilityMap[id] = list.some((a) => a.enabled) ? 'shared' : 'private'
    } catch {
      // 无权限查询授权时按私有显示
      visibilityMap[id] = 'private'
    }
  }
}

function drawerHealth(id: string | undefined) {
  return id ? healthRecords[id] ?? [] : []
}

// ---- 更多菜单 ----
function toggleMore(d: DtbsSource, ev: MouseEvent) {
  ev.stopPropagation()
  if (moreForId.value === d.id) {
    closeMore()
    return
  }
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  morePos.top = rect.bottom + 4
  morePos.left = Math.max(8, rect.right - 128)
  moreForId.value = d.id
}

function closeMore() {
  moreForId.value = ''
}

function onDocClick() {
  closeMore()
}

const drawerTesting = computed(() => !!drawerDs.value && testingId.value === drawerDs.value.id)

// ---- 图标（取自原型 shell.js 的 DG.ICONS） ----
const ICONS = {
  db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  report:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M13 4l-2 16"/></svg>',
  flame:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1-3.5-1.5 1-2 2-2 3.5"/><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-2.5-5.5C15 11 13 12 13 14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  spark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
}

const CATS: { key: DsCategory; icon: keyof typeof ICONS; nameKey: string; subKey: string }[] = [
  { key: 'db', icon: 'db', nameKey: 'dsPage.catDb', subKey: 'dsPage.catDbSub' },
  { key: 'file', icon: 'report', nameKey: 'dsPage.catFile', subKey: 'dsPage.catFileSub' },
  { key: 'http', icon: 'api', nameKey: 'dsPage.catHttp', subKey: 'dsPage.catHttpSub' },
  { key: 'stream', icon: 'flame', nameKey: 'dsPage.catStream', subKey: 'dsPage.catStreamSub' },
]

onMounted(() => {
  load()
  loadStats()
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">{{ t('dsPage.title') }}</div>
        <div class="page-desc">{{ t('dsPage.desc') }}</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="exportCsv">{{ t('dsPage.exportList') }}</button>
        <button class="btn primary" type="button" @click="wizardShow = true">
          <span style="display:flex" v-html="ICONS.plus"></span>{{ t('dsPage.newSource') }}
        </button>
      </div>
    </div>

    <!-- 业务规则提示条 -->
    <div class="rule-bar mb-3">
      <span style="display:flex" v-html="ICONS.spark"></span>
      <span><b>{{ t('dsPage.ruleBarLabel') }}</b>：{{ t('dsPage.ruleBarText') }}</span>
    </div>

    <!-- 来源分类统计卡 -->
    <section class="src-cats mb-3">
      <div
        v-for="c in CATS"
        :key="c.key"
        class="src-cat"
        :class="{ sel: catFilter === c.key }"
        :style="catStyle(c.key)"
        @click="setCatFilter(c.key)"
      >
        <div class="c-icon" :style="catIconStyle(c.key)" v-html="ICONS[c.icon]"></div>
        <div>
          <div class="c-name">{{ t(c.nameKey) }}<b>{{ catCounts[c.key] }}</b></div>
          <div class="c-sub">{{ t(c.subKey) }}</div>
        </div>
      </div>
    </section>

    <!-- 搜索条 -->
    <div class="flex mb-2" style="gap:10px">
      <form class="flex grow" style="gap:10px;max-width:460px" @submit.prevent="search">
        <input v-model="keyword" class="input" :placeholder="t('searchByTitleOrUrl')" />
        <button class="btn" type="submit">{{ t('query') }}</button>
      </form>
      <span v-if="catFilter !== 'all'" class="tag brand" style="align-self:center;cursor:pointer" @click="setCatFilter(catFilter)">
        {{ t(CATS.find((c) => c.key === catFilter)!.nameKey) }} ✕
      </span>
      <span class="tx-3 sm" style="align-self:center;margin-left:auto">{{ total }} {{ t('dsPage.colName') }}</span>
    </div>

    <!-- 数据源表格 -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>{{ t('dsPage.colName') }}</th>
            <th>{{ t('dsPage.colType') }}</th>
            <th>{{ t('dsPage.colStatus') }}</th>
            <th>{{ t('dsPage.colTables') }}</th>
            <th>{{ t('dsPage.colCreator') }}</th>
            <th>{{ t('dsPage.colVisibility') }}</th>
            <th>{{ t('dsPage.colLastCheck') }}</th>
            <th style="width:300px">{{ t('operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="tx-3" style="text-align:center">{{ t('loading') }}…</td>
          </tr>
          <tr v-else-if="!filteredItems.length">
            <td colspan="8"><div class="empty">{{ t('dsPage.empty') }}</div></td>
          </tr>
          <tr v-for="d in filteredItems" :key="d.id" style="cursor:pointer" @click="openDrawer(d)">
            <td>
              <div class="flex" style="gap:10px">
                <span
                  style="width:30px;height:30px;border-radius:8px;flex:none;display:inline-flex;align-items:center;justify-content:center"
                  :style="rowIconStyle(d)"
                  v-html="ICONS.db"
                ></span>
                <span class="cell-main ellipsis" style="max-width:220px" :title="d.title">{{ d.title }}</span>
                <span v-if="deriveDsType(d.url).xc" class="tag brand">{{ t('dsPage.xcTag') }}</span>
              </div>
            </td>
            <td><span class="tag">{{ deriveDsType(d.url).label }}</span></td>
            <td>
              <span v-if="!statusMap[d.id]" class="tag">{{ t('dsPage.stUntested') }}</span>
              <span v-else-if="statusMap[d.id].ok" class="tag ok">{{ t('dsPage.stOk') }}</span>
              <span v-else class="tag danger">{{ t('dsPage.stFail') }}</span>
            </td>
            <td class="num">{{ d.id in tableCountMap ? tableCountMap[d.id] : '-' }}</td>
            <td>{{ d.createUser?.realName || d.createUser?.name || '-' }}</td>
            <td>
              <span v-if="d.id in visibilityMap" class="tag" :class="{ info: visibilityMap[d.id] === 'shared' }">
                {{ visibilityMap[d.id] === 'shared' ? t('dsPage.visShared') : t('dsPage.visPrivate') }}
              </span>
              <span v-else>-</span>
            </td>
            <td class="sm tx-3">{{ statusMap[d.id]?.time ?? '-' }}</td>
            <td @click.stop>
              <span class="link" @click="onEdit(d)">{{ t('edit') }}</span> ·
              <span class="link" @click="onTest(d)">{{ testingId === d.id ? t('loading') : t('testConnection') }}</span> ·
              <span class="link" @click="onAuth(d)">{{ t('module.authorization') }}</span> ·
              <span class="link" @click="onManageData(d)">{{ t('dataManagement') }}</span> ·
              <span class="link" @click="onSqlpad(d)">SQL</span> ·
              <span class="link" @click="onImport(d)">{{ t('import') }}</span> ·
              <span class="link" @click="onExport(d)">{{ t('export') }}</span> ·
              <span class="link muted" @click="toggleMore(d, $event)">{{ t('more') }}▾</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 简单分页条 -->
    <div class="pager">
      <span>{{ t('dsPage.colName') }} {{ page * pageSize + 1 }}-{{ Math.min(total, (page + 1) * pageSize) }} / {{ total }}</span>
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

    <!-- 更多操作弹出菜单 -->
    <div v-if="moreForId" class="more-menu" :style="{ top: morePos.top + 'px', left: morePos.left + 'px' }" @click.stop>
      <div class="mi" @click="onCopy(items.find((x) => x.id === moreForId)!)">{{ t('dsPage.moreCopy') }}</div>
      <div class="mi" @click="onDbinfo(items.find((x) => x.id === moreForId)!)">{{ t('dsPage.moreDbinfo') }}</div>
      <div class="mi danger" @click="onDelete(items.find((x) => x.id === moreForId)!)">{{ t('delete') }}</div>
    </div>

    <!-- 详情抽屉 -->
    <DsDrawer
      :ds="drawerDs"
      :show="drawerShow"
      :table-count="drawerDs ? tableCountMap[drawerDs.id] : undefined"
      :visibility="drawerDs ? visibilityMap[drawerDs.id] : undefined"
      :health="drawerHealth(drawerDs?.id)"
      :testing="drawerTesting"
      @close="closeDrawer"
      @test="drawerDs && onTest(drawerDs)"
      @auth="drawerDs && onAuth(drawerDs)"
    />

    <!-- 新建数据源向导 -->
    <DsWizard :show="wizardShow" @close="wizardShow = false" @saved="load(); loadStats()" />

    <!-- 数据库信息弹窗 -->
    <DsDbinfoDialog :show="dbinfoShow" :ds-id="dbinfoDs?.id ?? ''" :ds-title="dbinfoDs?.title" @close="dbinfoShow = false" />
  </div>
</template>
