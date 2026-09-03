<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { init, use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import {
  chatSessions,
  ask,
  clarify,
  saveAsChart,
  type ChatAnswer,
} from '@/mock/chatData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/**
 * 智能问数（对齐 prototypev2 chatbi.html）：
 * 会话历史 + 对话区（三段式回答：结论/图表/表格 + 取数逻辑透明化）+ 澄清选项 + 归因。
 * 数据层为前端 mock（src/mock/chatData.ts，Text2DSL canned），datagear-ai 就绪后切换 SSE。
 */
const router = useRouter()
const { success } = useOperationMessage()

interface Msg {
  role: 'user' | 'ai'
  text?: string
  answer?: ChatAnswer
}

const sessions = ref(chatSessions.map((s) => ({ ...s })))
const activeSession = ref(sessions.value[0]?.id ?? '')
const msgs = ref<Msg[]>([])
const input = ref('')
const thinking = ref(false)
const chatEl = ref<HTMLElement>()
/** 每条 AI 消息独立的 ECharts 实例（v-for 中模板 ref 时序不可靠，改用容器收集） */
const chartMap = new Map<HTMLElement, ECharts>()

const topContext = computed(() => sessions.value.find((s) => s.id === activeSession.value)?.title ?? '')

function scrollBottom() {
  nextTick(() => chatEl.value?.scrollTo({ top: chatEl.value.scrollHeight, behavior: 'smooth' }))
}

/* ---------- 回答图表渲染（同比分组柱状图） ---------- */
function renderAnswerChart(a: ChatAnswer) {
  if (!a.dims) return
  const els = document.querySelectorAll<HTMLElement>('.ans-chart-canvas')
  const el = els[els.length - 1]
  if (!el) return
  let chart = chartMap.get(el)
  if (!chart) {
    chart = init(el)
    chartMap.set(el, chart)
  }
  const option: EChartsCoreOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['本期', '上年同期'], textStyle: { color: '#B9C2D4', fontSize: 11 } },
    grid: { left: 46, right: 12, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: a.dims, axisLabel: { color: '#7C88A0', fontSize: 10, interval: 0, rotate: a.dims.length > 5 ? 24 : 0 } },
    yAxis: { type: 'value', axisLabel: { color: '#7C88A0', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } } },
    series: [
      { name: '本期', type: 'bar', data: a.values, itemStyle: { color: '#FF8A3D', borderRadius: [3, 3, 0, 0] }, barWidth: '32%' },
      { name: '上年同期', type: 'bar', data: a.lastYear, itemStyle: { color: '#22D3EE', borderRadius: [3, 3, 0, 0] }, barWidth: '32%' },
    ],
  }
  chart.setOption(option, true)
  chart.resize()
}

/* ---------- 发送 ---------- */
async function send(q?: string) {
  const question = (q ?? input.value).trim()
  if (!question || thinking.value) return
  input.value = ''
  msgs.value.push({ role: 'user', text: question })
  thinking.value = true
  scrollBottom()
  // 模拟网络/推理延迟（原型 120~600ms + 推理耗时）
  await new Promise((r) => setTimeout(r, 700))
  const answer = ask(question)
  msgs.value.push({ role: 'ai', answer })
  thinking.value = false
  if (answer.type === 'answer') {
    await nextTick()
    renderAnswerChart(answer)
  }
  scrollBottom()
}

function onClarifyOption(opt: string) {
  msgs.value.push({ role: 'user', text: opt })
  thinking.value = true
  scrollBottom()
  setTimeout(() => {
    const answer = clarify()
    msgs.value.push({ role: 'ai', answer })
    thinking.value = false
    nextTick(() => renderAnswerChart(answer))
    scrollBottom()
  }, 600)
}

/* ---------- 会话 ---------- */
function newSession() {
  const id = 'CS-' + Date.now().toString(36)
  sessions.value.unshift({ id, title: '新会话', time: '刚刚', turns: 0 })
  activeSession.value = id
  msgs.value = []
  success('已新建问数会话')
}

function loadSession(id: string) {
  activeSession.value = id
  msgs.value = []
  const s = sessions.value.find((x) => x.id === id)
  if (s) success(`已加载会话「${s.title}」`)
}

/* ---------- 转存 ---------- */
function saveToChart(a: ChatAnswer) {
  const r = saveAsChart(a.title || '问数图表')
  success(`${r.msg}（${r.chartId}）`)
}

/* ---------- 快捷推荐问题 ---------- */
const RECOMMEND = ['上月各采油厂原油产量的同比变化？', '瓦斯超限次数排名？', '甲醇装置开工率趋势？']

onMounted(() => {
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chartMap.forEach((c) => c.dispose())
  chartMap.clear()
})
function onResize() {
  chartMap.forEach((c) => c.resize())
}
</script>

