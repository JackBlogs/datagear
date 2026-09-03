<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { init, use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { dashboardPagingQueryData, type DashboardListItem } from '@/api/dashboard'
import { alertHistory } from '@/mock/alertData'
import { ask, type ChatAnswer } from '@/mock/chatData'
import { useOperationMessage } from '@/composables/useOperationMessage'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/**
 * 移动端 H5（对齐 prototypev2 mobile.html）：
 * 手机壳内 5 视图 —— 首页 / 看板 / 看板详情 / 问数（Text2DSL canned）/ 消息；底部 Tab 栏 + 体验二维码。
 */
const { success } = useOperationMessage()

type MView = 'home' | 'boards' | 'boardDetail' | 'chat' | 'msg'
const view = ref<MView>('home')
const TABS: { id: MView; n: string; icon: string; badge?: number }[] = [
  { id: 'home', n: '首页', icon: 'pi pi-home' },
  { id: 'boards', n: '看板', icon: 'pi pi-images' },
  { id: 'chat', n: '问数', icon: 'pi pi-comments' },
  { id: 'msg', n: '消息', icon: 'pi pi-bell', badge: 3 },
]

function switchView(id: MView) {
  view.value = id
  if (id === 'home') nextTick(() => renderTrend())
}

/* ---------- 首页视图数据 ---------- */
const kpis = [
  { label: '原油产量 · 昨日', value: '12.86', unit: '万吨', trend: '▲ 2.4% 日环比', up: true },
  { label: '天然气产量 · 昨日', value: '4.32', unit: '亿方', trend: '▲ 1.8% 日环比', up: true },
]
const trendEl = ref<HTMLElement>()
let trendChart: ECharts | null = null

function renderTrend() {
  if (!trendEl.value) return
  if (!trendChart) trendChart = init(trendEl.value)
  const option: EChartsCoreOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 34, right: 10, top: 16, bottom: 20 },
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '昨日'], axisLabel: { color: '#7C88A0', fontSize: 9 } },
    yAxis: { type: 'value', axisLabel: { color: '#7C88A0', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.05)' } } },
    series: [
      {
        name: '日产油(万吨)',
        type: 'line',
        smooth: true,
        data: [12.1, 12.4, 12.2, 12.6, 12.5, 12.7, 12.86],
        itemStyle: { color: '#FF8A3D' },
        lineStyle: { color: '#FF8A3D', width: 2 },
        areaStyle: { color: 'rgba(255,138,61,.15)' },
      },
    ],
  }
  trendChart.setOption(option, true)
  trendChart.resize()
}

/* ---------- 看板列表 / 详情（真实数据） ---------- */
const boards = ref<DashboardListItem[]>([])
const detailBoard = ref<DashboardListItem | null>(null)
const detailTrendEl = ref<HTMLElement>()
let detailChart: ECharts | null = null

async function loadBoards() {
  try {
    const data = await dashboardPagingQueryData({ page: 1, pageSize: 20, orders: [{ name: 'createTime', type: 'DESC' as const }] })
    boards.value = data.items
  } catch { /* 后端不可达时保留空态 */ }
}

