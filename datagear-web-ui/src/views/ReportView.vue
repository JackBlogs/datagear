<script setup lang="ts">
import { ref } from 'vue'
import { useOperationMessage } from '@/composables/useOperationMessage'

// 统计报表（能源暗域）：中国式复杂报表 —— 多级表头、合并单元格、小计合计、条件格式与填报。
// 注：后端尚无报表模块 API，当前为演示数据（参考 prototype/report.html）。
const { success } = useOperationMessage()

/* ---------- 类型 chips ---------- */
interface Chip { key: string; label: string; msg?: string }
const CHIPS: Chip[] = [
  { key: 'all', label: '全部' },
  { key: 'group', label: '分组报表 12', msg: '筛选分组报表功能规划中（演示）' },
  { key: 'cross', label: '交叉报表 8', msg: '筛选交叉报表功能规划中（演示）' },
  { key: 'sheet', label: '电子表格 5', msg: '筛选电子表格功能规划中（演示）' },
  { key: 'form', label: '填报表单 6', msg: '筛选填报表单功能规划中（演示）' },
]
const activeChip = ref('all')
function selectChip(c: Chip) {
  activeChip.value = c.key
  if (c.msg) success(c.msg)
}

/* ---------- 报表清单（演示数据） ---------- */
interface Report {
  n: string; s: string; t: string
  col: string; bg: string
}
const RPS: Report[] = [
  { n: '原油产量月报', s: '分组报表 · 今天 06:00 · 李明', t: 'tag-brand', col: 'var(--oil)', bg: 'var(--oil-soft)' },
  { n: '管输量日报', s: '分组报表 · 今天 07:30 · 王芳', t: 'tag-info', col: 'var(--gas)', bg: 'var(--gas-soft)' },
  { n: '煤矿产量旬报', s: '交叉报表 · 09-01 · 陈磊', t: 'tag-warn', col: 'var(--coal)', bg: 'var(--coal-soft)' },
  { n: '化工品产销存月报', s: '电子表格 · 09-02 · 赵静', t: 'tag-info', col: 'var(--chem)', bg: 'var(--chem-soft)' },
  { n: '井场巡检填报单', s: '填报表单 · 持续 · 张伟', t: 'tag-ok', col: 'var(--info)', bg: 'rgba(96,165,250,.13)' },
  { n: '设备完好率季报', s: '交叉报表 · 07-02 · 刘总', t: 'tag-info', col: 'var(--info)', bg: 'rgba(96,165,250,.13)' },
]
const activeReport = ref('原油产量月报')
function selectReport(r: Report) {
  activeReport.value = r.n
  success(`加载报表「${r.n}」（演示）`)
}
function typeTag(r: Report): string {
  return r.s.split(' · ')[0]
}
</script>

