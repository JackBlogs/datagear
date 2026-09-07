<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/**
 * 移动端 H5 原型预览（1:1 对齐 prototypev2 mobile.html）：
 * 手机框五视图（首页/看板/问数/消息 + 看板详情第 5 视图）+ 底部 Tab 栏联动 +
 * 问数交互（clarify/答案+图表）+ 消息已读角标 + 体验二维码 + 发布轻应用。
 * 内容为演示数据（原型 canned 数据），后端 ai/订阅模块接入后替换。
 */
const { success, fail } = useOperationMessage()

type ViewKey = 'home' | 'board' | 'chat' | 'msg' | 'boardDetail' | 'mine'

/* ================= 视图切换 ================= */
const activeView = ref<ViewKey>('home')
let fromView: ViewKey = 'home'

const mTrendEl = ref<HTMLElement>()
const bd1El = ref<HTMLElement>()
const bd2El = ref<HTMLElement>()
const charts: Record<string, EChartsType | null> = { mTrend: null, bd1: null, bd2: null }

function makeChart(el: HTMLElement | undefined, option: EChartsCoreOption): EChartsType | null {
  if (!el) return null
  const c = init(el)
  c.setOption(option, true)
  return c
}

function switchView(v: ViewKey) {
  if (v === 'mine') {
    success('我的 · 个人中心属 Phase 2 能力，见 PRD 10.11 · FR-MOB-06')
    return
  }
  activeView.value = v
  setTimeout(() => window.dispatchEvent(new Event('resize')), 30)
}

/* ================= 首页 ================= */
const DBS = [
  { n: '华北油田生产日报', s: '看板 · 12 图表', c: '#FF8A3D', bg: 'rgba(255,138,61,.13)' },
  { n: '西气东输管网监控', s: '大屏 · 实时', c: '#22D3EE', bg: 'rgba(34,211,238,.12)' },
  { n: '煤矿安全监控', s: '看板 · 8 图表', c: '#E8B33C', bg: 'rgba(232,179,60,.13)' },
]

/* ================= 看板视图 ================= */
const BOARDS = [
  { n: '华北油田生产日报', s: '产量 / 含水 / 注采 · 更新 06:30', c: '#FF8A3D', bg: 'rgba(255,138,61,.13)' },
  { n: '集团经营驾驶舱', s: '四行业总览 · 决策层专享', c: '#FF8A3D', bg: 'rgba(255,138,61,.13)' },
  { n: '西气东输管网监控', s: '管输 / 门站 / 储气库 · 实时', c: '#22D3EE', bg: 'rgba(34,211,238,.12)' },
  { n: '煤化工经营分析', s: '烯烃 / 甲醇产销存', c: '#A78BFA', bg: 'rgba(167,139,250,.13)' },
  { n: '煤矿安全监控', s: '瓦斯 / 顶板 / 人员定位', c: '#E8B33C', bg: 'rgba(232,179,60,.13)' },
]

/* ================= 看板详情（第 5 视图） ================= */
const bdName = ref('看板详情')
function openBoardDetail(name: string, from: ViewKey) {
  fromView = from
  bdName.value = name
  switchView('boardDetail')
}
function backFromDetail() {
  switchView(fromView === 'boardDetail' ? 'home' : fromView)
}

/* ================= 消息 ================= */
interface Msg {
  c: string; bg: string; icon: string; t: string; s: string; unread: boolean; deep?: boolean
}
const msgs = ref<Msg[]>([
  { c: '#F87171', bg: 'rgba(248,113,113,.13)', icon: 'bell', t: '【告警】长庆区块日产油量低于 100 万吨阈值', s: '08:12 · 深链直达归因看板 ›', unread: true, deep: true },
  { c: '#FBBF24', bg: 'rgba(251,191,36,.13)', icon: 'clock', t: '【订阅】经营日报已推送，点击查看', s: '08:00 · 企业微信同步', unread: true },
  { c: '#60A5FA', bg: 'rgba(96,165,250,.13)', icon: 'shield', t: '【审批】您的「井口含水率」指标权限已通过', s: '昨天 17:42', unread: true },
  { c: '#34D399', bg: 'rgba(52,211,153,.13)', icon: 'govern', t: '【质量】ODS_采油日报表校验通过 98.6%', s: '昨天 22:00', unread: false },
])
const unreadCount = computed(() => msgs.value.filter((m) => m.unread).length)

