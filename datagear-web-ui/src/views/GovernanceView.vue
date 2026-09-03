<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart, PieChart, GraphChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'

use([LineChart, PieChart, GraphChart, GridComponent, TooltipComponent, CanvasRenderer])

// 数据治理（能源暗域）：元数据 / 数据标准 / 数据质量 / 数据血缘 / 数据安全。
// 注：后端尚无治理模块 API，当前为演示数据（参考 prototype/governance.html）。
const { success } = useOperationMessage()

/* ---------- 页签 ---------- */
type PaneKey = 'meta' | 'std' | 'quality' | 'lineage' | 'secure'
const PANES: { key: PaneKey; label: string; badge?: 'cnt' | 'issues' }[] = [
  { key: 'meta', label: '元数据' },
  { key: 'std', label: '数据标准', badge: 'cnt' },
  { key: 'quality', label: '数据质量', badge: 'issues' },
  { key: 'lineage', label: '数据血缘' },
  { key: 'secure', label: '数据安全' },
]
const activePane = ref<PaneKey>('meta')

/* ---------- 演示数据 ---------- */
interface Collect {
  n: string; t: string; tb: string; fd: string; last: string
  rate: number; col: string; bg: string
}
const COLLECTS: Collect[] = [
  { n: '华北油田生产库', t: 'MySQL · 全量+增量', tb: '128', fd: '3,402', last: '今天 02:00', rate: 100, col: 'var(--oil)', bg: 'var(--oil-soft)' },
  { n: '煤化工 ERP 库', t: 'Oracle · 全量', tb: '86', fd: '1,968', last: '今天 02:20', rate: 97.6, col: 'var(--chem)', bg: 'var(--chem-soft)' },
  { n: '煤矿安全监测流', t: 'Kafka · 实时 schema', tb: '9', fd: '214', last: '实时', rate: 99.1, col: 'var(--coal)', bg: 'var(--coal-soft)' },
]

interface TreeNode { n: string; lv: 0 | 1; cnt: string; ic: 'db' | 'dataset' }
const TREE: TreeNode[] = [
  { n: '华北油田生产库', lv: 0, cnt: '128 表', ic: 'db' },
  { n: 'ODS_采油日报', lv: 1, cnt: '36 列', ic: 'dataset' },
  { n: 'ODS_注水日报', lv: 1, cnt: '28 列', ic: 'dataset' },
  { n: 'ODS_井史档案', lv: 1, cnt: '52 列', ic: 'dataset' },
  { n: 'DIM_区块档案', lv: 1, cnt: '14 列', ic: 'dataset' },
  { n: '集团财务核算库', lv: 0, cnt: '54 表', ic: 'db' },
  { n: '煤矿安全监测流', lv: 0, cnt: '9 topic', ic: 'db' },
]
const selNode = ref('ODS_采油日报')
const fieldTableTitle = computed(() => {
  const node = TREE.find((t) => t.n === selNode.value)
  return node && node.lv === 1 ? `${node.n} · 字段元数据` : 'ODS_采油日报 · 字段元数据'
})
function selectNode(t: TreeNode) {
  selNode.value = t.n
}

interface Field { name: string; type: string; desc: string; lv: '低' | '中' | '高'; rule: string }
const FIELDS: Field[] = [
  { name: 'rq', type: 'DATE', desc: '生产日期', lv: '低', rule: '非空' },
  { name: 'cyf', type: 'VARCHAR(32)', desc: '采油厂名称', lv: '低', rule: '非空 · 枚举' },
  { name: 'block', type: 'VARCHAR(32)', desc: '所属区块（关联区块档案）', lv: '低', rule: '外键一致' },
  { name: 'well_no', type: 'VARCHAR(24)', desc: '井号', lv: '中', rule: '非空 · 唯一' },
  { name: 'oil_t', type: 'DECIMAL(10,2)', desc: '日产油量（吨）', lv: '低', rule: '范围 0-2000' },
  { name: 'water_t', type: 'DECIMAL(10,2)', desc: '日产水量（吨）', lv: '低', rule: '范围 0-5000' },
  { name: 'wc_pct', type: 'DECIMAL(5,2)', desc: '含水率（%）', lv: '低', rule: '范围 0-100' },
  { name: 'dyn_lvl', type: 'DECIMAL(8,2)', desc: '动液面深度（米）', lv: '低', rule: '及时性 ≤ T+1' },
]
const LV_TAG_CLS: Record<Field['lv'], string> = { 低: '', 中: 'tag-warn', 高: 'tag-danger' }