function openBoardDetail(b: DashboardListItem) {
  detailBoard.value = b
  view.value = 'boardDetail'
  nextTick(() => {
    if (!detailTrendEl.value) return
    if (!detailChart) detailChart = init(detailTrendEl.value)
    const option: EChartsCoreOption = {
      tooltip: { trigger: 'axis' },
      grid: { left: 34, right: 10, top: 14, bottom: 20 },
      xAxis: { type: 'category', data: ['8/30', '8/31', '9/1', '9/2', '9/3', '昨日'], axisLabel: { color: '#7C88A0', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#7C88A0', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.05)' } } },
      series: [{ type: 'line', smooth: true, data: [362, 368, 371, 359, 377, 385], itemStyle: { color: '#22D3EE' }, lineStyle: { color: '#22D3EE', width: 2 } }],
    }
    detailChart.setOption(option, true)
    detailChart.resize()
  })
}

/* ---------- 问数视图（canned Text2DSL） ---------- */
const chatInput = ref('')
const chatThinking = ref(false)
interface ChatTurn {
  role: 'user' | 'ai'
  text?: string
  thinking?: boolean
  answer?: ChatAnswer
}
const chatTurns = ref<ChatTurn[]>([])
const chatListEl = ref<HTMLElement>()

function scrollChat() {
  nextTick(() => chatListEl.value?.scrollTo({ top: chatListEl.value.scrollHeight, behavior: 'smooth' }))
}

async function sendChat(q?: string) {
  const question = (q ?? chatInput.value).trim()
  if (!question || chatThinking.value) return
  chatInput.value = ''
  chatTurns.value.push({ role: 'user', text: question })
  chatThinking.value = true
  scrollChat()
  await new Promise((r) => setTimeout(r, 800))
  const answer = ask(question)
  chatThinking.value = false
  if (answer.type === 'answer') {
    chatTurns.value.push({
      role: 'ai',
      thinking: false,
      text: (answer.conclusion || '').replace(/<[^>]+>/g, ''),
      answer,
    })
    nextTick(() => {
      const el = document.querySelector('.m-chat-canvas:last-of-type') as HTMLElement | null
      if (!el) return
      const c = init(el)
      c.setOption(
        {
          tooltip: { trigger: 'axis' },
          grid: { left: 30, right: 8, top: 12, bottom: 18 },
          xAxis: { type: 'category', data: answer.dims, axisLabel: { color: '#7C88A0', fontSize: 8, rotate: 20 } },
          yAxis: { type: 'value', axisLabel: { color: '#7C88A0', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.05)' } } },
          series: [{ type: 'bar', data: answer.values, itemStyle: { color: '#FF8A3D', borderRadius: [2, 2, 0, 0] } }],
        },
        true,
      )
    })
  } else {
    chatTurns.value.push({ role: 'ai', text: answer.message || '请换个问法', answer })
  }
  scrollChat()
}

const RECOMMEND = ['上月各采油厂原油产量排名？', '瓦斯超限次数排名？']

/* ---------- 消息视图 ---------- */
const msgs = computed(() => alertHistory.value)

/* ---------- 体验二维码（确定性伪码，演示） ---------- */
const qrCells = computed(() => {
  const cells: boolean[] = []
  let seedN = 20260904
  for (let i = 0; i < 361; i++) {
    seedN = (seedN * 1103515245 + 12345) % 2147483648
    cells.push((seedN >> 16) % 100 > 48)
  }
  return cells
})

function onResize() {
  trendChart?.resize()
  detailChart?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  loadBoards()
  await nextTick()
  renderTrend()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  detailChart?.dispose()
})
</script>

<template>
  <div class="ds-page mobile-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">移动端 H5 <span class="tag brand">消费场景</span></div>
        <div class="page-desc">查看 / 问数 / 消息 移动可用 —— 设计类操作桌面优先（FR-MOB）</div>
      </div>
    </div>

    <div class="m-layout">
      <!-- 左：手机壳 -->
      <div class="phone-stage">
        <!-- 视图切换 seg -->
        <div class="seg-row">
          <span class="seg-item" :class="{ active: view === 'home' }" @click="switchView('home')">首页</span>
          <span class="seg-item" :class="{ active: view === 'boards' || view === 'boardDetail' }" @click="switchView('boards')">看板</span>
          <span class="seg-item" :class="{ active: view === 'chat' }" @click="switchView('chat')">问数</span>
          <span class="seg-item" :class="{ active: view === 'msg' }" @click="switchView('msg')">消息</span>
        </div>

        <div class="phone">
          <div class="notch"></div>
          <div class="p-status"><span>9:41</span><span>5G ▮▮▮</span></div>

          <!-- 首页视图 -->
          <div v-show="view === 'home'" class="p-body">
            <div class="p-hello">早上好，李明 👋</div>
            <div class="p-sub">华北油田分公司 · 数据更新 06:30</div>
            <div v-for="k in kpis" :key="k.label" class="p-kpi">
              <div class="pk-label">{{ k.label }}</div>
              <div class="pk-value">{{ k.value }}<small>{{ k.unit }}</small></div>
              <div class="pk-trend up">{{ k.trend }}</div>
            </div>
            <div class="p-card">
              <div class="pc-title">近 7 日产量趋势 <span class="more" @click="success('原型演示：趋势详情页')">详情 ›</span></div>
              <div ref="trendEl" class="p-chart"></div>
            </div>
            <div class="p-card">
              <div class="pc-title">快捷入口</div>
              <div class="p-entries">
                <span @click="switchView('boards')">▦ 看板</span>
                <span @click="switchView('chat')">💬 问数</span>
                <span @click="switchView('msg')">🔔 消息</span>
              </div>
            </div>
          </div>

          <!-- 看板列表视图 -->
          <div v-show="view === 'boards'" class="p-body">
            <div class="p-hello">我的看板</div>
            <div v-for="b in boards" :key="b.id" class="p-board" @click="openBoardDetail(b)">
              <span class="pb-icon">▦</span>
              <div class="grow">
                <div class="pb-name ellipsis">{{ b.name }}</div>
                <div class="pb-sub">{{ b.analysisProject?.name || '默认项目' }}</div>
              </div>
              <i class="pi pi-arrow-right"></i>
            </div>
            <div v-if="!boards.length" class="p-empty">暂无看板</div>
          </div>

          <!-- 看板详情视图 -->
          <div v-show="view === 'boardDetail'" class="p-body">
            <div class="p-back" @click="switchView('boards')">‹ {{ detailBoard?.name || '看板详情' }}</div>
            <div class="p-kpi">
              <div class="pk-label">原油产量 · 昨日</div>
              <div class="pk-value">385.2<small>万吨</small></div>
              <div class="pk-trend up">▲ 5.1% 同比</div>
            </div>
            <div class="p-card">
              <div class="pc-title">产量趋势</div>
              <div ref="detailTrendEl" class="p-chart"></div>
            </div>
            <button class="btn primary w-full" type="button" @click="success('已在桌面端打开完整看板')">打开完整看板</button>
          </div>

          <!-- 问数视图 -->
          <div v-show="view === 'chat'" class="p-body p-chat">
            <div ref="chatListEl" class="p-chat-list">
              <div v-if="!chatTurns.length" class="p-chat-welcome">
                <div>试试问：</div>
                <span v-for="r in RECOMMEND" :key="r" @click="sendChat(r)">{{ r }}</span>
              </div>
              <div v-for="(t, i) in chatTurns" :key="i" class="p-turn" :class="t.role">
                <div class="p-turn-bubble">{{ t.text }}</div>
                <div v-if="t.role === 'ai' && t.answer?.type === 'answer'" class="p-chat-canvas-wrap">
                  <div class="m-chat-canvas"></div>
                </div>
              </div>
              <div v-if="chatThinking" class="p-turn ai"><div class="p-turn-bubble">正在按语义层口径查询…</div></div>
            </div>
            <div class="p-chat-input">
              <input v-model="chatInput" class="input grow" placeholder="问点什么…" @keydown.enter.prevent="sendChat()" />
              <button class="btn primary sm" type="button" :disabled="chatThinking" @click="sendChat()">发送</button>
            </div>
          </div>

          <!-- 消息视图 -->
          <div v-show="view === 'msg'" class="p-body">
            <div class="p-hello">消息</div>
            <div v-for="m in msgs" :key="m.id" class="p-msg" :class="m.handled ? '' : 'danger'">
              <b>{{ m.rule }}</b>
              <div class="sm tx-3">{{ m.metric }} · 当前 {{ m.value }} · {{ m.time }}</div>
            </div>
            <div v-if="!msgs.length" class="p-empty">暂无消息</div>
          </div>

          <!-- 底部 Tab 栏 -->
          <div class="p-tabbar">
            <div
              v-for="t in TABS"
              :key="t.id"
              class="pt-item"
              :class="{ active: view === t.id || (t.id === 'boards' && view === 'boardDetail') }"
              @click="switchView(t.id)"
            >
              <i :class="t.icon"></i>
              <span>{{ t.n }}</span>
              <em v-if="t.badge">{{ t.badge }}</em>
            </div>
          </div>
        </div>

        <!-- 右：二维码体验 -->
        <div class="qr-side">
          <div class="qr-title">体验二维码</div>
          <div class="qr-box">
            <i v-for="(on, i) in qrCells" :key="i" :class="{ w: !on }"></i>
          </div>
          <div class="tx-3 sm" style="text-align: center">微信 / 企业微信扫码体验 H5 移动端</div>
          <div class="qr-feats">
            <div>✓ 底部 Tab：首页/看板/问数/消息</div>
            <div>✓ 看板详情与趋势下钻</div>
            <div>✓ 自然语言问数（Text2DSL）</div>
            <div>✓ 告警/订阅消息推送</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-layout { display: flex; gap: 26px; align-items: flex-start; flex-wrap: wrap; }
.phone-stage { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); }
.seg-item { padding: 5px 16px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.phone {
  width: 322px; height: 660px; border-radius: 40px; border: 8px solid #1b2434;
  background: #0a0e17; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  display: flex; flex-direction: column; overflow: hidden; position: relative;
}
.notch { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); width: 110px; height: 20px; border-radius: 12px; background: #1b2434; z-index: 5; }
.p-status { flex: none; display: flex; justify-content: space-between; padding: 12px 20px 4px; font-size: 10px; color: var(--tx-4); }
.p-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 10px; }
.p-hello { font-size: 16px; font-weight: 800; color: var(--tx-1); }
.p-sub { font-size: 10px; color: var(--tx-4); margin-top: -6px; }
.p-kpi, .p-card { border: 1px solid var(--line-1); border-radius: 12px; background: var(--bg-glass); padding: 10px 12px; }
.pk-label { font-size: 10.5px; color: var(--tx-3); }
.pk-value { font-size: 24px; font-weight: 800; color: var(--brand); font-family: var(--font-num, monospace); }
.pk-value small { font-size: 11px; color: var(--tx-3); font-weight: 400; margin-left: 3px; }
.pk-trend { font-size: 10px; color: #34d399; }
.pk-trend.down { color: #f87171; }
.pc-title { font-size: 11.5px; font-weight: 700; color: var(--tx-1); display: flex; justify-content: space-between; margin-bottom: 6px; }
.pc-title .more { color: var(--tx-4); font-weight: 400; cursor: pointer; }
.p-chart { height: 150px; }
.p-entries { display: flex; gap: 8px; }
.p-entries span { flex: 1; text-align: center; padding: 9px 0; border-radius: 9px; background: var(--bg-glass-2); font-size: 11px; color: var(--tx-2); cursor: pointer; }
.p-board { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border: 1px solid var(--line-1); border-radius: 11px; cursor: pointer; background: var(--bg-glass); }
.p-board:hover { border-color: var(--brand-line); }
.pb-icon { width: 28px; height: 28px; border-radius: 8px; background: rgba(255, 138, 61, 0.14); color: var(--brand); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.pb-name { font-size: 12px; color: var(--tx-1); font-weight: 600; }
.pb-sub { font-size: 10px; color: var(--tx-4); }
.p-back { font-size: 12px; color: var(--tx-2); cursor: pointer; }
.p-empty { text-align: center; color: var(--tx-4); font-size: 11px; padding: 20px 0; }
.p-chat { gap: 8px; }
.p-chat-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.p-chat-welcome { font-size: 11px; color: var(--tx-3); display: flex; flex-direction: column; gap: 6px; }
.p-chat-welcome span { padding: 7px 12px; border: 1px dashed var(--line-2); border-radius: 9px; cursor: pointer; color: var(--tx-2); }
.p-turn { display: flex; }
.p-turn.user { justify-content: flex-end; }
.p-turn-bubble { max-width: 85%; padding: 8px 11px; border-radius: 11px; font-size: 11.5px; line-height: 1.6; background: var(--bg-glass); border: 1px solid var(--line-1); color: var(--tx-2); }
.p-turn.user .p-turn-bubble { background: var(--brand-soft); border-color: var(--brand-line); color: var(--tx-1); }
.p-chat-canvas-wrap { margin-top: 6px; border: 1px solid var(--line-1); border-radius: 10px; padding: 4px; background: var(--bg-glass); }
.m-chat-canvas { height: 120px; }
.p-chat-input { display: flex; gap: 6px; }
.p-msg { border: 1px solid var(--line-1); border-radius: 11px; padding: 9px 12px; background: var(--bg-glass); }
.p-msg b { font-size: 11.5px; color: var(--tx-1); }
.p-msg.danger { border-left: 3px solid #f87171; }
.p-msg.warn { border-left: 3px solid #fbbf24; }
.p-tabbar {
  flex: none; display: flex; border-top: 1px solid var(--line-1);
  background: rgba(13, 20, 32, 0.9); padding: 6px 0 10px;
}
.pt-item { flex: 1; text-align: center; font-size: 9.5px; color: var(--tx-4); cursor: pointer; position: relative; }
.pt-item i { display: block; font-size: 15px; margin-bottom: 2px; }
.pt-item.active { color: var(--brand); }
.pt-item em { position: absolute; top: -2px; right: 22%; font-style: normal; font-size: 8px; background: #f87171; color: #fff; border-radius: 8px; padding: 0 4px; }
.qr-side { display: flex; flex-direction: column; gap: 10px; max-width: 260px; }
.qr-title { font-size: 13px; font-weight: 700; color: var(--tx-1); text-align: center; }
.qr-box { display: grid; grid-template-columns: repeat(19, 1fr); gap: 1px; width: 190px; height: 190px; margin: 0 auto; padding: 10px; background: #fff; border-radius: 10px; }
.qr-box i { background: #111a2a; border-radius: 1px; }
.qr-box i.w { background: #fff; }
.qr-feats { font-size: 11px; color: var(--tx-3); display: flex; flex-direction: column; gap: 5px; }
.w-full { width: 100%; justify-content: center; }
.grow { flex: 1; min-width: 0; }
</style>