function onMsgClick(m: Msg) {
  if (m.unread) {
    m.unread = false
  }
  if (m.deep) openBoardDetail('长庆区块归因看板', 'msg')
}

/* ================= 问数 ================= */
interface ChatBubble { role: 'q' | 'a'; text: string; loading?: boolean; chart?: { title: string; dims: string[]; values: number[] }; clarify?: string[] }
const chatBubbles = ref<ChatBubble[]>([
  { role: 'q', text: '上月各采油厂原油产量排名？' },
  { role: 'a', text: '已按语义指标「原油产量 M-OIL-001」查询 2026-08 各采油厂产量，长庆油田以 39.12 万吨 居首，华北油田 28.94 万吨列第三。结果已按您的行级权限过滤。', chart: { title: '各采油厂产量（万吨）', dims: ['长庆', '塔里木', '华北', '大庆'], values: [39.12, 27.35, 28.94, 23.86] } },
])
const chatInput = ref('')

const CANNED: { match: RegExp; answer: ChatBubble & { chart: NonNullable<ChatBubble['chart']> } }[] = [
  {
    match: /同比|产量|采油厂|排名/,
    answer: {
      role: 'a',
      text: '上月（2026年8月）全集团原油产量 385.2 万吨，同比 +5.1%。其中长庆采油厂增幅最大（+12.3%，+10.4 万吨），主要来自安塞区块新井投产；大庆采油厂同比 -1.8%，受老区自然递减影响。',
      chart: { title: '各采油厂原油产量（万吨）', dims: ['长庆', '塔里木', '华北', '大庆'], values: [39.12, 27.35, 28.94, 23.86] },
    },
  },
  {
    match: /瓦斯|超限|煤矿|安全/,
    answer: {
      role: 'a',
      text: '昨日全集团瓦斯超限 2 次，同比 -33.3%。超限集中在大同矿区 3# 工作面（峰值 1.24%，持续 4 分钟）与神东矿区 12# 工作面（峰值 1.08%）。均已按预案停产撤人，复测恢复正常。',
      chart: { title: '瓦斯超限次数', dims: ['大同', '神东', '晋城'], values: [1, 1, 0] },
    },
  },
  {
    match: /甲醇|开工率|化工|装置/,
    answer: {
      role: 'a',
      text: '近 6 个月甲醇装置开工率均值 91.2%，8 月达 93.5%（环比 +1.4pct）。其中煤制甲醇装置开工率 95.1%，天然气制装置 88.6%。',
      chart: { title: '甲醇装置开工率（%）', dims: ['6月', '7月', '8月'], values: [92.4, 87.2, 93.5] },
    },
  },
]
const CLARIFY = ['查「原油产量」月度同比', '查「瓦斯超限次数」排名', '查「甲醇装置开工率」趋势']

async function sendChat() {
  const q = chatInput.value.trim()
  if (!q) {
    fail('请输入问题')
    return
  }
  chatInput.value = ''
  chatBubbles.value.push({ role: 'q', text: q })
  const loadingBubble: ChatBubble = { role: 'a', text: '正在按语义层口径查询…', loading: true }
  chatBubbles.value.push(loadingBubble)
  await scrollChatBottom()
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))

  const hit = CANNED.find((c) => c.match.test(q))
  const idx = chatBubbles.value.indexOf(loadingBubble)
  if (hit) {
    chatBubbles.value[idx] = { role: 'a', text: hit.answer.text }
    chatBubbles.value.push({ role: 'a', text: '', chart: hit.answer.chart })
  } else {
    chatBubbles.value[idx] = { role: 'a', text: '这个问题我没有十足把握，为避免取错数，请确认您的意图：', clarify: CLARIFY }
  }
  await scrollChatBottom()
  renderDynChart()
}

function onClarify(option: string) {
  chatInput.value = option
  sendChat()
}

async function scrollChatBottom() {
  await nextTick()
  const box = document.querySelector('.p-screen .p-view.show#chatView')
  ;(box || document.querySelector('#chatView'))?.scrollTo?.(0, 99999)
}

