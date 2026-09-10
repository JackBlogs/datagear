<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { dashboardPagingQueryData, type DashboardListItem } from '@/api/dashboard'
import {
  aiSessionList,
  aiSessionCreate,
  aiChatAsk,
  aiChatClarify,
  aiInsightAttribute,
  type AiSessionItem,
  type LiveAnswer,
  type LiveChartSpec,
  type LiveExplain,
  type AttrRow,
} from '@/api/chatbi'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/**
 * 智能问数 ChatBI（1:1 对齐 prototypev2 chatbi.html + PRD 10.8 / FR-AI-01~10）：
 * 三栏工作台 —— 会话历史 / 对话主区（结论+图表+数据表+归因+操作行+追问）/ 取数逻辑透明化五步面板。
 * 后端 datagear-ai 模块（Text2DSL 通道 A）接入后，将 mock 交互层替换为 /ai/chat/* 真实 API。
 */
const { success, fail } = useOperationMessage()

/* ================= 罐装答案（对齐 mock-api canned） ================= */
interface Canned {
  metric: string; title: string; conclusion: string
  dims: string[]; values: number[]; lastYear: number[]; yoy: string[]; drivers: string[]
  dsl: Record<string, unknown>; sql: string
  followup: { q: string; a: string }
  attribution: { dim: string; pct: number }[]
}
const CANNED: Record<'oil' | 'coal' | 'chem', Canned> = {
  oil: {
    metric: 'M-OIL-001',
    title: '原油产量月度同比',
    conclusion:
      '上月（2026年8月）全集团原油产量 <b>385.2 万吨</b>，同比 <b style="color:var(--ok)">+5.1%</b>。其中<b>长庆采油厂</b>增幅最大（+12.3%，+10.4 万吨），主要来自安塞区块新井投产；大庆采油厂同比 -1.8%，受老区自然递减影响。',
    dims: ['长庆采油厂', '大庆采油厂', '塔里木采油厂', '胜利采油厂', '华北采油厂'],
    values: [94.8, 88.6, 71.5, 68.2, 62.1],
    lastYear: [84.4, 90.2, 67.9, 66.5, 58.8],
    yoy: ['+12.3%', '-1.8%', '+5.3%', '+2.6%', '+5.6%'],
    drivers: ['安塞·靖安', '老区递减', '轮南·哈得', '孤岛·孤东', '任丘·霸州'],
    dsl: { metric: 'M-OIL-001', dimensions: ['plant'], time_range: { type: 'last_month', granularity: 'month' }, compare: 'yoy', filters: { well_status: '生产井' } },
    sql: "SELECT plant_name,\n  SUM(commercial_qty) AS qty\nFROM ods_fact_oil_daily\nWHERE dt BETWEEN ${pc(month_start)}\n  AND ${pc(month_end)}   -- 行级权限注入：AND org_id IN ('HB01')\nGROUP BY plant_name\nORDER BY qty DESC",
    followup: {
      q: '长庆为什么涨这么多？',
      a: '长庆采油厂同比 +12.3%（+10.4 万吨）主要由三方面驱动：① 安塞区块 23 口新井 7 月下旬投产，贡献 +6.8 万吨（65%）；② 靖安区块措施井（压裂改造 12 口）增产 +2.4 万吨（23%）；③ 去年同期检修低基数 +1.2 万吨（12%）。',
    },
    attribution: [
      { dim: '区块', pct: 62 }, { dim: '油藏类型', pct: 23 }, { dim: '井别', pct: 11 }, { dim: '其他', pct: 4 },
    ],
  },
  coal: {
    metric: 'M-COAL-003',
    title: '瓦斯超限次数排名',
    conclusion:
      '昨日全集团瓦斯超限 <b>2 次</b>，同比 <b style="color:var(--ok)">-33.3%</b>。超限集中在<b>大同矿区 3# 工作面</b>（1 次，峰值 1.24%，持续 4 分钟）与<b>神东矿区 12# 工作面</b>（1 次，峰值 1.08%）。均已按预案停产撤人，复测恢复正常。',
    dims: ['大同矿区', '神东矿区', '晋城矿区', '两淮矿区', '兖州矿区'],
    values: [1, 1, 0, 0, 0],
    lastYear: [2, 1, 1, 0, 0],
    yoy: ['-50%', '0%', '-100%', '—', '—'],
    drivers: ['3#工作面', '12#工作面', '—', '—', '—'],
    dsl: { metric: 'M-COAL-003', dimensions: ['mine', 'working_face'], time_range: { type: 'yesterday', granularity: 'day' }, compare: 'yoy', order: [{ field: 'cnt', dir: 'desc' }] },
    sql: "SELECT mine_name, working_face,\n  COUNT(DISTINCT alarm_id) AS cnt\nFROM ods_gas_monitor\nWHERE dt = ${pc(date)}\n  AND gas_conc > 1.0\nGROUP BY mine_name, working_face\nORDER BY cnt DESC",
    followup: { q: '瓦斯超限趋势如何？', a: '近一周瓦斯超限呈下降趋势：周一 3 起降至昨日 2 起，主要得益于 3# 工作面通风系统改造完成；预计本周维持 2 次以内（置信度 78%）。' },
    attribution: [
      { dim: '工作面', pct: 78 }, { dim: '班次', pct: 14 }, { dim: '通风方式', pct: 8 },
    ],
  },
  chem: {
    metric: 'M-CHEM-001',
    title: '甲醇装置开工率趋势',
    conclusion:
      '近 6 个月甲醇装置开工率均值 <b>91.2%</b>，8 月达 <b>93.5%</b>（环比 +1.4pct）。其中煤制甲醇装置开工率 95.1%，天然气制装置 88.6%。7 月天然气制装置检修导致当月下探 87.2%。',
    dims: ['3月', '4月', '5月', '6月', '7月', '8月'],
    values: [89.5, 90.2, 91.8, 92.4, 87.2, 93.5],
    lastYear: [86.1, 87.0, 88.5, 89.2, 85.4, 90.1],
    yoy: ['+3.4', '+3.2', '+3.3', '+3.2', '+1.8', '+3.4'],
    drivers: ['煤制装置', '气制装置', '检修影响', '—', '—'],
    dsl: { metric: 'M-CHEM-001', dimensions: ['month'], time_range: { type: 'recent_months', value: 6 }, compare: 'none', filters: { product: '甲醇' } },
    sql: "SELECT month,\n  AVG(run_rate) AS rate\nFROM ods_chem_device_daily\nWHERE month >= ${pc(month_from)}\n  AND product = '甲醇'\nGROUP BY month ORDER BY month",
    followup: { q: '开工率为什么 7 月下探？', a: '7 月开工率下探至 87.2% 主要因天然气制装置年度检修（计划内，持续 18 天），影响约 4.2pct；8 月检修结束叠加需求旺季回升至 93.5%。' },
    attribution: [
      { dim: '原料路线', pct: 55 }, { dim: '检修计划', pct: 32 }, { dim: '负荷调整', pct: 13 },
    ],
  },
}

