<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart, GraphChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'

use([LineChart, GraphChart, GridComponent, TooltipComponent, CanvasRenderer])

// 指标中心（能源暗域）：业务域目录树 + 指标卡列表 + 详情抽屉 + 消费拓扑。
// 注：后端尚无指标模块 API，当前为演示数据（参考 prototype/metrics.html）。
const { success } = useOperationMessage()

/* ---------- 数据模型（演示数据） ---------- */
interface Metric {
  key: string
  name: string
  code: string
  ind: 'oil' | 'gas' | 'chem' | 'coal'
  indName: string
  tag: { text: string; cls: string }
  conflict?: boolean
  desc: string
  period?: string
  value: string
  unit: string
  yoy: string
  yoyCls: string
  refs: string
  owner: string
  ownerDept: string
  domain: string
  sparkColor: string
  sparkBase: number
  sparkWave: number
}

const METRICS: Metric[] = [
  {
    key: 'oil-output', name: '原油产量', code: 'M-OIL-001', ind: 'oil', indName: '石油',
    tag: { text: '已认证 v1.2', cls: 'ok' }, period: '统计周期：日 / 月',
    desc: '采油厂井口产出原油经计量的商品量，不含自用油与损耗；按月口径为自然月累计。',
    value: '385.2', unit: '万吨/月', yoy: '+5.1%', yoyCls: 'up', refs: '看板 14 · 告警 3 · 问数 27',
    owner: '王建国', ownerDept: '勘探开发部', domain: 'oil', sparkColor: '#FF8A3D', sparkBase: 380, sparkWave: 14,
  },
  {
    key: 'oil-cost', name: '吨油完全成本', code: 'M-OIL-014', ind: 'oil', indName: '石油',
    tag: { text: '已认证 v1.0', cls: 'ok' },
    desc: '一定时期内原油生产总成本（含操作成本、折旧折耗、期间费用）除以同期商品量。',
    value: '2,146', unit: '元/吨', yoy: '+3.8%', yoyCls: 'down', refs: '看板 6 · 报表 4 · 问数 11',
    owner: '李秀兰', ownerDept: '财务资产部', domain: 'oil', sparkColor: '#E8B33C', sparkBase: 2100, sparkWave: 60,
  },
  {
    key: 'water-cut', name: '井口综合含水率', code: 'M-OIL-027', ind: 'oil', indName: '石油',
    tag: { text: '待认证', cls: 'warn' }, conflict: true,
    desc: '产液量中水所占体积百分比。⚠ 与「M-OIL-09 含水率（化验口径）」同名近义，化验值与计量值偏差最高 2.3pct，待仲裁归并。',
    value: '87.4', unit: '%', yoy: '+0.6pct', yoyCls: 'flat', refs: '看板 5 · 告警 2 · 问数 8',
    owner: '赵鹏', ownerDept: '采油工程部', domain: 'oil', sparkColor: '#FBBF24', sparkBase: 87, sparkWave: 0.8,
  },
  {
    key: 'coal-wash', name: '原煤入洗率', code: 'M-COAL-006', ind: 'coal', indName: '煤矿',
    tag: { text: '已认证 v1.1', cls: 'ok' },
    desc: '入洗原煤量占原煤产量的比例，反映煤炭洗选加工深度；按洗煤厂磅房计量数据汇总。',
    value: '72.8', unit: '%', yoy: '+4.2pct', yoyCls: 'up', refs: '看板 3 · 报表 2 · 问数 5',
    owner: '孙立军', ownerDept: '洗选运销部', domain: 'coal', sparkColor: '#E8B33C', sparkBase: 71, sparkWave: 2.4,
  },
  {
    key: 'methanol-grade', name: '甲醇优级品率', code: 'M-CHEM-011', ind: 'chem', indName: '化工',
    tag: { text: '待认证', cls: 'warn' },
    desc: '符合 GB 338 优级品标准的甲醇产量占比，以质检中心化验单为准，按班次加权汇总。',
    value: '98.2', unit: '%', yoy: '+0.4pct', yoyCls: 'up', refs: '看板 2 · 告警 1 · 问数 6',
    owner: '陈静', ownerDept: '煤化工质检中心', domain: 'chem', sparkColor: '#A78BFA', sparkBase: 98, sparkWave: 0.5,
  },
  {
    key: 'pipe-turnover', name: '管输周转量', code: 'M-GAS-004', ind: 'gas', indName: '天然气',
    tag: { text: '草稿 v0.3', cls: '' },
    desc: '输气量与平均运距的乘积（亿方·公里），衡量管网运输工作量；运距口径待定稿。',
    value: '1,284', unit: '亿方·km', yoy: '+6.9%', yoyCls: 'up', refs: '看板 1 · 问数 3',
    owner: '周海峰', ownerDept: '管道分公司', domain: 'gas', sparkColor: '#22D3EE', sparkBase: 1250, sparkWave: 60,
  },
]