<template>
  <div class="report-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">统计报表 <span class="tag tag-brand">演示数据</span></div>
        <div class="page-desc">中国式复杂报表：多级表头、合并单元格、小计合计、条件格式与填报（PRD 10.10）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('报表订阅管理功能规划中（演示）')">订阅管理</button>
        <button class="btn primary" @click="success('新建报表向导规划中（演示）')">
          <i class="pi pi-plus"></i>新建报表
        </button>
      </div>
    </div>

    <!-- 类型 chips -->
    <div class="flex wrap mb-3" style="gap:8px">
      <span
        v-for="c in CHIPS"
        :key="c.key"
        class="seg-item"
        :class="{ active: activeChip === c.key }"
        @click="selectChip(c)"
      >{{ c.label }}</span>
    </div>

    <div class="report-layout">
      <!-- 左：报表列表 -->
      <div class="card" style="padding:14px">
        <div class="card-title">
          <span class="bar"></span>报表清单
          <span class="more" @click="success('报表目录管理功能规划中（演示）')">目录 ›</span>
        </div>
        <div
          v-for="r in RPS"
          :key="r.n"
          class="rp-item"
          :class="{ active: activeReport === r.n }"
          @click="selectReport(r)"
        >
          <span class="r-ico" :style="{ color: r.col, background: r.bg }"><i class="pi pi-file"></i></span>
          <div class="grow">
            <div class="r-name">{{ r.n }}</div>
            <div class="r-sub">{{ r.s }}</div>
          </div>
          <span class="tag" :class="r.t" style="align-self:flex-start">{{ typeTag(r) }}</span>
        </div>
      </div>

      <!-- 右：报表预览 -->
      <div class="flex-col" style="gap:12px;min-width:0">
        <div class="toolbar">
          <button class="btn sm" @click="success('已导出 Excel：原油产量月报_202608.xlsx（演示）')">导出 Excel</button>
          <button class="btn sm" @click="success('已导出 PDF：原油产量月报_202608.pdf（演示）')">导出 PDF</button>
          <button class="btn sm" @click="success('定时推送设置规划中（每天 08:00 邮件，演示）')">定时推送</button>
          <button class="btn sm" @click="success('条件格式规则编辑功能规划中（演示）')">条件格式</button>
          <button class="btn sm" @click="success('打印排版预览功能规划中（演示）')">打印</button>
          <span class="sm tx-3" style="margin-left:auto;align-self:center">数据源：DS_采油日报 · 参数 ${month}=2026-08 · 已按行级权限过滤</span>
        </div>

        <div class="report-sheet">
          <div class="sheet-title">2026 年 8 月 各采油厂生产情况月报</div>
          <div class="sheet-sub"><span class="u">编制单位：生产运行部</span><span class="u">单位：万吨、%</span><span class="u">报表编号：SC-2026-08</span></div>
          <table class="sheet">
            <thead>
              <tr>
                <th rowspan="3" class="slash"><i class="a">指标</i><i class="b">单位</i></th>
                <th colspan="3">原油产量</th>
                <th colspan="3">天然气产量</th>
                <th colspan="2">注水</th>
                <th rowspan="3">综合含水率<br />(%)</th>
              </tr>
              <tr>
                <th>计划</th><th>实际</th><th>完成率(%)</th>
                <th>计划</th><th>实际</th><th>完成率(%)</th>
                <th>计划</th><th>实际</th>
              </tr>
              <tr>
                <th>万吨</th><th>万吨</th><th>—</th>
                <th>万方</th><th>万方</th><th>—</th>
                <th>万方</th><th>万方</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="grp" rowspan="2">长庆油田</td>
                <td class="numc">38.50</td><td class="numc">39.12</td><td class="numc good">101.6</td>
                <td class="numc">12,400</td><td class="numc">12,815</td><td class="numc good">103.3</td>
                <td class="numc">5,200</td><td class="numc">5,186</td>
                <td class="numc">61.2</td>
              </tr>
              <tr>
                <td class="sub">其中：页岩油</td>
                <td class="numc">6.20</td><td class="numc">6.58</td><td class="numc good">106.1</td>
                <td class="numc">—</td><td class="numc">—</td><td class="numc">—</td>
                <td class="numc">—</td><td class="numc">—</td>
                <td class="numc">58.4</td>
              </tr>
              <tr>
                <td class="grp" rowspan="2">华北油田</td>
                <td class="numc">30.00</td><td class="numc">28.94</td><td class="numc bad">96.5</td>
                <td class="numc">4,600</td><td class="numc">4,522</td><td class="numc bad">98.3</td>
                <td class="numc">3,800</td><td class="numc">3,902</td>
                <td class="numc">72.5</td>
              </tr>
              <tr>
                <td class="sub">其中：煤层气</td>
                <td class="numc">—</td><td class="numc">—</td><td class="numc">—</td>
                <td class="numc">1,050</td><td class="numc">1,183</td><td class="numc good">112.7</td>
                <td class="numc">—</td><td class="numc">—</td>
                <td class="numc">—</td>
              </tr>
              <tr>
                <td class="grp">塔里木油田</td>
                <td class="numc">26.80</td><td class="numc">27.35</td><td class="numc good">102.1</td>
                <td class="numc">9,800</td><td class="numc">10,064</td><td class="numc good">102.7</td>
                <td class="numc">2,600</td><td class="numc">2,577</td>
                <td class="numc">45.8</td>
              </tr>
              <tr>
                <td class="grp">大庆油田</td>
                <td class="numc">24.50</td><td class="numc">23.86</td><td class="numc bad">97.4</td>
                <td class="numc">1,200</td><td class="numc">1,156</td><td class="numc bad">96.3</td>
                <td class="numc">6,100</td><td class="numc">6,240</td>
                <td class="numc">83.1</td>
              </tr>
              <tr class="subtotal">
                <td>小计（东部油田）</td>
                <td class="numc">54.50</td><td class="numc">52.80</td><td class="numc bad">96.9</td>
                <td class="numc">5,800</td><td class="numc">5,678</td><td class="numc bad">97.9</td>
                <td class="numc">9,900</td><td class="numc">10,142</td>
                <td class="numc">77.6</td>
              </tr>
              <tr class="total">
                <td>合计</td>
                <td class="numc">119.80</td><td class="numc">119.27</td><td class="numc">99.6</td>
                <td class="numc">28,000</td><td class="numc">28,557</td><td class="numc good">102.0</td>
                <td class="numc">17,700</td><td class="numc">17,905</td>
                <td class="numc">66.4</td>
              </tr>
            </tbody>
          </table>
          <div class="sheet-sub" style="padding:10px 0 14px">注：完成率 &lt; 100% 以红色标注；数据经行级权限过滤，仅展示当前用户可见油田。审核人：刘总 · 审核时间：2026-09-02 16:30</div>
        </div>
      </div>
    </div>

    <!-- 企业版说明 -->
    <div class="ent-bar mt-3">
      <i class="pi pi-star" style="color:var(--chem);flex:none;font-size:14px"></i>
      <span><b>企业版增值能力</b>：报表设计器、单元格公式计算、电子表格（类 Excel 在线建模）为企业版增值模块；开源版支持分组 / 交叉报表与填报表单基础能力。</span>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.report-page {
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
  --r-m: 12px;
  --dur: .18s;
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
.mb-3 { margin-bottom: 14px; }
.mt-3 { margin-top: 14px; }
.sm { font-size: 11.5px; }
.tx-3 { color: var(--tx-3); }
.grow { flex: 1; min-width: 0; }
.flex { display: flex; align-items: center; }
.wrap { flex-wrap: wrap; }
.flex-col { display: flex; flex-direction: column; }

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
.tag-danger { background: rgba(248,113,113,.13); color: var(--danger); border-color: rgba(248,113,113,.3); }
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

/* ---- 分段 chips ---- */
.seg-item {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 14px; border-radius: 16px; font-size: 12.5px;
  color: var(--tx-2); background: var(--bg-glass);
  border: 1px solid var(--line-1); cursor: pointer;
  transition: all var(--dur); user-select: none;
}
.seg-item:hover { border-color: var(--line-3); color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); border-color: var(--brand-line); font-weight: 600; }