/* ================= 会话消息模型 ================= */
interface ChatMsg {
  id: number
  role: 'user' | 'ai'
  kind: 'text' | 'skeleton' | 'welcome' | 'answer' | 'followup' | 'clarify'
  text?: string
  html?: string
  options?: string[]
  /** live 模式澄清（选项点击走真实 /api/ai/chat/clarify） */
  liveClarify?: boolean
  chartOpt?: EChartsCoreOption
  table?: { dims: string[]; values: number[]; lastYear: number[]; yoy: string[]; drivers: string[] }
  dimLabel?: string
  attrRows?: { dim: string; pct: number }[] | null
  meta?: string
  ops?: string[]
  followupOpt?: EChartsCoreOption
  answer?: Canned
  /** live 模式：通用数据表（后端真实列/行） */
  liveTable?: { columns: string[]; rows: unknown[][] }
}
const messages = ref<ChatMsg[]>([])
let msgSeq = 0
const renderedCharts = new Set<number>()

/* ================= 会话历史 ================= */
const SESSIONS = [
  { title: '上月各采油厂原油产量同比', turns: 4, time: '今天 08:40' },
  { title: '华东管网输差分析', turns: 6, time: '昨天 16:22' },
  { title: '甲醇装置开工率趋势', turns: 2, time: '昨天 09:10' },
  { title: '吨油完全成本环比拆解', turns: 8, time: '3 天前' },
  { title: '瓦斯超限次数排名', turns: 3, time: '3 天前' },
]
const activeSession = ref(0)

/* live 会话（真实 /api/ai） */
const liveSessions = ref<AiSessionItem[]>([])
const liveSessionId = ref<string | null>(null)

async function loadLiveSessions() {
  try {
    liveSessions.value = await aiSessionList()
  } catch {
    liveSessions.value = []
  }
}
function fmtLiveTime(t?: string): string {
  if (!t) return ''
  const d = new Date(String(t).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(t)
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (day(d) === day(now)) return `今天 ${hm}`
  const yd = new Date(now.getTime() - 86400000)
  if (day(d) === day(yd)) return `昨天 ${hm}`
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
}
async function onLiveSessionClick(s: AiSessionItem) {
  liveSessionId.value = s.id
  activeSession.value = -1
  answered.value = 0
  ctx.value = null
  ctxBarVisible.value = false
  resetChartState()
  messages.value = []
  traceIntro.value = true
  traceSteps.value = []
  try {
    const { aiChatHistory } = await import('@/api/chatbi')
    const rows = await aiChatHistory(s.id)
    for (const r of rows) {
      if (r.role === 'user') {
        pushUser(r.content)
      } else {
        try {
          const a = JSON.parse(r.content) as LiveAnswer
          if (a.type === 'answer') renderLiveAnswer(a)
        } catch {
          /* 历史快照解析失败则跳过 */
        }
      }
    }
  } catch {
    fail('会话历史加载失败')
  }
}

function loadDemo() {
  resetChartState()
  messages.value = []
  const a = CANNED.oil
  pushUser('上月各采油厂原油产量的同比变化？')
  pushAnswer(a, { costMs: 842 })
  pushUser(a.followup.q)
  pushFollowup(a.followup)
  ctx.value = '上月（2026-08） · 采油厂维度'
  setTrace(a, '已按行级权限过滤：仅华北油田分公司可见数据；敏感列已脱敏', 842, false)
}
function loadWelcome() {
  resetChartState()
  messages.value = [{
    id: ++msgSeq, role: 'ai', kind: 'welcome',
    html: '您好，我是 <b>能源问数助手</b>。直接用业务语言提问即可，我会命中语义层指标取数，并把取数全过程展示在右侧面板。',
    options: ['上月各采油厂产量同比？', '瓦斯超限次数排名', '甲醇装置开工率趋势', '今日原煤产量'],
  }]
  ctx.value = null
  traceSteps.value = []
  traceIntro.value = true
}
function onSessionClick(i: number) {
  activeSession.value = i
  liveSessionId.value = null
  success(`已加载会话「${SESSIONS[i].title}」（演示内容）`)
  answered.value = 0
  ctx.value = null
  ctxBarVisible.value = false
  loadDemo()
}
async function newSession() {
  activeSession.value = -1
  liveSessionId.value = null
  loadWelcome()
  try {
    const s = await aiSessionCreate('')
    liveSessionId.value = s.id
    await loadLiveSessions()
    success('已新建问数会话（真实取数模式）')
  } catch {
    success('已新建问数会话')
  }
}

/* ================= 上下文条 ================= */
const ctx = ref<string | null>(null)
const ctxBarVisible = ref(false)
function clearCtx() {
  ctxBarVisible.value = false
  ctx.value = null
  success('已清除对话上下文，下次提问将重新识别时空范围')
}
function ctxOf(metric: string): string {
  if (metric.includes('COAL')) return '昨日 · 矿区 / 工作面维度'
  if (metric.includes('CHEM')) return '近 6 个月 · 月份维度'
  return '上月（2026-08） · 采油厂维度'
}

/* ================= 发问主流程（mock /ai/chat/ask） ================= */
const answered = ref(0)
const input = ref('')
const thinking = ref(false)
const CLARIFY_OPTIONS = ['查「原油产量」月度同比', '查「瓦斯超限次数」排名', '查「甲醇装置开工率」趋势']

function pickCanned(q: string): { canned: Canned } | { clarify: true } {
  if (/同比|产量|采油厂/.test(q)) return { canned: CANNED.oil }
  if (/瓦斯|超限|煤矿|安全/.test(q)) return { canned: CANNED.coal }
  if (/甲醇|开工率|化工|装置/.test(q)) return { canned: CANNED.chem }
  return { clarify: true }
}

async function sendAsk(q?: string) {
  const question = (q ?? input.value).trim()
  if (!question) {
    fail('请输入问题，或点击下方推荐问题')
    return
  }
  input.value = ''

  // live 模式：真实语义层取数（FR-AI-03 Text2DSL）
  if (liveSessionId.value) {
    await liveAsk(question)
    return
  }

  if (answered.value > 0 && ctx.value) ctxBarVisible.value = true
  pushUser(question)
  const skelId = pushSkeleton()
  thinking.value = true
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500))
  thinking.value = false

  const hit = pickCanned(question)
  if ('clarify' in hit) {
    replaceMsg(skelId, {
      id: skelId, role: 'ai', kind: 'clarify',
      text: '这个问题我没有十足把握，为避免取错数，请确认您的意图：',
      options: CLARIFY_OPTIONS,
    })
    return
  }
  answered.value++
  replaceAnswer(skelId, hit.canned, { costMs: 842 })
  ctx.value = ctxOf(hit.canned.metric)
  setTrace(hit.canned, '已按行级权限过滤：仅华北油田分公司可见数据；敏感列已脱敏', 842, false)
}