/* ================= 动态答图 ================= */
function renderDynChart() {
  nextTick(() => {
    requestAnimationFrame(() => {
      chatBubbles.value.forEach((b) => {
        if (!b.chart) return
        const host = document.querySelector(`#chatView .dyn-chart[data-t="${b.chart.title}"]`) as HTMLElement | null
        if (!host || host.querySelector('canvas')) return
        makeChart(host, barOption(b.chart.dims, b.chart.values))
      })
      const box = document.querySelector('#chatView .chat-box')
      box?.scrollTo?.(0, box.scrollHeight)
    })
  })
}

/* ================= 图表 option 工厂 ================= */
function trendOption(series: { name: string; data: number[] }[], single = false): EChartsCoreOption {
  return {
    grid: { left: 2, right: 6, top: single ? 8 : 22, bottom: 2, containLabel: true },
    legend: single ? undefined : { data: series.map((s) => s.name), textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['一', '二', '三', '四', '五', '六', '日'], axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: s.data,
      lineStyle: { width: 2, color: i === 0 ? '#FF8A3D' : '#22D3EE' },
      areaStyle: i === 0
        ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,138,61,.3)' }, { offset: 1, color: 'rgba(255,138,61,0)' }] } }
        : undefined,
    })),
  }
}
function barOption(dims: string[], values: number[]): EChartsCoreOption {
  return {
    grid: { left: 2, right: 24, top: 8, bottom: 2, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    yAxis: { type: 'category', data: [...dims].reverse(), axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar',
      barWidth: 12,
      data: [...values].reverse(),
      itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#F4633A' }, { offset: 1, color: '#FFB25E' }] } },
      label: { show: true, position: 'right', color: '#B9C2D4', fontSize: 9.5 },
    }],
  }
}

/* ================= 特性清单 ================= */
const FEATS = [
  { icon: '📱', c: '#FF8A3D', bg: 'rgba(255,138,61,.13)', n: '底部 Tab 五入口', d: '首页 / 看板 / 问数 / 消息 / 我的，消息角标实时提醒', tag: '信息架构' },
  { icon: '🎯', c: '#22D3EE', bg: 'rgba(34,211,238,.12)', n: '手势交互', d: '点按钻取 · 双指缩放图表 · 滑动翻页 · 长按看明细 · 下拉刷新', tag: '交互' },
  { icon: '🔗', c: '#60A5FA', bg: 'rgba(96,165,250,.13)', n: '社交分享', d: '看板 / 指标一键分享至微信、企业微信、钉钉，支持二维码', tag: '协同' },
  { icon: '🔔', c: '#F87171', bg: 'rgba(248,113,113,.13)', n: '推送通知', d: '告警与订阅推送深链直达对应页面，免二次查找', tag: '触达' },
  { icon: '⏱', c: '#FBBF24', bg: 'rgba(251,191,36,.13)', n: '离线缓存', d: '弱网环境展示缓存数据，标注「数据更新于 06:30」', tag: '可用性' },
  { icon: '📋', c: '#34D399', bg: 'rgba(52,211,153,.13)', n: '移动填报', d: '扫码录入 · 拍照上传 · 分步表单 · 草稿箱，适配井场巡检', tag: '采集' },
  { icon: '🛡', c: '#A78BFA', bg: 'rgba(167,139,250,.13)', n: '安全防护', d: '动态水印（用户+时间）· 设备绑定 · 异常登录检测', tag: '安全' },
  { icon: '⚡', c: '#60A5FA', bg: 'rgba(96,165,250,.13)', n: '轻应用接入', d: '微信 / 企微 / 钉钉工作台免登，租户级 SSO', tag: '生态' },
]

/* ================= 体验二维码 ================= */
const qrOpen = ref(false)
const QR_N = 21
const qrCells = computed(() => {
  const cells: boolean[] = []
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= QR_N - 7 && y < 7) || (x < 7 && y >= QR_N - 7)
  const core = (ox: number, oy: number) =>
    (x: number, y: number) =>
      x === ox || x === ox + 6 || y === oy || y === oy + 6 || (x >= ox + 2 && x <= ox + 4 && y >= oy + 2 && y <= oy + 4)
  for (let y = 0; y < QR_N; y++) {
    for (let x = 0; x < QR_N; x++) {
      const dark = finder(x, y)
        ? core(0, 0)(x, y) || core(QR_N - 7, 0)(x, y) || core(0, QR_N - 7)(x, y)
        : (x * 7 + y * 13 + x * y) % 3 !== 0
      cells.push(dark)
    }
  }
  return cells
})

