<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart, BarChart, ScatterChart, EffectScatterChart, LinesChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'

use([LineChart, BarChart, ScatterChart, EffectScatterChart, LinesChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 集团能源生产运营驾驶舱（能源暗域）：1920×1080 舞台自适应缩放的大屏页面。
// 注：后端尚无大屏数据接口，当前为演示数据（参考 prototype/screen.html）。
const { success } = useOperationMessage()

/* ---------- 演示数据 ---------- */
const C = { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', warn: '#FBBF24', info: '#60A5FA', ok: '#34D399', danger: '#F87171' }

interface IndRow { n: string; v: string; u: string; yoy: string; up: boolean; c: string; bg: string; icon: string }
const inds: IndRow[] = [
  { n: '原油',   v: '12.86', u: '万吨', yoy: '5.1%', up: true,  c: 'var(--oil)',  bg: 'var(--oil-soft)',  icon: 'pi-bolt' },
  { n: '天然气', v: '4.32',  u: '亿方', yoy: '8.6%', up: true,  c: 'var(--gas)',  bg: 'var(--gas-soft)',  icon: 'pi-cloud' },
  { n: '化工品', v: '3.15',  u: '万吨', yoy: '3.2%', up: true,  c: 'var(--chem)', bg: 'var(--chem-soft)', icon: 'pi-cog' },
  { n: '原煤',   v: '28.4',  u: '万吨', yoy: '0.1%', up: false, c: 'var(--coal)', bg: 'var(--coal-soft)', icon: 'pi-database' },
]

interface RateRow { n: string; v: number; c: string }
const rates: RateRow[] = [
  { n: '原油 · 月度计划',   v: 96.4,  c: 'linear-gradient(90deg,#FFB25E,#F4633A)' },
  { n: '天然气 · 月度计划', v: 102.8, c: 'linear-gradient(90deg,#22D3EE,#0E7490)' },
  { n: '化工品 · 月度计划', v: 91.2,  c: 'linear-gradient(90deg,#A78BFA,#6D28D9)' },
  { n: '原煤 · 月度计划',   v: 98.7,  c: 'linear-gradient(90deg,#E8B33C,#92610A)' },
]

type StationStatus = 'run' | 'mnt' | 'stp'
const stations: [string, StationStatus][] = [
  ['任11', 'run'], ['霸二联', 'run'], ['岔一转', 'mnt'], ['留北', 'stp'], ['深县', 'run'], ['河间', 'run'],
  ['安塞', 'run'], ['靖安', 'run'], ['轮南', 'run'], ['哈得', 'run'], ['孤岛', 'run'], ['孤东', 'run'],
  ['克一门站', 'run'], ['轮南首站', 'run'], ['靖边压气站', 'run'], ['霍尔果斯', 'run'], ['郑州分输', 'mnt'], ['上海末站', 'run'],
  ['甲醇一厂', 'run'], ['烯烃装置', 'run'], ['常减压', 'run'], ['催化', 'mnt'], ['洗煤一厂', 'stp'], ['洗煤二厂', 'run'],
]

type AlarmLevel = 'danger' | 'warn' | 'info'
const ALARM_POOL: [AlarmLevel, string][] = [
  ['danger', '留路北井场 外输压力异常 3.2MPa（阈值≥3.6）'],
  ['warn',   '大同煤矿 1309 工作面 瓦斯浓度预警 0.82%'],
  ['danger', '岔河集一转油站 2#外输泵 轴承温度 86℃ 超限'],
  ['warn',   '西气东输郑州分输站 瞬时流量波动 +12%'],
  ['warn',   '塔里木哈得区块 H₂S 检测点 HD-07 浓度 12ppm'],
  ['info',   '安塞区块王窑作业区 新井 WY-14 投产见油'],
  ['danger', '甲醇一厂 合成塔触媒层温差 +9℃ 偏离'],
  ['warn',   '霸州二联合站 污水外排 COD 接近限值'],
  ['info',   '胜利孤东区块 日注水量恢复至计划线'],
  ['warn',   '洗煤一厂 精煤灰分 10.6% 逼近上限 11%'],
]
const ALARM_TAG: Record<AlarmLevel, string> = { danger: '紧急', warn: '预警', info: '提示' }
interface AlarmItem { time: string; lv: AlarmLevel; msg: string }
const alarms = ref<AlarmItem[]>([])
let alarmIdx = 0
function pushAlarm() {
  const [lv, msg] = ALARM_POOL[alarmIdx % ALARM_POOL.length]; alarmIdx++
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
  alarms.value.unshift({ time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`, lv, msg })
  if (alarms.value.length > 7) alarms.value.pop()
}

interface WellRow { name: string; org: string; liquid: number; pressure: number; water: string; tagCls: string; tagText: string; duty: string }
const wells: WellRow[] = [
  { name: '任11井场',       org: '华北油田',   liquid: 486.2, pressure: 2.84, water: '86.1%', tagCls: 'ok',     tagText: '运行',     duty: '张立新' },
  { name: '王窑 WY-14 新井', org: '长庆油田',   liquid: 62.4,  pressure: 4.12, water: '31.5%', tagCls: 'ok',     tagText: '运行',     duty: '马晓峰' },
  { name: '哈得 HD-4 井场',  org: '塔里木油田', liquid: 218.6, pressure: 3.66, water: '58.2%', tagCls: 'ok',     tagText: '运行',     duty: '艾尔肯' },
  { name: '岔河集一转油站',  org: '华北油田',   liquid: 301.5, pressure: 3.21, water: '91.2%', tagCls: 'warn',   tagText: '检修',     duty: '李志远' },
  { name: '留路北井场',      org: '华北油田',   liquid: 268.9, pressure: 3.62, water: '84.7%', tagCls: 'danger', tagText: '压力异常', duty: '王学兵' },
]

/* ---------- 时钟 ---------- */
const clock = ref('--:--:--')
const dateTxt = ref('')
function tick() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
  clock.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  dateTxt.value = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ` + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

/* ---------- 舞台自适应缩放 ---------- */
const viewportEl = ref<HTMLElement>()
const stageScale = ref(1)
function fit() {
  if (!viewportEl.value) return
  stageScale.value = viewportEl.value.clientWidth / 1920
}

/* ---------- 图表 ---------- */
const trend30El = ref<HTMLElement>()
const mapEl = ref<HTMLElement>()
const energyEl = ref<HTMLElement>()
const top5El = ref<HTMLElement>()
let charts: ECharts[] = []

function series(n: number, base: number, wave: number, seed: number): number[] {
  const arr: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.8 + seed) * wave * 0.4 + (Math.random() - 0.48) * wave
    arr.push(Math.max(0, +v.toFixed(2)))
  }
  return arr
}

const darkTooltip = { backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)', textStyle: { color: '#F2F5FA', fontSize: 12 } }
const axisText = { color: '#7C88A0' }
const splitLine = { lineStyle: { color: 'rgba(255,255,255,.06)' } }

function renderCharts() {
  /* 近30日产量趋势 */
  if (trend30El.value) {
    const c = init(trend30El.value)
    c.setOption({
      tooltip: { trigger: 'axis', ...darkTooltip },
      legend: { data: ['原油', '天然气', '化工品', '原煤'], textStyle: { color: '#B9C2D4', fontSize: 11 }, itemWidth: 14, itemHeight: 8 },
      grid: { left: 6, right: 10, top: 30, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category', boundaryGap: false,
        data: Array.from({ length: 30 }, (_, i) => `8/${i + 3 > 31 ? i - 28 : i + 3}`),
        axisLabel: { fontSize: 10, interval: 4, ...axisText },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
      },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, ...axisText }, splitLine },
      series: [
        { name: '原油', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: C.oil }, itemStyle: { color: C.oil }, data: series(30, 12.8, 0.6, 1) },
        { name: '天然气', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: C.gas }, itemStyle: { color: C.gas }, data: series(30, 4.3, 0.2, 3) },
        { name: '化工品', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: C.chem }, itemStyle: { color: C.chem }, data: series(30, 3.1, 0.18, 5) },
        {
          name: '原煤', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: C.coal }, itemStyle: { color: C.coal }, data: series(30, 28.4, 1.4, 7),
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(232,179,60,.16)' }, { offset: 1, color: 'rgba(232,179,60,0)' }] } },
        },
      ],
    } as EChartsCoreOption)
    charts.push(c)
  }

  /* 主力产区分布与管网输送 */
  if (mapEl.value) {
    const c = init(mapEl.value)
    c.setOption({
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { show: false, min: 0, max: 100 },
      yAxis: { show: false, min: 0, max: 62 },
      series: [
        {
          type: 'lines', coordinateSystem: 'cartesian2d', polyline: false, silent: true,
          lineStyle: { color: 'rgba(34,211,238,.55)', width: 2, curveness: 0.25, type: 'solid', shadowBlur: 8, shadowColor: 'rgba(34,211,238,.5)' },
          effect: { show: true, period: 5, trailLength: 0.4, symbol: 'arrow', symbolSize: 5, color: '#7DEFFC' },
          data: [
            { coords: [[18, 44], [34, 38], [52, 33], [72, 30], [88, 33]] },
            { coords: [[26, 40], [44, 44], [62, 42], [80, 45]] },
            { coords: [[30, 28], [48, 22], [66, 20], [84, 24]] },
          ],
        },
        {
          type: 'scatter', coordinateSystem: 'cartesian2d',
          label: { show: true, position: 'bottom', color: '#C9D4E8', fontSize: 12, distance: 6, formatter: (p: { data: unknown[] }) => String(p.data[3]) },
          data: [
            [20, 47, 46, '长庆油田', C.oil], [52, 52, 30, '大庆油田', C.oil], [14, 38, 26, '塔里木油田', C.oil],
            [70, 42, 24, '胜利油田', C.oil], [64, 47, 20, '华北油田', C.oil],
            [26, 40, 22, '靖边气田', C.gas], [44, 22, 18, '普光气田', C.gas],
            [58, 30, 16, '独山子炼化', C.chem], [78, 26, 15, '镇海炼化', C.chem],
            [56, 44, 20, '大同矿区', C.coal], [40, 46, 17, '鄂尔多斯矿区', C.coal],
          ],
          symbolSize: (d: number[]) => d[2],
          itemStyle: {
            color: (p: { data: unknown[] }) => String(p.data[4]), opacity: 0.85,
            shadowBlur: 16, shadowColor: 'rgba(255,138,61,.4)',
            borderColor: 'rgba(255,255,255,.35)', borderWidth: 1,
          },
          emphasis: { scale: 1.25 },
        },
        {
          type: 'effectScatter', coordinateSystem: 'cartesian2d', rippleEffect: { brushType: 'stroke', scale: 3.2 },
          symbolSize: (d: number[]) => d[2] * 0.55,
          itemStyle: { color: (p: { data: unknown[] }) => String(p.data[4]) },
          label: { show: false },
          data: [[20, 47, 46, '', C.oil], [26, 40, 22, '', C.gas], [70, 42, 24, '', C.oil]],
        },
      ],
    } as EChartsCoreOption)
    charts.push(c)
  }

  /* 能耗与排放 */
  if (energyEl.value) {
    const c = init(energyEl.value)
    c.setOption({
      tooltip: { trigger: 'axis', ...darkTooltip },
      legend: { data: ['综合能耗(万吨标煤)', 'CO₂排放(万吨)'], textStyle: { color: '#B9C2D4', fontSize: 11 }, itemWidth: 14, itemHeight: 8 },
      grid: { left: 6, right: 26, top: 30, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category', data: ['油田板块', '气田板块', '炼化板块', '煤矿板块'],
        axisLabel: { fontSize: 10.5, ...axisText },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
      },
      yAxis: [
        { type: 'value', axisLabel: { fontSize: 10, ...axisText }, splitLine },
        { type: 'value', splitLine: { show: false }, axisLabel: { fontSize: 10, ...axisText } },
      ],
      series: [
        {
          name: '综合能耗(万吨标煤)', type: 'bar', barWidth: 22, data: [42.6, 18.9, 56.3, 24.1],
          itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#E8B33C' }, { offset: 1, color: 'rgba(146,97,10,.4)' }] } },
        },
        { name: 'CO₂排放(万吨)', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 6, lineStyle: { width: 2, color: C.chem }, itemStyle: { color: C.chem }, data: [98.4, 41.2, 132.7, 52.6] },
      ],
    } as EChartsCoreOption)
    charts.push(c)
  }

  /* 采油厂产量 TOP5 */
  if (top5El.value) {
    const c = init(top5El.value)
    c.setOption({
      tooltip: { trigger: 'axis', ...darkTooltip },
      grid: { left: 6, right: 40, top: 8, bottom: 4, containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 10, ...axisText }, splitLine },
      yAxis: {
        type: 'category', inverse: true,
        data: ['长庆采油厂', '大庆采油厂', '塔里木采油厂', '胜利采油厂', '华北采油厂'],
        axisLabel: { fontSize: 11.5, color: '#C9D4E8' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
      },
      series: [{
        type: 'bar', barWidth: 14,
        data: [3.42, 3.31, 2.42, 2.31, 1.78].map((v, i) => ({
          value: v,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(244,99,58,.35)' }, { offset: 1, color: ['#FF8A3D', '#FF9D5C', '#FAA96E', '#F4B57F', '#EEC190'][i] }] },
          },
        })),
        label: { show: true, position: 'right', color: '#FFB25E', fontFamily: 'Barlow, Bahnschrift, sans-serif', fontSize: 12, formatter: '{c} 万吨' },
      }],
    } as EChartsCoreOption)
    charts.push(c)
  }
}

