<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { dashboardPagingQueryData, saveDashboard, type DashboardListItem } from '@/api/dashboard'
import { chartPagingQueryData, type ChartEntity } from '@/api/chart'
import { dataSetPagingQueryData } from '@/api/dataSet'
import { dtbsSourcePagingQueryData } from '@/api/dtbsSource'
import { metricPagingQueryData, queryMetricValue, type MetricEntity } from '@/api/metric'
import { alertHistory } from '@/mock/alertData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { init, use } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 综合首页（能源暗域 Energy Dark）：欢迎横幅 + 真实资产统计 + 趋势 + 快捷入口 + 最近创建 + 资产概览
const router = useRouter()
const auth = useAuthStore()

/* ---------- 用户信息 / 问候 ---------- */
const displayName = computed(() => auth.user?.realName || auth.user?.name || '用户')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const dateLine = computed(() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${week} · 数据来自平台实时统计`
})

/* ---------- 资产统计（真实接口） ---------- */
const totals = ref({ dtbsSource: -1, dataSet: -1, chart: -1, dashboard: -1 })
const statCards = computed(() => [
  { key: 'dtbsSource', label: '数据源', ind: 'oil', indName: '石油', sub: '连接 · 驱动', to: '/dtbsSource', value: totals.value.dtbsSource },
  { key: 'dataSet', label: '数据集', ind: 'gas', indName: '天然气', sub: 'SQL · 文件', to: '/dataSet', value: totals.value.dataSet },
  { key: 'chart', label: '图表', ind: 'chem', indName: '化工', sub: '可视化图表', to: '/chart', value: totals.value.chart },
  { key: 'dashboard', label: '看板', ind: 'coal', indName: '煤矿', sub: '展示看板', to: '/dashboard', value: totals.value.dashboard },
])

/* ---------- 最近创建（真实数据） ---------- */
interface RecentItem {
  id: string
  name: string
  type: '看板' | '图表'
  to: string
  time?: string | number
  author?: string
}
const recents = ref<RecentItem[]>([])

function fmtTime(ct?: string | number): string {
  if (!ct) return ''
  const d = new Date(ct)
  if (isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/* ---------- 快捷入口 ---------- */
const entries = [
  { name: '数据源管理', sub: '连接 · 驱动 · 守卫', cls: 'oil', icon: 'pi pi-database', to: '/dtbsSource' },
  { name: '数据集', sub: 'SQL · 文件 · 关联', cls: 'gas', icon: 'pi pi-table', to: '/dataSet' },
  { name: '图表', sub: '拖拽 · 可视化', cls: 'chem', icon: 'pi pi-chart-line', to: '/chart' },
  { name: '看板', sub: '模板 · 分享 · 大屏', cls: 'coal', icon: 'pi pi-images', to: '/dashboard' },
]
const quickOps = [
  { label: '新建数据源', icon: 'pi pi-plus', to: '/dtbsSource' },
  { label: '新建数据集', icon: 'pi pi-plus', to: '/dataSet' },
  { label: '新建图表', icon: 'pi pi-plus', to: '/chart' },
  { label: '新建看板', icon: 'pi pi-plus', to: '/dashboard' },
]
const latestDashboards = ref<DashboardListItem[]>([])

function go(to: string) {
  router.push(to)
}
function askAi() {
  router.push('/chatbi')
}

/* ---------- 图表 ---------- */
const trendEl = ref<HTMLElement>()
const donutEl = ref<HTMLElement>()
let trendChart: ECharts | null = null
let donutChart: ECharts | null = null

const CHART_COLORS = ['#FF8A3D', '#22D3EE', '#A78BFA', '#E8B33C', '#34D399', '#F87171', '#60A5FA', '#F472B6']
function chartBase(): EChartsCoreOption {
  return {
    color: CHART_COLORS,
    textStyle: { color: '#B9C2D4', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif' },
    grid: { left: 8, right: 12, top: 36, bottom: 4, containLabel: true },
    legend: { textStyle: { color: '#7C88A0', fontSize: 11 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect', top: 2 },
    tooltip: {
      backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)',
      textStyle: { color: '#F2F5FA', fontSize: 12 }, confine: true,
    },
  }
}

function renderTrend(charts: ChartEntity[], dashboards: DashboardListItem[]) {
  if (!trendEl.value) return
  const days: string[] = []
  const dayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dayKeys.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
    days.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  const countBy = (items: { createTime?: string | number }[]) => {
    const arr = new Array(7).fill(0)
    for (const it of items) {
      if (!it.createTime) continue
      const d = new Date(it.createTime)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      const idx = dayKeys.indexOf(key)
      if (idx >= 0) arr[idx]++
    }
    return arr
  }
  trendChart = trendChart || init(trendEl.value)
  trendChart.setOption({
    ...chartBase(),
    legend: { ...chartBase().legend as object, data: ['新增图表', '新增看板'] },
    xAxis: {
      type: 'category', data: days,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,.14)' } },
      axisTick: { show: false }, axisLabel: { color: '#7C88A0', fontSize: 11 },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: '#7C88A0', fontSize: 11, fontFamily: 'Barlow, Bahnschrift, sans-serif' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
    },
    series: [
      {
        name: '新增图表', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { width: 2.5, color: '#A78BFA' }, itemStyle: { color: '#A78BFA' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(167,139,250,.28)' }, { offset: 1, color: 'rgba(167,139,250,0)' }],
          },
        },
        data: countBy(charts),
      },
      {
        name: '新增看板', type: 'bar', barWidth: 14,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: 'rgba(255,138,61,.75)' },
        data: countBy(dashboards),
      },
    ],
  } as EChartsCoreOption)
}

function renderDonut() {
  if (!donutEl.value) return
  const data = [
    { name: `数据源 ${Math.max(totals.value.dtbsSource, 0)}`, value: Math.max(totals.value.dtbsSource, 0) },
    { name: `数据集 ${Math.max(totals.value.dataSet, 0)}`, value: Math.max(totals.value.dataSet, 0) },
    { name: `图表 ${Math.max(totals.value.chart, 0)}`, value: Math.max(totals.value.chart, 0) },
    { name: `看板 ${Math.max(totals.value.dashboard, 0)}`, value: Math.max(totals.value.dashboard, 0) },
  ]
  donutChart = donutChart || init(donutEl.value)
  donutChart.setOption({
    ...chartBase(),
    tooltip: { trigger: 'item', backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)', textStyle: { color: '#F2F5FA', fontSize: 12 } },
    legend: { orient: 'vertical', right: 4, top: 'center', textStyle: { color: '#7C88A0', fontSize: 11 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect' },
    series: [{
      type: 'pie', radius: ['52%', '74%'], center: ['34%', '50%'],
      label: { show: false }, itemStyle: { borderColor: '#0A0E17', borderWidth: 2 },
      data,
    }],
  } as EChartsCoreOption)
}

function onResize() {
  trendChart?.resize()
  donutChart?.resize()
}

/* ---------- 加载 ---------- */
const loading = ref(true)

/* ---------- 指标卡横滑区（真实语义指标，FR-SEM-06 消费侧） ---------- */
const { success: opSuccess } = useOperationMessage()
const homeMetrics = ref<MetricEntity[]>([])
const metricValues = ref<Record<string, unknown>>({})

async function loadHomeMetrics() {
  try {
    const data = await metricPagingQueryData({ page: 1, pageSize: 8, orders: [{ name: 'createTime', type: 'DESC' as const }] })
    homeMetrics.value = data.items.slice(0, 4)
    await Promise.allSettled(
      homeMetrics.value.map(async (m) => {
        try {
          const v = await queryMetricValue(m.id, {})
          metricValues.value[m.id] = v.value
        } catch { /* 数据源不可达时显示 — */ }
      }),
    )
  } catch { /* 语义层未就绪时隐藏区块 */ }
}

function goMetric(_id: string) {
  router.push('/metrics')
}

/* ---------- 待办与消息 ---------- */
interface TodoItem { kind: string; icon: string; title: string; sub: string; level: string; to: string }
const todos = computed<TodoItem[]>(() => {
  const fromAlert = alertHistory.value.filter((h) => !h.handled).map(
    (h): TodoItem => ({ kind: '告警', icon: 'pi pi-bell', title: `【告警】${h.rule}：当前 ${h.value}（阈值 ${h.threshold}）`, sub: `阈值告警 · ${h.time}`, level: 'danger', to: '/alert' }),
  )
  return [...fromAlert,
    { kind: '审批', icon: 'pi pi-check-circle', title: '【审批】「井口含水率」指标查看权限申请', sub: '权限审批 · 昨天 17:42', level: 'info', to: '/metrics' },
    { kind: '质量', icon: 'pi pi-verified', title: '【质量】ODS_采油日报表 质量校验通过 98.6%', sub: '数据质量 · 昨天 22:00', level: 'ok', to: '/governance' },
  ].slice(0, 4)
})

/* ---------- 行业看板模板库（一键套用，真实落库） ---------- */
interface HomeTpl { name: string; desc: string; cover: string; badge?: string }
const HOME_TEMPLATES: HomeTpl[] = [
  { name: '油田生产驾驶舱', desc: '采油厂 · 区块 · 井场 · 含水率', cover: 'linear-gradient(135deg,#3a2410,#8a4d1f 45%,#b06a2a)', badge: '官方推荐' },
  { name: '天然气管网运行监控', desc: '管输量 · 门站压力 · 储气库', cover: 'linear-gradient(135deg,#0c2a33,#0e5a66 50%,#12808f)' },
  { name: '煤化工经营分析', desc: '甲醇 · 烯烃 · 产销存', cover: 'linear-gradient(135deg,#241536,#4a2d6e 50%,#6b41a0)' },
  { name: '煤矿安全双重预防', desc: '瓦斯 · 顶板 · 人员定位', cover: 'linear-gradient(135deg,#332b0d,#7a6420 50%,#a68a2e)' },
]
const applyingTpl = ref('')

async function applyHomeTemplate(t: HomeTpl) {
  applyingTpl.value = t.name
  try {
    await saveDashboard({ id: undefined as unknown as string, name: `${t.name}（副本）`, apiVersion: '2.0' })
    opSuccess(`已套用模板「${t.name}」，生成可编辑副本`)
    router.push('/dashboard')
  } catch (e) {
    opSuccess('套用失败，请稍后重试')
  } finally {
    applyingTpl.value = ''
  }
}

/* ---------- 我的收藏（看板收藏，localStorage） ---------- */
const favBoards = computed(() => {
  try {
    const favs = JSON.parse(localStorage.getItem('dg_board_favs') || '{}') as Record<string, boolean>
    return latestDashboards.value.filter((d) => favs[d.id])
  } catch {
    return [] as DashboardListItem[]
  }
})

/* ---------- 角色化新手引导（FR-HOME-23~25，5 步可跳过） ---------- */
const GUIDE_KEY = 'dg_home_guide_done'
const guideDone = ref(localStorage.getItem(GUIDE_KEY) === '1')
const guideStep = ref(0)
const guideOpen = ref(false)
const GUIDE_STEPS = [
  { title: 'AI 快速问数', body: '用自然语言直接取数，无需写 SQL。输入「上月各采油厂原油产量的同比变化」，回答含图表 + 数据 + 结论，取数逻辑全程透明。' },
  { title: '指标中心（语义层）', body: '指标的唯一定义与消费中心：先在指标中心定义口径统一的指标，再被看板、告警、问数一致消费。' },
  { title: '看板与设计器', body: '看板列表支持行业模板一键套用（生成可编辑副本）；设计器支持可视化拖拽、绑定已有图表与语义指标、源码双模式。' },
  { title: '告警与订阅', body: '基于语义指标配置阈值告警与定时订阅，经邮件/企微/钉钉/Webhook 多通道触达。' },
  { title: '开放与移动端', body: '指标/数据集一键发布为 API，签名嵌入第三方系统；移动端 H5 随时查看核心看板。' },
]
function openGuide() {
  guideStep.value = 0
  guideOpen.value = true
}
function guideNext() {
  if (guideStep.value < GUIDE_STEPS.length - 1) guideStep.value++
  else finishGuide()
}
function finishGuide() {
  guideOpen.value = false
  localStorage.setItem(GUIDE_KEY, '1')
  guideDone.value = true
  opSuccess('引导已完成，可随时重新打开')
}

/* ---------- 布局管理（隐藏卡片记忆，FR-HOME-19~22 简化版） ---------- */
const HIDE_KEY = 'dg_home_hidden_cards'
const hiddenCards = ref<string[]>(localStorage.getItem(HIDE_KEY)?.split(',').filter(Boolean) ?? [])
const layoutEditing = ref(false)
function toggleLayoutEditing() {
  layoutEditing.value = !layoutEditing.value
}
function toggleCardHidden(name: string) {
  if (layoutEditing.value) {
    if (hiddenCards.value.includes(name)) hiddenCards.value = hiddenCards.value.filter((n) => n !== name)
    else hiddenCards.value.push(name)
    localStorage.setItem(HIDE_KEY, hiddenCards.value.join(','))
  }
}
function cardVisible(name: string): boolean {
  return !hiddenCards.value.includes(name)
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  loadHomeMetrics()
  if (!guideDone.value) guideOpen.value = true
  const q = (n: number) => ({ page: 1, pageSize: n, orders: [{ name: 'createTime', type: 'DESC' as const }] })
  const [ds, dset, ch, db] = await Promise.allSettled([
    dtbsSourcePagingQueryData(q(1)),
    dataSetPagingQueryData(q(1)),
    chartPagingQueryData(q(100)),
    dashboardPagingQueryData(q(100)),
  ])
  if (ds.status === 'fulfilled') totals.value.dtbsSource = ds.value.total
  if (dset.status === 'fulfilled') totals.value.dataSet = dset.value.total
  if (ch.status === 'fulfilled') totals.value.chart = ch.value.total
  if (db.status === 'fulfilled') totals.value.dashboard = db.value.total

  const charts = ch.status === 'fulfilled' ? ch.value.items : []
  const dashboards = db.status === 'fulfilled' ? db.value.items : []
  latestDashboards.value = dashboards.slice(0, 4)

  recents.value = [
    ...dashboards.map((d): RecentItem => ({ id: d.id, name: d.name, type: '看板', to: '/dashboard', time: d.createTime, author: d.createUser?.realName || d.createUser?.name })),
    ...charts.map((c): RecentItem => ({ id: c.id, name: c.name, type: '图表', to: '/chart', time: c.createTime, author: c.createUser?.realName || c.createUser?.name })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 4)

  loading.value = false
  renderTrend(charts, dashboards)
  renderDonut()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  donutChart?.dispose()
})
</script>

<template>
  <div class="home-page">
    <!-- ===== 欢迎横幅 + AI 问数入口 ===== -->
    <section class="welcome">
      <div>
        <h1>{{ greeting }}，{{ displayName }} —— <em>欢迎回到能源数据智能平台</em></h1>
        <div class="w-sub">{{ dateLine }}</div>
      </div>
      <div class="quick-ask" @click="askAi">
        <i class="pi pi-star qa-icon"></i>
        <span>试试问数：「本月各数据集的访问量排名？」</span>
        <span class="qa-btn">问 AI</span>
      </div>
      <button class="layout-btn" type="button" title="重新打开新手引导" @click="openGuide">
        <i class="pi pi-question-circle"></i>帮助
      </button>
      <button class="layout-btn" type="button" :class="{ on: layoutEditing }" @click="toggleLayoutEditing">
        <i class="pi pi-th-large"></i>{{ layoutEditing ? '完成布局' : '布局管理' }}
      </button>
    </section>

    <!-- ===== 指标卡横滑区（语义层真实指标 · FR-SEM-06） ===== -->
    <section v-if="homeMetrics.length" class="metric-strip">
      <div v-for="m in homeMetrics" :key="m.id" class="h-metric" @click="goMetric(m.id)">
        <div class="hm-label"><span class="tag brand" v-if="m.certified">已认证</span> {{ m.name }}</div>
        <div class="hm-value num">{{ metricValues[m.id] !== undefined ? metricValues[m.id] : '—' }}</div>
        <div class="hm-caliber ellipsis" :title="m.caliber">{{ m.caliber || m.tableName + '.' + m.valueField }}</div>
      </div>
    </section>

    <!-- ===== 核心资产统计卡（真实数据） ===== -->
    <section class="stat-grid">
      <div
        v-for="c in statCards"
        :key="c.key"
        class="stat-card"
        :class="`glow-${c.ind}`"
        @click="go(c.to)"
      >
        <div class="s-label"><span class="ind" :class="c.ind"><i></i>{{ c.indName }}</span> {{ c.label }}</div>
        <div class="s-value">
          <span>{{ c.value >= 0 ? c.value : '—' }}</span>
        </div>
        <div class="s-foot">
          <span class="s-sub">{{ c.sub }}</span>
          <span class="s-more">查看全部 ›</span>
        </div>
      </div>
    </section>

    <div v-if="layoutEditing" class="layout-tip">
      布局编辑中：点击卡片标题的 👁 可隐藏/恢复模块（保存到本地偏好），完成后点击「完成布局」。
      当前隐藏：{{ hiddenCards.length ? hiddenCards.join('、') : '无' }}
    </div>
    <div class="portal-grid">
      <!-- ===== 左列 ===== -->
      <div class="col">
        <!-- 资产增长趋势 -->
        <div v-show="cardVisible('资产增长趋势')" class="card">
          <div class="card-title"><span class="bar"></span>资产增长趋势<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('资产增长趋势')">👁</span>
            <span class="tag-period">近 7 日</span>
          </div>
          <div ref="trendEl" class="chart trend"></div>
        </div>

        <!-- 快捷入口 -->
        <div v-show="cardVisible('快捷入口')" class="card">
          <div class="card-title"><span class="bar"></span>快捷入口<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('快捷入口')">👁</span>
            <span class="tag tag-brand">直达模块</span>
          </div>
          <div class="tpl-strip">
            <div
              v-for="e in entries"
              :key="e.name"
              class="tpl-card"
              :class="`tpl-${e.cls}`"
              @click="go(e.to)"
            >
              <i :class="e.icon" class="tpl-icon"></i>
              <div class="t-name">{{ e.name }}</div>
              <div class="t-sub">{{ e.sub }}</div>
            </div>
          </div>
        </div>

        <!-- 行业看板模板库（一键套用 · FR-HOME-23~25） -->
        <div v-show="cardVisible('行业看板模板库')" class="card">
          <div class="card-title"><span class="bar"></span>行业看板模板库<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('行业看板模板库')">👁</span>
            <span class="more" @click="go('/dashboard')">全部模板 ›</span>
          </div>
          <div class="home-tpl-grid">
            <div v-for="t in HOME_TEMPLATES" :key="t.name" class="home-tpl" :style="{ background: t.cover }">
              <span v-if="t.badge" class="ht-badge">{{ t.badge }}</span>
              <div class="ht-name">{{ t.name }}</div>
              <div class="ht-desc">{{ t.desc }}</div>
              <button class="btn sm primary ht-apply" type="button" :disabled="applyingTpl === t.name" @click="applyHomeTemplate(t)">
                {{ applyingTpl === t.name ? '套用中…' : '一键套用' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 最近创建 -->
        <div v-show="cardVisible('最近创建')" class="card">
          <div class="card-title"><span class="bar"></span>最近创建<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('最近创建')">👁</span>
            <span class="more" @click="go('/dashboard')">更多 ›</span>
          </div>
          <div v-if="recents.length" class="fav-grid">
            <div v-for="r in recents" :key="r.type + r.id" class="fav-item" @click="go(r.to)">
              <div class="f-icon" :class="r.type === '看板' ? 'ic-oil' : 'ic-chem'">
                <i :class="r.type === '看板' ? 'pi pi-images' : 'pi pi-chart-line'"></i>
              </div>
              <div class="grow">
                <div class="f-name ellipsis">{{ r.name }}</div>
                <div class="f-sub">{{ r.type }}<template v-if="r.author"> · {{ r.author }}</template> · {{ fmtTime(r.time) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty">
            <i class="pi pi-inbox"></i>
            <span>{{ loading ? '加载中…' : '暂无看板或图表，点击上方快捷入口开始创建' }}</span>
          </div>
        </div>
      </div>

      <!-- ===== 右列 ===== -->
      <div class="col">
        <!-- 待办与消息（FR-HOME-05） -->
        <div v-show="cardVisible('待办与消息')" class="card">
          <div class="card-title"><span class="bar"></span>待办与消息<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('待办与消息')">👁</span>
            <span class="tag tag-danger">{{ todos.length }} 条</span>
          </div>
          <div v-if="todos.length" class="todo-list">
            <div v-for="t in todos" :key="t.title" class="todo-item" :class="`lv-${t.level}`" @click="go(t.to)">
              <i :class="t.icon" class="td-icon"></i>
              <div class="grow">
                <div class="td-title ellipsis">{{ t.title }}</div>
                <div class="td-sub">{{ t.sub }}</div>
              </div>
              <i class="pi pi-arrow-right row-arrow"></i>
            </div>
          </div>
          <div v-else class="empty"><i class="pi pi-inbox"></i><span>暂无待办</span></div>
        </div>

        <!-- 快捷操作 -->
        <div v-show="cardVisible('快捷操作')" class="card">
          <div class="card-title"><span class="bar"></span>快捷操作<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('快捷操作')">👁</span></div>
          <div class="ops">
            <button v-for="op in quickOps" :key="op.label" class="op-btn" @click="go(op.to)">
              <i :class="op.icon"></i>{{ op.label }}
            </button>
          </div>
        </div>

        <!-- 我的收藏 -->
        <div class="card">
          <div class="card-title"><span class="bar"></span>我的收藏
            <span class="more" @click="go('/dashboard')">管理 ›</span>
          </div>
          <template v-if="favBoards.length">
            <div v-for="d in favBoards" :key="d.id" class="row-item" @click="go(`/dashboard/${d.id}/viewer`)">
              <span class="row-star star-filled">★</span>
              <div class="grow">
                <div class="row-name ellipsis">{{ d.name }}</div>
                <div class="row-sub">看板</div>
              </div>
              <i class="pi pi-arrow-right row-arrow"></i>
            </div>
          </template>
          <div v-else class="empty"><i class="pi pi-star"></i><span>在看板列表点击「收藏」后在此展示</span></div>
        </div>

        <!-- 最新看板 -->
        <div v-show="cardVisible('最新看板')" class="card">
          <div class="card-title"><span class="bar"></span>最新看板<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('最新看板')">👁</span>
            <span class="more" @click="go('/dashboard')">管理 ›</span>
          </div>
          <template v-if="latestDashboards.length">
            <div
              v-for="d in latestDashboards"
              :key="d.id"
              class="row-item"
              @click="go('/dashboard')"
            >
              <span class="row-star"><i class="pi pi-images"></i></span>
              <div class="grow">
                <div class="row-name ellipsis">{{ d.name }}</div>
                <div class="row-sub">{{ d.analysisProject?.name || '默认项目' }} · {{ fmtTime(d.createTime) }}</div>
              </div>
              <i class="pi pi-arrow-right row-arrow"></i>
            </div>
          </template>
          <div v-else class="empty">
            <i class="pi pi-inbox"></i>
            <span>{{ loading ? '加载中…' : '暂无看板' }}</span>
          </div>
        </div>

        <!-- 数据资产概览 -->
        <div v-show="cardVisible('数据资产概览')" class="card">
          <div class="card-title"><span class="bar"></span>数据资产概览<span v-if="layoutEditing" class="wc-eye" title="隐藏该模块" @click="toggleCardHidden('数据资产概览')">👁</span></div>
          <div ref="donutEl" class="chart donut"></div>
        </div>
      </div>
    </div>

    <!-- ===== 角色化新手引导（5 步，可跳过） ===== -->
    <div v-if="guideOpen" class="guide-mask">
      <div class="guide-card">
        <div class="g-step">STEP {{ guideStep + 1 }} / {{ GUIDE_STEPS.length }}</div>
        <div class="g-title">{{ GUIDE_STEPS[guideStep].title }}</div>
        <div class="g-body">{{ GUIDE_STEPS[guideStep].body }}</div>
        <div class="g-dots">
          <i v-for="(_s, gi) in GUIDE_STEPS" :key="gi" :class="{ on: gi <= guideStep }"></i>
        </div>
        <div class="g-ops">
          <button class="btn ghost" type="button" @click="finishGuide">跳过引导</button>
          <button class="btn primary" type="button" @click="guideNext">
            {{ guideStep === GUIDE_STEPS.length - 1 ? '开始使用' : '下一步' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
/* ===== 布局管理 / 新手引导 ===== */
.layout-btn {
  flex: none; align-self: center; display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--tx-3); padding: 7px 14px; border-radius: 10px;
  background: var(--bg-glass); border: 1px solid var(--line-2); cursor: pointer;
}
.layout-btn:hover, .layout-btn.on { color: var(--brand); border-color: var(--brand-line); background: var(--brand-soft); }
.layout-tip {
  padding: 9px 14px; border-radius: 10px; margin-bottom: 12px; font-size: 12px; color: var(--tx-2);
  background: rgba(255, 138, 61, 0.08); border: 1px dashed var(--brand-line);
}
.wc-eye { cursor: pointer; opacity: 0.6; font-style: normal; margin-left: 6px; }
.wc-eye:hover { opacity: 1; }
.guide-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.guide-card { width: 460px; max-width: 92vw; background: #0d1420; border: 1px solid var(--brand-line); border-radius: 16px; padding: 24px 26px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.g-step { font-size: 11px; font-weight: 700; color: var(--brand); letter-spacing: 1px; }
.g-title { font-size: 18px; font-weight: 800; color: var(--tx-1); margin: 10px 0; }
.g-body { font-size: 13px; color: var(--tx-2); line-height: 1.8; min-height: 84px; }
.g-dots { display: flex; gap: 6px; margin: 14px 0; }
.g-dots i { width: 18px; height: 4px; border-radius: 2px; background: var(--line-2); }
.g-dots i.on { background: var(--brand); }
.g-ops { display: flex; justify-content: space-between; }
/* ===== 指标卡横滑区 ===== */
.metric-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px; }
.h-metric {
  padding: 14px 16px; border-radius: 12px; border: 1px solid var(--line-1); background: var(--bg-glass);
  cursor: pointer; transition: border-color 0.15s;
}
.h-metric:hover { border-color: var(--brand-line); }
.hm-label { font-size: 12px; color: var(--tx-2); display: flex; gap: 6px; align-items: center; }
.hm-value { font-size: 28px; font-weight: 700; color: var(--brand); margin: 6px 0 4px; }
.hm-caliber { font-size: 11px; color: var(--tx-4); }
/* ===== 行业模板库 ===== */
.home-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.home-tpl { border-radius: 12px; padding: 12px; min-height: 118px; display: flex; flex-direction: column; position: relative; border: 1px solid var(--line-1); }
.ht-badge { position: absolute; top: 8px; right: 8px; font-size: 9.5px; padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,.4); color: #ffd9b8; }
.ht-name { font-size: 13px; font-weight: 700; color: #fff; margin-top: auto; }
.ht-desc { font-size: 10.5px; color: rgba(255,255,255,.75); margin: 3px 0 8px; }
.ht-apply { align-self: flex-start; }
/* ===== 待办与消息 ===== */
.todo-list { display: flex; flex-direction: column; gap: 8px; }
.todo-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--line-1); cursor: pointer;
}
.todo-item:hover { background: var(--bg-glass-2); }
.todo-item.lv-danger { border-left: 3px solid #f87171; }
.todo-item.lv-warn { border-left: 3px solid #fbbf24; }
.todo-item.lv-info { border-left: 3px solid #60a5fa; }
.todo-item.lv-ok { border-left: 3px solid #34d399; }
.td-icon { color: var(--tx-3); font-size: 13px; }
.td-title { font-size: 12.5px; color: var(--tx-1); }
.td-sub { font-size: 11px; color: var(--tx-4); margin-top: 2px; }
.star-filled { color: #e8b33c; }
.tag-danger { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.home-page {
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
  --oil: #FF8A3D;  --oil-soft: rgba(255,138,61,.13);
  --gas: #22D3EE;  --gas-soft: rgba(34,211,238,.12);
  --chem: #A78BFA; --chem-soft: rgba(167,139,250,.13);
  --coal: #E8B33C; --coal-soft: rgba(232,179,60,.13);
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;

  position: relative;
  min-height: 100%;
  padding: 20px 24px 40px;
  color: var(--tx-1);
  font-size: 14px; line-height: 1.6;
  background:
    radial-gradient(900px 480px at 85% -10%, rgba(255,138,61,.10), transparent 60%),
    radial-gradient(800px 500px at -10% 110%, rgba(34,211,238,.07), transparent 60%),
    radial-gradient(600px 400px at 55% 120%, rgba(167,139,250,.05), transparent 65%),
    #0A0E17;
}

/* ---- 欢迎横幅 ---- */
.welcome {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
  padding: 22px 24px; margin-bottom: 16px; flex-wrap: wrap;
  background:
    radial-gradient(500px 200px at 90% 0%, rgba(255,138,61,.16), transparent 65%),
    radial-gradient(400px 200px at 70% 100%, rgba(34,211,238,.08), transparent 60%),
    var(--bg-glass);
  border: 1px solid var(--line-1); border-radius: 20px;
}
.welcome h1 { font-size: 22px; font-weight: 700; margin: 0; }
.welcome h1 em {
  font-style: normal;
  background: var(--brand-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.w-sub { color: var(--tx-3); font-size: 13px; margin-top: 4px; }
.quick-ask {
  display: flex; align-items: center; gap: 10px; min-width: 340px; flex: 1; max-width: 560px;
  background: rgba(7,10,18,.55); border: 1px solid var(--brand-line);
  border-radius: 26px; padding: 11px 18px; cursor: pointer;
  transition: all .18s;
}
.quick-ask:hover { box-shadow: 0 0 24px rgba(255,138,61,.25); border-color: var(--brand); }
.qa-icon { color: var(--brand); font-size: 17px; }
.quick-ask span { color: var(--tx-3); font-size: 13.5px; flex: 1; }
.qa-btn {
  background: var(--brand-grad); color: #241105; font-size: 12.5px; font-weight: 600;
  padding: 5px 14px; border-radius: 16px; flex: none;
}

/* ---- 统计卡 ---- */
.stat-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px; margin-bottom: 16px;
}
.stat-card {
  position: relative; overflow: hidden; cursor: pointer;
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; padding: 16px 18px;
  transition: all .18s cubic-bezier(.4,0,.2,1);
}
.stat-card:hover { border-color: var(--line-3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.stat-card::after {
  content: ""; position: absolute; right: -30px; top: -30px; width: 110px; height: 110px;
  border-radius: 50%; filter: blur(8px); pointer-events: none;
}
.stat-card.glow-oil::after  { background: rgba(255,138,61,.14); }
.stat-card.glow-gas::after  { background: rgba(34,211,238,.13); }
.stat-card.glow-chem::after { background: rgba(167,139,250,.13); }
.stat-card.glow-coal::after { background: rgba(232,179,60,.13); }
.s-label { font-size: 12.5px; color: var(--tx-3); display: flex; align-items: center; gap: 6px; }
.s-value {
  font-family: var(--font-num); font-size: 30px; font-weight: 700;
  line-height: 1.25; margin-top: 4px; letter-spacing: .5px;
}
.s-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; font-size: 12px; color: var(--tx-3); }
.s-more { color: var(--tx-4); transition: color .18s; }
.stat-card:hover .s-more { color: var(--brand); }

/* 行业标记点 */
.ind { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 8px; border-radius: 10px; border: 1px solid transparent; }
.ind i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ind.oil  { color: var(--oil);  background: var(--oil-soft);  border-color: rgba(255,138,61,.3); }
.ind.gas  { color: var(--gas);  background: var(--gas-soft);  border-color: rgba(34,211,238,.3); }
.ind.chem { color: var(--chem); background: var(--chem-soft); border-color: rgba(167,139,250,.3); }
.ind.coal { color: var(--coal); background: var(--coal-soft); border-color: rgba(232,179,60,.3); }

/* ---- 门户网格 ---- */
.portal-grid { display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }
.card-title .more { margin-left: auto; font-size: 12px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.card-title .more:hover { color: var(--brand); }
.tag-period {
  margin-left: auto; font-size: 11px; font-family: var(--font-num);
  padding: 2px 10px; border-radius: 8px;
  background: var(--brand-soft); color: var(--brand); border: 1px solid var(--brand-line);
}
.tag-brand {
  font-size: 10.5px; padding: 1px 8px; border-radius: 6px;
  background: var(--brand-soft); color: var(--brand); border: 1px solid var(--brand-line);
}

/* ---- 图表 ---- */
.chart { width: 100%; }
.chart.trend { height: 260px; }
.chart.donut { height: 170px; }

/* ---- 快捷入口（模板条） ---- */
.tpl-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tpl-card {
  position: relative; border-radius: 14px; overflow: hidden; cursor: pointer;
  border: 1px solid var(--line-1); height: 108px; padding: 14px;
  display: flex; flex-direction: column; justify-content: flex-end; gap: 2px;
  transition: all .18s;
}
.tpl-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.tpl-icon { position: absolute; top: 12px; left: 14px; font-size: 20px; }
.tpl-oil  { background: linear-gradient(160deg, rgba(255,138,61,.28), rgba(244,99,58,.05) 60%), radial-gradient(200px 90px at 80% 20%, rgba(255,178,94,.35), transparent); }
.tpl-oil .tpl-icon { color: var(--oil); }
.tpl-gas  { background: linear-gradient(160deg, rgba(34,211,238,.24), rgba(34,211,238,.04) 60%), radial-gradient(200px 90px at 80% 20%, rgba(34,211,238,.3), transparent); }
.tpl-gas .tpl-icon { color: var(--gas); }
.tpl-chem { background: linear-gradient(160deg, rgba(167,139,250,.24), rgba(167,139,250,.04) 60%), radial-gradient(200px 90px at 80% 20%, rgba(167,139,250,.3), transparent); }
.tpl-chem .tpl-icon { color: var(--chem); }
.tpl-coal { background: linear-gradient(160deg, rgba(232,179,60,.24), rgba(232,179,60,.04) 60%), radial-gradient(200px 90px at 80% 20%, rgba(232,179,60,.3), transparent); }
.tpl-coal .tpl-icon { color: var(--coal); }
.t-name { font-size: 14px; font-weight: 700; }
.t-sub { font-size: 11px; color: var(--tx-2); }

/* ---- 最近创建 ---- */
.fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.fav-item {
  display: flex; gap: 12px; align-items: center; padding: 12px 14px;
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: 14px;
  cursor: pointer; transition: all .18s;
}
.fav-item:hover { border-color: var(--brand-line); transform: translateY(-2px); }
.f-icon {
  width: 38px; height: 38px; border-radius: 10px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.f-icon.ic-oil  { color: var(--oil);  background: var(--oil-soft); }
.f-icon.ic-chem { color: var(--chem); background: var(--chem-soft); }
.f-name { font-size: 13px; font-weight: 600; }
.f-sub { font-size: 11px; color: var(--tx-3); }
.grow { flex: 1; min-width: 0; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---- 快捷操作 ---- */
.ops { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.op-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 0; font-size: 12.5px; font-family: inherit;
  background: var(--bg-glass); color: var(--tx-1);
  border: 1px solid var(--line-2); border-radius: 10px; cursor: pointer;
  transition: all .18s;
}
.op-btn:hover { background: var(--bg-glass-3); border-color: var(--brand-line); color: var(--brand); }
.op-btn .pi { font-size: 12px; }

/* ---- 行列表 ---- */
.row-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 10px; transition: background .18s; cursor: pointer;
}
.row-item:hover { background: var(--bg-glass-2); }
.row-star { color: var(--brand); width: 16px; display: flex; flex: none; }
.row-name { font-size: 13px; font-weight: 500; }
.row-sub { font-size: 12px; color: var(--tx-3); }
.row-arrow { color: var(--tx-4); font-size: 13px; }

/* ---- 空态 ---- */
.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 20px; color: var(--tx-3); gap: 10px; text-align: center; font-size: 12.5px;
}
.empty .pi { font-size: 26px; opacity: .5; }

/* ---- 响应式 ---- */
@media (max-width: 1200px) {
  .portal-grid { grid-template-columns: 1fr; }
  .tpl-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .home-page { padding: 14px 14px 60px; }
  .quick-ask { min-width: 0; }
  .tpl-strip { grid-template-columns: 1fr; }
}
</style>
