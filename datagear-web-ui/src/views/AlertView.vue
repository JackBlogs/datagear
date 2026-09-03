<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  alertRules,
  alertHistory,
  subscriptions,
  jobs,
  channels,
  toggleRule,
  saveRule,
  deleteRule,
  handleHistory,
  toggleSub,
  saveSub,
  triggerJob,
  jobLog,
  testChannel,
  type AlertRule,
  type Subscription,
} from '@/mock/alertData'
import { useOperationMessage } from '@/composables/useOperationMessage'
import '@/styles/datasource-page.css'

/**
 * 告警与订阅推送（对齐 prototypev2 alert.html）：
 * 统计卡 + 5 tab（规则/历史/订阅/调度/渠道）+ 三步配置向导。
 * 数据层为前端 mock（src/mock/alertData.ts），后端 alert 模块就绪后一键切换。
 */
const { success, fail } = useOperationMessage()

const activeTab = ref<'rules' | 'history' | 'subs' | 'jobs' | 'channels'>('rules')
const histFilter = ref<'all' | 'pending' | 'handled'>('all')

const stats = computed(() => ({
  total: alertRules.value.length,
  enabled: alertRules.value.filter((r) => r.enabled).length,
  today: alertRules.value.reduce((s, r) => s + r.today, 0),
  subs: subscriptions.value.length,
  receivers: 213,
  channels: channels.value.length,
}))

const filteredHistory = computed(() => {
  if (histFilter.value === 'pending') return alertHistory.value.filter((h) => !h.handled)
  if (histFilter.value === 'handled') return alertHistory.value.filter((h) => h.handled)
  return alertHistory.value
})

/* ---------- 规则编辑 ---------- */
const ruleForm = ref<{ id?: string; name: string; metric: string; metricId: string; cond: string; freq: string; channels: string[]; receivers: string } | null>(null)
const CHANNEL_OPTS = ['邮件', '企业微信', '钉钉', 'Webhook', '短信']
const FREQ_OPTS = ['每5分钟', '实时', '每小时', '每天 08:00', '每天 09:00']

function openRuleForm(rule?: AlertRule) {
  ruleForm.value = rule
    ? { id: rule.id, name: rule.name, metric: rule.metric, metricId: rule.metricId, cond: rule.cond, freq: rule.freq, channels: [...rule.channels], receivers: rule.receivers }
    : { name: '', metric: '', metricId: '', cond: '', freq: '每5分钟', channels: ['邮件'], receivers: '' }
}

function toggleChannelOpt(c: string) {
  if (!ruleForm.value) return
  const i = ruleForm.value.channels.indexOf(c)
  if (i >= 0) ruleForm.value.channels.splice(i, 1)
  else ruleForm.value.channels.push(c)
}

function submitRule() {
  const f = ruleForm.value
  if (!f) return
  if (!f.name || !f.metric || !f.cond) {
    fail('请填写规则名称、监控指标与触发条件')
    return
  }
  saveRule(f)
  ruleForm.value = null
  success('告警规则已保存并启用')
}

function onDelRule(r: AlertRule) {
  if (!window.confirm(`确定删除规则「${r.name}」吗？`)) return
  deleteRule(r.id)
  success('已删除')
}

/* ---------- 订阅编辑 ---------- */
const subForm = ref<{ id?: string; name: string; resource: string; freqText: string; channels: string[]; receivers: string; format: string } | null>(null)
const FREQ_SUB_OPTS = ['每天 08:00', '每天 07:30', '每周一 09:00', '每月1日 10:00']

function openSubForm(s?: Subscription) {
  subForm.value = s
    ? { id: s.id, name: s.name, resource: s.resource, freqText: s.freqText, channels: [...s.channels], receivers: s.receivers, format: s.format }
    : { name: '', resource: '看板：集团经营日报', freqText: '每天 08:00', channels: ['邮件'], receivers: '', format: '图片+PDF' }
}

function toggleSubChannel(c: string) {
  if (!subForm.value) return
  const i = subForm.value.channels.indexOf(c)
  if (i >= 0) subForm.value.channels.splice(i, 1)
  else subForm.value.channels.push(c)
}

function submitSub() {
  const f = subForm.value
  if (!f) return
  if (!f.name || !f.receivers) {
    fail('订阅名称与接收人不能为空')
    return
  }
  saveSub(f)
  subForm.value = null
  success('订阅已保存')
}

