<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOperationMessage } from '@/composables/useOperationMessage'
import { init, use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 智能问数（ChatBI 演示会话）：三栏工作台 —— 会话历史 / 对话主区 / 取数透明化。
// 注：后端尚无 ChatBI 服务，对话为演示内容；发送问题会得到演示回复。
const auth = useAuthStore()
const { success } = useOperationMessage()

const userInitial = computed(() => {
  const n = auth.user?.realName || auth.user?.name || '我'
  return n.slice(0, 1).toUpperCase()
})

/* ---------- 会话历史（演示） ---------- */
const HIST = [
  { group: '今天', items: [
    { t: '上月各采油厂产量同比', s: '4 轮问答 · 09:12', active: true },
    { t: '华东管网输差分析', s: '2 轮问答 · 08:47' },
    { t: '甲醇装置开工率趋势', s: '1 轮问答 · 07:55' },
  ]},
  { group: '昨天', items: [
    { t: '吨油完全成本环比拆解', s: '5 轮问答 · 昨天 17:20' },
    { t: '瓦斯超限次数排名', s: '3 轮问答 · 昨天 15:02' },
    { t: '原煤入洗率达标情况', s: '2 轮问答 · 昨天 10:38' },
  ]},
  { group: '本周', items: [
    { t: '储气库注采平衡测算', s: '6 轮问答 · 周二' },
    { t: '炼化装置能耗对标', s: '3 轮问答 · 周一' },
  ]},
]
const activeHist = ref('上月各采油厂产量同比')
function pickHist(t: string) {
  activeHist.value = t
  success(`已加载会话「${t}」（演示）`)
}
function newSession() {
  success('已新建问数会话（演示）')
}

/* ---------- 对话消息 ---------- */
interface Msg {
  role: 'user' | 'ai'
  text?: string
  demo?: boolean
}
const messages = ref<Msg[]>([])
const input = ref('')
const chatScrollEl = ref<HTMLElement>()
const sending = ref(false)

const CHIPS = ['今日原煤产量', '甲醇装置开工率趋势', '瓦斯超限次数排名', '管输量月度计划完成率']

async function scrollBottom() {
  await nextTick()
  chatScrollEl.value?.scrollTo({ top: chatScrollEl.value.scrollHeight, behavior: 'smooth' })
}

async function send(text?: string) {
  const q = (text ?? input.value).trim()
  if (!q || sending.value) return
  messages.value.push({ role: 'user', text: q })
  input.value = ''
  sending.value = true
  await scrollBottom()
  setTimeout(async () => {
    messages.value.push({
      role: 'ai',
      text: `已收到问题「${q}」。智能问数后端服务（Text2DSL → 语义层 → 指标引擎）正在接入中，当前为演示会话；上方示例展示了完整的问数、归因与取数透明化能力。`,
    })
    sending.value = false
    await scrollBottom()
  }, 900)
}
function chipAsk(c: string) {
  send(c)
}

/* ---------- 演示图表 ---------- */
const chatBarEl = ref<HTMLElement>()
const attrLineEl = ref<HTMLElement>()
let charts: ECharts[] = []

const baseTooltip = {
  backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)',
  textStyle: { color: '#F2F5FA', fontSize: 12 }, confine: true,
}

