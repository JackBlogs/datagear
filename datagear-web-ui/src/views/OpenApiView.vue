<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { useOperationMessage } from '@/composables/useOperationMessage'
import DemoBadge from '@/components/DemoBadge.vue'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

// 开放与嵌入（能源暗域）：数据 API / 签名嵌入 / API Key / MCP Server / 导入导出。
// 注：后端尚无开放能力模块 API，当前为演示数据（参考 prototype/api.html）。
const { success } = useOperationMessage()

/* ---------- 演示数据 ---------- */
interface ApiItem { n: string; ep: string; src: '指标' | '数据集'; lim: string; today: string; on: boolean }
const APIS = ref<ApiItem[]>([
  { n: '原油产量查询', ep: 'GET /api/v1/metrics/M-OIL-001', src: '指标', lim: '1000 次/分', today: '12,406', on: true },
  { n: '管网输量实时值', ep: 'GET /api/v1/metrics/M-GAS-002', src: '指标', lim: '600 次/分', today: '8,862', on: true },
  { n: '采油日报数据集', ep: 'GET /api/v1/datasets/DS_采油日报', src: '数据集', lim: '300 次/分', today: '3,214', on: true },
  { n: '瓦斯浓度监测', ep: 'GET /api/v1/metrics/M-COAL-007', src: '指标', lim: '1200 次/分', today: '18,533', on: true },
  { n: '甲醇产销存', ep: 'GET /api/v1/datasets/DS_甲醇产销存', src: '数据集', lim: '200 次/分', today: '486', on: true },
  { n: '吨油成本分析', ep: 'GET /api/v1/metrics/M-OIL-021', src: '指标', lim: '300 次/分', today: '152', on: false },
  { n: '区块档案目录', ep: 'GET /api/v1/datasets/DS_区块档案', src: '数据集', lim: '200 次/分', today: '968', on: true },
])

interface KeyItem { n: string; p: string; scope: string; lim: string; last: string; on: boolean; t: string }
const KEYS = ref<KeyItem[]>([
  { n: '集团 OA 门户嵌入', p: 'dgak_8f3****', scope: '只读 · 看板渲染', lim: '5000 次/分', last: '2 分钟前', on: true, t: '2026-03-12' },
  { n: '能耗平台指标同步', p: 'dgak_2c7****', scope: '指标查询', lim: '1000 次/分', last: '11 分钟前', on: true, t: '2026-05-08' },
  { n: '巡检 APP 报表拉取', p: 'dgak_9e1****', scope: '只读 · 报表', lim: '600 次/分', last: '今天 07:50', on: true, t: '2026-06-21' },
  { n: 'Kimi Agent（MCP）', p: 'dgak_mcp****', scope: 'MCP 工具集', lim: '800 次/分', last: '今天 08:41', on: true, t: '2026-08-15' },
  { n: '临时联调（外部厂商）', p: 'dgak_tmp****', scope: '指标查询 · 沙箱', lim: '60 次/分', last: '08-29 16:20', on: false, t: '2026-08-20' },
])

const expChips = ref([
  { label: '数据集 (148)', on: true },
  { label: '图表 (312)', on: true },
  { label: '看板 (64)', on: true },
  { label: '指标 (86)', on: true },
  { label: '数据源引用（不含密码）', on: false },
  { label: '告警规则 (28)', on: false },
])

const MCP_CONFIG = JSON.stringify({
  mcpServers: {
    datagear: {
      url: 'https://bi.example.com/mcp',
      headers: { Authorization: 'Bearer dgak_********' },
    },
  },
}, null, 2)

async function copyText(text: string, msg = '已复制') {
  try {
    await navigator.clipboard.writeText(text)
    success(msg)
  } catch {
    success('复制失败，请手动复制')
  }
}

/* ---------- Tabs ---------- */
const activeTab = ref('api')
function switchTab(pane: string) {
  activeTab.value = pane
  nextTick(() => apiChart?.resize())
}

/* ---------- 图表 ---------- */
const apiCallsEl = ref<HTMLElement>()
let apiChart: ECharts | null = null