const DOMAINS = [
  { key: 'all', name: '全部指标', cnt: 86, color: 'var(--brand)', subs: [] as { name: string; cnt: number }[] },
  { key: 'oil', name: '油气勘探开发', cnt: 32, color: 'var(--oil)', subs: [{ name: '采油生产', cnt: 18 }, { name: '注水注气', cnt: 8 }, { name: '地质油藏', cnt: 6 }] },
  { key: 'chem', name: '炼油化工', cnt: 18, color: 'var(--chem)', subs: [] },
  { key: 'coal', name: '煤矿生产', cnt: 15, color: 'var(--coal)', subs: [] },
  { key: 'gas', name: '天然气管输', cnt: 12, color: 'var(--gas)', subs: [] },
  { key: 'fin', name: '经营财务', cnt: 9, color: 'var(--info)', subs: [] },
]

const activeDomain = ref('all')
const selectedKey = ref('oil-output')
const drawerVisible = ref(false)
const drawerMetric = ref<Metric>(METRICS[0])

const filteredMetrics = ref(METRICS)

function selectDomain(key: string, name: string) {
  activeDomain.value = key
  filteredMetrics.value = key === 'all' ? METRICS : METRICS.filter((m) => m.domain === key)
  success(`已按「${name}」筛选（演示数据）`)
  // 重新渲染迷你趋势
  requestAnimationFrame(() => renderSparks())
}

function openDrawer(m: Metric) {
  selectedKey.value = m.key
  drawerMetric.value = m
  drawerVisible.value = true
}
function closeDrawer() {
  drawerVisible.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}

/* ---------- 图表 ---------- */
const topoEl = ref<HTMLElement>()
const sparkEls = ref<HTMLElement[]>([])
let topoChart: ECharts | null = null
let sparkCharts: ECharts[] = []

function series(n: number, base: number, wave: number, seed: number): number[] {
  const arr: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.8 + seed) * wave * 0.4 + (Math.random() - 0.48) * wave
    arr.push(Math.max(0, +v.toFixed(2)))
  }
  return arr
}
function colorAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function renderSparks() {
  sparkCharts.forEach((c) => c.dispose())
  sparkCharts = []
  sparkEls.value.forEach((el, i) => {
    const m = filteredMetrics.value[i]
    if (!el || !m) return
    const c = init(el)
    c.setOption({
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'] },
      yAxis: { type: 'value', show: false, min: (v: { min: number }) => v.min - m.sparkWave, max: (v: { max: number }) => v.max + m.sparkWave },
      tooltip: { trigger: 'axis' },
      series: [{
        type: 'line', smooth: true, symbol: 'none', data: series(12, m.sparkBase, m.sparkWave, i + 1),
        lineStyle: { width: 1.8, color: m.sparkColor },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: colorAlpha(m.sparkColor, 0.28) }, { offset: 1, color: colorAlpha(m.sparkColor, 0) }],
          },
        },
      }],
    } as EChartsCoreOption)
    sparkCharts.push(c)
  })
}