function renderCharts() {
  if (chatBarEl.value) {
    const c = init(chatBarEl.value)
    c.setOption({
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: { data: ['8月产量(万吨)', '同比(%)'], textStyle: { color: '#7C88A0', fontSize: 11 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect', top: 2 },
      grid: { top: 30, left: 8, right: 12, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: ['长庆', '大庆', '塔里木', '胜利', '华北'], axisLine: { lineStyle: { color: 'rgba(255,255,255,.14)' } }, axisTick: { show: false }, axisLabel: { color: '#7C88A0', fontSize: 11 } },
      yAxis: [
        { type: 'value', name: '万吨', nameTextStyle: { color: '#7C88A0' }, axisLabel: { color: '#7C88A0', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } } },
        { type: 'value', name: '%', min: -4, max: 14, splitLine: { show: false }, nameTextStyle: { color: '#7C88A0' }, axisLabel: { color: '#7C88A0', fontSize: 11 } },
      ],
      series: [
        { name: '8月产量(万吨)', type: 'bar', barWidth: 26,
          itemStyle: { borderRadius: [5,5,0,0], color: { type: 'linear', x:0, y:0, x2:0, y2:1, colorStops: [{ offset: 0, color: '#FF8A3D' }, { offset: 1, color: 'rgba(244,99,58,.35)' }] } },
          data: [94.8, 98.1, 71.5, 68.2, 52.6] },
        { name: '同比(%)', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 7,
          lineStyle: { width: 2.2, color: '#22D3EE' }, itemStyle: { color: '#22D3EE' },
          data: [12.3, -1.8, 5.3, 2.6, 2.9] },
      ],
    } as EChartsCoreOption)
    charts.push(c)
  }
  if (attrLineEl.value) {
    const c = init(attrLineEl.value)
    c.setOption({
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: { data: ['长庆日产量(吨)', '去年同期'], textStyle: { color: '#7C88A0', fontSize: 11 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect', top: 2 },
      grid: { top: 30, left: 8, right: 12, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: ['7/25','8/1','8/6','8/11','8/16','8/21','8/26','8/31'], axisLabel: { fontSize: 10, color: '#7C88A0' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,.14)' } }, axisTick: { show: false } },
      yAxis: { type: 'value', name: '吨/日', nameTextStyle: { color: '#7C88A0', fontSize: 10 }, axisLabel: { color: '#7C88A0', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } } },
      series: [
        { name: '长庆日产量(吨)', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2.2, color: '#FF8A3D' },
          areaStyle: { color: { type: 'linear', x:0, y:0, x2:0, y2:1, colorStops: [{ offset: 0, color: 'rgba(255,138,61,.25)' }, { offset: 1, color: 'rgba(255,138,61,0)' }] } },
          data: [29800, 30500, 31200, 30800, 31600, 32100, 31900, 32400] },
        { name: '去年同期', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 1.6, type: 'dashed', color: '#7C88A0' },
          data: [27600, 27500, 27800, 27700, 27900, 28100, 28000, 28200] },
      ],
    } as EChartsCoreOption)
    charts.push(c)
  }
}

function onResize() {
  charts.forEach((c) => c.resize())
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  renderCharts()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  charts.forEach((c) => c.dispose())
})
</script>