function onResize() {
  fit()
  charts.forEach((c) => c.resize())
}

let clockTimer: ReturnType<typeof setInterval> | null = null
let alarmTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  tick()
  for (let i = 0; i < 5; i++) pushAlarm()
  clockTimer = setInterval(tick, 1000)
  alarmTimer = setInterval(pushAlarm, 3000)
  window.addEventListener('resize', onResize)
  fit()
  await nextTick()
  renderCharts()
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (alarmTimer) clearInterval(alarmTimer)
  window.removeEventListener('resize', onResize)
  charts.forEach((c) => c.dispose())
  charts = []
})
</script>

<template>
  <div class="screen-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">集团能源生产运营驾驶舱 <span class="tag tag-brand">演示数据</span></div>
        <div class="page-desc">1920×1080 大屏舞台自适应缩放 · 四大产业日产量 / 产区管网 / 实时告警（PRD 大屏场景）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('全屏投放功能规划中（演示）')"><i class="pi pi-window-maximize"></i>全屏投放</button>
        <button class="btn primary" @click="success('大屏配置功能规划中（演示）')"><i class="pi pi-cog"></i>大屏配置</button>
      </div>
    </div>

    <!-- 自适应舞台 -->
    <div ref="viewportEl" class="viewport" :style="{ height: `${1080 * stageScale}px` }">
      <div class="stage" :style="{ transform: `scale(${stageScale})` }">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>

        <!-- 顶部标题栏 -->
        <header class="scr-head">
          <div class="scr-sys">
            <div class="logo-mark">DG</div>
            <div>DataGear <span style="color:var(--brand)">能源BI</span><div class="sys-sub">ENERGY INTELLIGENCE V4.1</div></div>
          </div>
          <div class="scr-title">
            <span class="t-line l"></span><span class="t-line r"></span>
            <h1>集团能源生产运营驾驶舱</h1>
          </div>
          <div class="scr-time">
            <div class="t-now">{{ clock }}</div>
            <div class="t-date"><span>{{ dateTxt }}</span><span class="t-upd">数据更新 06:30</span></div>
          </div>
        </header>

        <!-- 主体 -->
        <div class="scr-body">
          <!-- 左列 -->
          <div class="scr-col">
            <div class="scr-panel" style="flex:none">
              <div class="sp-title">四大产业日产量 <span class="sp-extra">昨日 · 同比</span></div>
              <div>
                <div v-for="x in inds" :key="x.n" class="ind-row">
                  <div class="ir-ico" :style="{ color: x.c, background: x.bg }"><i class="pi" :class="x.icon"></i></div>
                  <span class="ir-name">{{ x.n }}</span>
                  <span class="ir-val" :style="{ color: x.c }">{{ x.v }}<span class="unit"> {{ x.u }}</span></span>
                  <span class="ir-yoy" :style="{ color: x.up ? 'var(--ok)' : 'var(--danger)' }">{{ x.up ? '▲' : '▼' }} {{ x.yoy }}</span>
                </div>
              </div>
            </div>
            <div class="scr-panel" style="flex:1.2">
              <div class="sp-title">近30日产量趋势 <span class="sp-extra">万吨 / 亿方</span></div>
              <div ref="trend30El" class="chart" style="flex:1;min-height:0"></div>
            </div>
            <div class="scr-panel" style="flex:none">
              <div class="sp-title">月度生产完成率 <span class="sp-extra">截至昨日</span></div>
              <div>
                <div v-for="r in rates" :key="r.n" class="rate-row">
                  <div class="rr-top">
                    <span>{{ r.n }}</span>
                    <b :style="{ color: r.v >= 100 ? 'var(--ok)' : 'var(--tx-1)' }">{{ r.v }}%</b>
                  </div>
                  <div class="progress" style="height:8px"><i :style="{ width: `${Math.min(r.v, 100)}%`, background: r.c }"></i></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中央 -->
          <div class="scr-center">
            <div class="scr-panel map-panel">
              <div class="sp-title" style="position:relative;z-index:4">主力产区分布与管网输送 <span class="sp-extra">气泡=日产量</span></div>
              <div ref="mapEl" class="chart"></div>
              <div class="total-float">
                <div class="tf-label">今日总产量 · 油气当量</div>
                <div class="tf-val">21.73</div>
                <div class="tf-unit">万吨油当量</div>
                <div class="tf-sub"><span class="trend up">▲ 2.1%</span> 较昨日 · 计划完成率 <b style="color:var(--ok)" class="num">101.4%</b></div>
              </div>
              <div class="map-legend">
                <span><i style="background:var(--oil)"></i>油田产区</span>
                <span><i style="background:var(--gas)"></i>气田/管网</span>
                <span><i style="background:var(--chem)"></i>炼化基地</span>
                <span><i style="background:var(--coal)"></i>煤矿产区</span>
              </div>
            </div>
          </div>

          <!-- 右列 -->
          <div class="scr-col">
            <div class="scr-panel" style="flex:1.15">
              <div class="sp-title">实时告警 <span class="sp-extra"><span class="tag tag-danger" style="font-size:10.5px">3 未处理</span></span></div>
              <div class="alarm-list">
                <div v-for="(a, i) in alarms" :key="i" class="alarm-item">
                  <span class="a-time">{{ a.time }}</span>
                  <span class="tag" :class="`tag-${a.lv}`" style="flex:none;font-size:10px">{{ ALARM_TAG[a.lv] }}</span>
                  <span class="a-msg" :title="a.msg">{{ a.msg }}</span>
                </div>
              </div>
            </div>
            <div class="scr-panel" style="flex:none">
              <div class="sp-title">场站 / 装置运行状态 <span class="sp-extra">共 24 座</span></div>
              <div class="st-matrix">
                <div v-for="[n, s] in stations" :key="n" class="st-cell"><i :class="s"></i><span>{{ n }}</span></div>
              </div>
              <div class="st-sum">
                <span><b style="color:var(--ok)">19</b>运行</span>
                <span><b style="color:var(--warn)">3</b>检修</span>
                <span><b style="color:var(--danger)">2</b>停机</span>
                <span style="margin-left:auto">综合完好率 <b style="color:var(--ok)" class="num">96.8%</b></span>
              </div>
            </div>
            <div class="scr-panel" style="flex:1">
              <div class="sp-title">能耗与排放 <span class="sp-extra">本月累计</span></div>
              <div ref="energyEl" class="chart" style="flex:1;min-height:0"></div>
            </div>
          </div>
        </div>

        <!-- 底部横条 -->
        <div class="scr-foot">
          <div class="scr-panel">
            <div class="sp-title">采油厂产量 TOP5 <span class="sp-extra">今日 · 万吨</span></div>
            <div ref="top5El" class="chart" style="flex:1;min-height:0"></div>
          </div>
          <div class="scr-panel">
            <div class="sp-title">重点井场 / 场站运行 <span class="sp-extra">实时</span></div>
            <div class="well-table">
              <table>
                <thead><tr><th>井场 / 场站</th><th>所属</th><th>日产液(t)</th><th>压力(MPa)</th><th>含水率</th><th>状态</th><th>值班</th></tr></thead>
                <tbody>
                  <tr v-for="w in wells" :key="w.name">
                    <td style="color:var(--tx-1)">{{ w.name }}</td><td>{{ w.org }}</td>
                    <td class="num">{{ w.liquid }}</td><td class="num">{{ w.pressure }}</td><td class="num">{{ w.water }}</td>
                    <td><span class="tag" :class="`tag-${w.tagCls}`" style="font-size:10.5px">{{ w.tagText }}</span></td><td>{{ w.duty }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.screen-page {
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
  --ok-soft: rgba(52,211,153,.12);
  --r-l: 12px;
  --dur: .18s;
  --ease: cubic-bezier(.4,0,.2,1);
  --shadow-glow-brand: 0 0 18px rgba(255,138,61,.35);
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;
  --font-mono: "JetBrains Mono","SF Mono","Cascadia Code",Consolas,monospace;

  position: relative;
  min-height: 100%;
  padding: 20px 24px 40px;
  color: var(--tx-1);
  font-size: 14px; line-height: 1.6;
  background:
    radial-gradient(1000px 520px at 50% -12%, rgba(255,138,61,.14), transparent 62%),
    radial-gradient(900px 560px at -8% 108%, rgba(34,211,238,.10), transparent 62%),
    radial-gradient(900px 560px at 108% 108%, rgba(167,139,250,.08), transparent 62%),
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
.tag-ok { background: rgba(52,211,153,.13); color: var(--ok); border-color: rgba(52,211,153,.3); }
.tag-warn { background: rgba(251,191,36,.13); color: var(--warn); border-color: rgba(251,191,36,.3); }
.tag-danger { background: rgba(248,113,113,.13); color: var(--danger); border-color: rgba(248,113,113,.3); }
.tag-info { background: rgba(96,165,250,.13); color: var(--info); border-color: rgba(96,165,250,.3); }

.num { font-family: var(--font-num); }
.trend { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-num); font-weight: 600; }
.trend.up { color: var(--ok); }

/* ---- 进度条 ---- */
.progress { background: rgba(255,255,255,.06); border-radius: 99px; overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: 99px; }

/* ---- 1920×1080 舞台 + 自适应缩放 ---- */
.viewport { position: relative; width: 100%; overflow: hidden; border-radius: var(--r-l); }
.stage {
  width: 1920px; height: 1080px; position: absolute; left: 0; top: 0;
  transform-origin: top left; overflow: hidden;
  border: 1px solid var(--line-1); border-radius: var(--r-l);
  background:
    linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 100% 54px,
    linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px) 0 0 / 96px 100%,
    radial-gradient(1200px 500px at 50% 42%, rgba(255,138,61,.05), transparent 65%),
    #05070D;
  display: flex; flex-direction: column;
}
/* 四角装饰线框 */
.corner { position: absolute; width: 42px; height: 42px; z-index: 5; pointer-events: none; opacity: .8; }
.corner.tl { left: 10px; top: 10px; border-left: 2px solid var(--brand); border-top: 2px solid var(--brand); }
.corner.tr { right: 10px; top: 10px; border-right: 2px solid var(--brand); border-top: 2px solid var(--brand); }
.corner.bl { left: 10px; bottom: 10px; border-left: 2px solid var(--brand); border-bottom: 2px solid var(--brand); }
.corner.br { right: 10px; bottom: 10px; border-right: 2px solid var(--brand); border-bottom: 2px solid var(--brand); }

