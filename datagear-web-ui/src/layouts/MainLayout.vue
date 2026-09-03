<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { dashboardPagingQueryData } from '@/api/dashboard'
import { chartPagingQueryData } from '@/api/chart'
import { metricPagingQueryData, type MetricEntity } from '@/api/metric'
import { dataSetPagingQueryData } from '@/api/dataSet'

// 主布局：能源暗域风格侧栏（分组菜单）+ 顶栏（全局检索）+ 内容区。
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const theme = useThemeStore()
const { success } = useOperationMessage()

/** 分组菜单（对齐能源BI信息架构，路由保持真实模块不变） */
const menuGroups = computed(() => [
  {
    name: t('nav.group.overview', '概览'),
    items: [
      { path: '/', label: t('module.main'), icon: 'pi pi-home', badge: '' },
      { path: '/metrics', label: t('module.metrics', '指标中心'), icon: 'pi pi-chart-bar', badge: '新' },
      { path: '/chatbi', label: t('module.chatbi', '智能问数'), icon: 'pi pi-comments', badge: 'AI' },
    ],
  },
  {
    name: t('nav.group.asset', '数据资产'),
    items: [
      { path: '/dtbsSource', label: t('module.dtbsSource'), icon: 'pi pi-database', badge: '' },
      { path: '/fileSource', label: t('module.fileSource'), icon: 'pi pi-folder', badge: '' },
      { path: '/dataSet', label: t('module.dataSet'), icon: 'pi pi-table', badge: '' },
      { path: '/analysisProject', label: t('module.analysisProject'), icon: 'pi pi-th-large', badge: '' },
      { path: '/governance', label: t('module.governance', '数据治理'), icon: 'pi pi-verified', badge: '' },
    ],
  },
  {
    name: t('nav.group.analysis', '分析展示'),
    items: [
      { path: '/chart', label: t('module.chart', '图表'), icon: 'pi pi-chart-line', badge: '' },
      { path: '/dashboard', label: t('module.dashboard', '看板'), icon: 'pi pi-images', badge: '' },
      { path: '/dashboard/design', label: t('module.dashboardDesigner', '看板设计器'), icon: 'pi pi-pencil', badge: '' },
      { path: '/screen/design', label: t('module.screenDesigner', '大屏设计器'), icon: 'pi pi-sliders-h', badge: '' },
      { path: '/screen', label: t('module.screen', '数据大屏'), icon: 'pi pi-desktop', badge: '' },
      { path: '/report', label: t('module.report', '统计报表'), icon: 'pi pi-file', badge: '' },
    ],
  },
  {
    name: t('nav.group.ops', '运营协同'),
    items: [
      { path: '/alert', label: t('module.alert', '告警与订阅'), icon: 'pi pi-bell', badge: '3' },
      { path: '/openApi', label: t('module.openApi', '开放与嵌入'), icon: 'pi pi-code', badge: '' },
      { path: '/mobile', label: t('module.mobile', '移动端'), icon: 'pi pi-mobile', badge: '' },
    ],
  },
  {
    name: t('nav.group.platform', '平台管理'),
    items: [
      { path: '/system', label: t('module.system', '系统管理'), icon: 'pi pi-cog', badge: '' },
      { path: '/dtbsSourceGuard', label: t('module.dtbsSourceGuard'), icon: 'pi pi-shield', badge: '' },
      { path: '/driverEntity', label: t('module.driverEntity'), icon: 'pi pi-cog', badge: '' },
      { path: '/chartPlugin', label: t('module.chartPlugin'), icon: 'pi pi-palette', badge: '' },
      { path: '/role', label: t('module.role'), icon: 'pi pi-users', badge: '' },
      { path: '/user', label: t('module.user'), icon: 'pi pi-user', badge: '' },
    ],
  },
])

/** 最长前缀匹配高亮：/dashboard/design 只点亮「看板设计器」而非「看板」 */
function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  if (!route.path.startsWith(path)) return false
  // 设计器菜单项同时接管 :id/design 编辑路由
  if (path === '/dashboard/design')
    return route.path === '/dashboard/design' || /^\/dashboard\/[^/]+\/design/.test(route.path)
  if (path === '/screen/design')
    return route.path === '/screen/design' || /^\/screen\/[^/]+\/design/.test(route.path)
  // 若存在另一个更长前缀的菜单项命中当前路由，则本项不亮
  const allPaths = menuGroups.value.flatMap((g) => g.items.map((i) => i.path))
  const better = allPaths.some(
    (p) => p !== path && p.startsWith(path) && route.path.startsWith(p) && p.length > path.length,
  )
  return !better
}