function series(n: number, base: number, wave: number, seed: number): number[] {
  const arr: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.8 + seed) * wave * 0.4 + (Math.random() - 0.48) * wave
    arr.push(Math.max(0, +v.toFixed(2)))
  }
  return arr
}

function renderApiCalls() {
  if (!apiCallsEl.value) return
  apiChart = apiChart || init(apiCallsEl.value)
  apiChart.setOption({
    grid: { left: 4, right: 10, top: 26, bottom: 2, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,20,32,.94)', borderColor: 'rgba(255,255,255,.12)',
      textStyle: { color: '#F2F5FA', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => i + ':00'),
      axisLabel: { color: '#7C88A0', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,.12)' } },
    },
    yAxis: {
      type: 'value', name: '次',
      nameTextStyle: { color: '#7C88A0' },
      axisLabel: { color: '#7C88A0', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.06)' } },
    },
    series: [{
      name: '调用量', type: 'line', smooth: true, symbol: 'none',
      data: series(24, 1800, 500, 2),
      lineStyle: { width: 2.2, color: '#22D3EE' }, itemStyle: { color: '#22D3EE' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(34,211,238,.26)' }, { offset: 1, color: 'rgba(34,211,238,0)' }],
        },
      },
    }],
  } as EChartsCoreOption)
}

function onResize() {
  apiChart?.resize()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  renderApiCalls()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  apiChart?.dispose()
})
</script>

<template>
  <div class="openapi-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">数据交换、嵌入与开放 API <DemoBadge /></div>
        <div class="page-desc">指标/数据集发布为 REST API、签名嵌入集成、MCP Server 与项目导入导出（PRD 10.13）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('OpenAPI 在线文档功能规划中（演示）')">OpenAPI 文档</button>
        <button class="btn primary" @click="success('从指标中心选择指标发布 API（演示）')">
          <i class="pi pi-plus"></i>发布 API
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'api' }" @click="switchTab('api')">数据 API <span class="cnt">24</span></div>
      <div class="tab" :class="{ active: activeTab === 'embed' }" @click="switchTab('embed')">嵌入集成</div>
      <div class="tab" :class="{ active: activeTab === 'keys' }" @click="switchTab('keys')">API Key <span class="cnt">12</span></div>
      <div class="tab" :class="{ active: activeTab === 'mcp' }" @click="switchTab('mcp')">MCP Server <span class="tag tag-brand" style="margin-left:2px">AI</span></div>
      <div class="tab" :class="{ active: activeTab === 'io' }" @click="switchTab('io')">导入导出</div>
    </div>

    <!-- 数据 API -->
    <div class="tab-pane" :class="{ show: activeTab === 'api' }">
      <div class="grid" style="grid-template-columns:1fr 340px;gap:14px;align-items:start">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr><th>API 名称</th><th>端点</th><th>来源</th><th>限流</th><th>今日调用</th><th>状态</th><th style="width:130px">操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in APIS" :key="a.ep">
                <td class="cell-main">{{ a.n }}</td>
                <td class="mono" style="color:var(--gas)">{{ a.ep }}</td>
                <td><span class="tag" :class="a.src === '指标' ? 'tag-brand' : 'tag-info'">{{ a.src }}</span></td>
                <td class="sm">{{ a.lim }}</td>
                <td class="num">{{ a.today }}</td>
                <td>
                  <label class="switch">
                    <input type="checkbox" v-model="a.on" @change="success('API 上下线切换（演示）')" /><i></i>
                  </label>
                </td>
                <td>
                  <span class="op-link" @click="success('在线调试控制台功能规划中（演示）')">调试</span> ·
                  <span class="op-link" @click="success('调用明细功能规划中（演示）')">明细</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex-col" style="gap:14px">
          <div class="card">
            <div class="card-title"><span class="bar"></span>近 24h 调用量</div>
            <div ref="apiCallsEl" class="chart" style="height:160px;min-height:160px"></div>
          </div>
          <div class="grid g-2" style="gap:10px">
            <div class="card" style="padding:12px 14px">
              <div class="sm tx-3">调用成功率</div>
              <div class="num bold" style="font-size:22px;color:var(--ok)">99.7%</div>
            </div>
            <div class="card" style="padding:12px 14px">
              <div class="sm tx-3">平均延迟</div>
              <div class="num bold" style="font-size:22px">42<span class="sm tx-3"> ms</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 嵌入集成 -->
    <div class="tab-pane" :class="{ show: activeTab === 'embed' }">
      <div class="card mb-3">
        <div class="card-title">
          <span class="bar"></span>签名 Token 嵌入 · 五步接入
          <span class="more" @click="success('Embed JS SDK 下载功能规划中（演示）')">下载 SDK ›</span>
        </div>
        <div class="embed-flow">
          <div class="embed-step"><span class="e-no">STEP 1</span><div class="e-name">生成嵌入密钥</div><div class="e-desc">在系统管理创建 <code>embed_secret</code>，绑定可嵌入资源范围</div></div>
          <div class="embed-step"><span class="e-no">STEP 2</span><div class="e-name">后端签名 JWT</div><div class="e-desc">业务系统后端用密钥签发 <code>JWT</code>，携带用户身份与行列权限上下文</div></div>
          <div class="embed-step"><span class="e-no">STEP 3</span><div class="e-name">引入 Embed SDK</div><div class="e-desc">前端页面引入 <code>embed.js</code>，体积 38KB 无依赖</div></div>
          <div class="embed-step"><span class="e-no">STEP 4</span><div class="e-name">渲染看板容器</div><div class="e-desc"><code>DGEmbed.render()</code> 渲染看板 / 图表 / 报表到指定 DOM</div></div>
          <div class="embed-step"><span class="e-no">STEP 5</span><div class="e-name">权限透传</div><div class="e-desc">行级 / 列级权限随 JWT 自动生效，业务系统零改造</div></div>
        </div>
      </div>
      <div class="grid g-2" style="align-items:start">
        <div class="card">
          <div class="card-title"><span class="bar"></span>接入代码示例</div>
          <div class="code-block"><span class="cm">&lt;!-- 1. 引入 SDK --&gt;</span>
