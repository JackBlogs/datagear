/**
 * 告警与订阅前端演示数据层（对齐 prototypev2 mock-api.js 契约）。
 * 端点形状与 SDS「REST API 分组清单」一致：/alert/rule/*、/alert/history/*、
 * /subscribe/*、/job/*、/channel/*。
 * 后端 datagear-scheduler + alert 模块就绪后，仅替换本文件的数据来源为真实 API。
 */
import { ref } from 'vue'

export interface AlertRule {
  id: string
  name: string
  metric: string
  metricId: string
  cond: string
  freq: string
  cron: string
  channels: string[]
  receivers: string
  enabled: boolean
  lastTrigger: string
  today: number
}

export interface AlertHistory {
  id: string
  rule: string
  metric: string
  value: string
  threshold: string
  time: string
  notify: string
  handled: number
  note?: string
}

export interface Subscription {
  id: string
  name: string
  resource: string
  cron: string
  freqText: string
  channels: string[]
  receivers: string
  format: string
  enabled: boolean
  last: string
}

export interface Job {
  id: string
  name: string
  type: string
  cron: string
  last: string
  next: string
  status: string
}

export interface Channel {
  id: string
  name: string
  enabled: boolean
  conf: string
  sent30d: number
  rate: string
}

const LS_KEY = 'dg_mock_alert_db'

interface AlertDb {
  rules: AlertRule[]
  history: AlertHistory[]
  subs: Subscription[]
  jobs: Job[]
  channels: Channel[]
}

