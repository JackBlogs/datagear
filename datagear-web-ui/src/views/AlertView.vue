<script setup lang="ts">
import { ref } from 'vue'
import { useOperationMessage } from '@/composables/useOperationMessage'
import DemoBadge from '@/components/DemoBadge.vue'

// 告警与订阅推送（能源暗域）：阈值告警规则 + 定时订阅 + 调度任务 + 多通道通知。
// 注：后端尚无告警/订阅模块 API，当前为演示数据（参考 prototype/alert.html）。
const { success } = useOperationMessage()

/* ---------- 演示数据 ---------- */
type PaneKey = 'rules' | 'subs' | 'jobs' | 'channels'
const activePane = ref<PaneKey>('rules')
const TABS: { key: PaneKey; name: string; cnt: number }[] = [
  { key: 'rules', name: '告警规则', cnt: 28 },
  { key: 'subs', name: '订阅推送', cnt: 15 },
  { key: 'jobs', name: '调度任务', cnt: 46 },
  { key: 'channels', name: '通知渠道', cnt: 5 },
]

interface Rule { n: string; m: string; c: string; f: string; ch: string[]; on: boolean; t: string; hot?: boolean }
const rules = ref<Rule[]>([
  { n: '日产油低于 100 万吨', m: '原油产量 M-OIL-001', c: '< 100 万吨', f: '每 5 分钟', ch: ['企业微信', '邮件'], on: true, t: '今天 08:12', hot: true },
  { n: '瓦斯浓度超限', m: '瓦斯浓度 M-COAL-007', c: '> 1.0%', f: '每 1 分钟', ch: ['企业微信', '短信'], on: true, t: '今天 07:48', hot: true },
  { n: '管网压力异常', m: '管输压力 M-GAS-012', c: '> 6.3 MPa', f: '每 5 分钟', ch: ['企业微信'], on: true, t: '昨天 21:33' },
  { n: '甲醇装置非计划停车', m: '装置开工率 M-CHEM-003', c: '= 0%', f: '每 10 分钟', ch: ['企业微信', '钉钉', 'Webhook'], on: true, t: '08-28 14:05' },
  { n: '含水率突升', m: '综合含水率 M-OIL-008', c: '环比 > 3%', f: '每小时', ch: ['邮件'], on: true, t: '08-30 09:00' },
  { n: '原煤库存低于安全线', m: '库存量 M-COAL-011', c: '< 15 万吨', f: '每小时', ch: ['钉钉'], on: false, t: '—' },
  { n: '数据调度失败', m: '调度成功率 M-SYS-002', c: '< 98%', f: '每 15 分钟', ch: ['企业微信', 'Webhook'], on: true, t: '今天 05:30' },
  { n: '门站流量瞬时波动', m: '瞬时流量 M-GAS-021', c: '波动 > 20%', f: '每 5 分钟', ch: ['企业微信'], on: false, t: '—' },
])
function chTagCls(c: string): string {
  return c === '企业微信' ? 'tag-info' : c === '短信' ? 'tag-warn' : c === 'Webhook' ? 'tag-brand' : ''
}

interface Sub { n: string; f: string; cron: string; ch: string; g: string; on: boolean }
const subs = ref<Sub[]>([
  { n: '经营日报看板', f: '每天 08:00', cron: '0 0 8 * * ?', ch: '企业微信', g: '经营分析组 · 58 人', on: true },
  { n: '原油产量周报报表', f: '每周一 09:00', cron: '0 0 9 ? * MON', ch: '邮件', g: '生产管理部 · 24 人', on: true },
  { n: '管输量日报（PDF）', f: '每天 07:30', cron: '0 30 7 * * ?', ch: '邮件', g: '管道分公司 · 41 人', on: true },
  { n: '煤矿安全旬报', f: '每月 1/11/21 日', cron: '0 0 9 1,11,21 * ?', ch: '企业微信', g: '安监部 · 33 人', on: true },
  { n: '化工品产销存月报', f: '每月 3 日 10:00', cron: '0 0 10 3 * ?', ch: '钉钉', g: '煤化工事业部 · 27 人', on: true },
  { n: '集团经营驾驶舱截图', f: '工作日 08:30', cron: '0 30 8 ? * MON-FRI', ch: '企业微信', g: '集团领导 · 12 人', on: false },
])

