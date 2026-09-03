<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 移动端 H5 原型预览（能源暗域）：手机外壳预览 + 特性清单。
// 注：后端尚无移动端 API，当前为演示数据（参考 prototype/mobile.html）。
const { success } = useOperationMessage()

/* ---------- 演示数据 ---------- */
interface DbItem { n: string; s: string; c: string; bg: string }
const DBS: DbItem[] = [
  { n: '华北油田生产日报', s: '看板 · 12 图表', c: 'var(--oil)', bg: 'var(--oil-soft)' },
  { n: '西气东输管网监控', s: '大屏 · 实时', c: 'var(--gas)', bg: 'var(--gas-soft)' },
  { n: '煤矿安全监控', s: '看板 · 8 图表', c: 'var(--coal)', bg: 'var(--coal-soft)' },
]

interface BoardItem extends DbItem { t: string }
const BOARDS: BoardItem[] = [
  { n: '华北油田生产日报', s: '产量 / 含水 / 注采 · 更新 06:30', c: 'var(--oil)', bg: 'var(--oil-soft)', t: 'tag-oil' },
  { n: '集团经营驾驶舱', s: '四行业总览 · 决策层专享', c: 'var(--brand)', bg: 'var(--brand-soft)', t: 'tag-brand' },
  { n: '西气东输管网监控', s: '管输 / 门站 / 储气库 · 实时', c: 'var(--gas)', bg: 'var(--gas-soft)', t: 'tag-gas' },
  { n: '煤化工经营分析', s: '烯烃 / 甲醇产销存', c: 'var(--chem)', bg: 'var(--chem-soft)', t: 'tag-chem' },
  { n: '煤矿安全监控', s: '瓦斯 / 顶板 / 人员定位', c: 'var(--coal)', bg: 'var(--coal-soft)', t: 'tag-coal' },
]

interface MsgItem { c: string; bg: string; i: string; t: string; s: string }
const MSGS: MsgItem[] = [
  { c: 'var(--danger)', bg: 'var(--danger-soft)', i: 'pi-exclamation-triangle', t: '【告警】长庆区块日产油量低于 100 万吨阈值', s: '08:12 · 深链直达归因看板 ›' },
  { c: 'var(--warn)', bg: 'var(--warn-soft)', i: 'pi-clock', t: '【订阅】经营日报已推送，点击查看', s: '08:00 · 企业微信同步' },
  { c: 'var(--info)', bg: 'var(--info-soft)', i: 'pi-shield', t: '【审批】您的「井口含水率」指标权限已通过', s: '昨天 17:42' },
  { c: 'var(--ok)', bg: 'var(--ok-soft)', i: 'pi-check-circle', t: '【质量】ODS_采油日报表校验通过 98.6%', s: '昨天 22:00' },
]

interface FeatItem { i: string; c: string; bg: string; n: string; d: string; tag: string }
const FEATS: FeatItem[] = [
  { i: 'pi-mobile', c: 'var(--brand)', bg: 'var(--brand-soft)', n: '底部 Tab 五入口', d: '首页 / 看板 / 问数 / 消息 / 我的，消息角标实时提醒', tag: '信息架构' },
  { i: 'pi-arrows-alt', c: 'var(--gas)', bg: 'var(--gas-soft)', n: '手势交互', d: '点按钻取 · 双指缩放图表 · 滑动翻页 · 长按看明细 · 下拉刷新', tag: '交互' },
  { i: 'pi-share-alt', c: 'var(--info)', bg: 'var(--info-soft)', n: '社交分享', d: '看板 / 指标一键分享至微信、企业微信、钉钉，支持二维码', tag: '协同' },
  { i: 'pi-bell', c: 'var(--danger)', bg: 'var(--danger-soft)', n: '推送通知', d: '告警与订阅推送深链直达对应页面，免二次查找', tag: '触达' },
  { i: 'pi-clock', c: 'var(--warn)', bg: 'var(--warn-soft)', n: '离线缓存', d: '弱网环境展示缓存数据，标注「数据更新于 06:30」', tag: '可用性' },
  { i: 'pi-file-edit', c: 'var(--ok)', bg: 'var(--ok-soft)', n: '移动填报', d: '扫码录入 · 拍照上传 · 分步表单 · 草稿箱，适配井场巡检', tag: '采集' },
  { i: 'pi-shield', c: 'var(--chem)', bg: 'var(--chem-soft)', n: '安全防护', d: '动态水印（用户+时间）· 设备绑定 · 异常登录检测', tag: '安全' },
  { i: 'pi-star', c: 'var(--info)', bg: 'var(--info-soft)', n: '轻应用接入', d: '微信 / 企微 / 钉钉工作台免登，租户级 SSO', tag: '生态' },
]