interface Std { name: string; cat: string; summary: string; status: '已发布' | '评审中'; refs: number; owner: string }
const STDS: Std[] = [
  { name: '指标命名规范 V3.0', cat: '命名规范', summary: '业务域_业务过程_度量_统计粒度，如 OIL_PROD_DAILY', status: '已发布', refs: 86, owner: '李明' },
  { name: '组织机构编码规则', cat: '编码规则', summary: 'GB/T 11714 扩展：集团-分公司-厂-区四级 12 位', status: '已发布', refs: 42, owner: '赵静' },
  { name: '油藏类型代码', cat: '值域标准', summary: 'SY/T 6169：01 构造油藏 / 02 岩性油藏 / 03 复合油藏…', status: '已发布', refs: 18, owner: '张伟' },
  { name: '井号编码规则', cat: '编码规则', summary: '区块码(4)+井别(1)+顺序号(5)', status: '已发布', refs: 31, owner: '陈磊' },
  { name: '计量单位标准', cat: '度量标准', summary: '产量-吨/万方，压力-MPa，温度-℃（统一 SI 换算）', status: '评审中', refs: 9, owner: '王芳' },
  { name: '管道站场编码', cat: '编码规则', summary: '管网-干线-站场三级编码，对齐 SCADA 点位表', status: '已发布', refs: 22, owner: '王芳' },
  { name: '瓦斯浓度计量规范', cat: '值域标准', summary: '%CH₄，报警阈值 1.0%、断电阈值 1.5%', status: '已发布', refs: 14, owner: '陈磊' },
]

interface Qr { name: string; type: string; target: string; rate: number }
const QRS: Qr[] = [
  { name: '井号非空校验', type: '非空', target: 'ODS_采油日报', rate: 99.8 },
  { name: '采油厂枚举校验', type: '值域', target: 'ODS_采油日报', rate: 100 },
  { name: '井号唯一性', type: '唯一', target: 'ODS_井史档案', rate: 98.2 },
  { name: '含水率范围 0-100', type: '范围', target: 'ODS_采油日报', rate: 96.8 },
  { name: 'T+1 及时性', type: '及时性', target: 'ODS_注水日报', rate: 99.1 },
  { name: '区块外键一致性', type: '一致性', target: 'DIM_区块档案', rate: 100 },
]
function rateColor(rate: number): string {
  return rate >= 99 ? 'var(--ok)' : rate >= 97 ? 'var(--warn)' : 'var(--danger)'
}

interface Issue { c: string; bg: string; t: string; s: string }
const ISSUES: Issue[] = [
  { c: 'var(--danger)', bg: 'rgba(248,113,113,.13)', t: 'ODS_采油日报表 · 含水率空值率 3.2% 超阈值（阈值 1%）', s: '今天 06:00 校验 · 疑似 SCADA 采集缺报 · 已通知王芳' },
  { c: 'var(--warn)', bg: 'rgba(251,191,36,.13)', t: 'ODS_井史档案 · 井号重复 2 条（HB-2048 / HB-2049）', s: '昨天 22:00 校验 · 等待源系统主数据修复' },
]

/* ---------- 图表 ---------- */
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
  backgroundColor: 'rgba(13,20,32,.94)',
  borderColor: 'rgba(255,255,255,.12)',
  textStyle: { color: '#F2F5FA', fontSize: 12 },
}

const scoreEl = ref<HTMLElement>()
const sparkEls = ref<HTMLElement[]>([])
const lineageEl = ref<HTMLElement>()
let scoreChart: ECharts | null = null
let sparkCharts: ECharts[] = []
let lineageChart: ECharts | null = null
let qualityInited = false
let lineageInited = false