type JobResult = 'ok' | 'warn' | 'err'
interface Job { n: string; t: string; cron: string; last: string; next: string; r: JobResult }
const jobs: Job[] = [
  { n: '告警检测 · 高频指标', t: '告警检测', cron: '0 */5 * * * ?', last: '今天 08:15', next: '今天 08:20', r: 'ok' },
  { n: '经营日报订阅推送', t: '订阅推送', cron: '0 0 8 * * ?', last: '今天 08:00', next: '明天 08:00', r: 'ok' },
  { n: 'ODS 采油日报抽取', t: '数据抽取', cron: '0 30 2 * * ?', last: '今天 02:30', next: '明天 02:30', r: 'ok' },
  { n: 'SCADA 实时流消费', t: '数据抽取', cron: '流式常驻', last: '持续运行', next: '—', r: 'ok' },
  { n: '原油产量月报生成', t: '报表定时', cron: '0 0 6 1 * ?', last: '09-01 06:00', next: '10-01 06:00', r: 'ok' },
  { n: '数据集缓存刷新', t: '数据抽取', cron: '0 */30 * * * ?', last: '今天 08:00', next: '今天 08:30', r: 'warn' },
  { n: '元数据全量采集', t: '数据治理', cron: '0 0 2 * * ?', last: '今天 02:00', next: '明天 02:00', r: 'ok' },
  { n: '历史井史归档同步', t: '数据抽取', cron: '0 0 23 ? * SUN', last: '08-31 23:00', next: '09-07 23:00', r: 'err' },
]
const JOB_TAG: Record<JobResult, { cls: string; text: string }> = {
  ok: { cls: 'tag-ok', text: '成功' },
  warn: { cls: 'tag-warn', text: '部分成功' },
  err: { cls: 'tag-danger', text: '失败 · 已重试' },
}
function jobTypeCls(t: string): string {
  return t === '告警检测' ? 'tag-danger' : t === '订阅推送' ? 'tag-info' : t === '报表定时' ? 'tag-brand' : ''
}

interface Channel { n: string; icon: string; col: string; bg: string; cfg: string; sent: string; rate: string; on: boolean }
const channels = ref<Channel[]>([
  { n: '邮件', icon: 'pi-envelope', col: 'var(--info)', bg: 'var(--info-soft)', cfg: 'smtp.****oil.com:465 · SSL', sent: '1,204', rate: '99.4%', on: true },
  { n: '企业微信', icon: 'pi-comments', col: 'var(--ok)', bg: 'var(--ok-soft)', cfg: 'corp_id: ww8f3**** · 应用 12', sent: '2,862', rate: '99.6%', on: true },
  { n: '钉钉', icon: 'pi-mobile', col: 'var(--info)', bg: 'var(--info-soft)', cfg: 'oapi.dingtalk.com · robot ****', sent: '936', rate: '99.3%', on: true },
  { n: 'Webhook', icon: 'pi-link', col: 'var(--brand)', bg: 'var(--brand-soft)', cfg: 'https://bi.****.com/hooks/dg', sent: '5,410', rate: '99.7%', on: true },
  { n: '短信', icon: 'pi-bell', col: 'var(--warn)', bg: 'var(--warn-soft)', cfg: '阿里云短信 · sign ****', sent: '86', rate: '99.5%', on: false },
])

/* ---------- 交互 ---------- */
const rulePaneEl = ref<HTMLElement>()
function gotoRulePane() {
  activePane.value = 'rules'
  requestAnimationFrame(() => rulePaneEl.value?.scrollIntoView({ behavior: 'smooth' }))
}
function toggleRule(r: Rule) {
  success(`规则「${r.n}」已${r.on ? '启用' : '停用'}（演示）`)
}
function toggleSub(s: Sub) {
  success(`订阅「${s.n}」已${s.on ? '启用' : '停用'}（演示）`)
}
function toggleChannel(c: Channel) {
  success(`渠道「${c.n}」已${c.on ? '启用' : '停用'}（演示）`)
}
</script>