function seed(): AlertDb {
  return {
    rules: [
      { id: 'AR-01', name: '日产油低于阈值', metric: '原油产量', metricId: 'M-OIL-001', cond: '< 100 万吨', freq: '每5分钟', cron: '0 0/5 * * * ?', channels: ['企业微信', '邮件'], receivers: '生产调度组', enabled: true, lastTrigger: '今天 08:12', today: 1 },
      { id: 'AR-02', name: '瓦斯浓度超限', metric: '瓦斯浓度', metricId: 'M-COAL-003', cond: '> 1.0 %', freq: '实时', cron: '实时流', channels: ['短信', '企业微信'], receivers: '安监部值班', enabled: true, lastTrigger: '昨天 22:41', today: 2 },
      { id: 'AR-03', name: '管网压力异常', metric: '管输压力', metricId: 'M-GAS-002', cond: '变化率 > 8 %', freq: '每小时', cron: '0 0 * * * ?', channels: ['钉钉'], receivers: '管道分公司', enabled: true, lastTrigger: '09-01 16:20', today: 0 },
      { id: 'AR-04', name: '甲醇装置开工率低', metric: '装置开工率', metricId: 'M-CHEM-002', cond: '< 75 %', freq: '每天 08:00', cron: '0 0 8 * * ?', channels: ['邮件'], receivers: '煤化工事业部', enabled: false, lastTrigger: '—', today: 0 },
      { id: 'AR-05', name: '吨油成本超预算', metric: '吨油完全成本', metricId: 'M-OIL-002', cond: '> 2,300 元/吨', freq: '每天 09:00', cron: '0 0 9 * * ?', channels: ['企业微信', 'Webhook'], receivers: '财务资产部', enabled: true, lastTrigger: '08-28 09:00', today: 0 },
    ],
    history: [
      { id: 'AH-101', rule: '日产油低于阈值', metric: '原油产量', value: '98.6 万吨', threshold: '< 100 万吨', time: '今天 08:12', notify: '已送达', handled: 0 },
      { id: 'AH-100', rule: '瓦斯浓度超限', metric: '瓦斯浓度', value: '1.24 %', threshold: '> 1.0 %', time: '昨天 22:41', notify: '已送达', handled: 1, note: '已停产撤人，30min 后复测正常' },
      { id: 'AH-099', rule: '管网压力异常', metric: '管输压力', value: '+9.6 %', threshold: '变化率 > 8 %', time: '09-01 16:20', notify: '已送达', handled: 1, note: '压缩机切换导致，已确认' },
    ],
    subs: [
      { id: 'SB-01', name: '经营日报（决策层）', resource: '看板：集团经营日报', cron: '0 0 8 * * ?', freqText: '每天 08:00', channels: ['企业微信'], receivers: '经营分析群', format: '图片+PDF', enabled: true, last: '今天 08:00' },
      { id: 'SB-02', name: '管输量日报', resource: '报表：管输量日报', cron: '0 30 7 * * ?', freqText: '每天 07:30', channels: ['邮件'], receivers: '管道分公司', format: 'Excel', enabled: true, last: '今天 07:30' },
      { id: 'SB-03', name: '煤矿安全周报', resource: '看板：煤矿安全监控', cron: '0 0 9 ? * MON', freqText: '每周一 09:00', channels: ['钉钉', '邮件'], receivers: '安监部', format: 'PDF', enabled: true, last: '周一 09:00' },
      { id: 'SB-04', name: '甲醇产销存月报', resource: '报表：产销存月报', cron: '0 0 10 1 * ?', freqText: '每月1日 10:00', channels: ['邮件'], receivers: '化工经营组', format: 'Excel+PDF', enabled: false, last: '08-01 10:00' },
    ],
    jobs: [
      { id: 'JB-01', name: '告警检测-日产油', type: '告警检测', cron: '0 0/5 * * * ?', last: '08:15:00', next: '08:20:00', status: '正常' },
      { id: 'JB-02', name: '订阅推送-经营日报', type: '订阅推送', cron: '0 0 8 * * ?', last: '08:00:02', next: '明天 08:00', status: '正常' },
      { id: 'JB-03', name: '质量校验-采油日报表', type: '数据质量', cron: '0 0 22 * * ?', last: '昨天 22:00', next: '今天 22:00', status: '正常' },
      { id: 'JB-04', name: '数据抽取-ODS同步', type: '数据抽取', cron: '0 0/30 * * * ?', last: '08:00:00', next: '08:30:00', status: '失败·已重试' },
      { id: 'JB-05', name: '报表定时-产销存月报', type: '报表定时', cron: '0 0 10 1 * ?', last: '08-01 10:00', next: '09-01 10:00', status: '正常' },
      { id: 'JB-06', name: '系统库自动备份', type: '备份', cron: '0 0 2 * * ?', last: '今天 02:00', next: '明天 02:00', status: '正常' },
    ],
    channels: [
      { id: 'CH-01', name: '邮件', enabled: true, conf: 'smtp.energy.local:465 · noreply@****.cn', sent30d: 1286, rate: '99.8%' },
      { id: 'CH-02', name: '企业微信', enabled: true, conf: 'corp id: ww8f2**** · agent: 能源BI', sent30d: 3412, rate: '99.9%' },
      { id: 'CH-03', name: '钉钉', enabled: true, conf: '机器人 webhook https://oapi.dingtalk.com/****', sent30d: 765, rate: '99.5%' },
      { id: 'CH-04', name: 'Webhook', enabled: true, conf: 'https://ops.energy.local/hook/****', sent30d: 231, rate: '98.2%' },
      { id: 'CH-05', name: '短信', enabled: false, conf: '阿里云短信 · 签名【能源BI】', sent30d: 56, rate: '99.1%' },
    ],
  }
}

function loadDb(): AlertDb {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as AlertDb
  } catch { /* ignore */ }
  return seed()
}

function saveDb(db: AlertDb) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

const db = loadDb()

/** 响应式镜像（页面直接绑定） */
export const alertRules = ref<AlertRule[]>(db.rules)
export const alertHistory = ref<AlertHistory[]>(db.history)
export const subscriptions = ref<Subscription[]>(db.subs)
export const jobs = ref<Job[]>(db.jobs)
export const channels = ref<Channel[]>(db.channels)

function persist() {
  saveDb({
    rules: alertRules.value,
    history: alertHistory.value,
    subs: subscriptions.value,
    jobs: jobs.value,
    channels: channels.value,
  })
}