function renderQuality() {
  if (scoreEl.value && !scoreChart) {
    scoreChart = init(scoreEl.value)
    scoreChart.setOption({
      series: [{
        type: 'pie', radius: ['72%', '88%'], center: ['50%', '50%'],
        label: { show: false }, silent: true,
        data: [
          { value: 92.6, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#FFB25E' }, { offset: 1, color: '#F4633A' }] }, borderRadius: 8 } },
          { value: 7.4, itemStyle: { color: 'rgba(255,255,255,.06)' } },
        ],
      }],
    } as EChartsCoreOption)
  }
  sparkEls.value.forEach((el, i) => {
    const q = QRS[i]
    if (!el || !q) return
    const okLine = q.rate >= 97
    const c = init(el)
    c.setOption({
      grid: { left: 0, right: 0, top: 3, bottom: 3 },
      xAxis: { type: 'category', show: false, data: WEEK },
      yAxis: { type: 'value', show: false, min: 90, max: 100 },
      tooltip: { trigger: 'axis', ...tooltipBase },
      series: [{
        type: 'line', smooth: true, symbol: 'none', data: series(7, q.rate - 1.5, 1.2, i),
        lineStyle: { width: 1.6, color: okLine ? '#34D399' : '#FBBF24' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: okLine ? 'rgba(52,211,153,.22)' : 'rgba(251,191,36,.22)' }, { offset: 1, color: 'rgba(0,0,0,0)' }],
          },
        },
      }],
    } as EChartsCoreOption)
    sparkCharts.push(c)
  })
}

const LC = { gas: '#22D3EE', info: '#60A5FA', brand: '#FF8A3D', chem: '#A78BFA' }
function renderLineage() {
  if (!lineageEl.value) return
  lineageChart = lineageChart || init(lineageEl.value)
  const node = (name: string, x: number, y: number, color: string) => ({
    name, x, y, symbol: 'roundRect', symbolSize: [132, 34],
    itemStyle: { color: color + '26', borderColor: color, borderWidth: 1.2, borderRadius: 8 },
    label: { show: true, color: '#F2F5FA', fontSize: 11, lineHeight: 14 },
  })
  const nodes = [
    node('ODS_采油日报', 60, 60, LC.gas), node('ODS_注水日报', 60, 210, LC.gas), node('DIM_区块档案', 60, 360, LC.gas),
    node('DS_采油日报', 330, 130, LC.info), node('DS_注采对应', 330, 300, LC.info),
    node('原油产量\nM-OIL-001', 600, 40, LC.brand), node('综合含水率\nM-OIL-008', 600, 190, LC.brand), node('注采比\nM-OIL-015', 600, 340, LC.brand),
    node('生产日报看板', 870, 20, LC.chem), node('经营驾驶舱大屏', 870, 150, LC.chem), node('产量月报报表', 870, 280, LC.chem), node('低产告警规则', 870, 400, LC.chem),
  ]
  const edges = [
    ['ODS_采油日报', 'DS_采油日报'], ['ODS_注水日报', 'DS_注采对应'], ['DIM_区块档案', 'DS_采油日报'], ['DIM_区块档案', 'DS_注采对应'],
    ['DS_采油日报', '原油产量\nM-OIL-001'], ['DS_采油日报', '综合含水率\nM-OIL-008'], ['DS_注采对应', '注采比\nM-OIL-015'],
    ['原油产量\nM-OIL-001', '生产日报看板'], ['原油产量\nM-OIL-001', '经营驾驶舱大屏'], ['原油产量\nM-OIL-001', '产量月报报表'],
    ['综合含水率\nM-OIL-008', '生产日报看板'], ['综合含水率\nM-OIL-008', '低产告警规则'], ['注采比\nM-OIL-015', '经营驾驶舱大屏'],
  ].map(([s, t]) => ({ source: s, target: t, lineStyle: { color: 'rgba(255,255,255,.28)', curveness: 0.08, width: 1.4 } }))
  lineageChart.setOption({
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    tooltip: { trigger: 'item', ...tooltipBase },
    series: [{
      type: 'graph', layout: 'none', roam: false, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7,
      data: nodes, links: edges, emphasis: { focus: 'adjacency', lineStyle: { color: '#FF8A3D', width: 2.2 } },
    }],
  } as EChartsCoreOption)
}

function switchPane(pane: PaneKey) {
  activePane.value = pane
  if (pane === 'quality' && !qualityInited) {
    qualityInited = true
    nextTick(() => renderQuality())
  } else if (pane === 'quality') {
    nextTick(() => {
      scoreChart?.resize()
      sparkCharts.forEach((c) => c.resize())
    })
  }
  if (pane === 'lineage' && !lineageInited) {
    lineageInited = true
    nextTick(() => renderLineage())
  } else if (pane === 'lineage') {
    nextTick(() => lineageChart?.resize())
  }
}