/* ================= 发布轻应用 ================= */
const pubOpen = ref(false)
const pubForm = ref({ platform: '企业微信', name: '能源BI 移动工作台' })
function submitPub() {
  if (!pubForm.value.name.trim()) {
    fail('请填写应用名称')
    return
  }
  pubOpen.value = false
  success(`已提交「${pubForm.value.name}」至${pubForm.value.platform}工作台审核（免登配置自动生效）`)
}

/* ================= 初始化 ================= */
onMounted(() => {
  nextTick(() => {
    charts.mTrend = makeChart(mTrendEl.value, trendOption([
      { name: '原油', data: [12.4, 12.5, 12.6, 12.3, 12.8, 12.75, 12.86] },
      { name: '天然气', data: [4.1, 4.2, 4.25, 4.15, 4.3, 4.28, 4.32] },
    ]))
  })
})

watch(activeView, (v) => {
  nextTick(() => requestAnimationFrame(() => {
    if (v === 'chat') renderDynChart()
    if (v === 'boardDetail' && !charts.bd1) {
      charts.bd1 = makeChart(bd1El.value, trendOption([{ name: '原油产量', data: [12.4, 12.6, 12.7, 12.5, 12.9, 12.8, 12.86] }], true))
      charts.bd2 = makeChart(bd2El.value, barOption(['长庆', '塔里木', '华北', '大庆'], [39.12, 27.35, 28.94, 23.86]))
    }
    Object.values(charts).forEach((c) => c?.resize())
  }))
})