/* ---------- 调度日志 ---------- */
const logView = ref<{ job: string; lines: string[] } | null>(null)

function openLog(id: string) {
  logView.value = jobLog(id)
}

function doTrigger(id: string) {
  const t = triggerJob(id)
  success(`任务已手动触发（${t}）`)
  openLog(id)
}

/* ---------- 历史处理 ---------- */
function doHandle(id: string) {
  handleHistory(id, '已确认处理')
  success('已标记处理')
}

function doTestChannel(id: string, name: string) {
  if (testChannel(id)) success(`${name} 测试消息已送达（340ms）`)
}
</script>

<template>
  <div class="ds-page">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <div class="page-title">告警与订阅推送</div>
        <div class="page-desc">基于语义指标的阈值告警、定时订阅推送与多通道通知（PRD 10.9）</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" @click="openRuleForm()">＋ 新建告警规则</button>
      </div>
    </div>

    <!-- 统计卡 -->
    <section class="stat-grid mb-3">
      <div class="stat-card">
        <div class="s-label">告警规则</div>
        <div class="s-value num">{{ stats.total }} <small>条</small></div>
        <div class="s-sub"><span class="tag ok">启用 {{ stats.enabled }}</span> <span class="tag">停用 {{ stats.total - stats.enabled }}</span></div>
      </div>
      <div class="stat-card">
        <div class="s-label">今日触发</div>
        <div class="s-value num" style="color: #f87171">{{ stats.today }} <small>次</small></div>
        <div class="s-sub">▼40% 较昨日 5 次</div>
      </div>
      <div class="stat-card">
        <div class="s-label">订阅任务</div>
        <div class="s-value num" style="color: #60a5fa">{{ stats.subs }} <small>个</small></div>
        <div class="s-sub">覆盖 6 个接收人组 · {{ stats.receivers }} 人</div>
      </div>
      <div class="stat-card">
        <div class="s-label">通知渠道</div>
        <div class="s-value num" style="color: #34d399">{{ stats.channels }} <small>种</small></div>
        <div class="s-sub">▲ 今日送达 386 条</div>
      </div>
    </section>

    <!-- Tabs -->
    <div class="tabs-row mb-2">
      <div class="tab-item" :class="{ active: activeTab === 'rules' }" @click="activeTab = 'rules'">告警规则 <em>{{ alertRules.length }}</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">告警历史</div>
      <div class="tab-item" :class="{ active: activeTab === 'subs' }" @click="activeTab = 'subs'">订阅推送 <em>{{ subscriptions.length }}</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'jobs' }" @click="activeTab = 'jobs'">调度任务 <em>{{ jobs.length }}</em></div>
      <div class="tab-item" :class="{ active: activeTab === 'channels' }" @click="activeTab = 'channels'">通知渠道 <em>{{ channels.length }}</em></div>
    </div>

    <!-- ===== 告警规则 ===== -->
    <template v-if="activeTab === 'rules'">
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>规则名称</th>
              <th>监控指标</th>
              <th>触发条件</th>
              <th style="width: 100px">检测频率</th>
              <th>通知渠道</th>
              <th style="width: 70px">状态</th>
              <th style="width: 110px">最近触发</th>
              <th style="width: 190px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!alertRules.length"><td colspan="8"><div class="empty">暂无规则，点击右上角「新建告警规则」</div></td></tr>
            <tr v-for="r in alertRules" :key="r.id">
              <td>
                <span class="cell-main">{{ r.name }}</span>
                <span v-if="r.today" class="tag danger" style="margin-left: 6px">今日已触发 {{ r.today }} 次</span>
              </td>
              <td class="sm">{{ r.metric }} <span class="tx-4">{{ r.metricId }}</span></td>
              <td><span class="cond">{{ r.cond }}</span></td>
              <td class="sm">{{ r.freq }}</td>
              <td><span v-for="c in r.channels" :key="c" class="tag info" style="margin-right: 4px">{{ c }}</span></td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="r.enabled" @change="toggleRule(r.id)" />
                  <i></i>
                </label>
              </td>
              <td class="sm tx-3">{{ r.lastTrigger }}</td>
              <td>
                <span class="link" @click="openRuleForm(r)">编辑</span> ·
                <span class="link" @click="activeTab = 'history'">历史</span> ·
                <span class="link danger" @click="onDelRule(r)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 三步配置向导 -->
      <div class="card wizard" style="margin-top: 14px">
        <div class="card-title"><i class="bar"></i>告警规则 · 三步配置说明 <span class="tx-4 sm" style="margin-left: auto">打开配置向导 ›</span></div>
        <div class="wiz-grid">
          <div class="wiz-step">
            <span class="step-no">STEP 1</span>
            <div class="step-t">⊕ 选择监控指标</div>
            <div class="wiz-field"><span class="f-lbl">来源</span><span>指标中心（语义层统一口径）</span></div>
            <div class="wiz-field"><span class="f-lbl">指标</span><span class="tag brand">原油产量</span><span class="tag">M-OIL-001</span></div>
            <div class="wiz-field"><span class="f-lbl">粒度</span><span>采油厂 · 日</span></div>
          </div>
          <div class="wiz-step">
            <span class="step-no">STEP 2</span>
            <div class="step-t">⚙ 设置阈值条件</div>
            <div class="wiz-field"><span class="f-lbl">条件</span><span class="cond">&lt; 100 万吨</span></div>
            <div class="wiz-field"><span class="f-lbl">持续</span><span>连续 2 个检测周期</span></div>
            <div class="wiz-field"><span class="f-lbl">级别</span><span class="tag danger">严重</span><span class="sm tx-3">同比偏离 &gt; 10% 升级</span></div>
          </div>
          <div class="wiz-step">
            <span class="step-no">STEP 3</span>
            <div class="step-t">🜲 渠道与接收人</div>
            <div class="wiz-field"><span class="f-lbl">渠道</span><span class="tag info">企业微信</span><span class="tag info">邮件</span></div>
            <div class="wiz-field"><span class="f-lbl">接收</span><span>生产调度组 · 32 人</span></div>
            <button class="btn primary w-full" type="button" @click="openRuleForm()">创建并启用</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 告警历史 ===== -->
    <template v-else-if="activeTab === 'history'">
      <div class="flex mb-2" style="gap: 8px; align-items: center">
        <div class="seg-row">
          <span class="seg-item" :class="{ active: histFilter === 'all' }" @click="histFilter = 'all'">全部</span>
          <span class="seg-item" :class="{ active: histFilter === 'pending' }" @click="histFilter = 'pending'">未处理</span>
          <span class="seg-item" :class="{ active: histFilter === 'handled' }" @click="histFilter = 'handled'">已处理</span>
        </div>
        <span class="tx-3 sm" style="margin-left: auto">{{ filteredHistory.length }} 条</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>触发规则</th>
              <th>监控指标</th>
              <th>触发值</th>
              <th>阈值</th>
              <th style="width: 120px">时间</th>
              <th style="width: 90px">通知</th>
              <th style="width: 240px">处理状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredHistory.length"><td colspan="7"><div class="empty">暂无告警记录</div></td></tr>
            <tr v-for="h in filteredHistory" :key="h.id">
              <td><span class="cell-main">{{ h.rule }}</span></td>
              <td class="sm">{{ h.metric }}</td>
              <td><span class="cond" :class="{ danger: !h.handled }">{{ h.value }}</span></td>
              <td class="sm tx-3">{{ h.threshold }}</td>
              <td class="sm tx-3">{{ h.time }}</td>
              <td><span class="tag ok">{{ h.notify }}</span></td>
              <td>
                <template v-if="h.handled"><span class="tag">已处理</span> <span class="sm tx-3">{{ h.note }}</span></template>
                <template v-else><span class="tag danger">未处理</span> <span class="link" @click="doHandle(h.id)">标记处理</span></template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 订阅推送 ===== -->
    <template v-else-if="activeTab === 'subs'">
      <div class="flex mb-2">
        <button class="btn primary sm" type="button" @click="openSubForm()">＋ 新建订阅</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>订阅名称</th>
              <th>资源</th>
              <th style="width: 110px">频率</th>
              <th>渠道</th>
              <th>接收人</th>
              <th style="width: 100px">格式</th>
              <th style="width: 70px">状态</th>
              <th style="width: 110px">最近推送</th>
              <th style="width: 80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!subscriptions.length"><td colspan="9"><div class="empty">暂无订阅</div></td></tr>
            <tr v-for="s in subscriptions" :key="s.id">
              <td><span class="cell-main">{{ s.name }}</span></td>
              <td class="sm">{{ s.resource }}</td>
              <td class="sm">{{ s.freqText }}</td>
              <td><span v-for="c in s.channels" :key="c" class="tag info" style="margin-right: 4px">{{ c }}</span></td>
              <td class="sm">{{ s.receivers }}</td>
              <td><span class="tag">{{ s.format }}</span></td>
              <td><label class="switch"><input type="checkbox" :checked="s.enabled" @change="toggleSub(s.id)" /><i></i></label></td>
              <td class="sm tx-3">{{ s.last }}</td>
              <td><span class="link" @click="openSubForm(s)">编辑</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 调度任务 ===== -->
    <template v-else-if="activeTab === 'jobs'">
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>任务名称</th>
              <th style="width: 100px">类型</th>
              <th>cron</th>
              <th style="width: 110px">上次执行</th>
              <th style="width: 110px">下次执行</th>
              <th style="width: 120px">状态</th>
              <th style="width: 160px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.id">
              <td><span class="cell-main">{{ j.name }}</span></td>
              <td><span class="tag">{{ j.type }}</span></td>
              <td class="sm tx-3">{{ j.cron }}</td>
              <td class="sm">{{ j.last }}</td>
              <td class="sm tx-3">{{ j.next }}</td>
              <td><span class="tag" :class="j.status.includes('失败') ? 'danger' : 'ok'">{{ j.status }}</span></td>
              <td>
                <span class="link" @click="doTrigger(j.id)">立即触发</span> ·
                <span class="link" @click="openLog(j.id)">执行日志</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ===== 通知渠道 ===== -->
    <template v-else>
      <div class="tpl-grid">
        <div v-for="c in channels" :key="c.id" class="db-card">
          <div class="c-body">
            <div class="mc-head">
              <span class="c-name">{{ c.name }}</span>
              <span class="tag" :class="c.enabled ? 'ok' : ''" style="margin-left: auto">{{ c.enabled ? '已启用' : '已停用' }}</span>
            </div>
            <div class="c-desc">{{ c.conf }}</div>
            <div class="c-meta">
              <span class="sm tx-3">近 30 天发送 <b class="num">{{ c.sent30d }}</b></span>
              <span class="sm tx-3">送达率 <b class="num" style="color: #34d399">{{ c.rate }}</b></span>
              <button class="btn sm" style="margin-left: auto" type="button" @click="doTestChannel(c.id, c.name)">发送测试</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 规则编辑弹窗 -->
    <div v-if="ruleForm" class="drawer-mask" @click="ruleForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ ruleForm.id ? '编辑告警规则' : '新建告警规则' }}</div>
          <button class="btn sm ghost" type="button" @click="ruleForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">规则名称 *</label><input v-model="ruleForm.name" class="input" placeholder="如：日产油低于阈值" /></div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">监控指标 *</label><input v-model="ruleForm.metric" class="input" placeholder="如：原油产量" /></div>
            <div class="form-item" style="width: 140px"><label class="form-label">指标 ID</label><input v-model="ruleForm.metricId" class="input" placeholder="M-OIL-001" /></div>
          </div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">触发条件 *</label><input v-model="ruleForm.cond" class="input" placeholder="如：< 100 万吨" /></div>
            <div class="form-item" style="width: 150px"><label class="form-label">检测频率</label>
              <select v-model="ruleForm.freq" class="input"><option v-for="f in FREQ_OPTS" :key="f" :value="f">{{ f }}</option></select>
            </div>
          </div>
          <div class="form-item"><label class="form-label">通知渠道</label>
            <div class="seg-row">
              <span v-for="c in CHANNEL_OPTS" :key="c" class="seg-item" :class="{ active: ruleForm.channels.includes(c) }" @click="toggleChannelOpt(c)">{{ c }}</span>
            </div>
          </div>
          <div class="form-item"><label class="form-label">接收人</label><input v-model="ruleForm.receivers" class="input" placeholder="如：生产调度组" /></div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitRule">保存并启用</button>
            <button class="btn" type="button" @click="ruleForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 订阅编辑弹窗 -->
    <div v-if="subForm" class="drawer-mask" @click="subForm = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">{{ subForm.id ? '编辑订阅' : '新建订阅' }}</div>
          <button class="btn sm ghost" type="button" @click="subForm = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="form-item"><label class="form-label">订阅名称 *</label><input v-model="subForm.name" class="input" placeholder="如：经营日报（决策层）" /></div>
          <div class="form-item"><label class="form-label">推送资源</label><input v-model="subForm.resource" class="input" placeholder="看板：集团经营日报" /></div>
          <div class="flex" style="gap: 12px">
            <div class="form-item grow"><label class="form-label">推送频率</label>
              <select v-model="subForm.freqText" class="input"><option v-for="f in FREQ_SUB_OPTS" :key="f" :value="f">{{ f }}</option></select>
            </div>
            <div class="form-item" style="width: 150px"><label class="form-label">格式</label>
              <select v-model="subForm.format" class="input"><option>图片+PDF</option><option>PDF</option><option>Excel</option><option>Excel+PDF</option></select>
            </div>
          </div>
          <div class="form-item"><label class="form-label">通知渠道</label>
            <div class="seg-row">
              <span v-for="c in CHANNEL_OPTS" :key="c" class="seg-item" :class="{ active: subForm.channels.includes(c) }" @click="toggleSubChannel(c)">{{ c }}</span>
            </div>
          </div>
          <div class="form-item"><label class="form-label">接收人 *</label><input v-model="subForm.receivers" class="input" placeholder="如：经营分析群" /></div>
          <div class="flex" style="gap: 10px; margin-top: 16px">
            <button class="btn primary grow" type="button" @click="submitSub">保存</button>
            <button class="btn" type="button" @click="subForm = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 调度日志弹窗 -->
    <div v-if="logView" class="drawer-mask" @click="logView = null">
      <div class="modal" @click.stop>
        <div class="drawer-head">
          <div class="drawer-title">执行日志 · {{ logView.job }}</div>
          <button class="btn sm ghost" type="button" @click="logView = null">✕</button>
        </div>
        <div class="drawer-body">
          <pre class="sql-code">{{ logView.lines.join('\n') }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-row { display: flex; gap: 4px; border-bottom: 1px solid var(--line-1); }
.tab-item { padding: 9px 18px; font-size: 13px; color: var(--tx-3); cursor: pointer; border-bottom: 2px solid transparent; display: inline-flex; gap: 6px; align-items: center; }
.tab-item:hover { color: var(--tx-1); }
.tab-item.active { color: var(--brand); border-bottom-color: var(--brand); }
.tab-item em { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 8px; background: var(--bg-glass-2); color: var(--tx-3); }
.seg-row { display: inline-flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-glass); border: 1px solid var(--line-1); flex-wrap: wrap; }
.seg-item { padding: 5px 14px; border-radius: 8px; font-size: 12.5px; color: var(--tx-3); cursor: pointer; white-space: nowrap; }
.seg-item:hover { color: var(--tx-1); }
.seg-item.active { background: var(--brand-soft); color: var(--brand); }
.cond { font-family: var(--font-num, monospace); color: var(--tx-1); font-size: 12.5px; }
.cond.danger { color: #f87171; }
.wizard { padding: 14px; }
.wiz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
.wiz-step { border: 1px solid var(--line-1); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 9px; }
.step-no { font-size: 10px; font-weight: 700; color: var(--brand); background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: 6px; padding: 2px 8px; width: fit-content; }
.step-t { font-size: 13px; font-weight: 700; color: var(--tx-1); }
.wiz-field { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--tx-2); flex-wrap: wrap; }
.f-lbl { color: var(--tx-4); width: 36px; flex: none; }
.w-full { width: 100%; justify-content: center; }
.grow { flex: 1; min-width: 0; }
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.db-card { border: 1px solid var(--line-1); border-radius: 14px; overflow: hidden; background: var(--bg-glass); }
.c-body { padding: 14px 16px; }
.mc-head { display: flex; align-items: center; gap: 8px; }
.c-name { font-size: 14px; font-weight: 700; color: var(--tx-1); }
.c-desc { font-size: 12px; color: var(--tx-3); margin: 6px 0 9px; }
.c-meta { display: flex; align-items: center; gap: 12px; }
.form-item { margin-bottom: 13px; }
.form-label { font-size: 12px; color: var(--tx-2); margin-bottom: 5px; display: block; }
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { width: 560px; max-width: 92vw; max-height: 86vh; background: #0d1420; border: 1px solid var(--line-2); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--line-1); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--tx-1); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 22px; }
.sql-code { margin: 0; padding: 12px; border-radius: 10px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line-1); font-family: monospace; font-size: 11.5px; color: #9ecbff; white-space: pre-wrap; }
</style>