function onResize() {
  scoreChart?.resize()
  sparkCharts.forEach((c) => c.resize())
  lineageChart?.resize()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  scoreChart?.dispose()
  sparkCharts.forEach((c) => c.dispose())
  lineageChart?.dispose()
})
</script>

<template>
  <div class="governance-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">数据治理 <span class="tag tag-brand">演示数据</span></div>
        <div class="page-desc">元数据采集、数据标准、质量校验、全链路血缘与敏感数据保护（PRD 10.4）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('治理周报导出功能规划中（演示）')">治理周报</button>
        <button class="btn primary" @click="success('新建采集任务向导规划中（演示）')">
          <i class="pi pi-plus"></i>新建采集任务
        </button>
      </div>
    </div>

    <!-- 页签 -->
    <div class="tabs">
      <div
        v-for="p in PANES"
        :key="p.key"
        class="tab"
        :class="{ active: activePane === p.key }"
        @click="switchPane(p.key)"
      >
        {{ p.label }}
        <span v-if="p.badge === 'cnt'" class="cnt">36</span>
        <span v-if="p.badge === 'issues'" class="tag tag-danger" style="margin-left:2px">2 异常</span>
      </div>
    </div>

    <!-- 元数据 -->
    <div v-show="activePane === 'meta'" class="tab-pane">
      <div class="grid g-3 mb-3">
        <div v-for="c in COLLECTS" :key="c.n" class="card hover">
          <div class="collect-card">
            <span class="cc-ico" :style="{ color: c.col, background: c.bg }"><i class="pi pi-database"></i></span>
            <div class="grow">
              <div style="font-size:13.5px;font-weight:600">{{ c.n }}</div>
              <div class="sm tx-3">{{ c.t }} · 最近采集 {{ c.last }}</div>
            </div>
            <span class="tag" :class="c.rate >= 99 ? 'tag-ok' : 'tag-warn'">成功率 {{ c.rate }}%</span>
          </div>
          <div class="flex-between sm tx-3 mt-2" style="padding-top:10px;border-top:1px dashed var(--line-1)">
            <span>表 <b class="num" style="color:var(--tx-1)">{{ c.tb }}</b></span>
            <span>字段 <b class="num" style="color:var(--tx-1)">{{ c.fd }}</b></span>
            <span style="color:var(--brand);cursor:pointer" @click="success('立即采集功能规划中（演示）')">立即采集</span>
          </div>
        </div>
      </div>
      <div class="meta-layout">
        <div class="card">
          <div class="card-title"><span class="bar"></span>元数据目录树</div>
          <div class="tree">
            <div
              v-for="t in TREE"
              :key="t.n"
              class="tree-node"
              :class="{ sel: selNode === t.n, 'tree-lv1': t.lv === 1 }"
              @click="selectNode(t)"
            >
              <i class="pi" :class="t.ic === 'db' ? 'pi-database' : 'pi-table'"></i>
              <span class="ellipsis">{{ t.n }}</span>
              <span class="t-cnt">{{ t.cnt }}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">
            <span class="bar"></span>{{ fieldTableTitle }}
            <span class="more" @click="success('批量标注功能规划中（编辑业务描述与敏感级别，演示）')">批量标注 ›</span>
          </div>
          <div class="table-wrap" style="border:none">
            <table class="tbl">
              <thead><tr><th>字段名</th><th>类型</th><th>业务描述</th><th>敏感级别</th><th>质量规则</th></tr></thead>
              <tbody>
                <tr v-for="f in FIELDS" :key="f.name">
                  <td class="mask-demo cell-main">{{ f.name }}</td>
                  <td class="mask-demo tx-3">{{ f.type }}</td>
                  <td>{{ f.desc }}</td>
                  <td><span class="tag" :class="LV_TAG_CLS[f.lv]">{{ f.lv }}</span></td>
                  <td class="sm tx-3">{{ f.rule }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据标准 -->
    <div v-show="activePane === 'std'" class="tab-pane">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>标准名称</th><th>类别</th><th>标准内容摘要</th><th>状态</th><th>被引用</th><th>维护人</th><th style="width:150px">操作</th></tr></thead>
          <tbody>
            <tr v-for="s in STDS" :key="s.name">
              <td class="cell-main">{{ s.name }}</td>
              <td><span class="tag tag-info">{{ s.cat }}</span></td>
              <td class="sm tx-2" style="max-width:380px">{{ s.summary }}</td>
              <td><span class="tag" :class="s.status === '已发布' ? 'tag-ok' : 'tag-warn'">{{ s.status }}</span></td>
              <td><span class="num">{{ s.refs }}</span> <span class="sm tx-3">处</span></td>
              <td class="sm">{{ s.owner }}</td>
              <td>
                <span class="op-link" @click="success('标准详情与引用清单功能规划中（演示）')">详情</span> ·
                <span class="op-link" @click="success('标准引用血缘功能规划中（演示）')">引用</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 数据质量 -->
    <div v-show="activePane === 'quality'" class="tab-pane">
      <div class="grid" style="grid-template-columns:320px 1fr;gap:14px;align-items:stretch">
        <div class="card">
          <div class="card-title"><span class="bar"></span>数据质量总分</div>
          <div class="score-wrap">
            <div ref="scoreEl" class="chart" style="height:220px;min-height:220px"></div>
            <div class="score-num"><div class="v">92.6</div><div class="l">覆盖 128 张表 · 日检</div></div>
          </div>
          <div class="flex-between sm tx-3" style="padding-top:6px;border-top:1px dashed var(--line-1)">
            <span>规则 <b class="num" style="color:var(--tx-1)">214</b> 条</span>
            <span>通过率 <b class="num" style="color:var(--ok)">96.8%</b></span>
            <span>异常 <b class="num" style="color:var(--danger)">2</b> 项</span>
          </div>
        </div>
        <div class="flex-col" style="gap:14px">
          <div class="card">
            <div class="card-title"><span class="bar"></span>质量规则与最近校验</div>
            <div class="table-wrap" style="border:none">
              <table class="tbl">
                <thead><tr><th>规则</th><th>类型</th><th>校验对象</th><th>最近通过率</th><th>近 7 日趋势</th></tr></thead>
                <tbody>
                  <tr v-for="(q, i) in QRS" :key="q.name">
                    <td class="cell-main">{{ q.name }}</td>
                    <td><span class="tag">{{ q.type }}</span></td>
                    <td class="sm">{{ q.target }}</td>
                    <td><span class="num" :style="{ color: rateColor(q.rate) }">{{ q.rate }}%</span></td>
                    <td><div :ref="(el) => { if (el) sparkEls[i] = el as HTMLElement }" class="chart" style="height:34px;min-height:34px;width:120px"></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><span class="bar"></span>质量异常清单 <span class="tag tag-danger" style="margin-left:6px">待处理</span></div>
            <div class="flex-col" style="gap:10px">
              <div v-for="iss in ISSUES" :key="iss.t" class="row-item" @click="success('异常详情与处理工单功能规划中（演示）')">
                <span class="issue-ico" :style="{ color: iss.c, background: iss.bg }"><i class="pi pi-exclamation-triangle"></i></span>
                <div class="grow">
                  <div style="font-size:13px;color:var(--tx-1)">{{ iss.t }}</div>
                  <div class="sm tx-3">{{ iss.s }}</div>
                </div>
                <span class="op-link" style="flex:none">处理</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据血缘 -->
    <div v-show="activePane === 'lineage'" class="tab-pane">
      <div class="card mb-3">
        <div class="card-title">
          <span class="bar"></span>全链路血缘：物理表 → 数据集 → 指标 → 消费端
          <span class="more" @click="success('影响分析：下游 3 个指标、4 个看板将受 ODS_采油日报 变更影响（演示）')">影响分析 ›</span>
        </div>
        <div class="lineage-legend mb-2">
          <span><i style="background:var(--gas)"></i>物理表</span>
          <span><i style="background:var(--info)"></i>数据集</span>
          <span><i style="background:var(--brand)"></i>语义指标</span>
          <span><i style="background:var(--chem)"></i>看板 / 报表 / 告警</span>
        </div>
        <div ref="lineageEl" class="chart" style="height:420px;min-height:420px"></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="bar"></span>字段级血缘示例</div>
        <div class="table-wrap" style="border:none">
          <table class="tbl">
            <thead><tr><th>上游字段</th><th>转换逻辑</th><th>下游指标</th><th>消费端</th></tr></thead>
            <tbody>
              <tr>
                <td class="mask-demo">ODS_采油日报.oil_t</td>
                <td class="sm">SUM 聚合 · 按日/采油厂分组</td>
                <td class="cell-main">原油产量 M-OIL-001</td>
                <td class="sm">生产日报看板 · 经营驾驶舱大屏</td>
              </tr>
              <tr>
                <td class="mask-demo">ODS_采油日报.wc_pct</td>
                <td class="sm">AVG 聚合 · 剔除空值</td>
                <td class="cell-main">综合含水率 M-OIL-008</td>
                <td class="sm">含水率突升告警 · 月报报表</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 数据安全 -->
    <div v-show="activePane === 'secure'" class="tab-pane">
      <div class="flex-col" style="gap:14px">
        <div class="card">
          <div class="card-title">
            <span class="bar"></span>敏感字段自动识别 <span class="tag tag-brand">AI 扫描</span>
            <span class="more" @click="success('重新扫描全部数据源功能规划中（演示）')">重新扫描 ›</span>
          </div>
          <div class="table-wrap" style="border:none">
            <table class="tbl">
              <thead><tr><th>敏感类型</th><th>出现位置</th><th>样本（已脱敏）</th><th>建议脱敏规则</th><th>状态</th></tr></thead>
              <tbody>
                <tr><td><span class="tag tag-danger">身份证号</span></td><td class="sm">员工档案表.id_card</td><td class="mask-demo">130***********4217</td><td>保留前 3 后 4 掩码</td><td><span class="tag tag-ok">已采纳</span></td></tr>
                <tr><td><span class="tag tag-danger">手机号</span></td><td class="sm">供应商联系人.phone、值班表.mobile</td><td class="mask-demo">138****1234</td><td>中间 4 位掩码</td><td><span class="tag tag-ok">已采纳</span></td></tr>
                <tr><td><span class="tag tag-warn">银行账号</span></td><td class="sm">采购结算.bank_no</td><td class="mask-demo">6222 **** **** 8102</td><td>哈希 + 仅财务角色可见</td><td><span class="tag tag-warn">待确认</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 300px;gap:14px">
          <div class="card">
            <div class="card-title"><span class="bar"></span>脱敏规则</div>
            <div class="table-wrap" style="border:none">
              <table class="tbl">
                <thead><tr><th>规则名</th><th>字段</th><th>脱敏算法</th><th>适用角色</th><th>状态</th></tr></thead>
                <tbody>
                  <tr><td class="cell-main">手机号掩码</td><td class="mask-demo">*.mobile / *.phone</td><td><span class="tag tag-info">掩码</span></td><td class="sm">业务人员 · 分析师</td><td><span class="tag tag-ok">启用</span></td></tr>
                  <tr><td class="cell-main">身份证掩码</td><td class="mask-demo">*.id_card</td><td><span class="tag tag-info">掩码</span></td><td class="sm">除人事外全部角色</td><td><span class="tag tag-ok">启用</span></td></tr>
                  <tr><td class="cell-main">工资哈希</td><td class="mask-demo">薪酬表.salary</td><td><span class="tag tag-warn">哈希</span></td><td class="sm">业务人员</td><td><span class="tag tag-ok">启用</span></td></tr>
                  <tr><td class="cell-main">银行账号截断</td><td class="mask-demo">采购结算.bank_no</td><td><span class="tag tag-brand">截断</span></td><td class="sm">除财务外全部角色</td><td><span class="tag tag-warn">待审批</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><span class="bar"></span>外发审计</div>
            <div class="sm tx-3" style="line-height:1.8">近 30 日数据导出 / 外发行为 <b class="num" style="color:var(--tx-1);font-size:16px">47</b> 次，其中敏感数据外发 <b class="num" style="color:var(--warn)">3</b> 次均已审批留痕。</div>
            <div class="flex-col mt-2" style="gap:8px">
              <div class="row-item">
                <span class="audit-ico" style="color:var(--warn)"><i class="pi pi-exclamation-triangle"></i></span>
                <div class="grow"><div style="font-size:12.5px">导出「供应商联系人.csv」</div><div class="sm tx-3">张伟 · 09-01 15:20 · 已自动脱敏</div></div>
              </div>
              <div class="row-item">
                <span class="audit-ico" style="color:var(--info)"><i class="pi pi-cloud"></i></span>
                <div class="grow"><div style="font-size:12.5px">API 批量拉取「员工档案」</div><div class="sm tx-3">dgak_8f3**** · 08-28 09:12 · 审批单 A-2026-113</div></div>
              </div>
            </div>
            <button class="btn mt-2" style="width:100%;justify-content:center" @click="success('外发审计明细功能规划中（演示）')">查看外发审计明细</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.governance-page {
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

/* ---- 通用工具类 ---- */
.grid { display: grid; gap: 14px; }
.g-3 { grid-template-columns: repeat(3, 1fr); }
.mb-2 { margin-bottom: 10px; }
.mb-3 { margin-bottom: 14px; }
.mt-2 { margin-top: 10px; }
.sm { font-size: 11.5px; }
.tx-2 { color: var(--tx-2); }
.tx-3 { color: var(--tx-3); }
.num { font-family: var(--font-num); }
.grow { flex: 1; min-width: 0; }
.flex-col { display: flex; flex-direction: column; }
.flex-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-main { color: var(--tx-1); font-weight: 500; }
.chart { width: 100%; }
.mask-demo { font-family: var(--font-mono); font-size: 12px; }
.op-link { color: var(--brand); cursor: pointer; font-size: 12.5px; }
.op-link:hover { text-decoration: underline; }

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

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card.hover { transition: all .18s; }
.card.hover:hover { border-color: var(--line-3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }
.card-title .more { margin-left: auto; font-size: 12px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.card-title .more:hover { color: var(--brand); }

/* ---- 页签 ---- */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line-1); margin-bottom: 16px; flex-wrap: wrap; }
.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px; font-size: 13.5px; color: var(--tx-3);
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all .18s; user-select: none;
}
.tab:hover { color: var(--tx-1); }
.tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.tab .cnt {
  font-family: var(--font-num); font-size: 11px;
  background: var(--bg-glass-2); padding: 0 6px; border-radius: 8px; color: var(--tx-3);
}
.tab.active .cnt { color: var(--brand); background: var(--brand-soft); }

/* ---- 表格 ---- */
.table-wrap { border: 1px solid var(--line-1); border-radius: 12px; overflow: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tbl th {
  text-align: left; padding: 9px 12px; color: var(--tx-3); font-weight: 500;
  font-size: 12px; border-bottom: 1px solid var(--line-1); background: var(--bg-glass);
  white-space: nowrap;
}
.tbl td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,.045); color: var(--tx-2); }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl tbody tr:hover td { background: var(--bg-glass); }