<span class="tg">&lt;script</span> <span class="at">src</span>=<span class="st">"https://bi.example.com/embed.js"</span><span class="tg">&gt;&lt;/script&gt;</span>

<span class="cm">// 2. 渲染看板（token 由业务后端签名）</span>
<span class="fn">DGEmbed</span>.<span class="fn">render</span>({
  el: <span class="st">'#app'</span>,
  dashboard: <span class="st">'oil-daily'</span>,
  token: <span class="st">signedJwt</span>,   <span class="cm">// 含用户身份与行级权限</span>
  params: { org: <span class="st">'华北油田'</span>, theme: <span class="st">'dark'</span> }
});</div>
        </div>
        <div class="flex-col" style="gap:14px">
          <div class="card">
            <div class="card-title"><span class="bar"></span>嵌入能力标签</div>
            <div class="flex wrap" style="gap:8px">
              <span class="tag tag-brand">白标定制（去 DataGear 标识）</span>
              <span class="tag tag-info">URL 参数传递</span>
              <span class="tag tag-info">主题跟随宿主</span>
              <span class="tag tag-ok">iframe / JS 双模式</span>
              <span class="tag tag-ok">行级权限透传</span>
              <span class="tag">事件回调（钻取/筛选）</span>
            </div>
            <div class="sm tx-3 mt-2" style="line-height:1.8">白标定制可替换 LOGO、配色与版权信息，适配集团统一门户；参数透传支持组织、时间、行业维度默认值。</div>
          </div>
          <div class="card">
            <div class="card-title"><span class="bar"></span>已嵌入宿主系统</div>
            <div class="row-item"><div class="grow"><div style="font-size:13px;font-weight:500">集团 OA 门户 · 生产频道</div><div class="sm tx-3">嵌入 6 个看板 · 日均 1.2 万次访问</div></div><span class="tag tag-ok">运行中</span></div>
            <div class="row-item"><div class="grow"><div style="font-size:13px;font-weight:500">生产调度指挥系统</div><div class="sm tx-3">嵌入大屏 2 面 · 签名 Token</div></div><span class="tag tag-ok">运行中</span></div>
            <div class="row-item"><div class="grow"><div style="font-size:13px;font-weight:500">移动巡检 APP（H5）</div><div class="sm tx-3">嵌入报表 3 张 · 离线缓存</div></div><span class="tag tag-warn">灰度中</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- API Key -->
    <div class="tab-pane" :class="{ show: activeTab === 'keys' }">
      <div class="flex-between mb-2">
        <div class="sm tx-3">Key 仅创建时完整展示一次，前缀 + 哈希存储，可随时吊销</div>
        <button class="btn primary sm" @click="success('新建 Key 弹窗功能规划中（完整密钥仅展示一次）')">新建 Key</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>Key 名称</th><th>前缀</th><th>权限范围</th><th>限流</th><th>最近调用</th><th>状态</th><th>创建时间</th><th style="width:110px">操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="k in KEYS" :key="k.p">
              <td class="cell-main">{{ k.n }}</td>
              <td class="mono">{{ k.p }}</td>
              <td class="sm">{{ k.scope }}</td>
              <td class="sm num">{{ k.lim }}</td>
              <td class="sm tx-3">{{ k.last }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" v-model="k.on" @change="success('吊销 / 启用 Key（演示）')" /><i></i>
                </label>
              </td>
              <td class="sm tx-3">{{ k.t }}</td>
              <td>
                <span class="op-link" @click="success('编辑权限范围功能规划中（演示）')">编辑</span> ·
                <span class="op-link danger" @click="success('吊销需管理员二次确认（演示）')">吊销</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MCP Server -->
    <div class="tab-pane" :class="{ show: activeTab === 'mcp' }">
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;align-items:start">
        <div class="card">
          <div class="card-title"><span class="bar"></span>MCP Server · 让 AI Agent 直接消费指标与数据集</div>
          <div class="sm tx-2" style="line-height:1.9;margin-bottom:12px">
            基于 Model Context Protocol 暴露指标查询、看板清单、数据集 Schema 等工具，Claude / Kimi / 自研 Agent 可直接调用语义层，口径与权限由指标中心统一管控。
          </div>
          <div class="kv"><span class="tx-3">服务端点</span><span class="mono" style="color:var(--gas)">https://bi.example.com/mcp</span></div>
          <div class="kv"><span class="tx-3">鉴权方式</span><span>API Key（dgak_*）· OAuth2 可选</span></div>
          <div class="kv" style="border-bottom:none"><span class="tx-3">连接状态</span><span><span class="tag tag-ok">在线 · 延迟 18ms</span></span></div>
          <button class="btn primary mt-2" @click="copyText(MCP_CONFIG, 'MCP 连接配置已复制')">复制连接配置</button>
        </div>
        <div class="card">
          <div class="card-title"><span class="bar"></span>已开放工具（Tools）</div>
          <div class="flex wrap" style="gap:8px;margin-bottom:12px">
            <span class="tag tag-brand mono">query_metric</span>
            <span class="tag tag-brand mono">list_metrics</span>
            <span class="tag tag-info mono">list_dashboards</span>
            <span class="tag tag-info mono">get_dataset_schema</span>
            <span class="tag tag-info mono">run_dataset_query</span>
            <span class="tag mono">get_lineage</span>
          </div>
          <div class="sm tx-3" style="margin-bottom:8px">最近调用记录</div>
          <div class="row-item"><div class="grow"><div style="font-size:12.5px" class="mono">query_metric(M-OIL-001, month=2026-08)</div><div class="sm tx-3">Kimi Agent · 今天 08:41 · 0.36s</div></div><span class="tag tag-ok">成功</span></div>
          <div class="row-item"><div class="grow"><div style="font-size:12.5px" class="mono">get_dataset_schema(DS_管网输量)</div><div class="sm tx-3">Claude Desktop · 今天 08:12 · 0.08s</div></div><span class="tag tag-ok">成功</span></div>
          <div class="row-item"><div class="grow"><div style="font-size:12.5px" class="mono">list_dashboards(org=华北油田)</div><div class="sm tx-3">Kimi Agent · 昨天 17:52 · 0.11s</div></div><span class="tag tag-ok">成功</span></div>
        </div>
      </div>
    </div>

    <!-- 导入导出 -->
    <div class="tab-pane" :class="{ show: activeTab === 'io' }">
      <div class="grid g-2" style="align-items:start">
        <div class="card">
          <div class="card-title"><span class="bar"></span>项目导出 <span class="tag tag-brand">.dgpkg</span></div>
          <div class="form-label">导出范围</div>
          <div class="chk-chips mb-2">
            <span
              v-for="c in expChips"
              :key="c.label"
              class="tag"
              :class="{ on: c.on }"
              @click="c.on = !c.on"
            >{{ c.label }}</span>
          </div>
          <div class="sm tx-3 mb-2">数据源仅导出引用关系，密码与密钥不落盘；导入时重新绑定。</div>
          <button class="btn primary" @click="success('已导出 project_20260903.dgpkg（18.6 MB）（演示）')">导出项目包</button>
        </div>
        <div class="flex-col" style="gap:14px">
          <div class="card">
            <div class="card-title"><span class="bar"></span>项目导入</div>
            <div class="drop-zone" @click="success('选择 .dgpkg 文件功能规划中（演示）')">
              <i class="pi pi-cloud-upload" style="font-size:26px;color:var(--tx-4);margin-bottom:8px"></i>
              <div>拖拽 <b class="mono" style="color:var(--tx-2)">.dgpkg</b> 文件到此处，或点击选择</div>
              <span class="sm">导入前自动校验版本兼容性与依赖完整性</span>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><span class="bar"></span>备份与恢复</div>
            <div class="flex-between sm" style="padding:6px 0"><span class="tx-3">自动备份</span><span>每天 02:00 · 保留 30 天</span></div>
            <div class="flex-between sm" style="padding:6px 0"><span class="tx-3">最近备份</span><span class="mono">dg_backup_20260903_0200.zip · 96 MB</span></div>
            <div class="flex-between sm" style="padding:6px 0 12px"><span class="tx-3">备份位置</span><span class="mono">/data/datagear/backup</span></div>
            <div class="flex" style="gap:10px">
              <button class="btn primary grow" style="justify-content:center" @click="success('立即备份任务已提交（演示）')">立即备份</button>
              <button class="btn grow" style="justify-content:center" @click="success('恢复需管理员二次确认（演示）')">恢复…</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.openapi-page {
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
  --r-m: 10px;
  --r-l: 14px;
  --dur: .18s;

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
.btn.sm { padding: 4px 10px; font-size: 12px; border-radius: 8px; }

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
.tag-info { background: rgba(96,165,250,.13); color: var(--info); border-color: rgba(96,165,250,.3); }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }
.card-title .more { margin-left: auto; font-size: 12px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.card-title .more:hover { color: var(--brand); }

/* ---- 布局工具 ---- */
.grid { display: grid; gap: 14px; }
.g-2 { grid-template-columns: 1fr 1fr; }
.flex { display: flex; align-items: center; }
.flex-col { display: flex; flex-direction: column; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.wrap { flex-wrap: wrap; }
.grow { flex: 1; min-width: 0; }
.mt-2 { margin-top: 10px; }
.mb-2 { margin-bottom: 10px; }
.mb-3 { margin-bottom: 14px; }
.sm { font-size: 12px; }
.tx-2 { color: var(--tx-2); }
.tx-3 { color: var(--tx-3); }
.tx-4 { color: var(--tx-4); }
.num { font-family: var(--font-num); }
.bold { font-weight: 700; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.chart { width: 100%; }

/* ---- Tabs ---- */
.tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--line-1); flex-wrap: wrap; }
.tab {
  padding: 8px 14px; font-size: 13px; color: var(--tx-3); cursor: pointer;
  border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px;
  transition: all .18s; margin-bottom: -1px;
}
.tab:hover { color: var(--tx-1); }
.tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.tab .cnt {
  font-size: 10.5px; font-family: var(--font-num);
  background: var(--bg-glass-2); border-radius: 8px; padding: 0 6px; color: var(--tx-3);
}
.tab.active .cnt { background: var(--brand-soft); color: var(--brand); }
.tab-pane { display: none; }
.tab-pane.show { display: block; }

/* ---- 表格 ---- */
.table-wrap {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; padding: 6px 14px; overflow-x: auto;
}
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th {
  text-align: left; color: var(--tx-3); font-weight: 500; font-size: 12px;
  padding: 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap;
}
.tbl td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,.045); color: var(--tx-2); }
.tbl tbody tr:last-child td { border-bottom: none; }
.cell-main { color: var(--tx-1); font-weight: 500; }
.op-link { color: var(--brand); cursor: pointer; font-size: 12.5px; }
.op-link:hover { text-decoration: underline; }
.op-link.danger { color: var(--danger); }