function onResize() {
  Object.values(charts).forEach((c) => c?.resize())
}
window.addEventListener('resize', onResize)
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  Object.values(charts).forEach((c) => c?.dispose())
})
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">移动端 H5 原型预览</div>
        <div class="page-desc">H5 深化策略 · 不做原生 App：一套 H5 嵌入微信 / 企微 / 钉钉轻应用（PRD 10.11）</div>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="qrOpen = true">体验二维码</button>
        <button class="btn primary" type="button" @click="pubOpen = true">发布轻应用</button>
      </div>
    </div>

    <!-- 双栏：手机框 + 特性清单 -->
    <div class="m-layout">
      <!-- 左：手机框 -->
      <div class="phone-stage">
        <div class="seg-row">
          <span class="seg-item" :class="{ active: activeView === 'home' }" @click="switchView('home')">首页</span>
          <span class="seg-item" :class="{ active: activeView === 'board' || activeView === 'boardDetail' }" @click="switchView('board')">看板</span>
          <span class="seg-item" :class="{ active: activeView === 'chat' }" @click="switchView('chat')">问数</span>
          <span class="seg-item" :class="{ active: activeView === 'msg' }" @click="switchView('msg')">消息</span>
        </div>

        <div class="phone-scale">
          <div class="phone">
            <div class="notch"></div>
            <div class="p-status">
              <span>08:41</span>
              <span class="s-ico">●▐</span>
            </div>
            <div class="p-screen">
              <!-- 首页视图 -->
              <div class="p-view" :class="{ show: activeView === 'home' }" data-view="home">
                <div class="p-greet">
                  <div>
                    <div class="g-hi">早上好，李明</div>
                    <div class="g-sub">华北油田 · 数据更新于 06:30</div>
                  </div>
                  <div class="g-ava">李</div>
                </div>
                <div class="p-search" @click="switchView('chat')">🔍 搜索看板 / 指标，或向 AI 提问…</div>
                <div class="p-kpis">
                  <div class="p-kpi" style="--k-glow: rgba(255, 138, 61, 0.16)">
                    <div class="k-l"><span class="ind-tag" style="--c: #FF8A3D; font-size: 9.5px">石油</span> 原油产量</div>
                    <div class="k-v">12.86<small> 万吨</small></div>
                    <div class="k-t" style="color: #34d399">▲ 2.4% 日环比</div>
                  </div>
                  <div class="p-kpi" style="--k-glow: rgba(34, 211, 238, 0.15)">
                    <div class="k-l"><span class="ind-tag" style="--c: #22D3EE; font-size: 9.5px">天然气</span> 天然气产量</div>
                    <div class="k-v">4.32<small> 亿方</small></div>
                    <div class="k-t" style="color: #34d399">▲ 1.8% 日环比</div>
                  </div>
                </div>
                <div class="p-card">
                  <div class="pc-title">近 7 日产量趋势 <span class="more">详情 ›</span></div>
                  <div ref="mTrendEl" style="height: 130px; min-height: 130px"></div>
                </div>
                <div class="p-card">
                  <div class="pc-title">我的看板 <span class="more" @click="switchView('board')">全部 ›</span></div>
                  <div
                    v-for="d in DBS"
                    :key="d.n"
                    class="p-db-item"
                    @click="openBoardDetail(d.n, 'home')"
                  >
                    <span class="d-ico" :style="{ color: d.c, background: d.bg }">▦</span>
                    <div style="flex: 1; min-width: 0">
                      <div class="d-n">{{ d.n }}</div>
                      <div class="d-s">{{ d.s }}</div>
                    </div>
                    <span style="color: var(--tx-4)">→</span>
                  </div>
                </div>
              </div>

              <!-- 看板视图 -->
              <div class="p-view" :class="{ show: activeView === 'board' }" data-view="board">
                <div class="p-search">🔍 搜索看板…</div>
                <div
                  v-for="b in BOARDS"
                  :key="b.n"
                  class="p-card board-row"
                  @click="openBoardDetail(b.n, 'board')"
                >
                  <span class="d-ico-lg" :style="{ color: b.c, background: b.bg }">▦</span>
                  <div style="flex: 1; min-width: 0">
                    <div class="d-n-lg">{{ b.n }}</div>
                    <div class="d-s-sm">{{ b.s }}</div>
                  </div>
                  <span class="mini-tag">打开</span>
                </div>
              </div>

              <!-- 看板详情视图（第 5 视图） -->
              <div class="p-view" :class="{ show: activeView === 'boardDetail' }" data-view="boardDetail">
                <div class="p-backbar">
                  <span class="bk" @click="backFromDetail">← 返回</span>
                  <span class="ellipsis">{{ bdName }}</span>
                </div>
                <div class="p-kpis">
                  <div class="p-kpi" style="--k-glow: rgba(255, 138, 61, 0.16)">
                    <div class="k-l">原油产量 · 昨日</div>
                    <div class="k-v">12.86<small> 万吨</small></div>
                    <div class="k-t" style="color: #34d399">▲ 2.4% 日环比</div>
                  </div>
                  <div class="p-kpi" style="--k-glow: rgba(232, 179, 60, 0.15)">
                    <div class="k-l">综合含水率</div>
                    <div class="k-v">87.4<small> %</small></div>
                    <div class="k-t" style="color: #fbbf24">▲ 0.6pct 同比</div>
                  </div>
                </div>
                <div class="p-card">
                  <div class="pc-title">近 7 日产量趋势</div>
                  <div ref="bd1El" style="height: 130px; min-height: 130px"></div>
                </div>
                <div class="p-card">
                  <div class="pc-title">各采油厂产量（万吨）</div>
                  <div ref="bd2El" style="height: 150px; min-height: 150px"></div>
                </div>
              </div>

              <!-- 问数视图 -->
              <div id="chatView" class="p-view chat-view" :class="{ show: activeView === 'chat' }" data-view="chat">
                <div class="chat-box">
                  <template v-for="b in chatBubbles" :key="i">
                    <div v-if="b.role === 'q'" class="p-chat-q"><div class="q-b">{{ b.text }}</div></div>
                    <div v-else class="p-chat-a">
                      <span class="a-ava">⚡</span>
                      <div class="a-b">
                        <span v-if="b.loading" class="spin-dot">◌</span>
                        <template v-if="!b.clarify">{{ b.text }}</template>
                        <template v-else>
                          {{ b.text }}
                          <div v-for="o in b.clarify" :key="o" style="margin-top: 6px">
                            <span class="clarify-tag" @click="onClarify(o)">{{ o }}</span>
                          </div>
                        </template>
                      </div>
                    </div>
                    <div v-if="b.chart" class="p-card">
                      <div class="pc-title">{{ b.chart.title }}</div>
                      <div class="dyn-chart" :data-t="b.chart.title" style="height: 150px; min-height: 150px"></div>
                    </div>
                  </template>
                </div>
                <div class="p-input">
                  <input
                    v-model="chatInput"
                    class="in"
                    placeholder="继续提问，如「同比去年如何？」"
                    @keydown.enter="sendChat"
                  />
                  <div class="send" @click="sendChat">➤</div>
                </div>
              </div>

              <!-- 消息视图 -->
              <div class="p-view" :class="{ show: activeView === 'msg' }" data-view="msg">
                <div
                  v-for="m in msgs"
                  :key="m.t"
                  class="p-msg"
                  :class="{ read: !m.unread }"
                  @click="onMsgClick(m)"
                >
                  <span class="m-ico" :style="{ color: m.c, background: m.bg }">{{ m.icon }}</span>
                  <div style="flex: 1; min-width: 0">
                    <div class="m-t"><span v-if="m.unread" class="udot"></span>{{ m.t }}</div>
                    <div class="m-s">{{ m.s }}</div>
                  </div>
                </div>
              </div>

              <!-- 底部 Tab 栏 -->
              <div class="p-tabbar">
                <div class="p-tab" :class="{ active: activeView === 'home' }" @click="switchView('home')">🏠<span>首页</span></div>
                <div class="p-tab" :class="{ active: activeView === 'board' || activeView === 'boardDetail' }" @click="switchView('board')">▦<span>看板</span></div>
                <div class="p-tab" :class="{ active: activeView === 'chat' }" @click="switchView('chat')">💬<span>问数</span></div>
                <div class="p-tab" :class="{ active: activeView === 'msg' }" @click="switchView('msg')">
                  🔔<span>消息</span><span v-if="unreadCount" class="badge">{{ unreadCount }}</span>
                </div>
                <div class="p-tab" @click="switchView('mine')">👤<span>我的</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：特性清单 -->
      <div class="flex-col" style="gap: 14px">
        <div class="h5-bar">
          📱 <span><b>H5 深化策略</b>：不开发原生 App，一套 H5 适配微信 / 企业微信 / 钉钉轻应用免登接入，降低维护成本。</span>
        </div>
        <div class="card">
          <div class="card-title"><i class="bar"></i>移动端特性清单（PRD 6.5）</div>
          <div
            v-for="f in FEATS"
            :key="f.n"
            class="feat-item"
          >
            <span class="f-ico" :style="{ color: f.c, background: f.bg }">{{ f.icon }}</span>
            <div class="grow">
              <div class="f-n">{{ f.n }}<span class="tag" style="font-size: 10px">{{ f.tag }}</span></div>
              <div class="f-d">{{ f.d }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 体验二维码 modal -->
    <Teleport to="body">
      <div v-if="qrOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="qrOpen = false">
        <div class="modal" style="width: 380px" @click.stop>
          <div class="drawer-head">
            <div class="drawer-title">扫码体验移动端 H5</div>
            <button class="btn sm ghost" type="button" @click="qrOpen = false">✕</button>
          </div>
          <div class="drawer-body">
            <div class="qr-box">
              <i v-for="(dark, i) in qrCells" :key="i" :class="{ w: !dark }"></i>
            </div>
            <div style="text-align: center; font-size: 12.5px; color: var(--tx-2)">微信 / 企业微信扫码体验 H5 移动端</div>
            <div style="text-align: center" class="sm tx-3">演示环境地址：m.datagear.demo/energy · 免登 token 15 分钟有效</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 发布轻应用 modal -->
    <Teleport to="body">
      <div v-if="pubOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="pubOpen = false">
        <div class="modal" style="width: 480px" @click.stop>
          <div class="drawer-head">
            <div class="drawer-title">发布轻应用</div>
            <button class="btn sm ghost" type="button" @click="pubOpen = false">✕</button>
          </div>
          <div class="drawer-body">
            <div class="form-item">
              <label class="form-label">目标平台</label>
              <select v-model="pubForm.platform" class="input">
                <option>企业微信</option><option>微信小程序</option><option>钉钉</option>
              </select>
            </div>
            <div class="form-item">
              <label class="form-label">应用名称 *</label>
              <input v-model="pubForm.name" class="input" placeholder="能源BI 移动工作台" />
            </div>
            <div class="flex" style="gap: 10px; margin-top: 14px">
              <button class="btn primary grow" type="button" @click="submitPub">提交发布</button>
              <button class="btn" type="button" @click="pubOpen = false">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ---- 双栏 ---- */
.m-layout { display: grid; grid-template-columns: 6fr 4fr; gap: 20px; align-items: start; }
.flex-col { display: flex; flex-direction: column; gap: 14px; }
.grow { flex: 1; min-width: 0; }

/* ---- 手机框 ---- */
.phone-stage { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 16px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.phone-scale { height: 712px; }
.phone {
  width: 375px; height: 812px; border-radius: 44px; overflow: hidden; position: relative;
  border: 3px solid #2a3550; background: #070a12;
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.04), 0 30px 80px rgba(0, 0, 0, 0.6);
  transform: scale(0.86); transform-origin: top center;
}
.phone .notch {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 122px; height: 26px; background: #000; border-radius: 14px; z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.phone .p-status {
  position: absolute; top: 0; left: 0; right: 0; height: 44px; z-index: 9;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 26px 0 30px; font-size: 11.5px; font-family: var(--font-num); color: var(--tx-1);
}
.p-screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; }
.p-view { flex: 1; overflow-y: auto; padding: 10px 14px 8px; display: none; }
.p-view.show { display: block; }
.p-view::-webkit-scrollbar { display: none; }
.p-view.chat-view { display: none; flex-direction: column; }
.p-view.chat-view.show { display: flex; }
.chat-box { flex: 1; overflow-y: auto; }