/* ---- 行项 ---- */
.row-item {
  display: flex; gap: 10px; align-items: center;
  padding: 10px 12px; border: 1px solid var(--line-1); border-radius: 10px;
  background: var(--bg-glass); cursor: pointer; transition: all .18s;
}
.row-item:hover { border-color: var(--line-2); }

/* ---- 元数据布局 ---- */
.meta-layout { display: grid; grid-template-columns: 300px 1fr; gap: 14px; align-items: start; }
.tree { font-size: 13px; }
.tree-node { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 7px; cursor: pointer; color: var(--tx-2); }
.tree-node:hover { background: var(--bg-glass-2); }
.tree-node.sel { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.tree-node .pi { font-size: 13px; flex: none; opacity: .85; }
.tree-lv1 { margin-left: 20px; }
.tree-node .t-cnt { margin-left: auto; font-size: 10.5px; color: var(--tx-4); font-family: var(--font-num); }
.collect-card { display: flex; gap: 14px; align-items: center; }
.collect-card .cc-ico { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex: none; }
.collect-card .cc-ico .pi { font-size: 20px; }

/* ---- 质量分环图居中数字 ---- */
.score-wrap { position: relative; height: 220px; }
.score-num {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
}
.score-num .v { font-family: var(--font-num); font-size: 34px; font-weight: 800; color: var(--tx-1); }
.score-num .l { font-size: 11.5px; color: var(--tx-3); }
.issue-ico {
  width: 30px; height: 30px; border-radius: 8px; flex: none;
  display: inline-flex; align-items: center; justify-content: center; font-size: 14px;
}
.audit-ico { width: 15px; height: 15px; display: inline-flex; flex: none; font-size: 14px; align-items: center; }

/* ---- 血缘图节点标签 ---- */
.lineage-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11.5px; color: var(--tx-3); }
.lineage-legend span { display: inline-flex; align-items: center; gap: 5px; }
.lineage-legend i { width: 9px; height: 9px; border-radius: 50%; }

/* ---- 响应式 ---- */
@media (max-width: 1200px) {
  .meta-layout { grid-template-columns: 1fr; }
  .g-3 { grid-template-columns: 1fr; }
}
</style>