/* 顶部标题栏 */
.scr-head {
  flex: none; height: 86px; display: flex; align-items: center; padding: 0 40px; position: relative;
  background: linear-gradient(180deg, rgba(255,138,61,.06), transparent);
}
.scr-sys { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; width: 380px; }
.scr-sys .logo-mark { width: 34px; height: 34px; border-radius: 9px; background: var(--brand-grad); display: flex; align-items: center; justify-content: center; font-family: var(--font-num); font-weight: 800; color: #1A0E05; box-shadow: var(--shadow-glow-brand); }
.scr-sys .sys-sub { font-size: 10px; color: var(--tx-3); letter-spacing: 2px; font-weight: 400; }
.scr-title { flex: 1; text-align: center; position: relative; }
.scr-title h1 {
  font-size: 34px; font-weight: 800; letter-spacing: 6px; line-height: 1.2; margin: 0;
  background: linear-gradient(180deg, #FFF2E4 20%, #FFB25E 55%, #F4633A 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 40px rgba(255,138,61,.25);
}
.scr-title .t-line {
  position: absolute; top: 50%; height: 1px; width: 240px;
  background: linear-gradient(90deg, transparent, var(--brand-line), transparent);
}
.scr-title .t-line.l { right: calc(50% + 340px); }
.scr-title .t-line.r { left: calc(50% + 340px); }
.scr-time { width: 380px; text-align: right; font-family: var(--font-num); }
.scr-time .t-now { font-size: 24px; font-weight: 700; letter-spacing: 2px; color: var(--tx-1); }
.scr-time .t-date { font-size: 12px; color: var(--tx-3); margin-top: 2px; }
.scr-time .t-upd { display: inline-block; font-size: 11px; color: var(--ok); border: 1px solid rgba(52,211,153,.3); background: var(--ok-soft); border-radius: 10px; padding: 1px 10px; margin-left: 8px; }

/* 主体布局 */
.scr-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 430px 1fr 430px; gap: 16px; padding: 6px 24px 14px; }
.scr-col { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.scr-panel {
  position: relative; border: 1px solid var(--line-1); border-radius: var(--r-l);
  background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015));
  backdrop-filter: blur(8px); padding: 14px 16px; display: flex; flex-direction: column; min-height: 0;
  box-shadow: inset 0 0 40px rgba(255,255,255,.015);
}
.scr-panel::before, .scr-panel::after {
  content: ""; position: absolute; width: 14px; height: 14px; pointer-events: none;
}
.scr-panel::before { left: -1px; top: -1px; border-left: 2px solid var(--brand); border-top: 2px solid var(--brand); border-radius: var(--r-l) 0 0 0; opacity: .7; }
.scr-panel::after { right: -1px; bottom: -1px; border-right: 2px solid var(--brand); border-bottom: 2px solid var(--brand); border-radius: 0 0 var(--r-l) 0; opacity: .7; }
.sp-title {
  flex: none; font-size: 15px; font-weight: 700; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;
  margin-bottom: 10px;
}
.sp-title::before { content: ""; width: 4px; height: 15px; border-radius: 2px; background: var(--brand-grad); box-shadow: var(--shadow-glow-brand); }
.sp-title .sp-extra { margin-left: auto; font-size: 11px; color: var(--tx-3); font-weight: 400; }