<template>
  <div class="alert-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">告警与订阅推送 <DemoBadge /></div>
        <div class="page-desc">基于语义指标的阈值告警、定时订阅推送与多通道通知（PRD 10.9）</div>
      </div>
      <div class="page-actions">
        <button class="btn" @click="success('告警历史与静默管理功能规划中（演示）')">告警历史</button>
        <button class="btn primary" @click="gotoRulePane"><i class="pi pi-plus"></i>新建告警规则</button>
      </div>
    </div>

    <!-- 顶部统计 -->
    <section class="stat-grid mb-3">
      <div class="stat-card" style="--sc-glow:rgba(255,138,61,.13)">
        <div class="s-label">告警规则</div>
        <div class="s-value">28<span class="unit">条</span></div>
        <div class="s-foot"><span class="tag tag-ok">启用 24</span><span class="tx-3">停用 4</span></div>
      </div>
      <div class="stat-card" style="--sc-glow:rgba(248,113,113,.13)">
        <div class="s-label">今日触发</div>
        <div class="s-value">3<span class="unit">次</span></div>
        <div class="s-foot"><span class="trend down">▼ 40%</span><span>较昨日 5 次</span></div>
      </div>
      <div class="stat-card" style="--sc-glow:rgba(34,211,238,.12)">
        <div class="s-label">订阅任务</div>
        <div class="s-value">15<span class="unit">个</span></div>
        <div class="s-foot"><span class="tx-3">覆盖 6 个接收人组 · 213 人</span></div>
      </div>
      <div class="stat-card" style="--sc-glow:rgba(167,139,250,.12)">
        <div class="s-label">通知渠道</div>
        <div class="s-value">5<span class="unit">种</span></div>
        <div class="s-foot"><span class="trend up">▲ 今日送达 386 条</span></div>
      </div>
    </section>

    <!-- Tabs -->
    <div class="tabs">
      <div
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: activePane === t.key }"
        @click="activePane = t.key"
      >
        {{ t.name }} <span class="cnt">{{ t.cnt }}</span>
      </div>
    </div>

    <!-- 告警规则 -->
    <div v-show="activePane === 'rules'" class="tab-pane">
      <div class="table-wrap mb-3">
        <table class="tbl">
          <thead><tr>
            <th>规则名称</th><th>监控指标</th><th>触发条件</th><th>检测频率</th><th>通知渠道</th><th>状态</th><th>最近触发</th><th style="width:150px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in rules" :key="r.n">
              <td><span class="cell-main">{{ r.n }}</span><span v-if="r.hot" class="tag tag-danger" style="margin-left:4px">今日已触发</span></td>
              <td class="sm">{{ r.m }}</td>
              <td><span class="num" style="color:var(--warn)">{{ r.c }}</span></td>
              <td class="sm">{{ r.f }}</td>
              <td>
                <span v-for="c in r.ch" :key="c" class="tag" :class="chTagCls(c)" style="margin-right:4px">{{ c }}</span>
              </td>
              <td>
                <label class="switch"><input v-model="r.on" type="checkbox" @change="toggleRule(r)" /><i></i></label>
              </td>
              <td class="sm" :class="{ 'tx-3': !r.hot }" :style="r.hot ? 'color:var(--danger)' : ''">{{ r.t }}</td>
              <td>
                <span class="op-link" @click="success(`编辑规则「${r.n}」功能规划中（演示）`)">编辑</span> ·
                <span class="op-link" @click="success(`规则「${r.n}」触发历史功能规划中（演示）`)">历史</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 新建规则三步 -->
      <div ref="rulePaneEl" class="card">
        <div class="card-title"><span class="bar"></span>新建告警规则 · 三步配置
          <span class="more" @click="success('规则草稿已保存（演示）')">保存草稿 ›</span>
        </div>
        <div class="rule-steps">
          <div class="rule-step">
            <span class="rs-no">STEP 1</span>
            <div class="rs-name"><i class="pi pi-chart-bar"></i>选择监控指标</div>
            <div class="mini"><span class="m-tag">来源</span>指标中心</div>
            <div class="mini"><span class="m-tag">指标</span><b>原油产量</b> <span class="tag tag-brand">M-OIL-001</span></div>
            <div class="mini"><span class="m-tag">粒度</span>采油厂 · 日</div>
          </div>
          <div class="rule-step">
            <span class="rs-no">STEP 2</span>
            <div class="rs-name"><i class="pi pi-sliders-h"></i>设置阈值条件</div>
            <div class="mini"><span class="m-tag">条件</span><span class="m-val">&lt; 100 万吨</span></div>
            <div class="mini"><span class="m-tag">持续</span>连续 2 个检测周期</div>
            <div class="mini"><span class="m-tag">级别</span><span class="tag tag-danger">严重</span> 同比偏离 &gt; 10% 升级</div>
          </div>
          <div class="rule-step">
            <span class="rs-no">STEP 3</span>
            <div class="rs-name"><i class="pi pi-share-alt"></i>渠道与接收人</div>
            <div class="mini"><span class="m-tag">渠道</span><span class="tag tag-info">企业微信</span> <span class="tag">邮件</span></div>
            <div class="mini"><span class="m-tag">接收</span>生产调度组 · 32 人</div>
            <button class="btn primary sm" style="width:100%;justify-content:center" @click="success('规则创建成功并启用（演示）')">创建并启用</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 订阅推送 -->
    <div v-show="activePane === 'subs'" class="tab-pane">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>订阅内容</th><th>推送频率</th><th>Cron</th><th>渠道</th><th>接收人组</th><th>状态</th><th style="width:150px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="s in subs" :key="s.n">
              <td class="cell-main">{{ s.n }}</td>
              <td>{{ s.f }}</td>
              <td class="cron">{{ s.cron }}</td>
              <td><span class="tag tag-info">{{ s.ch }}</span></td>
              <td class="sm">{{ s.g }}</td>
              <td>
                <label class="switch"><input v-model="s.on" type="checkbox" @change="toggleSub(s)" /><i></i></label>
              </td>
              <td>
                <span class="op-link" @click="success(`编辑订阅「${s.n}」功能规划中（演示）`)">编辑</span> ·
                <span class="op-link" @click="success(`已立即推送一次至 ${s.ch}（演示）`)">立即推送</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 调度任务 -->
    <div v-show="activePane === 'jobs'" class="tab-pane">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>任务名称</th><th>类型</th><th>Cron 表达式</th><th>上次执行</th><th>下次执行</th><th>结果</th><th style="width:130px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.n">
              <td class="cell-main">{{ j.n }}</td>
              <td><span class="tag" :class="jobTypeCls(j.t)">{{ j.t }}</span></td>
              <td class="cron">{{ j.cron }}</td>
              <td class="sm">{{ j.last }}</td>
              <td class="sm tx-3">{{ j.next }}</td>
              <td><span class="tag" :class="JOB_TAG[j.r].cls">{{ JOB_TAG[j.r].text }}</span></td>
              <td>
                <span class="op-link" @click="success(`任务「${j.n}」执行日志功能规划中（演示）`)">日志</span> ·
                <span class="op-link" @click="success(`已触发「${j.n}」手动执行（演示）`)">执行</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 通知渠道 -->
    <div v-show="activePane === 'channels'" class="tab-pane">
      <div class="ch-grid">
        <div v-for="c in channels" :key="c.n" class="ch-card">
          <div class="ch-head">
            <span class="ch-ico" :style="{ color: c.col, background: c.bg }"><i class="pi" :class="c.icon"></i></span>
            <div><div class="ch-name">{{ c.n }}</div><div class="ch-cfg">{{ c.cfg }}</div></div>
            <label class="switch" style="margin-left:auto"><input v-model="c.on" type="checkbox" @change="toggleChannel(c)" /><i></i></label>
          </div>
          <div class="ch-foot">
            <span class="ch-stat">近 30 日发送<br /><b>{{ c.sent }}</b> 条</span>
            <span class="ch-stat" style="text-align:right">送达率<br /><b style="color:var(--ok)">{{ c.rate }}</b></span>
            <span class="op-link" @click="success(`渠道「${c.n}」测试发送成功（演示）`)">测试发送</span>
          </div>
        </div>
      </div>
      <div class="card mt-3" style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--tx-2)">
        <i class="pi pi-info-circle" style="color:var(--info)"></i>
        <span>渠道为插件化扩展点：可按 SPI 接入 <b>飞书、APP 推送、短信网关、声光报警</b> 等自定义通道。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ 能源暗域 Energy Dark ============ */