<template>
  <div class="chatbi-page">
    <div class="chat-bench">
      <!-- ===== 左：会话历史 ===== -->
      <div class="card chat-col">
        <div class="hist-head">
          <b>会话历史</b>
          <button class="btn sm primary" @click="newSession"><i class="pi pi-plus"></i>新会话</button>
        </div>
        <div class="hist-list">
          <template v-for="g in HIST" :key="g.group">
            <div class="hist-group">{{ g.group }}</div>
            <div
              v-for="it in g.items"
              :key="it.t"
              class="hist-item"
              :class="{ active: activeHist === it.t }"
              @click="pickHist(it.t)"
            >
              <div class="h-t">{{ it.t }}</div>
              <div class="h-s">{{ it.s }}</div>
            </div>
          </template>
        </div>
      </div>

      <!-- ===== 中：对话主区 ===== -->
      <div class="chat-col chat-main">
        <div class="status-tags">
          <span class="tag tag-brand">DeepSeek-V3 · BYO-LLM 接入</span>
          <span class="tag tag-info">语义层已连接 · 86 指标</span>
          <span class="tag tag-ok">行级权限继承开启</span>
          <span class="tag tag-demo">演示会话</span>
        </div>

        <div ref="chatScrollEl" class="chat-scroll">
          <!-- 演示对话：用户提问 -->
          <div class="msg user">
            <div class="m-avatar">{{ userInitial }}</div>
            <div class="bubble-user">上月各采油厂原油产量的同比变化？</div>
          </div>

          <!-- AI 回复（含图表 + 表格 + 归因） -->
          <div class="msg ai">
            <div class="m-avatar"><i class="pi pi-star"></i></div>
            <div class="bubble-ai">
              <div class="ai-conclusion">
                上月（2026年8月）全集团原油产量 <b>385.2</b> 万吨，同比 <b class="tx-ok">+5.1%</b>。
                其中 <b>长庆采油厂</b> 增幅最大，同比 <b class="tx-ok">+12.3%</b>（+10.4 万吨），
                主要来自安塞区块新井投产；大庆采油厂同比 <b class="tx-danger">-1.8%</b>，受老区自然递减影响。
              </div>
              <div ref="chatBarEl" class="msg-chart"></div>
              <div class="ai-table table-wrap">
                <table class="tbl">
                  <thead><tr><th>采油厂</th><th class="num">8月产量(万吨)</th><th class="num">去年同期</th><th class="num">同比</th><th>主要驱动区块</th></tr></thead>
                  <tbody>
                    <tr><td class="cell-main">长庆采油厂</td><td class="num">94.8</td><td class="num">84.4</td><td class="num tx-ok">+12.3%</td><td>安塞 · 靖安</td></tr>
                    <tr><td class="cell-main">塔里木采油厂</td><td class="num">71.5</td><td class="num">67.9</td><td class="num tx-ok">+5.3%</td><td>轮南 · 哈得</td></tr>
                    <tr><td class="cell-main">胜利采油厂</td><td class="num">68.2</td><td class="num">66.5</td><td class="num tx-ok">+2.6%</td><td>孤岛 · 孤东</td></tr>
                    <tr><td class="cell-main">华北采油厂</td><td class="num">52.6</td><td class="num">51.1</td><td class="num tx-ok">+2.9%</td><td>任丘 · 霸州</td></tr>
                    <tr><td class="cell-main">大庆采油厂</td><td class="num">98.1</td><td class="num">99.9</td><td class="num tx-danger">-1.8%</td><td>萨尔图老区</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="attr-card">
                <div class="a-t"><i class="pi pi-star"></i>产量波动归因 · 维度贡献度</div>
                <div class="attr-row"><span class="a-name">区块</span><div class="progress"><i style="width:82%"></i></div><span class="a-v">贡献 62%<span class="attr-top">Top</span></span></div>
                <div class="attr-row"><span class="a-name">油藏类型</span><div class="progress"><i style="width:44%;background:linear-gradient(90deg,#22D3EE,#0E7490)"></i></div><span class="a-v">贡献 23%</span></div>
                <div class="attr-row"><span class="a-name">井别</span><div class="progress"><i style="width:26%;background:linear-gradient(90deg,#A78BFA,#6D28D9)"></i></div><span class="a-v">贡献 11%</span></div>
              </div>
              <div class="ai-ops">
                <button class="btn sm" @click="success('已转为看板草稿（演示）')">转为看板</button>
                <button class="btn sm" @click="success('导出 Excel 功能规划中')">导出 Excel</button>
                <button class="btn sm ghost" @click="success('已收藏（演示）')">收藏</button>
                <button class="btn sm ghost" @click="success('纠错反馈已提交（演示）')">纠错反馈</button>
              </div>
              <div class="m-time">09:12:26 · 耗时 2.4s · 命中语义层指标「原油产量 M-OIL-001」</div>
            </div>
          </div>

          <!-- 演示对话：追问 -->
          <div class="msg user">
            <div class="m-avatar">{{ userInitial }}</div>
            <div class="bubble-user">长庆为什么涨这么多？</div>
          </div>
          <div class="msg ai">
            <div class="m-avatar"><i class="pi pi-star"></i></div>
            <div class="bubble-ai">
              <div class="ai-conclusion">
                长庆采油厂 8 月同比 +12.3%，主要由三方面驱动：
                ① <b>安塞区块</b> 王窑作业区 14 口新井 7 月下旬投产，贡献增量 <b>+6.2</b> 万吨（贡献度 60%）；
                ② <b>靖安区块</b> 老井措施复配（压裂+补孔）增油 <b>+2.8</b> 万吨（27%）；
                ③ 去年同期 H2S 治理停井形成低基数，约 <b>+1.4</b> 万吨（13%）。
                风险提示：新井递减速率高于方案预期 0.8pct，建议关注 10 月稳产能力。
              </div>
              <div ref="attrLineEl" class="msg-chart sm-chart"></div>
              <div class="ai-ops">
                <button class="btn sm" @click="success('已下钻至安塞区块单井明细（演示）')">下钻安塞区块</button>
                <button class="btn sm ghost" @click="success('已订阅「长庆产量异动」告警（演示）')">订阅异动告警</button>
              </div>
              <div class="m-time">09:13:04 · 耗时 3.1s · 归因引擎 v2（维度拆解 + 基数修正）</div>
            </div>
          </div>

          <!-- 动态消息 -->
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="msg"
            :class="m.role"
          >
            <div class="m-avatar">
              <i v-if="m.role === 'ai'" class="pi pi-star"></i>
              <template v-else>{{ userInitial }}</template>
            </div>
            <div v-if="m.role === 'user'" class="bubble-user">{{ m.text }}</div>
            <div v-else class="bubble-ai">
              <div class="ai-conclusion">{{ m.text }}</div>
            </div>
          </div>
          <div v-if="sending" class="msg ai">
            <div class="m-avatar"><i class="pi pi-star"></i></div>
            <div class="bubble-ai"><div class="ai-conclusion thinking">正在经语义层取数…</div></div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="chat-input-wrap">
          <div class="chips">
            <span v-for="c in CHIPS" :key="c" class="chip" @click="chipAsk(c)">{{ c }}</span>
          </div>
          <div class="chat-input">
            <input
              v-model="input"
              placeholder="用业务语言提问，如「上月各采油厂原油产量同比？」— 将自动命中语义层指标"
              @keyup.enter="send()"
            />
            <button class="send-btn" title="发送" :disabled="sending" @click="send()">
              <i class="pi pi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 右：取数逻辑透明化 ===== -->
      <div class="card chat-col right trace-panel">
        <div class="card-title"><span class="bar"></span>取数逻辑透明化</div>

        <div class="trace-step">
          <div class="ts-dot">1</div>
          <div class="ts-t">意图识别（Text2DSL）</div>
          <div class="ts-kv">
            <div><span class="k">指标：</span><b>原油产量</b> <span class="mc-code tag">M-OIL-001</span></div>
            <div><span class="k">维度：</span><b>采油厂</b></div>
            <div><span class="k">时间：</span><b>上月（2026-08）</b> · 粒度 月</div>
            <div><span class="k">对比：</span><b>同比（去年同期）</b></div>
          </div>
        </div>

        <div class="trace-step">
          <div class="ts-dot">2</div>
          <div class="ts-t">DSL 中间层（语义层 Grounding）</div>
          <div class="code-block">{
  <span class="st">"metric"</span>: <span class="st">"M-OIL-001"</span>,
  <span class="st">"dimensions"</span>: [<span class="st">"plant"</span>],
  <span class="st">"time_range"</span>: {
    <span class="st">"type"</span>: <span class="st">"last_month"</span>,
    <span class="st">"granularity"</span>: <span class="st">"month"</span>
  },
  <span class="st">"compare"</span>: <span class="st">"yoy"</span>,
  <span class="st">"filters"</span>: [
    { <span class="st">"well_status"</span>: <span class="st">"生产井"</span> }
  ]
}</div>
        </div>

        <div class="trace-step">
          <div class="ts-dot">3</div>
          <div class="ts-t">编译 SQL（指标引擎）</div>
          <div class="code-block"><span class="kw">SELECT</span> plant_name,
  <span class="fn">SUM</span>(commercial_qty) qty