const C = { oil: '#FF8A3D', gas: '#22D3EE', chem: '#A78BFA', coal: '#E8B33C', warn: '#FBBF24', info: '#60A5FA' }
function renderTopo() {
  if (!topoEl.value) return
  topoChart = topoChart || init(topoEl.value)
  topoChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)', textStyle: { color: '#F2F5FA', fontSize: 12 } },
    series: [{
      type: 'graph', layout: 'none', roam: false,
      symbolSize: (_v: unknown, p: { data: { sz?: number } }) => p.data.sz || 34,
      label: { show: true, color: '#B9C2D4', fontSize: 11, position: 'bottom', distance: 4 },
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7,
      lineStyle: { color: 'rgba(255,255,255,.22)', width: 1.2, curveness: 0.12 },
      emphasis: { lineStyle: { color: '#FF8A3D', width: 2 } },
      data: [
        { name: 'ODS_采油日报表', x: 60, y: 120, sz: 30, itemStyle: { color: C.info } },
        { name: 'ODS_管网运行表', x: 60, y: 240, sz: 30, itemStyle: { color: C.info } },
        { name: 'ODS_洗煤计量表', x: 60, y: 360, sz: 30, itemStyle: { color: C.info } },
        { name: '原油产量', x: 330, y: 90, sz: 44, itemStyle: { color: C.oil, shadowBlur: 18, shadowColor: 'rgba(255,138,61,.55)' }, label: { fontWeight: 700, color: '#F2F5FA' } },
        { name: '吨油完全成本', x: 330, y: 190, sz: 38, itemStyle: { color: C.oil } },
        { name: '管输周转量', x: 330, y: 285, sz: 36, itemStyle: { color: C.gas } },
        { name: '原煤入洗率', x: 330, y: 375, sz: 36, itemStyle: { color: C.coal } },
        { name: '华北油田生产日报', x: 640, y: 40, sz: 30, itemStyle: { color: C.gas } },
        { name: '集团经营驾驶舱', x: 640, y: 120, sz: 30, itemStyle: { color: C.gas } },
        { name: '产量阈值告警 ×3', x: 640, y: 200, sz: 28, itemStyle: { color: C.warn } },
        { name: '问数会话 ×27', x: 640, y: 280, sz: 28, itemStyle: { color: C.chem } },
        { name: '经营日报报表', x: 640, y: 355, sz: 28, itemStyle: { color: C.chem } },
        { name: '开放 API ×2', x: 640, y: 425, sz: 26, itemStyle: { color: C.info } },
      ],
      links: [
        { source: 'ODS_采油日报表', target: '原油产量' },
        { source: 'ODS_采油日报表', target: '吨油完全成本' },
        { source: 'ODS_管网运行表', target: '管输周转量' },
        { source: 'ODS_洗煤计量表', target: '原煤入洗率' },
        { source: '原油产量', target: '华北油田生产日报' },
        { source: '原油产量', target: '集团经营驾驶舱' },
        { source: '原油产量', target: '产量阈值告警 ×3' },
        { source: '原油产量', target: '问数会话 ×27' },
        { source: '吨油完全成本', target: '经营日报报表' },
        { source: '吨油完全成本', target: '集团经营驾驶舱' },
        { source: '管输周转量', target: '开放 API ×2' },
        { source: '原煤入洗率', target: '经营日报报表' },
        { source: '原煤入洗率', target: '问数会话 ×27' },
      ],
    }],
  } as EChartsCoreOption)
}

function onResize() {
  topoChart?.resize()
  sparkCharts.forEach((c) => c.resize())
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
  renderSparks()
  renderTopo()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeydown)
  topoChart?.dispose()
  sparkCharts.forEach((c) => c.dispose())
})
</script>