.alert-page {
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
  --info-soft: rgba(96,165,250,.12);
  --warn-soft: rgba(251,191,36,.12);
  --r-l: 12px;
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

.mb-3 { margin-bottom: 16px; }
.mt-3 { margin-top: 16px; }
.tx-3 { color: var(--tx-3); }
.num { font-family: var(--font-num); }
.sm { font-size: 12.5px; }

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

/* ---- 统计卡 ---- */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
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
  background: var(--sc-glow, rgba(255,138,61,.13));
}
.s-label { font-size: 12.5px; color: var(--tx-3); }
.s-value { font-family: var(--font-num); font-size: 30px; font-weight: 700; line-height: 1.25; margin-top: 4px; }
.s-value .unit { font-size: 13px; color: var(--tx-3); font-weight: 400; margin-left: 4px; }
.s-foot { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--tx-3); }
.trend { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-num); font-weight: 600; }
.trend.up { color: var(--ok); }
.trend.down { color: var(--danger); }

/* ---- 卡片 ---- */
.card {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; backdrop-filter: blur(10px); padding: 16px 18px;
}
.card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-title .bar { width: 3px; height: 14px; border-radius: 2px; background: var(--brand-grad); }
.card-title .more { margin-left: auto; font-size: 12px; color: var(--tx-3); font-weight: 400; cursor: pointer; }
.card-title .more:hover { color: var(--brand); }