const userInitial = computed(() => {
  const n = auth.user?.realName || auth.user?.name || ''
  return n ? n.slice(0, 1).toUpperCase() : '?'
})

async function logout() {
  userMenuOpen.value = false
  await auth.logout()
  router.push('/login')
}

/* ============ 用户菜单（主题切换 / 退出登录） ============ */
const userMenuOpen = ref(false)
function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}
function toggleTheme() {
  theme.toggle()
}

/* ============ 顶栏图标动作 ============ */
function openAlerts() {
  success('告警通知中心规划中（演示）')
}
function openHelp() {
  success('新手引导：角色化任务教学（演示）')
}

/* ============ 侧栏收起 / 展开 ============ */
const folded = ref(false)
function toggleFold() {
  folded.value = !folded.value
  // 通知图表等组件重新计算尺寸（对齐参考站交互）
  setTimeout(() => window.dispatchEvent(new Event('resize')), 220)
}

/* ============ 全局检索 ============ */
const searchKw = ref('')
const searchOpen = ref(false)
const searching = ref(false)
const searchInputEl = ref<HTMLInputElement>()
const searchBoxEl = ref<HTMLElement>()

interface SearchResult {
  id: string
  name: string
  type: string
  icon: string
  to: string
}
const moduleResults = ref<SearchResult[]>([])
const assetResults = ref<SearchResult[]>([])
/** 搜索结果按资源类型分组（指标 / 看板 / 图表 / 数据集） */
const groupedAssetResults = computed(() => {
  const order = ['指标', '看板', '图表', '数据集']
  const groups: { type: string; rows: SearchResult[] }[] = []
  for (const base of order) {
    const rows = assetResults.value.filter((r) => r.type === base || r.type.startsWith(base + ' '))
    if (rows.length) groups.push({ type: base, rows })
  }
  return groups
})

/** 模块快捷索引（本地匹配） */
const MODULE_INDEX: SearchResult[] = [
  { id: 'm-home', name: '综合首页', type: '页面', icon: 'pi pi-home', to: '/' },
  { id: 'm-metrics', name: '指标中心', type: '页面', icon: 'pi pi-chart-bar', to: '/metrics' },
  { id: 'm-chatbi', name: '智能问数', type: '页面', icon: 'pi pi-comments', to: '/chatbi' },
  { id: 'm-ds', name: '数据源', type: '模块', icon: 'pi pi-database', to: '/dtbsSource' },
  { id: 'm-fs', name: '文件源', type: '模块', icon: 'pi pi-folder', to: '/fileSource' },
  { id: 'm-dataset', name: '数据集', type: '模块', icon: 'pi pi-table', to: '/dataSet' },
  { id: 'm-ap', name: '分析项目', type: '模块', icon: 'pi pi-th-large', to: '/analysisProject' },
  { id: 'm-chart', name: '图表', type: '模块', icon: 'pi pi-chart-line', to: '/chart' },
  { id: 'm-db', name: '看板', type: '模块', icon: 'pi pi-images', to: '/dashboard' },
  { id: 'm-gov', name: '数据治理', type: '页面', icon: 'pi pi-verified', to: '/governance' },
  { id: 'm-screen', name: '数据大屏', type: '页面', icon: 'pi pi-desktop', to: '/screen' },
  { id: 'm-report', name: '统计报表', type: '页面', icon: 'pi pi-file', to: '/report' },
  { id: 'm-alert', name: '告警与订阅', type: '页面', icon: 'pi pi-bell', to: '/alert' },
  { id: 'm-openapi', name: '开放与嵌入', type: '页面', icon: 'pi pi-code', to: '/openApi' },
  { id: 'm-mobile', name: '移动端', type: '页面', icon: 'pi pi-mobile', to: '/mobile' },
  { id: 'm-user', name: '用户管理', type: '模块', icon: 'pi pi-user', to: '/user' },
  { id: 'm-role', name: '角色管理', type: '模块', icon: 'pi pi-users', to: '/role' },
]

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  searchOpen.value = true
  const kw = searchKw.value.trim()
  // 模块即时匹配
  moduleResults.value = kw
    ? MODULE_INDEX.filter((m) => m.name.toLowerCase().includes(kw.toLowerCase()))
    : MODULE_INDEX.slice(0, 5)
  if (searchTimer) clearTimeout(searchTimer)
  if (!kw) {
    assetResults.value = []
    return
  }
  searchTimer = setTimeout(() => queryAssets(kw), 300)
}