const SEG = [
  { id: 'home', n: '首页' },
  { id: 'board', n: '看板' },
  { id: 'chat', n: '问数' },
  { id: 'msg', n: '消息' },
]

const TABS = [
  { id: 'home', n: '首页', i: 'pi-home', b: 0 },
  { id: 'board', n: '看板', i: 'pi-th-large', b: 0 },
  { id: 'chat', n: '问数', i: 'pi-comments', b: 0 },
  { id: 'msg', n: '消息', i: 'pi-bell', b: 3 },
  { id: 'mine', n: '我的', i: 'pi-user', b: 0 },
]

const activeView = ref('home')
let chatChartInited = false

function switchView(v: string) {
  if (v === 'mine') {
    success('「我的」个人中心功能规划中（演示）')
    return
  }
  activeView.value = v
  if (v === 'chat' && !chatChartInited) {
    chatChartInited = true
    nextTick(() => renderChatChart())
  } else {
    nextTick(() => onResize())
  }
}

/* ---------- 图表 ---------- */
const trendEl = ref<HTMLElement>()
const chatChartEl = ref<HTMLElement>()
let trendChart: ECharts | null = null
let chatChart: ECharts | null = null

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function series(n: number, base: number, wave: number, seed: number): number[] {
  const arr: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.8 + seed) * wave * 0.4 + (Math.random() - 0.48) * wave
    arr.push(Math.max(0, +v.toFixed(2)))
  }
  return arr
}

const tooltipBase = {
  trigger: 'axis',
  backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)',
  textStyle: { color: '#F2F5FA', fontSize: 11 },
}

function renderTrend() {
  if (!trendEl.value) return
  trendChart = trendChart || init(trendEl.value)
  trendChart.setOption({
    grid: { left: 2, right: 6, top: 22, bottom: 2, containLabel: true },
    legend: { data: ['原油', '天然气'], textStyle: { fontSize: 10, color: '#7C88A0' }, itemWidth: 10, itemHeight: 6 },
    tooltip: tooltipBase,
    xAxis: {
      type: 'category', data: WEEK,
      axisLabel: { fontSize: 9, color: '#7C88A0' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 9, color: '#7C88A0' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
    },
    series: [
      {
        name: '原油', type: 'line', smooth: true, symbol: 'none',
        data: series(7, 12.8, 0.5, 1),
        lineStyle: { width: 2, color: '#FF8A3D' }, itemStyle: { color: '#FF8A3D' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(255,138,61,.3)' }, { offset: 1, color: 'rgba(255,138,61,0)' }],
          },
        },
      },
      {
        name: '天然气', type: 'line', smooth: true, symbol: 'none',
        data: series(7, 4.3, 0.2, 3),
        lineStyle: { width: 2, color: '#22D3EE' }, itemStyle: { color: '#22D3EE' },
      },
    ],
  } as EChartsCoreOption)
}

function renderChatChart() {
  if (!chatChartEl.value) return
  chatChart = chatChart || init(chatChartEl.value)
  chatChart.setOption({
    grid: { left: 2, right: 6, top: 8, bottom: 2, containLabel: true },
    tooltip: tooltipBase,
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 9, color: '#7C88A0' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
    },
    yAxis: {
      type: 'category', data: ['长庆', '塔里木', '华北', '大庆'],
      axisLabel: { fontSize: 10, color: '#B9C2D4' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
    },
    series: [{
      type: 'bar', barWidth: 12, data: [39.12, 27.35, 28.94, 23.86],
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#F4633A' }, { offset: 1, color: '#FFB25E' }],
        },
      },
      label: { show: true, position: 'right', color: '#B9C2D4', fontSize: 9.5, fontFamily: 'Barlow' },
    }],
  } as EChartsCoreOption)
}

function onResize() {
  trendChart?.resize()
  chatChart?.resize()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  renderTrend()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  chatChart?.dispose()
})
</script>