<template>
  <div class="ds-page chatbi-page">
    <!-- 左：会话历史 -->
    <div class="card sess-col">
      <button class="btn primary w-full" type="button" @click="newSession">＋ 新会话</button>
      <div class="sess-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="sess-item"
          :class="{ sel: activeSession === s.id }"
          @click="loadSession(s.id)"
        >
          <div class="s-title ellipsis">{{ s.title }}</div>
          <div class="s-meta">{{ s.time }} · {{ s.turns }} 轮</div>
        </div>
      </div>
      <div class="sess-foot">
        <span class="tag ok">语义层已连接</span>
        <span class="sm tx-4">DeepSeek-V3 · BYO-LLM</span>
      </div>
    </div>

    <!-- 中：对话区 -->
    <div class="card chat-col">
      <div class="chat-head">
        <b>智能问数</b>
        <span class="tag info">Text2DSL</span>
        <span class="sm tx-3" style="margin-left: auto">当前上下文：{{ topContext }}（点击会话可切换）</span>
      </div>

      <div ref="chatEl" class="chat-scroll">
        <div v-if="!msgs.length" class="chat-welcome">
          <div class="cw-title">试一试</div>
          <div class="cw-list">
            <span v-for="r in RECOMMEND" :key="r" class="cw-item" @click="send(r)">{{ r }}</span>
          </div>
        </div>

        <template v-for="(m, _i) in msgs" :key="_i">
          <!-- 用户气泡 -->
          <div v-if="m.role === 'user'" class="bubble user">
            <span>{{ m.text }}</span>
          </div>

          <!-- AI 回答 -->
          <div v-else class="bubble ai">
            <template v-if="m.answer?.type === 'clarify'">
              <div class="clarify">
                <div class="cl-msg">{{ m.answer.message }}</div>
                <div class="cl-opts">
                  <button v-for="o in m.answer.options" :key="o" class="btn sm" type="button" @click="onClarifyOption(o)">{{ o }}</button>
                </div>
              </div>
            </template>
            <template v-else-if="m.answer">
              <div class="ans-title">{{ m.answer.title }}</div>
              <div class="ans-conclusion" v-html="m.answer.conclusion"></div>
              <div class="ans-chart"><div ref="answerChartEl" class="ans-chart-canvas"></div></div>
              <table class="ans-tbl">
                <thead>
                  <tr><th>维度</th><th>本期</th><th>上年同期</th><th>同比</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(d, j) in m.answer.dims" :key="d">
                    <td>{{ d }}<span class="sm tx-4" style="margin-left: 6px">{{ m.answer!.drivers?.[j] && m.answer!.drivers[j] !== '—' ? '· ' + (m.answer!.drivers[j] ?? '') : '' }}</span></td>
                    <td class="num">{{ m.answer!.values?.[j] }}</td>
                    <td class="num tx-3">{{ m.answer!.lastYear?.[j] }}</td>
                    <td class="num">{{ m.answer!.yoy?.[j] }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- 取数逻辑透明化（折叠） -->
              <details class="trace">
                <summary>查看取数逻辑（指标 / DSL / SQL / 权限）</summary>
                <div class="trace-row"><span class="f-lbl">指标</span><span class="tag brand">{{ m.answer.explain?.metric }}</span></div>
                <div class="trace-row"><span class="f-lbl">DSL</span><pre class="sql-code">{{ JSON.stringify(m.answer.explain?.dsl, null, 2) }}</pre></div>
                <div class="trace-row"><span class="f-lbl">SQL</span><pre class="sql-code">{{ m.answer.explain?.sql }}</pre></div>
                <div class="trace-row"><span class="f-lbl">权限</span><span class="sm">{{ m.answer.explain?.permission }} · {{ m.answer.explain?.costMs }}ms · 缓存{{ m.answer.explain?.cacheHit ? '命中' : '未命中' }}</span></div>
              </details>

              <!-- 归因 -->
              <div v-if="m.answer.attribution?.length" class="attr">
                <span class="tag warn">归因</span>
                <span v-for="at in m.answer.attribution" :key="at.dim" class="attr-item">{{ at.dim }} {{ at.pct }}%</span>
              </div>

              <!-- 跟进与操作 -->
              <div v-if="m.answer.followup" class="followup">
                <button class="btn sm ghost" type="button" @click="send(m.answer.followup.q)">追问：{{ m.answer.followup.q }}</button>
              </div>
              <div class="ans-ops">
                <button class="btn sm" type="button" @click="saveToChart(m.answer!)">转图表</button>
                <button class="btn sm" type="button" @click="router.push('/dashboard')">添加到看板</button>
                <button class="btn sm" type="button" @click="success('分享链接已复制')">分享</button>
                <span class="sm tx-4" style="margin-left: auto">有用 👍 · 无用 👎</span>
              </div>
            </template>
          </div>
        </template>

        <div v-if="thinking" class="bubble ai thinking">正在理解意图并生成查询 …</div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input">
        <input
          v-model="input"
          class="input grow"
          placeholder="用自然语言提问，Enter 发送（如：上月各采油厂原油产量的同比变化？）"
          @keydown.enter.prevent="send()"
        />
        <button class="btn primary" type="button" :disabled="thinking" @click="send()">发送</button>
      </div>
    </div>

    <!-- 右：能力说明 -->
    <div class="card cap-col">
      <div class="card-title"><i class="bar"></i>可信问数（FR-AI-01~09）</div>
      <div class="cap-item"><span class="tag ok">1</span> 大模型只做<b>意图理解</b>，绝不直接生成 SQL</div>
      <div class="cap-item"><span class="tag ok">2</span> 取数走<b>语义层 DSL 确定性通道</b>，指标必须已认证</div>
      <div class="cap-item"><span class="tag ok">3</span> 全程<b>继承行级权限</b>，敏感列脱敏后出域</div>
      <div class="cap-item"><span class="tag ok">4</span> 取数逻辑<b>全程透明</b>：指标/DSL/SQL 可查</div>
      <div class="cap-item"><span class="tag ok">5</span> 无把握时<b>主动澄清</b>，不猜数</div>
      <div class="cap-foot">当前为演示会话 —— datagear-ai 模块（Phase 2）接入后自动切换真实推理</div>
    </div>
  </div>
</template>

<style scoped>
.chatbi-page { display: grid; grid-template-columns: 220px 1fr 250px; gap: 12px; height: 100%; }
.sess-col { padding: 12px; display: flex; flex-direction: column; min-height: 0; }
.sess-list { flex: 1; overflow-y: auto; margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.sess-item { padding: 8px 10px; border-radius: 9px; cursor: pointer; border: 1px solid transparent; }
.sess-item:hover { background: var(--bg-glass-2); }
.sess-item.sel { border-color: var(--brand-line); background: var(--brand-soft); }
.s-title { font-size: 12px; color: var(--tx-1); }
.s-meta { font-size: 10.5px; color: var(--tx-4); margin-top: 2px; }
.sess-foot { display: flex; flex-direction: column; gap: 4px; padding-top: 10px; border-top: 1px solid var(--line-1); }
.chat-col { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.chat-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--line-1); color: var(--tx-1); }
.chat-scroll { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.chat-welcome { text-align: center; padding: 40px 0; }
.cw-title { font-size: 13px; color: var(--tx-3); margin-bottom: 12px; }
.cw-list { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.cw-item { padding: 8px 18px; border-radius: 10px; border: 1px dashed var(--line-2); font-size: 12.5px; color: var(--tx-2); cursor: pointer; }
.cw-item:hover { border-color: var(--brand-line); color: var(--brand); }
.bubble { max-width: 92%; }
.bubble.user { align-self: flex-end; background: var(--brand-soft); border: 1px solid var(--brand-line); color: var(--tx-1); padding: 9px 14px; border-radius: 12px 12px 2px 12px; font-size: 13px; }
.bubble.ai { align-self: flex-start; width: 100%; background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: 2px 12px 12px 12px; padding: 14px 16px; }
.bubble.thinking { color: var(--tx-3); font-size: 12.5px; width: auto; }
.ans-title { font-size: 14px; font-weight: 700; color: var(--tx-1); margin-bottom: 8px; }
.ans-conclusion { font-size: 13px; color: var(--tx-2); line-height: 1.7; }
.ans-chart { height: 220px; margin: 12px 0; border: 1px solid var(--line-1); border-radius: 10px; padding: 6px; }
.ans-chart-canvas { width: 100%; height: 100%; }
.ans-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.ans-tbl th, .ans-tbl td { border: 1px solid var(--line-1); padding: 6px 10px; text-align: left; }
.ans-tbl th { color: var(--tx-3); font-weight: 600; background: var(--bg-glass); }
.trace { margin-top: 12px; border: 1px solid var(--line-1); border-radius: 10px; padding: 8px 12px; }
.trace summary { font-size: 12px; color: var(--tx-3); cursor: pointer; }
.trace-row { display: flex; gap: 10px; align-items: flex-start; margin-top: 8px; }
.f-lbl { width: 36px; flex: none; font-size: 11px; color: var(--tx-4); }
.trace .sql-code { flex: 1; margin: 0; padding: 8px 10px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11px; color: #9ecbff; white-space: pre-wrap; }
.attr { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; font-size: 12px; color: var(--tx-2); }
.attr-item { padding: 2px 9px; border-radius: 7px; background: var(--bg-glass-2); }
.followup { margin-top: 10px; }
.ans-ops { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line-1); }
.clarify .cl-msg { font-size: 13px; color: var(--tx-2); margin-bottom: 10px; }
.clarify .cl-opts { display: flex; gap: 8px; flex-wrap: wrap; }
.chat-input { flex: none; display: flex; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--line-1); }
.cap-col { padding: 14px; }
.cap-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; color: var(--tx-2); margin-bottom: 10px; line-height: 1.6; }
.cap-foot { font-size: 11px; color: var(--tx-4); margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line-1); }
.w-full { width: 100%; justify-content: center; }
.grow { flex: 1; min-width: 0; }
</style>