<span class="kw">FROM</span> ods_fact_oil_daily
<span class="kw">WHERE</span> dt <span class="kw">BETWEEN</span>
  <span class="pc">${pc(month_start)}</span>
  <span class="kw">AND</span> <span class="pc">${pc(month_end)}</span>
<span class="cm">-- 行级权限注入</span>
<span class="kw">AND</span> org_id <span class="kw">IN</span>
  (<span class="pc">${pc(user_orgs)}</span>)
<span class="kw">GROUP BY</span> plant_name;</div>
        </div>

        <div class="trace-step">
          <div class="ts-dot">4</div>
          <div class="ts-t">权限与脱敏继承</div>
          <div class="ts-kv" style="margin-bottom:8px">已按你的身份自动套用数据权限，无需手工声明：</div>
          <div class="trace-tags">
            <span class="tag tag-info">行级权限：仅华北油田分公司</span>
            <span class="tag tag-warn">敏感列「单井坐标」已脱敏</span>
            <span class="tag tag-ok">指标口径已认证 v1.2</span>
          </div>
        </div>

        <div class="trace-step">
          <div class="ts-dot">5</div>
          <div class="ts-t">执行与缓存</div>
          <div class="ts-kv">
            <div><span class="k">引擎：</span><b>StarRocks 集群（信创）</b></div>
            <div><span class="k">扫描行数：</span><b class="num">128,406</b> 行</div>
            <div><span class="k">缓存：</span>命中语义层结果缓存（TTL 10min）</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.chatbi-page {
  --bg-glass: rgba(255,255,255,.035);
  --bg-glass-2: rgba(255,255,255,.06);
  --bg-glass-3: rgba(255,255,255,.09);
  --line-1: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --tx-1: #F2F5FA;
  --tx-2: #B9C2D4;
  --tx-3: #7C88A0;
  --tx-4: #525D75;
  --brand: #FF8A3D;
  --brand-grad: linear-gradient(135deg,#FFB25E 0%,#FF8A3D 45%,#F4633A 100%);
  --brand-soft: rgba(255,138,61,.14);
  --brand-line: rgba(255,138,61,.35);
  --ok: #34D399;  --warn: #FBBF24;  --danger: #F87171;  --info: #60A5FA;
  --gas: #22D3EE; --chem: #A78BFA;
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;
  --font-mono: "JetBrains Mono","SF Mono","Cascadia Code",Consolas,monospace;

  height: 100%;
  padding: 14px 18px 18px;
  color: var(--tx-1);
  font-size: 14px; line-height: 1.6;
  background:
    radial-gradient(900px 480px at 85% -10%, rgba(255,138,61,.10), transparent 60%),
    radial-gradient(800px 500px at -10% 110%, rgba(34,211,238,.07), transparent 60%),
    #0A0E17;
  overflow: hidden;
}

.chat-bench {
  display: grid; grid-template-columns: 240px 1fr 320px; gap: 14px;
  height: 100%;
}
.chat-col { display: flex; flex-direction: column; min-height: 0; }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }

/* ---- 按钮 / 标签 ---- */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-family: inherit; font-weight: 500;
  padding: 7px 16px; border-radius: 10px;
  border: 1px solid var(--line-2); background: var(--bg-glass);
  color: var(--tx-1); cursor: pointer; transition: all .18s; white-space: nowrap;
}
.btn:hover { background: var(--bg-glass-3); border-color: var(--line-3, rgba(255,255,255,.18)); }
.btn:active { transform: scale(.97); }
.btn.primary { background: var(--brand-grad); border: none; color: #241105; font-weight: 600; box-shadow: 0 4px 16px rgba(244,99,58,.3); }
.btn.primary:hover { filter: brightness(1.1); }
.btn.ghost { border-color: transparent; background: transparent; color: var(--tx-2); }
.btn.ghost:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.btn.sm { padding: 4px 10px; font-size: 12px; border-radius: 8px; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11.5px; padding: 1.5px 8px; border-radius: 6px;
  background: var(--bg-glass-2); color: var(--tx-2); border: 1px solid var(--line-1); white-space: nowrap;
}
.tag-brand { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); }
.tag-ok { background: rgba(52,211,153,.13); color: var(--ok); border-color: rgba(52,211,153,.3); }
.tag-warn { background: rgba(251,191,36,.13); color: var(--warn); border-color: rgba(251,191,36,.3); }
.tag-info { background: rgba(96,165,250,.13); color: var(--info); border-color: rgba(96,165,250,.3); }
.tag-demo { margin-left: auto; }