/* ================= live 真实问数（/api/ai/chat/*） ================= */
async function liveAsk(question: string, opts?: { clarify?: boolean }) {
  pushUser(question)
  const skelId = pushSkeleton()
  try {
    const resp = opts?.clarify
      ? await aiChatClarify(liveSessionId.value || '', question)
      : await aiChatAsk(liveSessionId.value || '', question)

    if (resp.type === 'clarify') {
      replaceMsg(skelId, {
        id: skelId, role: 'ai', kind: 'clarify',
        text: resp.message,
        options: resp.options,
        liveClarify: true,
      })
      return
    }

    answered.value++
    renderLiveAnswer(resp, skelId)
  } catch (e) {
    replaceMsg(skelId, {
      id: skelId, role: 'ai', kind: 'clarify',
      text: '取数服务异常：' + ((e as Error).message || '未知错误') + '（可重试或换一种问法）',
      options: [],
    })
  }
}

function chartOptFromLive(c: LiveChartSpec): EChartsCoreOption {
  const axis = { type: 'category', data: c.x, axisLabel: { fontSize: 10 } }
  if (c.type === 'line') {
    return {
      tooltip: { trigger: 'axis' }, legend: { data: ['本期'] }, grid: { top: 30 },
      xAxis: axis, yAxis: { type: 'value' },
      series: [{
        name: '本期', type: 'line', smooth: true, symbolSize: 6,
        lineStyle: { width: 2.4, color: '#FF8A3D' }, itemStyle: { color: '#FF8A3D' }, data: c.y,
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,138,61,.22)' }, { offset: 1, color: 'rgba(255,138,61,0)' }] } },
      }],
    }
  }
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['本期'] }, grid: { top: 30 },
    xAxis: axis, yAxis: { type: 'value' },
    series: [{
      name: '本期', type: 'bar', barWidth: 26, data: c.y,
      itemStyle: { borderRadius: [5, 5, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#FF8A3D' }, { offset: 1, color: 'rgba(244,99,58,.35)' }] } },
    }],
  }
}

function renderLiveAnswer(a: LiveAnswer, replaceId?: number) {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const dimCols = a.columns.filter((c) => c !== 'METRIC_VALUE')

  const msg: ChatMsg = {
    id: replaceId ?? ++msgSeq,
    role: 'ai',
    kind: 'answer',
    html: a.conclusion,
    answer: undefined,
    dimLabel: dimCols.join(' / ') || '维度',
    liveTable: { columns: a.columns, rows: a.data.map((r) => a.columns.map((c) => r[c])) },
    attrRows: null,
    meta: `${t} · 命中语义层指标「${a.title} ${a.metric}」${a.explain?.costMs ? ' · 耗时 ' + a.explain.costMs + 'ms' : ''}`,
    ops: ['board', 'excel', 'fav', 'fb'],
    chartOpt: chartOptFromLive(a.chart),
  }

  if (replaceId) replaceMsg(replaceId, msg)
  else messages.value.push(msg)

  drawPendingCharts()

  // 归因回填（真实 /api/ai/insight/attribute）
  aiInsightAttribute(a.metric)
    .then((rows: AttrRow[]) => {
      const m = messages.value.find((x) => x.id === msg.id)
      if (m) {
        m.attrRows = rows.map((r) => ({ dim: `${r.dim}·${r.topValue}`, pct: r.pct }))
        scrollBottom()
      }
    })
    .catch(() => {
      const m = messages.value.find((x) => x.id === msg.id)
      if (m) m.attrRows = []
    })

  if (a.explain) setTraceLive(a.explain)
  ctx.value = dimCols.join(' / ') + ' 维度'
  ctxBarVisible.value = answered.value > 0
  if (a.sessionId) {
    if (a.sessionId !== liveSessionId.value) liveSessionId.value = a.sessionId
    loadLiveSessions()
  }
}

async function clarifyAsk(q: string) {
  pushUser(q)
  const skelId = pushSkeleton()
  if (liveSessionId.value) {
    await liveAsk(q, { clarify: true })
    return
  }
  await new Promise((r) => setTimeout(r, 600))
  answered.value++
  const a = CANNED.oil
  replaceAnswer(skelId, a, { costMs: 655 })
  ctx.value = '上月（2026-08） · 采油厂维度'
  setTrace(a, '行级权限已注入', 655, false)
}

/* ================= 消息操作 ================= */
function pushUser(text: string) {
  messages.value.push({ id: ++msgSeq, role: 'user', kind: 'text', text })
  scrollBottom()
}
function pushSkeleton(): number {
  const id = ++msgSeq
  messages.value.push({ id, role: 'ai', kind: 'skeleton' })
  scrollBottom()
  return id
}
function replaceMsg(id: number, msg: ChatMsg) {
  const i = messages.value.findIndex((m) => m.id === id)
  if (i >= 0) messages.value[i] = msg
  scrollBottom()
}
function pushAnswer(a: Canned, opts: { costMs?: number }) {
  const id = ++msgSeq
  messages.value.push({
    id,
    role: 'ai',
    kind: 'answer',
    html: a.conclusion,
    answer: a,
    dimLabel: a.metric.includes('OIL') ? '采油厂' : a.metric.includes('COAL') ? '矿区 / 工作面' : '月份',
    attrRows: null,
    meta: new Date().toLocaleTimeString('zh-CN', { hour12: false }) + ' · 命中语义层指标「' + a.title + ' ' + a.metric + '」' + (opts.costMs ? ' · 耗时 ' + opts.costMs + 'ms' : ''),
    ops: ['board', 'excel', 'fav', 'fb'],
    chartOpt: chartOptOf(a),
  })
  drawPendingCharts()
  setTimeout(() => {
    const msg = messages.value.find((m) => m.id === id)
    if (msg) {
      msg.attrRows = a.attribution
      scrollBottom()
    }
  }, 900)
  scrollBottom()
}
function replaceAnswer(id: number, a: Canned, opts: { costMs?: number }) {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  replaceMsg(id, {
    id,
    role: 'ai',
    kind: 'answer',
    html: a.conclusion,
    answer: a,
    dimLabel: a.metric.includes('OIL') ? '采油厂' : a.metric.includes('COAL') ? '矿区 / 工作面' : '月份',
    attrRows: null,
    meta: `${t} · 命中语义层指标「${a.title} ${a.metric}」${opts.costMs ? ' · 耗时 ' + opts.costMs + 'ms' : ''}`,
    ops: ['board', 'excel', 'fav', 'fb'],
    chartOpt: chartOptOf(a),
  })
  drawPendingCharts()
  // 归因引擎（mock 延迟回填）
  setTimeout(() => {
    const msg = messages.value.find((m) => m.id === id)
    if (msg) {
      msg.attrRows = a.attribution
      scrollBottom()
    }
  }, 900)
}
function pushFollowup(f: { q: string; a: string }) {
  pushUser(f.q)
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  messages.value.push({
    id: ++msgSeq,
    role: 'ai',
    kind: 'followup',
    html: boldNums(f.a),
    followupOpt: {
      tooltip: { trigger: 'axis' }, legend: { data: ['长庆日产量(吨)', '去年同期'] }, grid: { top: 30 },
      xAxis: { type: 'category', data: ['7/25', '8/1', '8/6', '8/11', '8/16', '8/21', '8/26', '8/31'], axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: '吨/日', nameTextStyle: { color: '#7C88A0', fontSize: 10 } },
      series: [
        { name: '长庆日产量(吨)', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2.2, color: '#FF8A3D' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,138,61,.25)' }, { offset: 1, color: 'rgba(255,138,61,0)' }] } },
          data: [29800, 30500, 31200, 30800, 31600, 32100, 31900, 32400] },
        { name: '去年同期', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 1.6, type: 'dashed', color: '#7C88A0' }, data: [27600, 27500, 27800, 27700, 27900, 28100, 28000, 28200] },
      ],
    },
    meta: `${t} · 归因引擎 v2（维度拆解 + 基数修正）`,
    ops: ['drill', 'sub'],
  })
  drawPendingCharts()
  scrollBottom()
}
function boldNums(s: string): string {
  return s.replace(/([+-]?\d+(\.\d+)?\s*(万吨|pct|%|口|个))/g, '<b>$1</b>')
}