/** 真实后端关键词检索：看板 / 图表 / 数据集 */
async function queryAssets(kw: string) {
  searching.value = true
  try {
    const q = { page: 1, pageSize: 5, keyword: kw }
    const [mt, db, ch, dset] = await Promise.allSettled([
      metricPagingQueryData(q),
      dashboardPagingQueryData(q),
      chartPagingQueryData(q),
      dataSetPagingQueryData(q),
    ])
    const out: SearchResult[] = []
    // 指标优先（v2 /search 契约：跨资源联想，指标第一组）
    if (mt.status === 'fulfilled')
      out.push(...mt.value.items.map((m: MetricEntity) => ({ id: m.id, name: m.name, type: m.certified ? '指标 · 已认证' : '指标', icon: 'pi pi-chart-bar', to: '/metrics' })))
    if (db.status === 'fulfilled') out.push(...db.value.items.map((d) => ({ id: d.id, name: d.name, type: '看板', icon: 'pi pi-images', to: '/dashboard' })))
    if (ch.status === 'fulfilled') out.push(...ch.value.items.map((c) => ({ id: c.id, name: c.name, type: '图表', icon: 'pi pi-chart-line', to: '/chart' })))
    if (dset.status === 'fulfilled') out.push(...dset.value.items.map((d) => ({ id: d.id, name: d.name, type: '数据集', icon: 'pi pi-table', to: '/dataSet' })))
    assetResults.value = out
  } finally {
    searching.value = false
  }
}

function goResult(r: SearchResult) {
  searchOpen.value = false
  searchKw.value = ''
  router.push(r.to)
}

function askFromSearch() {
  const kw = searchKw.value.trim()
  searchOpen.value = false
  searchKw.value = ''
  router.push('/chatbi')
  void kw
}

/** 路由切换后清空检索状态 */
watch(
  () => route.path,
  () => {
    searchKw.value = ''
    searchOpen.value = false
    moduleResults.value = []
    assetResults.value = []
  },
)

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    searchOpen.value = false
    searchInputEl.value?.blur()
  } else if (e.key === 'Enter') {
    const first = moduleResults.value[0] || assetResults.value[0]
    if (first) goResult(first)
    else askFromSearch()
  }
}

/** ⌘K / Ctrl+K 聚焦检索框，Esc 关闭用户菜单 */
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInputEl.value?.focus()
    searchOpen.value = true
    onSearchInput()
  } else if (e.key === 'Escape' && userMenuOpen.value) {
    userMenuOpen.value = false
  }
}