/* 四大产业 KPI 行 */
.ind-row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.ind-row:last-child { border-bottom: none; }
.ind-row .ir-ico { width: 36px; height: 36px; border-radius: 10px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.ind-row .ir-name { font-size: 13px; color: var(--tx-2); width: 64px; flex: none; }
.ind-row .ir-val { font-family: var(--font-num); font-size: 22px; font-weight: 700; flex: 1; }
.ind-row .ir-val .unit { font-size: 11px; color: var(--tx-3); font-weight: 400; }
.ind-row .ir-yoy { font-size: 11.5px; font-family: var(--font-num); width: 76px; text-align: right; }

/* 完成率 */
.rate-row { padding: 7px 0; }
.rate-row .rr-top { display: flex; justify-content: space-between; font-size: 12px; color: var(--tx-2); margin-bottom: 5px; }
.rate-row .rr-top b { font-family: var(--font-num); color: var(--tx-1); }

/* 告警滚动 */
.alarm-list { flex: 1; min-height: 0; overflow: hidden; position: relative; }
.alarm-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 6px;
  border-radius: 8px; background: rgba(255,255,255,.03); border: 1px solid var(--line-1);
  font-size: 12px; animation: slideIn .35s var(--ease);
}
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
.alarm-item .a-time { font-family: var(--font-num); font-size: 11px; color: var(--tx-4); flex: none; }
.alarm-item .a-msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tx-1); }
.alarm-item:hover { border-color: var(--line-3); }