/* ---- 报表布局 ---- */
.report-layout { display: grid; grid-template-columns: 320px 1fr; gap: 14px; align-items: start; }
.rp-item {
  display: flex; gap: 12px; padding: 12px;
  border: 1px solid var(--line-1); border-radius: var(--r-m);
  margin-bottom: 10px; cursor: pointer; transition: all var(--dur);
  background: var(--bg-glass);
}
.rp-item:hover { border-color: var(--line-3); }
.rp-item.active { border-color: var(--brand); background: var(--brand-soft); }
.rp-item .r-ico { width: 36px; height: 36px; border-radius: 9px; flex: none; display: flex; align-items: center; justify-content: center; }
.rp-item .r-ico .pi { font-size: 16px; }
.rp-item .r-name { font-size: 13px; font-weight: 600; }
.rp-item .r-sub { font-size: 11px; color: var(--tx-3); margin-top: 2px; }

/* ---- 工具条 ---- */
.toolbar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px; background: var(--bg-glass);
  border: 1px solid var(--line-1); border-radius: var(--r-m);
}

/* ---- 中国式复杂报表（纯 HTML 表格） ---- */
.report-sheet { overflow: auto; border-radius: var(--r-m); border: 1px solid var(--line-2); background: rgba(7,10,18,.5); }
.sheet-title { text-align: center; font-size: 17px; font-weight: 700; letter-spacing: 2px; padding: 18px 0 4px; }
.sheet-sub { text-align: center; font-size: 11.5px; color: var(--tx-3); padding-bottom: 12px; }
.sheet-sub .u { margin: 0 18px; }
table.sheet { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 860px; }
.sheet th, .sheet td { border: 1px solid var(--line-2); padding: 7px 10px; text-align: center; white-space: nowrap; }
.sheet thead th { background: rgba(255,138,61,.08); color: var(--tx-1); font-weight: 600; }
.sheet .grp { background: rgba(255,255,255,.03); color: var(--tx-1); font-weight: 600; text-align: left; padding-left: 14px; }
.sheet .sub { color: var(--tx-3); font-weight: 400; text-align: left; padding-left: 28px; }
.sheet .numc { font-family: var(--font-num); text-align: right; padding-right: 12px; }
.sheet .subtotal td { background: rgba(255,138,61,.06); font-weight: 700; color: var(--tx-1); }
.sheet .total td { background: rgba(255,138,61,.12); font-weight: 700; color: var(--brand); }
.sheet .bad { color: var(--danger); font-weight: 600; }
.sheet .good { color: var(--ok); font-weight: 600; }
/* 斜线表头 */
.sheet .slash {
  background-image: linear-gradient(to top right, transparent 49.4%, var(--line-3) 49.4%, var(--line-3) 50.6%, transparent 50.6%) !important;
  position: relative; min-width: 108px; padding: 0 !important; height: 54px;
}
.sheet .slash i { position: absolute; font-style: normal; font-size: 11px; color: var(--tx-2); }
.sheet .slash i.a { right: 8px; top: 5px; }
.sheet .slash i.b { left: 8px; bottom: 5px; }

/* ---- 企业版说明条 ---- */
.ent-bar {
  display: flex; align-items: center; gap: 10px; padding: 11px 16px;
  background: var(--chem-soft); border: 1px solid rgba(167,139,250,.3); border-radius: var(--r-m);
  font-size: 12.5px; color: var(--tx-2);
}
.ent-bar b { color: var(--chem); }

/* ---- 响应式 ---- */
@media (max-width: 1100px) { .report-layout { grid-template-columns: 1fr; } }
</style>