/* 首页 */
.p-greet { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.p-greet .g-hi { font-size: 16px; font-weight: 700; }
.p-greet .g-sub { font-size: 10.5px; color: var(--tx-3); }
.p-greet .g-ava {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #22d3ee, #0e7490);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #04262c;
}
.p-search {
  display: flex; align-items: center; gap: 7px; padding: 8px 12px; margin-bottom: 12px;
  background: var(--bg-glass-2); border: 1px solid var(--line-1); border-radius: 16px;
  color: var(--tx-4); font-size: 11.5px; cursor: pointer;
}
.p-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
.p-kpi {
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: 14px; padding: 11px 12px;
  position: relative; overflow: hidden;
}
.p-kpi::after {
  content: ''; position: absolute; right: -18px; top: -18px; width: 62px; height: 62px; border-radius: 50%;
  background: var(--k-glow, rgba(255, 138, 61, 0.14)); filter: blur(6px);
}
.p-kpi .k-l { font-size: 10.5px; color: var(--tx-3); }
.p-kpi .k-v { font-family: var(--font-num); font-size: 21px; font-weight: 700; margin-top: 2px; }
.p-kpi .k-v small { font-size: 10px; color: var(--tx-3); font-weight: 400; }
.p-kpi .k-t { font-size: 10px; font-family: var(--font-num); margin-top: 2px; }
.p-card { background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: 14px; padding: 12px; margin-bottom: 12px; }
.p-card .pc-title { font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.p-card .pc-title .more { font-size: 10.5px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.p-db-item { display: flex; align-items: center; gap: 9px; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer; }
.p-db-item:last-child { border-bottom: none; }
.p-db-item .d-ico { width: 30px; height: 30px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 13px; }
.p-db-item .d-n { font-size: 12px; font-weight: 600; }
.p-db-item .d-s { font-size: 10px; color: var(--tx-3); }
.d-ico-lg { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.d-n-lg { font-size: 12.5px; font-weight: 600; }
.d-s-sm { font-size: 10px; color: var(--tx-3); }
.mini-tag {
  font-size: 9.5px; padding: 2px 8px; border-radius: 7px;
  background: rgba(255, 138, 61, 0.14); color: var(--brand); border: 1px solid var(--brand-line);
}
.ind-tag {
  font-size: 9.5px; padding: 0 5px; border-radius: 6px; color: var(--c); white-space: nowrap;
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
}

/* 看板详情 */
.p-backbar { display: flex; align-items: center; gap: 8px; padding: 4px 0 10px; font-size: 13px; font-weight: 600; }
.p-backbar .bk { display: inline-flex; align-items: center; gap: 4px; color: var(--tx-3); cursor: pointer; font-size: 11px; font-weight: 400; }

/* 问数 */
.p-chat-q { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.p-chat-q .q-b {
  background: linear-gradient(135deg, #ffb25e, #f4633a); color: #241105; font-size: 12px; font-weight: 600;
  padding: 8px 12px; border-radius: 14px 14px 4px 14px; max-width: 82%;
}
.p-chat-a { display: flex; gap: 8px; margin-bottom: 12px; }
.p-chat-a .a-ava {
  width: 26px; height: 26px; border-radius: 8px; background: var(--brand-soft); color: var(--brand);
  display: flex; align-items: center; justify-content: center; flex: none; font-size: 12px;
}
.p-chat-a .a-b {
  background: var(--bg-glass-2); border: 1px solid var(--line-1); font-size: 11.5px; color: var(--tx-2);
  padding: 9px 11px; border-radius: 4px 14px 14px 14px; max-width: 86%; line-height: 1.6;
}
.clarify-tag {
  display: inline-block; font-size: 10.5px; padding: 2px 9px; border-radius: 7px;
  background: var(--brand-soft); color: var(--brand); border: 1px solid var(--brand-line); cursor: pointer;
}
.spin-dot { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.p-input { display: flex; gap: 8px; margin-top: 4px; }
.p-input .in {
  flex: 1; background: var(--bg-glass-2); border: 1px solid var(--line-1); border-radius: 16px;
  padding: 8px 12px; font-size: 11.5px; color: var(--tx-1); outline: none; font-family: inherit;
}
.p-input .in::placeholder { color: var(--tx-4); }
.p-input .send {
  width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ffb25e, #f4633a);
  display: flex; align-items: center; justify-content: center; color: #241105; flex: none; cursor: pointer;
}

/* 消息 */
.p-msg { display: flex; gap: 10px; padding: 11px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer; }
.p-msg .m-ico { width: 32px; height: 32px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.p-msg .m-t { font-size: 12px; font-weight: 600; color: var(--tx-1); display: flex; align-items: center; gap: 6px; }
.p-msg .m-t .udot { width: 7px; height: 7px; border-radius: 50%; background: var(--danger); flex: none; }
.p-msg.read .m-t { color: var(--tx-3); font-weight: 400; }
.p-msg .m-s { font-size: 10.5px; color: var(--tx-3); margin-top: 1px; }

/* 底部 Tab 栏 */
.p-tabbar {
  flex: none; height: 62px; border-top: 1px solid var(--line-1);
  background: rgba(13, 20, 32, 0.92); display: flex; padding-bottom: 8px;
}
.p-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; font-size: 9.5px; color: var(--tx-4); cursor: pointer; position: relative;
}
.p-tab.active { color: var(--brand); }
.p-tab .badge {
  position: absolute; top: 5px; right: calc(50% - 17px); background: var(--danger);
  color: #fff; font-size: 8px; border-radius: 7px; padding: 0 4px; font-family: var(--font-num);
}

/* 特性清单 */
.feat-item { display: flex; gap: 12px; padding: 11px 2px; border-bottom: 1px solid rgba(255, 255, 255, 0.045); }
.feat-item:last-child { border-bottom: none; }
.feat-item .f-ico { width: 34px; height: 34px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.feat-item .f-n { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.feat-item .f-d { font-size: 11.5px; color: var(--tx-3); margin-top: 2px; line-height: 1.6; }
.h5-bar {
  display: flex; align-items: center; gap: 10px; padding: 11px 16px; margin-bottom: 14px;
  background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: var(--r-m);
  font-size: 12.5px; color: var(--tx-2);
}
.h5-bar b { color: var(--brand); }

/* 二维码 */
.qr-box { display: grid; gap: 1px; width: 190px; height: 190px; margin: 10px auto; padding: 10px; background: #fff; border-radius: 10px; }
.qr-box i { background: #111a2a; border-radius: 1px; }
.qr-box i.w { background: #fff; }

/* 弹窗（复用全局 drawer-mask 体系） */
.modal { width: 600px; max-width: 94vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.grow { flex: 1; min-width: 0; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm { font-size: 11.5px; }
.tx-3 { color: var(--tx-3); }
@media (max-width: 1100px) { .m-layout { grid-template-columns: 1fr; } }
</style>