/* 状态点矩阵 */
.st-matrix { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 6px; }
.st-cell { text-align: center; }
.st-cell i { display: block; width: 100%; height: 30px; border-radius: 6px; }
.st-cell span { font-size: 10px; color: var(--tx-4); display: block; margin-top: 3px; }
.st-cell .run { background: rgba(52,211,153,.22); border: 1px solid rgba(52,211,153,.5); box-shadow: inset 0 0 12px rgba(52,211,153,.15); }
.st-cell .mnt { background: rgba(251,191,36,.18); border: 1px solid rgba(251,191,36,.5); }
.st-cell .stp { background: rgba(248,113,113,.18); border: 1px solid rgba(248,113,113,.5); }
.st-sum { display: flex; gap: 14px; font-size: 11.5px; color: var(--tx-3); margin-top: 10px; }
.st-sum b { font-family: var(--font-num); font-size: 15px; margin-right: 2px; }

/* 中央产区图 */
.scr-center { display: flex; flex-direction: column; min-width: 0; min-height: 0; position: relative; }
.map-panel { flex: 1; position: relative; min-height: 0; }
.map-panel .chart { position: absolute; inset: 0; min-height: 0; }
.total-float {
  position: absolute; left: 50%; top: 44%; transform: translate(-50%,-50%); text-align: center; z-index: 4;
  pointer-events: none;
}
.total-float .tf-label { font-size: 13px; color: var(--tx-3); letter-spacing: 3px; }
.total-float .tf-val {
  font-family: var(--font-num); font-size: 58px; font-weight: 800; line-height: 1.15;
  background: linear-gradient(180deg,#FFF 30%,#FFB25E); -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 60px rgba(255,138,61,.3);
}
.total-float .tf-unit { font-size: 14px; color: var(--tx-2); }
.total-float .tf-sub { font-size: 12px; color: var(--tx-3); margin-top: 4px; }
.map-legend { position: absolute; left: 18px; bottom: 14px; display: flex; gap: 14px; font-size: 11.5px; color: var(--tx-3); z-index: 4; }
.map-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }

/* 底部横条 */
.scr-foot { flex: none; height: 236px; display: grid; grid-template-columns: 1.1fr 1.9fr; gap: 16px; padding: 0 24px 20px; }
.well-table { flex: 1; min-height: 0; overflow: hidden; }
.well-table table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.well-table th { text-align: left; color: var(--tx-4); font-weight: 500; font-size: 11px; padding: 6px 10px; border-bottom: 1px solid var(--line-1); }
.well-table td { padding: 7px 10px; border-bottom: 1px solid rgba(255,255,255,.04); color: var(--tx-2); }
.well-table .num { color: var(--tx-1); }
</style>