<template>
  <div class="mobile-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">移动端 H5 原型预览 <span class="tag tag-brand">演示数据</span></div>
        <div class="page-desc">H5 深化策略 · 不做原生 App：一套 H5 嵌入微信 / 企微 / 钉钉轻应用（PRD 10.11）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('生成体验二维码功能规划中（演示）')">体验二维码</button>
        <button class="btn primary" @click="success('发布到企业微信工作台功能规划中（演示）')">发布轻应用</button>
      </div>
    </div>

    <div class="m-layout">
      <!-- 左：手机框 -->
      <div class="phone-stage">
        <div class="seg">
          <span
            v-for="s in SEG"
            :key="s.id"
            class="seg-item"
            :class="{ active: activeView === s.id }"
            @click="switchView(s.id)"
          >{{ s.n }}</span>
        </div>

        <div class="phone-scale">
          <div class="phone">
            <div class="notch"></div>
            <div class="p-status">
              <span>08:41</span>
              <span class="s-ico">
                <i class="pi pi-signal" style="font-size:11px"></i>
                <i class="pi pi-wifi" style="font-size:11px"></i>
              </span>
            </div>
            <div class="p-screen">
              <!-- 首页视图 -->
              <div class="p-view" :class="{ show: activeView === 'home' }">
                <div class="p-greet">
                  <div>
                    <div class="g-hi">早上好，李明</div>
                    <div class="g-sub">华北油田 · 数据更新于 06:30</div>
                  </div>
                  <div class="g-ava">李</div>
                </div>
                <div class="p-search">
                  <i class="pi pi-search" style="font-size:12px"></i>搜索看板 / 指标，或向 AI 提问…
                </div>
                <div class="p-kpis">
                  <div class="p-kpi" style="--k-glow:rgba(255,138,61,.16)">
                    <div class="k-l"><span class="ind oil" style="padding:0 5px;font-size:9.5px"><i></i>石油</span> 原油产量</div>
                    <div class="k-v">12.86<small> 万吨</small></div>
                    <div class="k-t" style="color:var(--ok)">▲ 2.4% 日环比</div>
                  </div>
                  <div class="p-kpi" style="--k-glow:rgba(34,211,238,.15)">
                    <div class="k-l"><span class="ind gas" style="padding:0 5px;font-size:9.5px"><i></i>天然气</span> 天然气产量</div>
                    <div class="k-v">4.32<small> 亿方</small></div>
                    <div class="k-t" style="color:var(--ok)">▲ 1.8% 日环比</div>
                  </div>
                </div>
                <div class="p-card">
                  <div class="pc-title">近 7 日产量趋势 <span class="more" @click="success('趋势详情功能规划中（演示）')">详情 ›</span></div>
                  <div ref="trendEl" class="chart" style="height:130px;min-height:130px"></div>
                </div>
                <div class="p-card">
                  <div class="pc-title">我的看板 <span class="more" @click="switchView('board')">全部 ›</span></div>
                  <div v-for="d in DBS" :key="d.n" class="p-db-item" @click="success(`打开看板「${d.n}」（演示）`)">
                    <span class="d-ico" :style="{ color: d.c, background: d.bg }"><i class="pi pi-th-large"></i></span>
                    <div style="flex:1;min-width:0"><div class="d-n">{{ d.n }}</div><div class="d-s">{{ d.s }}</div></div>
                    <i class="pi pi-chevron-right" style="font-size:11px;color:var(--tx-4)"></i>
                  </div>
                </div>
              </div>

              <!-- 看板视图 -->
              <div class="p-view" :class="{ show: activeView === 'board' }">
                <div class="p-search"><i class="pi pi-search" style="font-size:12px"></i>搜索看板…</div>
                <div
                  v-for="b in BOARDS"
                  :key="b.n"
                  class="p-card"
                  style="display:flex;align-items:center;gap:10px;margin-bottom:9px;cursor:pointer"
                  @click="success(`打开看板「${b.n}」（演示）`)"
                >
                  <span class="d-ico" :style="{ color: b.c, background: b.bg, width: '34px', height: '34px' }"><i class="pi pi-th-large"></i></span>
                  <div style="flex:1;min-width:0">
                    <div class="d-n" style="font-size:12.5px;font-weight:600">{{ b.n }}</div>
                    <div class="d-s" style="font-size:10px;color:var(--tx-3)">{{ b.s }}</div>
                  </div>
                  <span class="tag" :class="b.t" style="font-size:9.5px">打开</span>
                </div>
              </div>

              <!-- 问数视图 -->
              <div class="p-view" :class="{ show: activeView === 'chat' }">
                <div class="p-chat-q"><div class="q-b">上月各采油厂原油产量排名？</div></div>
                <div class="p-chat-a">
                  <span class="a-ava"><i class="pi pi-star"></i></span>
                  <div class="a-b">已按语义指标「原油产量 M-OIL-001」查询 2026-08 各采油厂产量，长庆油田以 <b style="color:var(--brand)">39.12 万吨</b> 居首，华北油田 28.94 万吨列第三。结果已按您的行级权限过滤。</div>
                </div>
                <div class="p-card">
                  <div class="pc-title">各采油厂产量（万吨）</div>
                  <div ref="chatChartEl" class="chart" style="height:150px;min-height:150px"></div>
                </div>
                <div class="p-input">
                  <div class="in">继续提问，如「同比去年如何？」</div>
                  <div class="send" @click="success('发送问题功能规划中（演示）')"><i class="pi pi-send"></i></div>
                </div>
              </div>

              <!-- 消息视图 -->
              <div class="p-view" :class="{ show: activeView === 'msg' }">
                <div v-for="m in MSGS" :key="m.t" class="p-msg" @click="success('深链跳转对应页面（演示）')">
                  <span class="m-ico" :style="{ color: m.c, background: m.bg }"><i class="pi" :class="m.i"></i></span>
                  <div style="flex:1;min-width:0"><div class="m-t">{{ m.t }}</div><div class="m-s">{{ m.s }}</div></div>
                </div>
              </div>

              <!-- 底部 Tab 栏 -->
              <div class="p-tabbar">
                <div
                  v-for="t in TABS"
                  :key="t.id"
                  class="p-tab"
                  :class="{ active: activeView === t.id }"
                  @click="switchView(t.id)"
                >
                  <i class="pi" :class="t.i"></i>
                  <span>{{ t.n }}</span>
                  <span v-if="t.b" class="badge">{{ t.b }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：特性清单 -->
      <div class="flex-col" style="gap:14px">
        <div class="h5-bar">
          <i class="pi pi-mobile" style="font-size:15px;color:var(--brand);flex:none"></i>
          <span><b>H5 深化策略</b>：不开发原生 App，一套 H5 适配微信 / 企业微信 / 钉钉轻应用免登接入，降低维护成本。</span>
        </div>
        <div class="card">
          <div class="card-title"><span class="bar"></span>移动端特性清单（PRD 6.5）</div>
          <div v-for="f in FEATS" :key="f.n" class="feat-item">
            <span class="f-ico" :style="{ color: f.c, background: f.bg }"><i class="pi" :class="f.i"></i></span>
            <div class="grow">
              <div class="f-n">{{ f.n }}<span class="tag" style="font-size:10px">{{ f.tag }}</span></div>
              <div class="f-d">{{ f.d }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.mobile-page {
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
  --ok: #34D399;   --warn: #FBBF24;  --danger: #F87171;  --info: #60A5FA;
  --ok-soft: rgba(52,211,153,.13);
  --warn-soft: rgba(251,191,36,.13);
  --danger-soft: rgba(248,113,113,.13);
  --info-soft: rgba(96,165,250,.13);
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;
  --font-mono: "JetBrains Mono","SF Mono","Cascadia Code",Consolas,monospace;
  --r-m: 10px;

  position: relative;
  min-height: 100%;
  padding: 20px 24px 40px;
  color: var(--tx-1);
  font-size: 14px; line-height: 1.6;
  background:
    radial-gradient(900px 480px at 85% -10%, rgba(255,138,61,.10), transparent 60%),
    radial-gradient(800px 500px at -10% 110%, rgba(34,211,238,.07), transparent 60%),
    #0A0E17;
}

/* ---- 页头 ---- */
.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 700; letter-spacing: .5px; display: flex; align-items: center; gap: 10px; }
.page-desc { font-size: 13px; color: var(--tx-3); margin-top: 2px; }
.page-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ---- 按钮 ---- */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-family: inherit; font-weight: 500;
  padding: 7px 16px; border-radius: 10px;
  border: 1px solid var(--line-2); background: var(--bg-glass);
  color: var(--tx-1); cursor: pointer; transition: all .18s;
  white-space: nowrap;
}
.btn:hover { background: var(--bg-glass-3); border-color: var(--line-3); }
.btn:active { transform: scale(.97); }
.btn.primary {
  background: var(--brand-grad); border: none; color: #241105; font-weight: 600;
  box-shadow: 0 4px 16px rgba(244,99,58,.3);
}
.btn.primary:hover { filter: brightness(1.1); box-shadow: 0 6px 22px rgba(244,99,58,.42); }