/* ---- 开关 ---- */
.switch { position: relative; display: inline-block; width: 34px; height: 19px; cursor: pointer; vertical-align: middle; }
.switch input { display: none; }
.switch i {
  position: absolute; inset: 0; border-radius: 20px;
  background: var(--bg-glass-3); border: 1px solid var(--line-2); transition: all .18s;
}
.switch i::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px;
  border-radius: 50%; background: var(--tx-3); transition: all .18s;
}
.switch input:checked + i { background: var(--brand-grad); border-color: transparent; }
.switch input:checked + i::after { left: 17px; background: #fff; }

/* ---- 行项 ---- */
.row-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.045); }
.row-item:last-child { border-bottom: none; }

/* ---- KV ---- */
.kv {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 0; border-bottom: 1px dashed rgba(255,255,255,.06); font-size: 13px;
}

/* ---- 嵌入五步流程 ---- */
.embed-flow { display: flex; gap: 0; overflow-x: auto; padding-bottom: 4px; padding-top: 9px; }
.embed-step {
  flex: 1; min-width: 170px; background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: var(--r-l); padding: 14px; position: relative;
}
.embed-step + .embed-step { margin-left: 30px; }
.embed-step + .embed-step::before {
  content: ""; position: absolute; left: -30px; top: 50%; width: 30px; height: 2px;
  background: linear-gradient(90deg, var(--line-3), var(--brand-line));
}
.embed-step + .embed-step::after {
  content: ""; position: absolute; left: -6px; top: calc(50% - 4px);
  border: 5px solid transparent; border-left-color: var(--brand-line);
}
.embed-step .e-no {
  position: absolute; top: -9px; left: 12px; font-size: 10px;
  font-family: var(--font-num); font-weight: 700;
  background: var(--brand-grad); color: #241105; padding: 1px 8px; border-radius: 8px;
}
.embed-step .e-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.embed-step .e-desc { font-size: 11.5px; color: var(--tx-3); line-height: 1.55; }
.embed-step .e-desc code { font-family: var(--font-mono); font-size: 10.5px; color: var(--gas); }