/* ---- Tabs ---- */
.tabs { display: flex; gap: 6px; margin-bottom: 14px; border-bottom: 1px solid var(--line-1); }
.tab {
  padding: 9px 16px; font-size: 13.5px; color: var(--tx-2); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .18s;
  display: inline-flex; align-items: center; gap: 7px;
}
.tab:hover { color: var(--tx-1); }
.tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.tab .cnt {
  font-size: 11px; font-family: var(--font-num); padding: 0 7px; border-radius: 8px;
  background: var(--bg-glass-2); color: var(--tx-3);
}
.tab.active .cnt { background: var(--brand-soft); color: var(--brand); }

/* ---- 表格 ---- */
.table-wrap {
  background: var(--bg-glass); border: 1px solid var(--line-1);
  border-radius: 14px; overflow: hidden; backdrop-filter: blur(10px);
}
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th {
  text-align: left; padding: 10px 14px; font-size: 12px; font-weight: 500; color: var(--tx-3);
  background: rgba(255,255,255,.025); border-bottom: 1px solid var(--line-1); white-space: nowrap;
}
.tbl td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.04); color: var(--tx-2); }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl tbody tr:hover { background: rgba(255,255,255,.025); }
.tbl .cell-main { color: var(--tx-1); font-weight: 600; }
.op-link { color: var(--brand); cursor: pointer; font-size: 12.5px; }
.op-link:hover { text-decoration: underline; }
.cron { font-family: var(--font-mono); font-size: 12px; color: var(--gas); }

/* ---- 开关 ---- */
.switch { position: relative; display: inline-block; width: 36px; height: 20px; flex: none; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.switch i {
  position: absolute; inset: 0; border-radius: 99px; cursor: pointer;
  background: rgba(255,255,255,.12); transition: all .18s;
}
.switch i::before {
  content: ""; position: absolute; left: 3px; top: 3px; width: 14px; height: 14px;
  border-radius: 50%; background: #B9C2D4; transition: all .18s;
}
.switch input:checked + i { background: var(--brand-grad); box-shadow: 0 0 10px rgba(255,138,61,.4); }
.switch input:checked + i::before { transform: translateX(16px); background: #FFF; }

/* ---- 新建规则三步 ---- */
.rule-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
.rule-step {
  background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-l);
  padding: 16px; position: relative;
}
.rule-step .rs-no {
  position: absolute; top: -10px; left: 14px; font-size: 11px; font-family: var(--font-num);
  font-weight: 700; padding: 1px 10px; border-radius: 9px;
  background: var(--brand-grad); color: #241105;
}
.rule-step .rs-name { font-size: 13.5px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 7px; }
.rule-step .rs-name i { font-size: 15px; color: var(--brand); }
.rule-step .mini {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 7px;
  background: var(--bg-glass-2); border: 1px solid var(--line-1); border-radius: 8px; font-size: 12px;
}
.rule-step .mini .m-tag { font-size: 10.5px; color: var(--tx-3); flex: none; }
.rule-step .mini .m-val { font-family: var(--font-mono); color: var(--brand); font-weight: 600; }

/* ---- 渠道卡 ---- */
.ch-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(250px,1fr)); gap: 14px; }
.ch-card { background: var(--bg-glass); border: 1px solid var(--line-1); border-radius: var(--r-l); padding: 16px; }
.ch-card .ch-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.ch-card .ch-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: none; font-size: 16px; }
.ch-card .ch-name { font-size: 13.5px; font-weight: 600; }
.ch-card .ch-cfg { font-size: 11.5px; color: var(--tx-3); font-family: var(--font-mono); margin-top: 2px; }
.ch-card .ch-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line-1); }
.ch-card .ch-stat { font-size: 11.5px; color: var(--tx-3); }
.ch-card .ch-stat b { font-family: var(--font-num); color: var(--tx-1); font-size: 14px; }

/* ---- 响应式 ---- */
@media (max-width: 1100px) { .rule-steps { grid-template-columns: 1fr; } }
</style>