function onOp(msg: ChatMsg, op: string) {
  if (op === 'board') openSaveAsChart(msg)
  else if (op === 'excel') success(`已导出「问数-${msg.answer?.title || '问数'}.xlsx」（含数据表与编译 SQL）`)
  else if (op === 'fav') success('已收藏到「我的收藏」')
  else if (op === 'fb') feedbackOpen.value = true
  else if (op === 'drill') success('已下钻至安塞区块单井明细（FR-AI-06 多轮下钻）')
  else if (op === 'sub') success('已订阅「长庆产量异动」告警，将推送至企业微信（FR-ALERT-02）')
}

/* ================= 图表 option 与渲染 ================= */
function chartOptOf(a: Canned): EChartsCoreOption {
  const isTime = a.dims.every((d) => String(d).endsWith('月'))
  if (isTime) {
    return {
      tooltip: { trigger: 'axis' }, legend: { data: ['本期', '去年同期'] }, grid: { top: 30 },
      xAxis: { type: 'category', data: a.dims }, yAxis: { type: 'value' },
      series: [
        { name: '本期', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.4, color: '#FF8A3D' }, itemStyle: { color: '#FF8A3D' }, data: a.values,
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,138,61,.22)' }, { offset: 1, color: 'rgba(255,138,61,0)' }] } } },
        { name: '去年同期', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 1.6, type: 'dashed', color: '#7C88A0' }, data: a.lastYear },
      ],
    }
  }
  const yoyNum = a.yoy.map((y) => { const v = parseFloat(y); return isNaN(v) ? null : v })
  return {
    tooltip: { trigger: 'axis' }, legend: { data: ['本期', '同比(%)'] }, grid: { top: 30 },
    xAxis: { type: 'category', data: a.dims.map((d) => String(d).replace('采油厂', '').replace('矿区', '')) },
    yAxis: [{ type: 'value' }, { type: 'value', splitLine: { show: false } }],
    series: [
      { name: '本期', type: 'bar', barWidth: 26, data: a.values,
        itemStyle: { borderRadius: [5, 5, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#FF8A3D' }, { offset: 1, color: 'rgba(244,99,58,.35)' }] } } },
      { name: '同比(%)', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 7, lineStyle: { width: 2.2, color: '#22D3EE' }, itemStyle: { color: '#22D3EE' }, data: yoyNum },
    ],
  }
}

const chatScrollEl = ref<HTMLElement>()
const chartInstances = new Map<number, EChartsType>()

function drawPendingCharts(attempt = 0) {
  // 不用 requestAnimationFrame：标签页在后台时 rAF 不触发，会静默漏渲染
  nextTick(() => {
    let unrendered = false
    messages.value.forEach((m) => {
      if (renderedCharts.has(m.id)) return
      const opt = m.chartOpt || m.followupOpt
      if (!opt) return
      const host = document.getElementById('chat-chart-' + m.id)
      if (!host) {
        unrendered = true
        return
      }
      try {
        const inst = chartInstances.get(m.id) || init(host)
        chartInstances.set(m.id, inst)
        inst.setOption(opt, true)
        renderedCharts.add(m.id)
      } catch (e) {
        console.warn('chat chart render failed', e)
      }
    })
    // 宿主未挂出（骨架替换/异步分支）或仍有未渲染项时短重试
    if (unrendered && attempt < 8) setTimeout(() => drawPendingCharts(attempt + 1), 150)
    scrollBottom()
  })
}
function resetChartState() {
  chartInstances.forEach((c) => c.dispose())
  chartInstances.clear()
  renderedCharts.clear()
}
function scrollBottom() {
  nextTick(() => {
    chatScrollEl.value?.scrollTo({ top: chatScrollEl.value.scrollHeight, behavior: 'smooth' })
  })
}

/* ================= 取数透明化 trace（五步，可折叠） ================= */
interface TraceStep { t: string; bodyHtml: string }
const traceSteps = ref<TraceStep[]>([])
const traceIntro = ref(true)
const folded = ref<boolean[]>([false, false, false, false, false])
function setTrace(a: Canned, permission: string, costMs: number, cacheHit: boolean) {
  traceIntro.value = false
  folded.value = [false, false, false, false, false]
  const tr = a.dsl.time_range as { type: string; granularity?: string }
  const steps: TraceStep[] = [
    { t: '意图识别（Text2DSL）', bodyHtml:
      `<div class="ts-kv"><div><span class="k">指标：</span><b>${a.title}</b> <span class="tag" style="font-family:var(--font-mono)">${a.metric}</span></div>` +
      `<div><span class="k">维度：</span><b>${(a.dsl.dimensions as string[]).join(' / ')}</b></div>` +
      `<div><span class="k">时间：</span><b>${tr.type} · 粒度 ${tr.granularity || '—'}</b></div>` +
      `<div><span class="k">对比：</span><b>${a.dsl.compare}</b></div></div>` },
    { t: 'DSL 中间层（语义层 Grounding）', bodyHtml: `<div class="code-block">${escapeHtml(JSON.stringify(a.dsl, null, 2))}</div>` },
    { t: '编译 SQL（指标引擎）', bodyHtml: `<div class="code-block">${hlSql(a.sql)}</div>` },
    { t: '权限与脱敏继承', bodyHtml:
      `<div class="ts-kv" style="margin-bottom:8px">已按你的身份自动套用数据权限，无需手工声明：</div>` +
      `<div class="flex wrap" style="gap:6px"><span class="tag info">${escapeHtml(permission)}</span><span class="tag warn">敏感列已脱敏</span><span class="tag ok">指标口径已认证</span></div>` },
    { t: '执行与缓存', bodyHtml:
      `<div class="ts-kv"><div><span class="k">引擎：</span><b>StarRocks 集群（信创）</b></div>` +
      `<div><span class="k">耗时：</span><b class="num">${costMs} ms</b></div>` +
      `<div><span class="k">缓存：</span>${cacheHit ? '命中语义层结果缓存（TTL 10min）' : '未命中缓存，结果已写入（TTL 10min）'}</div></div>` },
  ]
  traceSteps.value = steps
}
function setTraceLive(e: LiveExplain) {
  traceIntro.value = false
  folded.value = [false, false, false, false, false]
  const dsl = e.dsl || {}
  const dims = (dsl.dimensions as string[]) || []
  const steps: TraceStep[] = [
    { t: '意图识别（Text2DSL）', bodyHtml:
      `<div class="ts-kv"><div><span class="k">指标：</span><b>${escapeHtml(e.metricName || '')}</b> <span class="tag" style="font-family:var(--font-mono)">${escapeHtml(e.metric)}</span></div>` +
      `<div><span class="k">维度：</span><b>${escapeHtml(dims.join(' / ') || '—')}</b></div>` +
      `<div><span class="k">时间：</span><b>${escapeHtml(String(dsl.time_range || 'none'))}</b></div>` +
      `<div><span class="k">命中方式：</span><b>语义层确定性 Grounding（关键词规则）</b></div></div>` },
    { t: 'DSL 中间层（语义层 Grounding）', bodyHtml: `<div class="code-block">${escapeHtml(JSON.stringify(dsl, null, 2))}</div>` },
    { t: '编译 SQL（指标引擎）', bodyHtml: `<div class="code-block">${hlSql(e.sql)}</div>` },
    { t: '权限与脱敏继承', bodyHtml:
      `<div class="ts-kv" style="margin-bottom:8px">已按你的身份自动套用数据权限，无需手工声明：</div>` +
      `<div class="flex wrap" style="gap:6px"><span class="tag info">${escapeHtml(e.permission || '默认权限')}</span>` +
      ((e.appliedMasks || []).length ? `<span class="tag warn">已脱敏：${escapeHtml(e.appliedMasks!.join('、'))}</span>` : '<span class="tag warn">无脱敏命中</span>') +
      '<span class="tag ok">指标口径继承</span></div>' },
    { t: '执行与缓存', bodyHtml:
      `<div class="ts-kv"><div><span class="k">引擎：</span><b>指标查询引擎（参数化 PreparedStatement）</b></div>` +
      `<div><span class="k">耗时：</span><b class="num">${e.costMs} ms</b></div>` +
      `<div><span class="k">缓存：</span>${e.cacheHit ? '命中语义层结果缓存（TTL 10min）' : '未命中缓存，结果已写入（TTL 10min）'}</div></div>` },
  ]
  traceSteps.value = steps
}
function toggleFold(i: number) {
  folded.value[i] = !folded.value[i]
}
function hlSql(sql: string): string {
  return escapeHtml(String(sql || '-- 无')).split('\n').map((line) => {
    if (line.trim().startsWith('--')) return `<span class="cm">${line}</span>`
    return line
      .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|BETWEEN|AND|IN|AS|DESC|DISTINCT)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(SUM|AVG|COUNT|MAX|MIN)\(/g, '<span class="fn">$1</span>(')
      .replace(/\$\{[^}]*\}/g, (mm: string) => `<span class="pc">${mm}</span>`)
  }).join('\n')
}
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ================= BYO-LLM 配置展示 ================= */
const llmOpen = ref(false)