/* ---- 标签 ---- */
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11.5px; padding: 1.5px 8px; border-radius: 6px;
  background: var(--bg-glass-2); color: var(--tx-2); border: 1px solid var(--line-1);
  white-space: nowrap;
}
.tag-brand { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); }
.tag-oil { background: var(--oil-soft); color: var(--oil); border-color: rgba(255,138,61,.3); }
.tag-gas { background: var(--gas-soft); color: var(--gas); border-color: rgba(34,211,238,.3); }
.tag-chem { background: var(--chem-soft); color: var(--chem); border-color: rgba(167,139,250,.3); }
.tag-coal { background: var(--coal-soft); color: var(--coal); border-color: rgba(232,179,60,.3); }

/* ---- 行业标记 ---- */
.ind { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 8px; border-radius: 10px; border: 1px solid transparent; }
.ind i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ind.oil { color: var(--oil); background: var(--oil-soft); border-color: rgba(255,138,61,.3); }
.ind.gas { color: var(--gas); background: var(--gas-soft); border-color: rgba(34,211,238,.3); }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }

/* ---- 布局工具 ---- */
.flex-col { display: flex; flex-direction: column; }
.grow { flex: 1; min-width: 0; }
.chart { width: 100%; }

/* ---- 分段器 ---- */
.seg {
  display: flex; background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 12px; padding: 3px; gap: 2px;
}
.seg-item {
  padding: 5px 18px; font-size: 12.5px; color: var(--tx-3);
  border-radius: 9px; cursor: pointer; transition: all .18s;
}
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }

/* ---- 布局 ---- */
.m-layout { display: grid; grid-template-columns: 6fr 4fr; gap: 20px; align-items: start; }

/* ---- 手机框 ---- */
.phone-stage { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.phone-scale { height: 712px; }
.phone {
  width: 375px; height: 812px; border-radius: 44px; overflow: hidden; position: relative;
  border: 3px solid #2A3550; background: #070A12;
  box-shadow: 0 0 0 6px rgba(255,255,255,.04), 0 30px 80px rgba(0,0,0,.6);
  transform: scale(.86); transform-origin: top center;
}
.phone .notch {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 122px; height: 26px; background: #000; border-radius: 14px; z-index: 10;
  border: 1px solid rgba(255,255,255,.06);
}
.phone .p-status {
  position: absolute; top: 0; left: 0; right: 0; height: 44px; z-index: 9;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 26px 0 30px; font-size: 11.5px; font-family: var(--font-num); color: var(--tx-1);
}
.phone .p-status .s-ico { display: flex; gap: 5px; align-items: center; }
.p-screen { position: absolute; inset: 44px 0 0 0; display: flex; flex-direction: column; }
.p-view { flex: 1; overflow-y: auto; padding: 10px 14px 8px; display: none; }
.p-view.show { display: block; }
.p-view::-webkit-scrollbar { display: none; }

/* 首页元素 */
.p-greet { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.p-greet .g-hi { font-size: 16px; font-weight: 700; }
.p-greet .g-sub { font-size: 10.5px; color: var(--tx-3); }
.p-greet .g-ava {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg,#22D3EE,#0E7490);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #04262C;
}
.p-search {
  display: flex; align-items: center; gap: 7px; padding: 8px 12px; margin-bottom: 12px;
  background: var(--bg-glass-2); border: 1px solid var(--line-1); border-radius: 16px;
  color: var(--tx-4); font-size: 11.5px;
}
.p-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
.p-kpi {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; padding: 11px 12px; position: relative; overflow: hidden;
}
.p-kpi::after {
  content: ""; position: absolute; right: -18px; top: -18px; width: 62px; height: 62px;
  border-radius: 50%; background: var(--k-glow, rgba(255,138,61,.14)); filter: blur(6px);
}
.p-kpi .k-l { font-size: 10.5px; color: var(--tx-3); display: flex; align-items: center; gap: 4px; }
.p-kpi .k-v { font-family: var(--font-num); font-size: 21px; font-weight: 700; margin-top: 2px; }
.p-kpi .k-v small { font-size: 10px; color: var(--tx-3); font-weight: 400; }
.p-kpi .k-t { font-size: 10px; font-family: var(--font-num); margin-top: 2px; }
.p-card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; padding: 12px; margin-bottom: 12px;
}
.p-card .pc-title {
  font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.p-card .pc-title .more { font-size: 10.5px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.p-db-item {
  display: flex; align-items: center; gap: 9px; padding: 9px 0;
  border-bottom: 1px solid rgba(255,255,255,.05); cursor: pointer;
}
.p-db-item:last-child { border-bottom: none; }
.p-db-item .d-ico, .d-ico {
  width: 30px; height: 30px; border-radius: 9px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.p-db-item .d-n { font-size: 12px; font-weight: 600; }
.p-db-item .d-s { font-size: 10px; color: var(--tx-3); }

/* 问数视图 */
.p-chat-q { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.p-chat-q .q-b {
  background: var(--brand-grad); color: #241105;
  font-size: 12px; font-weight: 600; padding: 8px 12px;
  border-radius: 14px 14px 4px 14px; max-width: 82%;
}
.p-chat-a { display: flex; gap: 8px; margin-bottom: 12px; }
.p-chat-a .a-ava {
  width: 26px; height: 26px; border-radius: 8px; flex: none;
  background: var(--brand-soft); color: var(--brand);
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.p-chat-a .a-b {
  background: var(--bg-glass-2); border: 1px solid var(--line-1);
  font-size: 11.5px; color: var(--tx-2); padding: 9px 11px;
  border-radius: 4px 14px 14px 14px; max-width: 86%; line-height: 1.6;
}
.p-input { display: flex; gap: 8px; margin-top: 4px; }
.p-input .in {
  flex: 1; background: var(--bg-glass-2); border: 1px solid var(--line-1);
  border-radius: 16px; padding: 8px 12px; font-size: 11.5px; color: var(--tx-4);
}
.p-input .send {
  width: 34px; height: 34px; border-radius: 50%; flex: none;
  background: var(--brand-grad); display: flex; align-items: center; justify-content: center;
  color: #241105; cursor: pointer; font-size: 14px;
}

/* 消息视图 */
.p-msg {
  display: flex; gap: 10px; padding: 11px 0;
  border-bottom: 1px solid rgba(255,255,255,.05); cursor: pointer;
}
.p-msg .m-ico {
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 15px;
}
.p-msg .m-t { font-size: 12px; font-weight: 600; color: var(--tx-1); }
.p-msg .m-s { font-size: 10.5px; color: var(--tx-3); margin-top: 1px; }

/* 底部 Tab 栏 */
.p-tabbar {
  flex: none; height: 62px; border-top: 1px solid var(--line-1);
  background: rgba(13,20,32,.92); display: flex; padding-bottom: 8px;
}
.p-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; font-size: 9.5px; color: var(--tx-4); cursor: pointer; position: relative;
}
.p-tab .pi { font-size: 18px; }
.p-tab.active { color: var(--brand); }
.p-tab .badge {
  position: absolute; top: 5px; right: calc(50% - 17px);
  background: var(--danger); color: #fff; font-size: 8px;
  border-radius: 7px; padding: 0 4px; font-family: var(--font-num);
}

/* ---- 特性清单 ---- */
.feat-item { display: flex; gap: 12px; padding: 11px 2px; border-bottom: 1px solid rgba(255,255,255,.045); }
.feat-item:last-child { border-bottom: none; }
.feat-item .f-ico {
  width: 34px; height: 34px; border-radius: 9px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.feat-item .f-n { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.feat-item .f-d { font-size: 11.5px; color: var(--tx-3); margin-top: 2px; line-height: 1.6; }
.h5-bar {
  display: flex; align-items: center; gap: 10px; padding: 11px 16px; margin-bottom: 14px;
  background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: var(--r-m);
  font-size: 12.5px; color: var(--tx-2);
}
.h5-bar b { color: var(--brand); }

/* ---- 响应式 ---- */
@media (max-width: 1100px) { .m-layout { grid-template-columns: 1fr; } }
</style>