export function toggleRule(id: string): boolean {
  const r = alertRules.value.find((x) => x.id === id)
  if (r) r.enabled = !r.enabled
  persist()
  return r?.enabled ?? false
}

export function saveRule(body: Partial<AlertRule>): AlertRule {
  const id = body.id || 'AR-' + String(alertRules.value.length + 1).padStart(2, '0')
  const row: AlertRule = {
    id,
    name: body.name || '未命名规则',
    metric: body.metric || '—',
    metricId: body.metricId || '—',
    cond: body.cond || '—',
    freq: body.freq || '每5分钟',
    cron: body.cron || '0 0/5 * * * ?',
    channels: body.channels || ['邮件'],
    receivers: body.receivers || '—',
    enabled: true,
    lastTrigger: '—',
    today: 0,
  }
  const i = alertRules.value.findIndex((r) => r.id === id)
  if (i >= 0) alertRules.value[i] = { ...alertRules.value[i], ...row }
  else alertRules.value.unshift(row)
  persist()
  return row
}

export function deleteRule(id: string) {
  alertRules.value = alertRules.value.filter((r) => r.id !== id)
  persist()
}

export function handleHistory(id: string, note: string) {
  const h = alertHistory.value.find((x) => x.id === id)
  if (h) {
    h.handled = 1
    h.note = note || '已处理'
  }
  persist()
}

export function toggleSub(id: string): boolean {
  const s = subscriptions.value.find((x) => x.id === id)
  if (s) s.enabled = !s.enabled
  persist()
  return s?.enabled ?? false
}

export function saveSub(body: Partial<Subscription>): Subscription {
  const FREQ_CRON: Record<string, string> = {
    '每天 08:00': '0 0 8 * * ?',
    '每天 07:30': '0 30 7 * * ?',
    '每周一 09:00': '0 0 9 ? * MON',
    '每月1日 10:00': '0 0 10 1 * ?',
  }
  const id = body.id || 'SB-' + String(subscriptions.value.length + 1).padStart(2, '0')
  const row: Subscription = {
    id,
    name: body.name || '未命名订阅',
    resource: body.resource || '看板：集团经营日报',
    cron: FREQ_CRON[body.freqText || ''] || body.cron || '0 0 8 * * ?',
    freqText: body.freqText || '每天 08:00',
    channels: body.channels || ['邮件'],
    receivers: body.receivers || '—',
    format: body.format || '图片+PDF',
    enabled: true,
    last: '—',
  }
  const i = subscriptions.value.findIndex((s) => s.id === id)
  if (i >= 0) subscriptions.value[i] = { ...subscriptions.value[i], ...row }
  else subscriptions.value.unshift(row)
  persist()
  return row
}

export function triggerJob(id: string): string {
  const j = jobs.value.find((x) => x.id === id)
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  if (j) j.last = time
  persist()
  return time
}

export function jobLog(id: string): { job: string; lines: string[] } {
  const j = jobs.value.find((x) => x.id === id) || jobs.value[0]
  return {
    job: j.name,
    lines: [
      `[${j.last}] 触发方式：定时调度（cron ${j.cron}）`,
      `[${j.last}] 任务实例 ${j.id}-20260904 进入执行队列（executors: 2/8 空闲）`,
      `[${j.last}] 加载任务上下文：目标「${j.name}」，超时阈值 300s`,
      `[${j.last}] 开始执行主逻辑 ……`,
      `[${j.last}] 数据处理完成：读取 12,842 行，写出 12,842 行`,
      `[${j.last}] 执行结束：结果「${j.status}」，总耗时 4.2s`,
      `[${j.last}] 下次计划执行：${j.next}`,
    ],
  }
}

export function testChannel(_id: string): boolean {
  return true
}

export function resetDb() {
  const s = seed()
  alertRules.value = s.rules
  alertHistory.value = s.history
  subscriptions.value = s.subs
  jobs.value = s.jobs
  channels.value = s.channels
  persist()
}