function onClickOutside(e: MouseEvent) {
  if (searchBoxEl.value && !searchBoxEl.value.contains(e.target as Node)) {
    searchOpen.value = false
  }
  const target = e.target as HTMLElement
  if (userMenuOpen.value && !target.closest('.side-foot')) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('click', onClickOutside)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="layout-root">
    <!-- ===== 侧边导航 ===== -->
    <aside class="sidebar" :class="{ fold: folded }">
      <div class="side-logo">
        <div class="logo-mark">DG</div>
        <div class="side-logo-text">
          <div class="logo-name">DataGear <em>能源BI</em></div>
          <div class="logo-sub">ENERGY INTELLIGENCE · V4.1</div>
        </div>
      </div>

      <nav class="side-nav">
        <div v-for="g in menuGroups" :key="g.name" class="nav-group">
          <div class="nav-group-title">{{ g.name }}</div>
          <router-link
            v-for="item in g.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
            <em v-if="item.badge" class="nav-badge">{{ item.badge }}</em>
          </router-link>
        </div>
      </nav>

      <div class="side-foot">
        <div class="side-user" @click="toggleUserMenu">
          <div class="avatar">{{ userInitial }}</div>
          <div class="side-user-info">
            <div class="u-name">{{ auth.user?.realName || auth.user?.name }}</div>
            <div class="u-role">{{ t('nav.online', '在线') }}</div>
          </div>
        </div>
        <button
          class="fold-btn"
          :title="folded ? '展开导航' : '收起导航'"
          @click="toggleFold"
        >
          <i :class="folded ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'"></i>
        </button>

        <!-- 用户菜单弹层 -->
        <div v-if="userMenuOpen" class="user-menu">
          <div class="user-menu-item" @click="toggleTheme">
            <i :class="theme.theme === 'blue' ? 'pi pi-moon' : 'pi pi-sun'"></i>
            {{ theme.theme === 'blue' ? '切换深色' : '切换浅色' }}
          </div>
          <div class="user-menu-item danger" @click="logout">
            <i class="pi pi-sign-out"></i>{{ t('logout') }}
          </div>
        </div>
      </div>
    </aside>

    <!-- ===== 主区 ===== -->
    <div class="main">
      <header class="topbar">
        <div class="crumbs"><b>{{ route.meta.title || 'DataGear' }}</b></div>

        <!-- 全局检索 -->
        <div ref="searchBoxEl" class="top-search" :class="{ open: searchOpen }">
          <i class="pi pi-search"></i>
          <input
            ref="searchInputEl"
            v-model="searchKw"
            placeholder="全局搜索：指标 / 看板 / 数据集，或直接向 AI 提问…"
            @input="onSearchInput"
            @focus="onSearchInput"
            @keydown="onSearchKeydown"
          />
          <kbd>⌘K</kbd>

          <!-- 检索下拉 -->
          <div v-if="searchOpen" class="search-dropdown">
            <div v-if="moduleResults.length" class="sd-group">
              <div class="sd-group-title">页面与模块</div>
              <div
                v-for="r in moduleResults"
                :key="r.id"
                class="sd-item"
                @click="goResult(r)"
              >
                <i :class="r.icon"></i>
                <span class="sd-name">{{ r.name }}</span>
                <span class="sd-type">{{ r.type }}</span>
              </div>
            </div>
            <div v-if="assetResults.length" class="sd-group">
              <div class="sd-group-title">数据资产（跨资源实时检索）</div>
              <template v-for="group in groupedAssetResults" :key="group.type">
                <div class="sd-item" v-for="r in group.rows" :key="r.type + r.id" @click="goResult(r)">
                  <i :class="r.icon"></i>
                  <span class="sd-name">{{ r.name }}</span>
                  <span class="sd-type">{{ r.type }}</span>
                </div>
              </template>
            </div>
            <div v-if="searching" class="sd-empty">检索中…</div>
            <div v-else-if="searchKw.trim() && !moduleResults.length && !assetResults.length" class="sd-empty">
              未找到「{{ searchKw.trim() }}」相关内容
            </div>
            <div class="sd-foot" @click="askFromSearch">
              <i class="pi pi-star"></i>向 AI 提问<template v-if="searchKw.trim()">：「{{ searchKw.trim() }}」</template>
              <i class="pi pi-arrow-right"></i>
            </div>
          </div>
        </div>

        <div class="top-actions">
          <span class="env-tag">生产环境 · 信创适配</span>
          <button class="icon-btn" title="告警通知" @click="openAlerts">
            <i class="pi pi-bell"></i><span class="dot"></span>
          </button>
          <button class="icon-btn" title="帮助与新手引导" @click="openHelp">
            <i class="pi pi-star"></i>
          </button>
        </div>
      </header>

      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark · 布局壳 ============ */
.layout-root {
  --bg-glass: rgba(255,255,255,.035);
  --bg-glass-2: rgba(255,255,255,.06);
  --bg-glass-3: rgba(255,255,255,.09);
  --line-1: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --line-3: rgba(255,255,255,.18);
  --tx-1: #F2F5FA;
  --tx-2: #B9C2D4;
  --tx-3: #7C88A0;
  --tx-4: #525D75;
  --brand: #FF8A3D;
  --brand-grad: linear-gradient(135deg,#FFB25E 0%,#FF8A3D 45%,#F4633A 100%);
  --brand-soft: rgba(255,138,61,.14);
  --brand-line: rgba(255,138,61,.35);
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;

  display: flex;
  height: 100%;
  min-height: 100vh;
}

/* ---- 侧边导航 ---- */
.sidebar {
  width: 232px; flex: none; height: 100vh;
  position: sticky; top: 0;
  background: linear-gradient(180deg, rgba(13,20,32,.92), rgba(9,13,22,.96));
  border-right: 1px solid var(--line-1);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.side-logo {
  height: 56px; display: flex; align-items: center; gap: 10px;
  padding: 0 16px; border-bottom: 1px solid var(--line-1); flex: none;
  white-space: nowrap;
}
.logo-mark {
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  background: var(--brand-grad);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px rgba(255,138,61,.25);
  color: #1A0E05; font-weight: 800; font-size: 15px; font-family: var(--font-num);
}
.logo-name { font-size: 15px; font-weight: 700; letter-spacing: .5px; color: var(--tx-1); }
.logo-name em { font-style: normal; color: var(--brand); }
.logo-sub { font-size: 10px; color: var(--tx-3); letter-spacing: 1px; font-family: var(--font-num); }
.side-logo-text { display: flex; flex-direction: column; line-height: 1.25; }

.side-nav { flex: 1; overflow-y: auto; padding: 10px 10px 20px; }
.side-nav::-webkit-scrollbar { width: 6px; }
.side-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
.nav-group { margin-top: 14px; }
.nav-group:first-child { margin-top: 0; }
.nav-group-title {
  font-size: 11px; color: var(--tx-4); letter-spacing: 2px;
  padding: 0 10px 6px; white-space: nowrap;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; margin: 1px 0; border-radius: 10px;
  color: var(--tx-2); font-size: 13.5px; text-decoration: none;
  transition: all .18s cubic-bezier(.4,0,.2,1);
  white-space: nowrap; position: relative;
}
.nav-item .pi { font-size: 15px; opacity: .85; }
.nav-item:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.nav-item.active {
  background: linear-gradient(90deg, var(--brand-soft), rgba(255,138,61,.05));
  color: var(--brand); font-weight: 600;
}
.nav-item.active::before {
  content: ""; position: absolute; left: -10px; top: 20%; bottom: 20%;
  width: 3px; border-radius: 2px; background: var(--brand-grad);
  box-shadow: 0 0 24px rgba(255,138,61,.25);
}
.nav-badge {
  margin-left: auto; font-style: normal;
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: var(--brand-soft); color: var(--brand);
  border: 1px solid var(--brand-line);
  font-family: var(--font-num);
}

.side-foot {
  flex: none; padding: 12px; border-top: 1px solid var(--line-1);
  display: flex; align-items: center; gap: 10px;
}
.side-user { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.avatar {
  width: 30px; height: 30px; border-radius: 50%; flex: none;
  background: linear-gradient(135deg, #22D3EE, #0E7490);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #04262C;
}
.side-user-info { min-width: 0; line-height: 1.3; }
.u-name { font-size: 13px; font-weight: 600; color: var(--tx-1); white-space: nowrap; }
.u-role { font-size: 11px; color: #34D399; white-space: nowrap; }
.fold-btn {
  width: 26px; height: 26px; flex: none; border-radius: 7px;
  border: 1px solid var(--line-2);
  background: var(--bg-glass); color: var(--tx-3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.fold-btn:hover { color: var(--brand); border-color: var(--brand-line); }
.fold-btn .pi { font-size: 12px; }

/* ---- 主区 ---- */
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100vh; }
.topbar {
  height: 56px; flex: none;
  display: flex; align-items: center; gap: 14px; padding: 0 20px;
  border-bottom: 1px solid var(--line-1);
  background: rgba(10,14,23,1); backdrop-filter: blur(14px);
  position: relative; z-index: 50;
}
.crumbs { font-size: 13px; color: var(--tx-3); white-space: nowrap; flex: none; }
.crumbs b { color: var(--tx-1); font-weight: 600; font-size: 14px; }

/* ---- 全局检索 ---- */
.top-search {
  flex: 1; max-width: 460px; position: relative;
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 20px; padding: 6px 14px; color: var(--tx-3);
  transition: all .18s;
}
.top-search:hover, .top-search:focus-within, .top-search.open {
  border-color: var(--brand-line); background: var(--bg-glass-2);
}
.top-search > .pi { font-size: 14px; flex: none; }
.top-search input {
  flex: 1; background: none; border: none; outline: none;
  color: var(--tx-1); font-size: 13px; font-family: inherit;
}
.top-search input::placeholder { color: var(--tx-4); }
.top-search kbd {
  font-size: 10px; font-family: var(--font-num); color: var(--tx-4);
  border: 1px solid var(--line-2); border-radius: 4px; padding: 0 5px;
  flex: none;
}
.search-dropdown {
  position: absolute; top: calc(100% + 8px); left: 0; right: 0;
  background: rgba(13,20,32,.97);
  border: 1px solid var(--line-2); border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  backdrop-filter: blur(14px);
  max-height: 380px; overflow-y: auto;
  padding: 8px;
}
.sd-group { margin-bottom: 4px; }
.sd-group-title {
  font-size: 10.5px; color: var(--tx-4); letter-spacing: 1.5px;
  padding: 6px 10px 4px;
}
.sd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background .15s;
}
.sd-item:hover { background: var(--bg-glass-2); }
.sd-item .pi { font-size: 14px; color: var(--tx-3); flex: none; }
.sd-item:hover .pi { color: var(--brand); }
.sd-name { flex: 1; min-width: 0; font-size: 13px; color: var(--tx-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-type {
  font-size: 10.5px; color: var(--tx-3); flex: none;
  border: 1px solid var(--line-1); border-radius: 6px; padding: 0 6px;
}
.sd-empty { padding: 16px; text-align: center; font-size: 12.5px; color: var(--tx-4); }
.sd-foot {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px; padding: 9px 10px;
  border-top: 1px solid var(--line-1);
  font-size: 12.5px; color: var(--brand); cursor: pointer;
  border-radius: 0 0 8px 8px;
}
.sd-foot:hover { background: var(--brand-soft); }
.sd-foot .pi-arrow-right { margin-left: auto; font-size: 12px; }

/* ---- 顶栏操作（对齐参考站：环境标签 + 图标按钮） ---- */
.top-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; flex: none; }
.env-tag {
  font-size: 11px; padding: 3px 10px; border-radius: 12px;
  background: rgba(52,211,153,.13); color: #34D399; border: 1px solid rgba(52,211,153,.3);
  font-family: var(--font-num); white-space: nowrap;
}
.icon-btn {
  width: 34px; height: 34px; border-radius: 9px; border: none;
  background: transparent; color: var(--tx-2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s; position: relative;
}
.icon-btn:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.icon-btn .pi { font-size: 17px; }
.icon-btn .dot {
  position: absolute; top: 7px; right: 8px; width: 7px; height: 7px;
  border-radius: 50%; background: #F87171; border: 1.5px solid #0A0E17;
}

/* ---- 用户菜单弹层 ---- */
.side-foot { position: relative; }
.side-user { cursor: pointer; border-radius: 10px; padding: 6px; transition: background .18s; }
.side-user:hover { background: var(--bg-glass-2); }
.user-menu {
  position: absolute; left: 12px; bottom: calc(100% + 8px); z-index: 60;
  min-width: 168px;
  background: rgba(13,20,32,.97);
  border: 1px solid var(--line-2); border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0,0,0,.55);
  backdrop-filter: blur(14px);
  padding: 6px;
}
.user-menu-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px; cursor: pointer;
  font-size: 13px; color: var(--tx-2); transition: all .15s;
}
.user-menu-item:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.user-menu-item .pi { font-size: 14px; }
.user-menu-item.danger { color: #F87171; }
.user-menu-item.danger:hover { background: rgba(248,113,113,.1); color: #F87171; }

.layout-content { flex: 1; overflow: auto; }

/* ---- 侧栏收起态（与参考站 fold 交互一致） ---- */
.sidebar { transition: width .18s cubic-bezier(.4,0,.2,1); }
.sidebar.fold { width: 64px; }
.sidebar.fold .side-logo-text,
.sidebar.fold .nav-group-title,
.sidebar.fold .nav-item span,
.sidebar.fold .nav-badge,
.sidebar.fold .side-user-info { display: none; }
.sidebar.fold .side-logo { justify-content: center; padding: 0; }
.sidebar.fold .nav-group { margin-top: 10px; }
.sidebar.fold .nav-item { justify-content: center; padding: 9px 0; }
.sidebar.fold .side-foot { flex-direction: column; gap: 8px; }
.sidebar.fold .side-user { justify-content: center; padding: 2px; flex: none; }
.sidebar.fold .nav-item.active::before { left: -6px; }

/* ---- 响应式 ---- */
@media (max-width: 760px) {
  .sidebar { width: 64px; }
  .side-logo-text, .nav-group-title, .nav-item span, .nav-badge, .side-user-info { display: none; }
  .nav-item { justify-content: center; padding: 9px 0; }
  .side-logo { justify-content: center; padding: 0; }
  .side-user { justify-content: center; padding: 2px; flex: none; }
  .side-foot { flex-direction: column; gap: 8px; }
  .top-search kbd, .env-tag { display: none; }
}
</style>