/* ================= 转为看板部件 ================= */
const saveAsOpen = ref(false)
const saveAsTarget = ref<ChatMsg | null>(null)
const dashboards = ref<DashboardListItem[]>([])
const saveAsForm = reactive({ target: '', wtype: 'chart' })

async function openSaveAsChart(msg: ChatMsg) {
  try {
    const d = await dashboardPagingQueryData({ page: 1, pageSize: 50 })
    dashboards.value = d.items
  } catch { dashboards.value = [] }
  saveAsTarget.value = msg
  saveAsForm.target = ''
  saveAsForm.wtype = 'chart'
  saveAsOpen.value = true
}
function submitSaveAs() {
  if (!saveAsTarget.value) return
  if (!saveAsForm.target) {
    fail('请选择目标看板')
    return
  }
  const isNew = saveAsForm.target === '__new'
  saveAsOpen.value = false
  success(isNew
    ? '已生成图表部件并创建新看板草稿，可在看板设计器中继续编辑'
    : `已加入看板「${saveAsForm.target}」（部件 CH-${Date.now() % 1000}）`)
}

/* ================= 纠错反馈 ================= */
const feedbackOpen = ref(false)
const feedbackForm = reactive({ useful: '有用', reason: '' })
function submitFeedback() {
  feedbackOpen.value = false
  success('反馈已提交：将用于语义层口径与意图识别优化（FR-AI-10）')
}

/* ================= 生命周期 ================= */
onMounted(() => {
  loadDemo()
  loadLiveSessions()
})
</script>