<template>
  <div class="metrics-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">指标中心 <span class="tag tag-brand">演示数据</span></div>
        <div class="page-desc">指标的唯一定义与消费中心 —— 一个指标，一个口径（语义层核心）</div>
      </div>
      <div class="page-actions">
        <button class="btn ghost" @click="success('口径冲突检测：扫描 86 个指标，发现 2 处同名不同口径（演示）')">
          口径冲突检测 <span class="tag tag-danger">2</span>
        </button>
        <button class="btn" @click="success('指标目录功能规划中')">指标目录</button>
        <button class="btn primary" @click="success('新建指标向导规划中（定义度量 / 维度 / 过滤条件）')">
          <i class="pi pi-plus"></i>新建指标
        </button>
      </div>
    </div>

    <!-- 统计条 -->
    <section class="stat-grid">
      <div class="stat-card glow-info">
        <div class="s-label">指标总数</div>
        <div class="s-value">86<span class="unit">个</span></div>
        <div class="s-foot"><span class="trend up">▲ 6</span><span>本月新增</span></div>
      </div>
      <div class="stat-card glow-ok">
        <div class="s-label">已认证指标</div>
        <div class="s-value tx-ok">52<span class="unit">个</span></div>
        <div class="s-foot"><span>认证覆盖率 60.5% · 目标 80%</span></div>
      </div>
      <div class="stat-card glow-tx">
        <div class="s-label">草稿</div>
        <div class="s-value tx-2">21<span class="unit">个</span></div>
        <div class="s-foot"><span>含 7 个 AI 问数沉淀指标</span></div>
      </div>
      <div class="stat-card glow-warn">
        <div class="s-label">待认证</div>
        <div class="s-value tx-warn">13<span class="unit">个</span></div>
        <div class="s-foot"><span>平均认证周期 2.3 天</span></div>
      </div>
      <div class="stat-card glow-danger">
        <div class="s-label">口径冲突告警</div>
        <div class="s-value tx-danger">2<span class="unit">处</span></div>
        <div class="s-foot"><span class="tag tag-danger sm-tag">同名不同口径</span><span>需治理委员仲裁</span></div>
      </div>
    </section>

    <div class="metric-bench">
      <!-- 左：业务域目录树 -->
      <div class="card domain-tree">
        <div class="card-title"><span class="bar"></span>业务域</div>
        <template v-for="d in DOMAINS" :key="d.key">
          <div
            class="dt-item"
            :class="{ active: activeDomain === d.key }"
            @click="selectDomain(d.key, d.name)"
          >
            <span class="dt-dot" :style="{ background: d.color, boxShadow: `0 0 6px ${d.color}` }"></span>
            {{ d.name }}
            <span class="dt-cnt">{{ d.cnt }}</span>
          </div>
          <div v-if="d.subs.length" class="dt-sub">
            <div
              v-for="s in d.subs"
              :key="s.name"
              class="dt-item"
              @click.stop="selectDomain(d.key, s.name)"
            >
              {{ s.name }}<span class="dt-cnt">{{ s.cnt }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 中：指标卡列表 -->
      <div class="metric-list">
        <div
          v-for="(m, i) in filteredMetrics"
          :key="m.key"
          class="card metric-card"
          :class="{ selected: selectedKey === m.key && drawerVisible }"
          @click="openDrawer(m)"
        >
          <div class="mc-head">
            <span class="mc-name">{{ m.name }}</span>
            <span class="mc-code">{{ m.code }}</span>
            <span class="ind" :class="m.ind"><i></i>{{ m.indName }}</span>
            <span class="tag" :class="`tag-${m.tag.cls}`">{{ m.tag.text }}</span>
            <span v-if="m.conflict" class="tag tag-danger sm-tag">口径冲突</span>
            <span v-if="m.period" class="mc-period">{{ m.period }}</span>
          </div>
          <div class="mc-desc">{{ m.desc }}</div>
          <div class="mc-body">
            <div :ref="(el) => { if (el) sparkEls[i] = el as HTMLElement }" class="mc-spark"></div>
            <div class="mc-meta">
              <span>当前值<br /><b>{{ m.value }}</b> {{ m.unit }}</span>
              <span>同比<br /><b :class="`yoy-${m.yoyCls}`">{{ m.yoy }}</b></span>
              <span>被引用<br /><b>{{ m.refs }}</b></span>
              <span class="mc-owner">
                <span class="avatar">{{ m.owner.slice(0, 1) }}</span>{{ m.owner }} · {{ m.ownerDept }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 指标消费拓扑 -->
    <div class="card topo-wrap">
      <div class="card-title"><span class="bar"></span>指标消费拓扑
        <span class="tag tag-brand">语义层一处定义 · 处处消费</span>
        <span class="more" @click="success('全量血缘图谱功能规划中')">全量血缘 ›</span>
      </div>
      <div class="topo-legend">
        <span><i style="background:var(--brand)"></i>指标</span>
        <span><i style="background:var(--gas)"></i>看板/图表</span>
        <span><i style="background:var(--warn)"></i>告警</span>
        <span><i style="background:var(--chem)"></i>问数/报表</span>
        <span><i style="background:var(--info)"></i>API/数据集</span>
      </div>
      <div ref="topoEl" class="topo-chart"></div>
    </div>

    <!-- 指标详情抽屉 -->
    <div class="drawer" :class="{ show: drawerVisible }">
      <div class="drawer-head">
        <div>
          <div class="drawer-title-row">
            <b class="drawer-name">{{ drawerMetric.name }}</b>
            <span class="mc-code">{{ drawerMetric.code }}</span>
            <span class="ind" :class="drawerMetric.ind"><i></i>{{ drawerMetric.indName }}</span>
            <span class="tag" :class="`tag-${drawerMetric.tag.cls}`">{{ drawerMetric.tag.text }}</span>
          </div>
          <div class="drawer-desc">{{ drawerMetric.desc }}</div>
        </div>
        <button class="icon-btn d-close" title="关闭" @click="closeDrawer"><i class="pi pi-times"></i></button>
      </div>
      <div class="drawer-body">
        <div class="d-sec">
          <div class="d-sec-t">指标定义（语义层模型）</div>
          <dl class="def-grid">
            <dt>度量</dt><dd>SUM(商品油量) — ODS_采油日报表.fact_oil_daily.commercial_qty</dd>
            <dt>维度</dt><dd>采油厂 / 区块 / 油藏类型 / 井别 / 日期</dd>
            <dt>过滤条件</dt><dd>井状态 ∈ {生产井} 且 计量方式 ≠ 估算</dd>
            <dt>统计周期</dt><dd>日 / 月（自然月累计）</dd>
            <dt>负责人</dt><dd>{{ drawerMetric.owner }}（{{ drawerMetric.ownerDept }}）· 治理委员：张总工</dd>
            <dt>权限</dt><dd><span class="tag tag-info">行级权限继承</span> <span class="tag tag-warn">单井级敏感</span></dd>
          </dl>
        </div>
        <div class="d-sec">
          <div class="d-sec-t">指标查询引擎 · 编译 SQL 预览</div>
          <div class="code-block"><span class="cm">-- 由指标语义模型编译生成（参数化，防注入预编译）</span>
<span class="kw">SELECT</span> t.plant_name          <span class="cm">AS 采油厂</span>,
       <span class="fn">SUM</span>(t.commercial_qty) <span class="cm">AS 原油产量_吨</span>
<span class="kw">FROM</span> ods_fact_oil_daily t
<span class="kw">WHERE</span> t.dt <span class="kw">BETWEEN</span> <span class="pc">${pc(month_start)}</span> <span class="kw">AND</span> <span class="pc">${pc(month_end)}</span>
  <span class="kw">AND</span> t.well_status = <span class="pc">${pc('生产井')}</span>
  <span class="kw">AND</span> t.meter_type  &lt;&gt; <span class="pc">'估算'</span>
  <span class="cm">/* 行级权限自动注入 */</span>
  <span class="kw">AND</span> t.org_id <span class="kw">IN</span> (<span class="pc">${pc(user_orgs)}</span>)
<span class="kw">GROUP BY</span> t.plant_name
<span class="kw">ORDER BY</span> 原油产量_吨 <span class="kw">DESC</span>;</div>
        </div>
        <div class="d-sec">
          <div class="d-sec-t">版本历史</div>
          <div class="ver-item"><span class="v-no">v1.2</span><div class="grow"><b>当前版本</b> · 过滤条件新增「计量方式≠估算」<div class="ver-sub">2026-08-20 · {{ drawerMetric.owner }} · 认证发布</div></div><span class="tag tag-ok">已认证</span></div>
          <div class="ver-item"><span class="v-no">v1.1</span><div class="grow">维度新增「油藏类型」<div class="ver-sub">2026-06-11 · {{ drawerMetric.owner }}</div></div><span class="tag">历史</span></div>
          <div class="ver-item"><span class="v-no">v1.0</span><div class="grow">首次定义并接入 12 张看板<div class="ver-sub">2026-03-02 · 张总工</div></div><span class="tag">历史</span></div>
        </div>
        <div class="d-sec">
          <div class="d-sec-t">数据血缘（上游 → 下游消费）</div>
          <div class="lineage-row">
            <span class="lineage-node ln-info">ODS_采油日报表</span>
            <i class="pi pi-arrow-right lineage-arrow"></i>
            <span class="lineage-node ln-brand">指标 · {{ drawerMetric.name }}</span>
            <i class="pi pi-arrow-right lineage-arrow"></i>
            <span class="lineage-node ln-gas">看板 ×14</span>
            <span class="lineage-node ln-warn">告警 ×3</span>
          </div>
          <div class="lineage-row">
            <span class="lineage-node ln-info">DIM_组织机构维表</span>
            <i class="pi pi-arrow-right lineage-arrow"></i>
            <span class="lineage-node ln-brand">（维度关联）</span>
            <i class="pi pi-arrow-right lineage-arrow"></i>
            <span class="lineage-node ln-chem">问数 ×27</span>
            <span class="lineage-node ln-info">API ×2</span>
          </div>
        </div>
      </div>
      <div class="drawer-foot">
        <button class="btn sm" @click="success('版本对比功能规划中')">版本对比</button>
        <button class="btn sm" @click="success('消费方列表：14 看板 / 3 告警 / 27 问数 / 2 API（演示）')">消费方列表</button>
        <button class="btn sm primary" @click="success('认证发布申请已提交（演示）')">认证发布</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.metrics-page {
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
  --font-num: "Barlow","DIN Alternate","Bahnschrift","PingFang SC","Segoe UI",sans-serif;
  --font-mono: "JetBrains Mono","SF Mono","Cascadia Code",Consolas,monospace;

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
.btn.ghost { border-color: transparent; background: transparent; color: var(--tx-2); }
.btn.ghost:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.btn.sm { padding: 4px 10px; font-size: 12px; border-radius: 8px; }
.icon-btn {
  width: 34px; height: 34px; border-radius: 9px; border: none;
  background: transparent; color: var(--tx-2); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all .18s;
}
.icon-btn:hover { background: var(--bg-glass-2); color: var(--tx-1); }

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
.sm-tag { font-size: 10.5px; }

/* ---- 统计卡 ---- */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px; }
.stat-card {
  position: relative; overflow: hidden;
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; padding: 16px 18px;
  transition: all .18s;
}
.stat-card:hover { border-color: var(--line-3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.stat-card::after {
  content: ""; position: absolute; right: -30px; top: -30px; width: 110px; height: 110px;
  border-radius: 50%; filter: blur(8px); pointer-events: none;
}
.glow-info::after { background: rgba(96,165,250,.13); }
.glow-ok::after { background: rgba(52,211,153,.13); }
.glow-tx::after { background: rgba(124,136,160,.13); }
.glow-warn::after { background: rgba(251,191,36,.13); }
.glow-danger::after { background: rgba(248,113,113,.15); }
.s-label { font-size: 12.5px; color: var(--tx-3); }
.s-value { font-family: var(--font-num); font-size: 30px; font-weight: 700; line-height: 1.25; margin-top: 4px; }
.s-value .unit { font-size: 13px; color: var(--tx-3); font-weight: 400; margin-left: 4px; }
.s-foot { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--tx-3); }
.tx-ok { color: var(--ok); } .tx-warn { color: var(--warn); } .tx-danger { color: var(--danger); } .tx-2 { color: var(--tx-2); }
.trend { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-num); font-weight: 600; }
.trend.up { color: var(--ok); }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }
.card-title .more { margin-left: auto; font-size: 12px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.card-title .more:hover { color: var(--brand); }

/* ---- 三栏工作台 ---- */
.metric-bench { display: grid; grid-template-columns: 220px 1fr; gap: 14px; align-items: start; }

/* 业务域树 */
.domain-tree { padding: 10px; }
.domain-tree .card-title { margin-bottom: 8px; }
.dt-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px;
  cursor: pointer; font-size: 13px; color: var(--tx-2); transition: all .18s;
}
.dt-item:hover { background: var(--bg-glass-2); color: var(--tx-1); }
.dt-item.active { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.dt-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dt-cnt { margin-left: auto; font-size: 11px; font-family: var(--font-num); color: var(--tx-4); }
.dt-item.active .dt-cnt { color: var(--brand); }
.dt-sub { margin: 2px 0 2px 15px; padding-left: 12px; border-left: 1px solid var(--line-1); }
.dt-sub .dt-item { padding: 6px 10px; font-size: 12.5px; }

/* 指标卡 */
.metric-list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.metric-card { cursor: pointer; position: relative; transition: all .18s; }
.metric-card:hover { border-color: var(--line-3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.metric-card.selected { border-color: var(--brand-line); box-shadow: 0 0 24px rgba(255,138,61,.25); }
.mc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mc-name { font-size: 15px; font-weight: 700; }
.mc-code { font-size: 11px; font-family: var(--font-mono); color: var(--tx-4); }
.mc-period { margin-left: auto; font-size: 12px; color: var(--tx-3); }
.mc-desc { font-size: 12.5px; color: var(--tx-3); margin-top: 6px; }
.mc-body { display: flex; align-items: flex-end; gap: 16px; margin-top: 12px; }
.mc-spark { width: 150px; height: 36px; flex: none; }
.mc-meta { display: flex; gap: 14px; font-size: 11.5px; color: var(--tx-3); flex-wrap: wrap; margin-left: auto; text-align: right; }
.mc-meta b { color: var(--tx-1); font-family: var(--font-num); font-weight: 600; }
.yoy-up { color: var(--ok) !important; }
.yoy-down { color: var(--danger) !important; }
.yoy-flat { color: var(--warn) !important; }
.mc-owner { display: flex; align-items: center; gap: 6px; }
.avatar {
  width: 20px; height: 20px; border-radius: 50%; flex: none;
  background: linear-gradient(135deg, #22D3EE, #0E7490);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #04262C;
}

/* 行业标记 */
.ind { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 8px; border-radius: 10px; border: 1px solid transparent; }
.ind i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ind.oil  { color: var(--oil);  background: var(--oil-soft);  border-color: rgba(255,138,61,.3); }
.ind.gas  { color: var(--gas);  background: var(--gas-soft);  border-color: rgba(34,211,238,.3); }
.ind.chem { color: var(--chem); background: var(--chem-soft); border-color: rgba(167,139,250,.3); }
.ind.coal { color: var(--coal); background: var(--coal-soft); border-color: rgba(232,179,60,.3); }

/* ---- 拓扑 ---- */
.topo-wrap { position: relative; margin-top: 14px; }
.topo-legend { position: absolute; right: 16px; top: 12px; display: flex; gap: 12px; font-size: 11.5px; color: var(--tx-3); z-index: 2; }
.topo-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.topo-chart { width: 100%; height: 340px; }

/* ---- 抽屉 ---- */
.drawer {
  position: fixed; top: 0; right: -480px; width: 460px; max-width: 94vw; height: 100vh;
  background: #0D1420; border-left: 1px solid var(--line-2);
  box-shadow: 0 8px 30px rgba(0,0,0,.45); z-index: 95;
  transition: right .28s cubic-bezier(.4,0,.2,1);
  display: flex; flex-direction: column;
}
.drawer.show { right: 0; }
.drawer-head {
  flex: none; padding: 18px 20px 14px; border-bottom: 1px solid var(--line-1);
  display: flex; align-items: flex-start; gap: 10px;
}
.drawer-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.drawer-name { font-size: 16px; }
.drawer-desc { font-size: 12px; color: var(--tx-3); margin-top: 8px; }
.d-close { margin-left: auto; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 24px; }
.drawer-foot {
  flex: none; padding: 12px 20px; border-top: 1px solid var(--line-1);
  display: flex; gap: 10px; justify-content: flex-end;
}
.def-grid { display: grid; grid-template-columns: 84px 1fr; gap: 8px 12px; font-size: 12.5px; margin: 0; }
.def-grid dt { color: var(--tx-3); }
.def-grid dd { color: var(--tx-1); margin: 0; }
.code-block {
  background: rgba(5,8,14,.8); border: 1px solid var(--line-1); border-radius: 10px;
  padding: 12px 14px; font-family: var(--font-mono); font-size: 11.5px; line-height: 1.7;
  color: #C9D4E8; overflow-x: auto; white-space: pre;
}
.code-block .kw { color: #FF8A3D; }
.code-block .fn { color: #22D3EE; }
.code-block .cm { color: #525D75; }
.code-block .pc { color: #E8B33C; }
.ver-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.045); font-size: 12.5px; }
.ver-item:last-child { border-bottom: none; }
.v-no { font-family: var(--font-mono); color: var(--brand); flex: none; width: 44px; }
.ver-sub { font-size: 12px; color: var(--tx-3); }
.grow { flex: 1; min-width: 0; }
.lineage-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 0; flex-wrap: wrap; }
.lineage-node {
  padding: 3px 10px; border-radius: 8px; border: 1px solid var(--line-2);
  background: var(--bg-glass-2); font-size: 11.5px; white-space: nowrap;
}
.lineage-arrow { color: var(--tx-4); font-size: 13px; }
.ln-info { border-color: rgba(96,165,250,.4); color: var(--info); }
.ln-brand { border-color: var(--brand-line); color: var(--brand); }
.ln-gas { border-color: rgba(34,211,238,.4); color: var(--gas); }
.ln-warn { border-color: rgba(251,191,36,.4); color: var(--warn); }
.ln-chem { border-color: rgba(167,139,250,.4); color: var(--chem); }
.d-sec { margin-bottom: 20px; }
.d-sec-t { font-size: 12px; color: var(--tx-3); letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.d-sec-t::before { content: ""; width: 3px; height: 10px; border-radius: 2px; background: var(--brand-grad); }

/* ---- 响应式 ---- */
@media (max-width: 1100px) { .metric-bench { grid-template-columns: 1fr; } }
</style>