/* ---- 代码块 ---- */
.code-block {
  font-family: var(--font-mono); font-size: 12px; line-height: 1.8;
  background: rgba(7,10,18,.78); border: 1px solid var(--line-1); border-radius: var(--r-m);
  padding: 14px 16px; overflow-x: auto; white-space: pre; color: var(--tx-2);
}
.code-block .tg { color: #F07178; }
.code-block .at { color: #FFCB6B; }
.code-block .st { color: #C3E88D; }
.code-block .kw { color: #C792EA; }
.code-block .fn { color: #82AAFF; }
.code-block .cm { color: #546178; font-style: italic; }

/* ---- 导入导出 ---- */
.drop-zone {
  border: 1.5px dashed var(--line-2); border-radius: var(--r-l); padding: 30px 20px;
  text-align: center; color: var(--tx-3); font-size: 12.5px; cursor: pointer;
  transition: all var(--dur); background: var(--bg-glass);
}
.drop-zone:hover { border-color: var(--brand-line); background: var(--bg-glass-2); }
.form-label { font-size: 12.5px; color: var(--tx-3); margin-bottom: 8px; }
.chk-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chk-chips .tag { cursor: pointer; padding: 5px 12px; font-size: 12px; }
.chk-chips .tag.on { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); }

/* ---- 响应式 ---- */
@media (max-width: 1100px) {
  .g-2 { grid-template-columns: 1fr; }
  .tab-pane .grid { grid-template-columns: 1fr !important; }
}
</style>