<template>
  <div class="ds-page chat-page">
    <div class="chat-bench">
    <!-- 左：会话历史 -->
    <div class="card chat-col">
      <div class="hist-head">
        <b style="font-size: 13.5px">会话历史</b>
        <button class="btn sm primary" type="button" @click="newSession">＋ 新会话</button>
      </div>
      <div class="hist-list">
        <template v-if="liveSessions.length">
          <div class="hist-group">我的会话</div>
          <div
            v-for="s in liveSessions"
            :key="s.id"
            class="hist-item"
            :class="{ active: liveSessionId === s.id }"
            @click="onLiveSessionClick(s)"
          >
            <div class="h-t">{{ s.title }}</div>
            <div class="h-s">{{ s.turns }} 轮问答 · {{ fmtLiveTime(s.updateTime || s.createTime) }}</div>
          </div>
        </template>
        <div class="hist-group">演示会话</div>
        <div
          v-for="(s, i) in SESSIONS"
          :key="s.title"
          class="hist-item"
          :class="{ active: !liveSessionId && activeSession === i }"
          @click="onSessionClick(i)"
        >
          <div class="h-t">{{ s.title }}</div>
          <div class="h-s">{{ s.turns }} 轮问答 · {{ s.time }}</div>
        </div>
      </div>
    </div>

    <!-- 中：对话主区 -->
    <div class="chat-col chat-main">
      <div class="flex wrap" style="gap: 8px; flex: none; padding: 2px 6px 12px">
        <span class="tag brand" style="cursor: pointer" title="点击查看 BYO-LLM 接入配置" @click="llmOpen = true">DeepSeek-V3 · BYO-LLM 接入</span>
        <span class="tag info">语义层已连接 · {{ liveSessions.length ? '已接入真实取数' : '演示模式' }}</span>
        <span class="tag ok">行级权限继承开启</span>
        <span class="tag" style="margin-left: auto">取数透明化已开启</span>
      </div>

      <div v-if="ctxBarVisible" class="ctx-bar">
        <span style="color: #60a5fa">🎯</span>
        <span>当前上下文：<b style="color: var(--tx-1)">{{ ctx }}</b> <span class="sm tx-3">（追问将继承该时空与维度口径）</span></span>
        <span class="ctx-clear" title="清除上下文" @click="clearCtx">✕</span>
      </div>

      <div ref="chatScrollEl" class="chat-scroll">
        <template v-for="m in messages" :key="m.id">
          <!-- 用户气泡 -->
          <div v-if="m.role === 'user'" class="msg user">
            <div class="m-avatar user-ava">A</div>
            <div class="bubble-user">{{ m.text }}</div>
          </div>

          <!-- 欢迎态 -->
          <div v-else-if="m.kind === 'welcome'" class="msg ai">
            <div class="m-avatar ai-ava">⚡</div>
            <div class="bubble-ai">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="ai-conclusion" v-html="m.html"></div>
              <div class="chips" style="margin-top: 12px">
                <span v-for="o in m.options" :key="o" class="chip" @click="sendAsk(o)">{{ o }}</span>
              </div>
            </div>
          </div>

          <!-- 骨架加载 -->
          <div v-else-if="m.kind === 'skeleton'" class="msg ai">
            <div class="m-avatar ai-ava">⚡</div>
            <div class="bubble-ai">
              <div class="flex" style="gap: 8px; color: var(--tx-3); font-size: 12.5px">
                <span class="spin">◌</span> 正在经语义层取数：意图识别 → DSL 落地 → SQL 编译…
              </div>
              <div class="skeleton" style="height: 13px; margin-top: 12px"></div>
              <div class="skeleton" style="height: 13px; width: 84%; margin-top: 8px"></div>
              <div class="skeleton" style="height: 13px; width: 62%; margin-top: 8px"></div>
            </div>
          </div>

          <!-- 完整答案 -->
          <div v-else-if="m.kind === 'answer'" class="msg ai">
            <div class="m-avatar ai-ava">⚡</div>
            <div class="bubble-ai">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="ai-conclusion" v-html="m.html"></div>
              <div :id="'chat-chart-' + m.id" class="chart" style="height: 230px; margin-top: 10px"></div>
              <div v-if="m.liveTable" class="ai-table table-wrap">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th v-for="c in m.liveTable.columns" :key="c" :class="{ num: c === 'METRIC_VALUE' }">{{ c === 'METRIC_VALUE' ? '指标值' : c }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in m.liveTable.rows" :key="ri">
                      <td v-for="(cell, ci) in row" :key="ci" :class="{ num: m.liveTable?.columns[ci] === 'METRIC_VALUE', 'cell-main': ci === 0 }">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="ai-table table-wrap">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th>{{ m.dimLabel }}</th><th class="num">本期</th><th class="num">去年同期</th><th class="num">同比</th><th>主要驱动</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d, i) in m.table?.dims" :key="d">
                      <td class="cell-main">{{ d }}</td>
                      <td class="num">{{ m.table?.values[i] }}</td>
                      <td class="num">{{ m.table?.lastYear[i] }}</td>
                      <td class="num" :style="{ color: String(m.table?.yoy[i]).indexOf('-') === 0 ? 'var(--danger)' : 'var(--ok)' }">{{ m.table?.yoy[i] }}</td>
                      <td>{{ m.table?.drivers[i] || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="attr-card">
                <div class="a-t">⚡ 波动归因 · 维度贡献度</div>
                <div class="attr-rows">
                  <div v-if="!m.attrRows" class="sm tx-3">归因引擎计算中…（POST /ai/insight/attribute）</div>
                  <div v-for="(x, i) in m.attrRows || []" :key="x.dim" class="attr-row">
                    <span class="a-name">{{ x.dim }}</span>
                    <div class="progress"><i :style="{ width: x.pct + '%', background: i === 0 ? '' : 'linear-gradient(90deg,#22D3EE,#0E7490)' }"></i></div>
                    <span class="a-v">贡献 {{ x.pct }}%<span v-if="i === 0" class="attr-top">Top</span></span>
                  </div>
                </div>
              </div>
              <div class="ai-ops">
                <button v-for="op in m.ops" :key="op" class="btn sm" type="button" @click="onOp(m, op)">
                  {{ op === 'board' ? '转为看板' : op === 'excel' ? '导出 Excel' : op === 'fav' ? '☆ 收藏' : op === 'fb' ? '纠错反馈' : op }}
                </button>
              </div>
              <div class="m-time">{{ m.meta }}</div>
            </div>
          </div>

          <!-- 追问（归因答复） -->
          <div v-else-if="m.kind === 'followup'" class="msg ai">
            <div class="m-avatar ai-ava">⚡</div>
            <div class="bubble-ai">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="ai-conclusion" v-html="m.html"></div>
              <div :id="'chat-chart-' + m.id" class="chart" style="height: 170px; margin-top: 10px"></div>
              <div class="ai-ops">
                <button v-for="op in m.ops" :key="op" class="btn sm" type="button" @click="onOp(m, op)">
                  {{ op === 'drill' ? '下钻安塞区块' : '订阅异动告警' }}
                </button>
              </div>
              <div class="m-time">{{ m.meta }}</div>
            </div>
          </div>

          <!-- 澄清 -->
          <div v-else-if="m.kind === 'clarify'" class="msg ai">
            <div class="m-avatar ai-ava">⚡</div>
            <div class="bubble-ai">
              <div class="ai-conclusion">{{ m.text }}</div>
              <div class="chips" style="margin-top: 10px">
                <span v-for="o in m.options" :key="o" class="chip" @click="clarifyAsk(o)">{{ o }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-wrap">
        <div class="chips">
          <span v-for="c in ['今日原煤产量', '甲醇装置开工率趋势', '瓦斯超限次数排名', '管输量月度计划完成率']" :key="c" class="chip" @click="sendAsk(c)">{{ c }}</span>
        </div>
        <div class="chat-input">
          <input
            v-model="input"
            placeholder="用业务语言提问，如「上月各采油厂原油产量同比？」— 将自动命中语义层指标"
            @keydown.enter="sendAsk()"
          />
          <button class="send-btn" type="button" title="发送" @click="sendAsk()">➤</button>
        </div>
      </div>
    </div>

    <!-- 右：取数逻辑透明化 -->
    <div class="card chat-col right trace-panel">
      <div class="card-title" style="margin-bottom: 14px">
        <i class="bar"></i>取数逻辑透明化 <span class="tag brand" style="margin-left: auto">FR-AI</span>
      </div>
      <div v-if="traceIntro" class="sm tx-3" style="line-height: 1.9; padding: 6px 2px">
        发起提问后，此处将逐步展示 <b style="color: var(--tx-1)">意图识别 → DSL 落地 → SQL 编译 → 权限继承 → 执行缓存</b> 全过程；每一步骤标题可点击折叠 / 展开。
      </div>
      <template v-else>
        <div v-for="(s, i) in traceSteps" :key="s.t" class="trace-step">
          <div class="ts-dot">{{ i + 1 }}</div>
          <div class="ts-t" style="cursor: pointer" @click="toggleFold(i)">
            {{ s.t }}<span class="sm tx-3" style="float: right; font-weight: 400">{{ folded[i] ? '展开' : '折叠' }}</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-show="!folded[i]" class="ts-body" v-html="s.bodyHtml"></div>
        </div>
      </template>
    </div>
    </div>

    <!-- BYO-LLM 配置 modal -->
    <Teleport to="body">
      <div v-if="llmOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="llmOpen = false">
        <div class="modal" style="width: 640px" @click.stop>
          <div class="drawer-head">
            <div class="drawer-title">BYO-LLM 接入配置（FR-AI-09）</div>
            <button class="btn sm ghost" type="button" @click="llmOpen = false">✕</button>
          </div>
          <div class="drawer-body">
            <dl class="def-grid">
              <dt>Base URL</dt><dd class="mono-num">https://api.deepseek.com/v1</dd>
              <dt>Model</dt><dd>deepseek-chat（DeepSeek-V3）</dd>
              <dt>API Key</dt><dd class="mono-num">sk-9f2c••••••••••••3kQa（KMS 加密存储）</dd>
              <dt>接入方式</dt><dd><span class="tag brand">BYO-LLM 自带密钥</span> <span class="tag ok">连接正常 · 312ms</span></dd>
            </dl>
            <div class="form-label" style="margin: 16px 0 8px">按功能点指定模型（多模型路由）</div>
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>功能点</th><th>模型</th><th>说明</th></tr></thead>
                <tbody>
                  <tr><td class="cell-main">Text2DSL 意图识别</td><td class="mono-num">DeepSeek-V3</td><td class="sm">语义层 Grounding，temperature 0.1</td></tr>
                  <tr><td class="cell-main">归因分析</td><td class="mono-num">DeepSeek-V3</td><td class="sm">维度拆解 + 基数修正</td></tr>
                  <tr><td class="cell-main">NL2SQL 兜底</td><td class="mono-num">Qwen2.5-72B（信创内网）</td><td class="sm">语义层未命中时降级</td></tr>
                  <tr><td class="cell-main">图表推荐</td><td class="mono-num">规则引擎</td><td class="sm">不消耗 Token</td></tr>
                </tbody>
              </table>
            </div>
            <div class="sm tx-3" style="margin-top: 10px">模型与密钥为平台级配置，修改入口在「系统管理 → 模型接入」；本页只读展示。</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 转为看板部件 modal -->
    <Teleport to="body">
      <div v-if="saveAsOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="saveAsOpen = false">
        <div class="modal" style="width: 520px" @click.stop>
          <div class="drawer-head">
            <div class="drawer-title">转为看板部件（FR-AI-07）</div>
            <button class="btn sm ghost" type="button" @click="saveAsOpen = false">✕</button>
          </div>
          <div class="drawer-body">
            <div class="form-item">
              <label class="form-label">目标看板 *</label>
              <select v-model="saveAsForm.target" class="input">
                <option value="">请选择…</option>
                <option v-for="d in dashboards" :key="d.id" :value="d.name">{{ d.name }}（{{ d.id }}）</option>
                <option value="__new">＋ 新建看板「问数-{{ saveAsTarget?.answer?.title }}」</option>
              </select>
            </div>
            <div class="form-item">
              <label class="form-label">部件形态</label>
              <select v-model="saveAsForm.wtype" class="input">
                <option value="chart">图表部件（柱线组合）</option>
                <option value="table">数据表部件</option>
                <option value="kpi">指标卡部件</option>
              </select>
            </div>
            <div class="flex" style="gap: 10px; margin-top: 14px">
              <button class="btn primary grow" type="button" @click="submitSaveAs">生成部件</button>
              <button class="btn" type="button" @click="saveAsOpen = false">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 纠错反馈 modal -->
    <Teleport to="body">
      <div v-if="feedbackOpen" class="drawer-mask" style="z-index: 130; padding: 0" @click="feedbackOpen = false">
        <div class="modal" style="width: 520px" @click.stop>
          <div class="drawer-head">
            <div class="drawer-title">纠错反馈 · 帮助语义层变好</div>
            <button class="btn sm ghost" type="button" @click="feedbackOpen = false">✕</button>
          </div>
          <div class="drawer-body">
            <div class="form-item">
              <label class="form-label">本次回答是否有用</label>
              <select v-model="feedbackForm.useful" class="input">
                <option>有用 ✓ 数据正确</option>
                <option>无用 ✗ 数据或口径有误</option>
              </select>
            </div>
            <div class="form-item">
              <label class="form-label">问题描述</label>
              <textarea v-model="feedbackForm.reason" class="input" rows="3" placeholder="如：华北采油厂同比数值与日报不一致，怀疑行级权限过滤遗漏…"></textarea>
            </div>
            <div class="flex" style="gap: 10px; margin-top: 14px">
              <button class="btn primary grow" type="button" @click="submitFeedback">提交反馈</button>
              <button class="btn" type="button" @click="feedbackOpen = false">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 满高三栏工作台（内容区不滚动，列内滚动）——对齐原型 #content overflow hidden */
.chat-page { overflow: hidden; padding: 14px 18px 18px; display: flex; }
.chat-bench {
  display: grid; grid-template-columns: 240px 1fr 320px; gap: 14px;
  height: calc(100vh - 56px - 32px);
  width: 100%; min-height: 0;
}
.chat-col { display: flex; flex-direction: column; min-height: 0; }

/* 左：会话历史 */
.hist-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.hist-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.hist-item {
  padding: 9px 12px; border-radius: var(--r-m); cursor: pointer; transition: background var(--dur);
  font-size: 12.5px; color: var(--tx-2);
}
.hist-item:hover { background: var(--bg-glass-2); }
.hist-item.active { background: var(--brand-soft); color: var(--brand); }
.hist-item .h-t { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-item .h-s { font-size: 10.5px; color: var(--tx-4); margin-top: 2px; }
.hist-group { font-size: 10.5px; color: var(--tx-4); letter-spacing: 1px; padding: 8px 12px 4px; }

/* 中：对话区 */
.chat-main { display: flex; flex-direction: column; min-height: 0; padding: 0 !important; background: transparent; border: none; }
.chat-scroll { flex: 1; overflow-y: auto; padding: 4px 6px 12px; display: flex; flex-direction: column; gap: 16px; }
.msg { display: flex; gap: 10px; max-width: 92%; }
.msg.user { align-self: flex-end; flex-direction: row-reverse; }
.m-avatar {
  width: 30px; height: 30px; border-radius: 9px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
}
.user-ava { background: linear-gradient(135deg, #22d3ee, #0e7490); color: #04262c; }
.ai-ava { background: var(--brand-grad); color: #241105; box-shadow: var(--shadow-glow-brand); }
.bubble-user {
  background: var(--brand-soft); border: 1px solid var(--brand-line);
  border-radius: 14px 4px 14px 14px; padding: 10px 14px; font-size: 13.5px;
}
.bubble-ai {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 4px 14px 14px 14px; padding: 14px 16px; flex: 1; min-width: 0;
}
.bubble-ai .m-time { font-size: 10.5px; color: var(--tx-4); margin-top: 10px; }
.ai-conclusion { font-size: 13.5px; line-height: 1.75; }
.ai-conclusion :deep(b) { color: var(--brand); font-family: var(--font-num); }
.ai-ops { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.ai-table { margin-top: 12px; }
.ai-table :deep(.tbl thead th) { padding: 8px 10px; font-size: 11.5px; }
.ai-table :deep(.tbl tbody td) { padding: 8px 10px; font-size: 12.5px; }
.attr-card {
  margin-top: 12px; border: 1px solid var(--line-1); border-radius: var(--r-m);
  background: rgba(255, 255, 255, 0.02); padding: 12px 14px;
}
.attr-card .a-t { font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.attr-row { display: flex; align-items: center; gap: 10px; font-size: 12px; padding: 4px 0; }
.attr-row .a-name { width: 76px; flex: none; color: var(--tx-2); }
.attr-row .progress { flex: 1; height: 8px; border-radius: 5px; background: var(--bg-glass-2); overflow: hidden; }
.attr-row .progress i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #ff8a3d, #f4633a); }
.attr-row .a-v { width: 90px; text-align: right; font-family: var(--font-num); color: var(--tx-1); }
.attr-top { font-size: 10.5px; color: var(--brand); border: 1px solid var(--brand-line); border-radius: 6px; padding: 0 6px; margin-left: 6px; }

/* 上下文条 */
.ctx-bar {
  display: flex; align-items: center; gap: 8px; margin: 0 6px 10px; padding: 6px 12px; flex: none;
  background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 10px; font-size: 12px; color: var(--tx-2);
}
.ctx-clear { margin-left: auto; cursor: pointer; color: var(--tx-3); }
.ctx-clear:hover { color: var(--tx-1); }

/* 底部输入 */
.chat-input-wrap { flex: none; padding-top: 12px; }
.chips { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.chip {
  font-size: 12px; color: var(--tx-2); padding: 5px 12px; border-radius: 14px; cursor: pointer;
  background: var(--bg-glass); border: 1px solid var(--line-1); transition: all var(--dur);
}
.chip:hover { border-color: var(--brand-line); color: var(--brand); }
.chat-input {
  display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 16px;
  background: rgba(7, 10, 18, 0.6); border: 1px solid var(--line-2); border-radius: 18px;
}
.chat-input:focus-within { border-color: var(--brand-line); box-shadow: var(--shadow-glow-brand); }
.chat-input input { flex: 1; background: none; border: none; outline: none; color: var(--tx-1); font-size: 13.5px; font-family: var(--font); }
.chat-input input::placeholder { color: var(--tx-4); }
.send-btn {
  width: 36px; height: 36px; border-radius: 12px; border: none; cursor: pointer;
  background: var(--brand-grad); color: #241105;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(244, 99, 58, 0.35);
}

/* 右：取数透明化面板 */
.trace-panel { padding: 14px 16px; overflow-y: auto; }
.trace-step { position: relative; padding-left: 26px; padding-bottom: 18px; }
.trace-step::before {
  content: ''; position: absolute; left: 8px; top: 20px; bottom: -2px;
  width: 1px; background: var(--line-2);
}
.trace-step:last-child::before { display: none; }
.trace-step .ts-dot {
  position: absolute; left: 0; top: 2px; width: 17px; height: 17px; border-radius: 50%;
  background: var(--brand-soft); border: 1px solid var(--brand-line);
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-family: var(--font-num); color: var(--brand); font-weight: 700;
}
.trace-step .ts-t { font-size: 12.5px; font-weight: 600; margin-bottom: 6px; }
/* ts-kv / code-block 由 v-html 注入（无 scoped 属性），需 :deep 穿透 */
.ts-body :deep(.ts-kv) { font-size: 11.5px; color: var(--tx-2); line-height: 1.8; }
.ts-body :deep(.ts-kv b) { color: var(--tx-1); }
.ts-body :deep(.ts-kv .k) { color: var(--tx-3); }
.ts-body :deep(.code-block) {
  background: rgba(5, 8, 14, 0.8); border: 1px solid var(--line-1); border-radius: var(--r-m);
  padding: 10px 12px; font-family: var(--font-mono); font-size: 10.5px; line-height: 1.7;
  color: #c9d4e8; overflow-x: auto; white-space: pre; margin-top: 6px;
}
.ts-body :deep(.code-block .kw) { color: #ff8a3d; }
.ts-body :deep(.code-block .fn) { color: #22d3ee; }
.ts-body :deep(.code-block .cm) { color: #525d75; }
.ts-body :deep(.code-block .pc) { color: #e8b33c; }
.ts-body :deep(.code-block .st) { color: #34d399; }
.ts-body :deep(.tag) { margin-right: 4px; }
.def-grid { display: grid; grid-template-columns: 96px 1fr; gap: 8px 12px; font-size: 12.5px; }
.def-grid dt { color: var(--tx-3); }
.def-grid dd { color: var(--tx-1); margin: 0; }
.mono-num { font-family: var(--font-num); }

/* Teleport 弹窗（token 由 datasource-page.css 的 body > .drawer-mask 提供） */
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 540px; max-width: 92vw; max-height: 86vh; background: var(--bg-2); border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-2); }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.input { background: var(--bg-glass); border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 12px; color: var(--tx-1); font-size: 13px; font-family: var(--font); outline: none; width: 100%; box-sizing: border-box; }
.input:focus { border-color: var(--brand-line); }
.select, select.input { appearance: auto; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.grow { flex: 1; min-width: 0; }
.flex { display: flex; }
.wrap { flex-wrap: wrap; }
.sm { font-size: 11.5px; }
.tx-3 { color: var(--tx-3); }
.spin { display: inline-block; animation: chat-spin 1s linear infinite; }
@keyframes chat-spin { to { transform: rotate(360deg); } }
.skeleton { border-radius: 6px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.05) 75%); background-size: 200% 100%; animation: chat-sk 1.4s infinite; }
@keyframes chat-sk { to { background-position: -200% 0; } }
@media (max-width: 1200px) {
  .chat-bench { grid-template-columns: 200px 1fr; }
  .chat-col.right { display: none; }
}
</style>