/* ---- 左：会话历史 ---- */
.hist-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13.5px; }
.hist-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.hist-item { padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: background .18s; font-size: 12.5px; color: var(--tx-2); }
.hist-item:hover { background: var(--bg-glass-2); }
.hist-item.active { background: var(--brand-soft); color: var(--brand); }
.h-t { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-s { font-size: 10.5px; color: var(--tx-4); margin-top: 2px; }
.hist-group { font-size: 10.5px; color: var(--tx-4); letter-spacing: 1px; padding: 8px 12px 4px; }

/* ---- 中：对话主区 ---- */
.chat-main { min-height: 0; }
.status-tags { display: flex; flex-wrap: wrap; gap: 8px; flex: none; padding: 2px 6px 12px; }
.chat-scroll {
  flex: 1; overflow-y: auto; padding: 4px 6px 12px;
  display: flex; flex-direction: column; gap: 16px;
}
.chat-scroll::-webkit-scrollbar { width: 6px; }
.chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
.msg { display: flex; gap: 10px; max-width: 92%; }
.msg.user { align-self: flex-end; flex-direction: row-reverse; }
.m-avatar {
  width: 30px; height: 30px; border-radius: 9px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
}
.msg.user .m-avatar { background: linear-gradient(135deg,#22D3EE,#0E7490); color: #04262C; }
.msg.ai .m-avatar { background: var(--brand-grad); color: #241105; box-shadow: 0 0 24px rgba(255,138,61,.25); }
.msg.ai .m-avatar .pi { font-size: 15px; }
.bubble-user {
  background: var(--brand-soft); border: 1px solid var(--brand-line);
  border-radius: 14px 4px 14px 14px; padding: 10px 14px; font-size: 13.5px;
}
.bubble-ai {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 4px 14px 14px 14px; padding: 14px 16px; flex: 1; min-width: 0;
}
.m-time { font-size: 10.5px; color: var(--tx-4); margin-top: 10px; }
.ai-conclusion { font-size: 13.5px; line-height: 1.75; }
.ai-conclusion b { color: var(--brand); font-family: var(--font-num); }
.ai-conclusion .tx-ok { color: var(--ok); }
.ai-conclusion .tx-danger { color: var(--danger); }
.thinking { color: var(--tx-3); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
.msg-chart { height: 230px; margin-top: 10px; width: 100%; }
.msg-chart.sm-chart { height: 170px; }

.ai-table { margin-top: 12px; }
.table-wrap { overflow: auto; border: 1px solid var(--line-1); border-radius: 14px; background: var(--bg-glass); }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl thead th {
  text-align: left; font-weight: 600; font-size: 11.5px; color: var(--tx-3);
  padding: 8px 10px; border-bottom: 1px solid var(--line-1);
  background: rgba(255,255,255,.02); white-space: nowrap;
}
.tbl tbody td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.045); color: var(--tx-2); font-size: 12.5px; }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl .num { font-family: var(--font-num); color: var(--tx-1); }
.tbl .cell-main { color: var(--tx-1); font-weight: 500; }

.attr-card {
  margin-top: 12px; border: 1px solid var(--line-1); border-radius: 10px;
  background: rgba(255,255,255,.02); padding: 12px 14px;
}
.a-t { font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.a-t .pi { font-size: 13px; color: var(--brand); }
.attr-row { display: flex; align-items: center; gap: 10px; font-size: 12px; padding: 4px 0; }
.a-name { width: 76px; flex: none; color: var(--tx-2); }
.progress { flex: 1; height: 6px; border-radius: 3px; background: var(--bg-glass-2); overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: 3px; background: var(--brand-grad); }
.a-v { width: 74px; text-align: right; font-family: var(--font-num); color: var(--tx-1); }
.attr-top { font-size: 10.5px; color: var(--brand); border: 1px solid var(--brand-line); border-radius: 6px; padding: 0 6px; margin-left: 6px; }

.ai-ops { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

/* ---- 输入区 ---- */
.chat-input-wrap { flex: none; padding-top: 12px; }
.chips { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.chip {
  font-size: 12px; color: var(--tx-2); padding: 5px 12px; border-radius: 14px; cursor: pointer;
  background: var(--bg-glass); border: 1px solid var(--line-1); transition: all .18s;
}
.chip:hover { border-color: var(--brand-line); color: var(--brand); }
.chat-input {
  display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 16px;
  background: rgba(7,10,18,.6); border: 1px solid var(--line-2); border-radius: 18px;
}
.chat-input:focus-within { border-color: var(--brand-line); box-shadow: 0 0 24px rgba(255,138,61,.25); }
.chat-input input {
  flex: 1; background: none; border: none; outline: none;
  color: var(--tx-1); font-size: 13.5px; font-family: inherit;
}
.chat-input input::placeholder { color: var(--tx-4); }
.send-btn {
  width: 36px; height: 36px; border-radius: 12px; border: none; cursor: pointer;
  background: var(--brand-grad); color: #241105;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(244,99,58,.35);
  transition: filter .18s;
}
.send-btn:hover { filter: brightness(1.1); }
.send-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ---- 右：取数透明化 ---- */
.trace-panel { padding: 14px 16px; overflow-y: auto; }
.trace-panel::-webkit-scrollbar { width: 6px; }
.trace-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
.trace-step { position: relative; padding-left: 26px; padding-bottom: 18px; }
.trace-step::before {
  content: ""; position: absolute; left: 8px; top: 20px; bottom: -2px;
  width: 1px; background: var(--line-2);
}
.trace-step:last-child::before { display: none; }
.ts-dot {
  position: absolute; left: 0; top: 2px; width: 17px; height: 17px; border-radius: 50%;
  background: var(--brand-soft); border: 1px solid var(--brand-line);
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-family: var(--font-num); color: var(--brand); font-weight: 700;
}
.ts-t { font-size: 12.5px; font-weight: 600; margin-bottom: 6px; }
.ts-kv { font-size: 11.5px; color: var(--tx-2); line-height: 1.8; }
.ts-kv b { color: var(--tx-1); }
.ts-kv .k { color: var(--tx-3); }
.ts-kv .num { font-family: var(--font-num); }
.mc-code { font-size: 11px; font-family: var(--font-mono); }
.trace-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.code-block {
  background: rgba(5,8,14,.8); border: 1px solid var(--line-1); border-radius: 10px;
  padding: 10px 12px; font-family: var(--font-mono); font-size: 10.5px; line-height: 1.7;
  color: #C9D4E8; overflow-x: auto; white-space: pre; margin-top: 6px;
}
.code-block .kw { color: #FF8A3D; }
.code-block .fn { color: #22D3EE; }
.code-block .cm { color: #525D75; }
.code-block .pc { color: #E8B33C; }
.code-block .st { color: #34D399; }

/* ---- 响应式 ---- */
@media (max-width: 1200px) {
  .chat-bench { grid-template-columns: 200px 1fr; }
  .chat-col.right { display: none; }
}
@media (max-width: 860px) {
  .chat-bench { grid-template-columns: 1fr; }
  .chat-col:first-child { display: none; }
}
</style>
