/**
 * 数据治理前端演示数据层（对齐 prototypev2 mock-api：/quality/*、/sensitive/*）。
 * 治理模块为 FR-GOV（P2）；后端就绪后仅替换本文件数据来源。
 */
import { ref } from 'vue'

export interface QualityRule {
  id: string
  name: string
  type: string
  target: string
  freq: string
  pass: number
  trend: number[]
  enabled: boolean
}

export interface QualityIssue {
  id: string
  rule: string
  target: string
  detail: string
  time: string
  level: 'danger' | 'warn' | 'ok'
  resolved?: boolean
  note?: string
}

export interface SensitiveField {
  id: string
  field: string
  pos: string
  type: string
  mode: string
  rule: string
}

export interface MetaColumn {
  name: string
  type: string
  desc: string
  sensitive: string
  rule: string
}

export interface StdItem {
  id: string
  name: string
  category: string
  summary: string
  status: string
  refs: number
  owner: string
}

const LS_KEY = 'dg_mock_gov_db'

interface GovDb {
  rules: QualityRule[]
  issues: QualityIssue[]
  sensitive: SensitiveField[]
}

function seed(): GovDb {
  return {
    rules: [
      { id: 'QR-01', name: '采油日报非空校验', type: '非空', target: 'ODS_采油日报表.日产油量', freq: '每天 22:00', pass: 99.2, trend: [98.5, 99.0, 99.2, 99.1, 99.3, 99.2], enabled: true },
      { id: 'QR-02', name: '井号唯一性', type: '唯一', target: 'ODS_采油日报表.井号', freq: '每天 22:00', pass: 100, trend: [100, 100, 100, 100, 100, 100], enabled: true },
      { id: 'QR-03', name: '含水率范围 0~100', type: '范围', target: 'ODS_采油日报表.含水率', freq: '每天 22:00', pass: 96.8, trend: [97.5, 97.1, 96.9, 97.0, 96.6, 96.8], enabled: true },
      { id: 'QR-04', name: '管输量及时性', type: '及时性', target: 'ODS_管网输量.数据时间', freq: '每小时', pass: 98.9, trend: [99.2, 99.0, 98.8, 98.9, 99.0, 98.9], enabled: true },
      { id: 'QR-05', name: '瓦斯浓度格式', type: '格式', target: 'ODS_瓦斯监测.浓度值', freq: '实时', pass: 99.9, trend: [99.8, 99.9, 99.9, 100, 99.9, 99.9], enabled: true },
    ],
    issues: [
      { id: 'QI-01', rule: '含水率范围 0~100', target: 'ODS_采油日报表.含水率', detail: '空值率 3.2%（阈值 2%），涉及 华北采油厂 2 口井', time: '昨天 22:00', level: 'danger' },
      { id: 'QI-02', rule: '管输量及时性', target: 'ODS_管网输量', detail: '09-02 08 点批次延迟 12 分钟到达', time: '昨天 08:12', level: 'warn' },
    ],
    sensitive: [
      { id: 'SF-01', field: '联系电话', pos: '集团财务库(达梦).供应商主数据.phone', type: '手机号', mode: '正则自动识别', rule: '掩码 MK-01' },
      { id: 'SF-02', field: '身份证号', pos: '集团财务库(达梦).员工主数据.id_card', type: '身份证', mode: '正则自动识别', rule: '掩码 MK-02' },
      { id: 'SF-03', field: '银行账号', pos: '煤化工ERP.应付账款.bank_no', type: '银行卡', mode: '手动标记', rule: '哈希 MK-03' },
    ],
  }
}

function loadDb(): GovDb {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as GovDb
  } catch { /* ignore */ }
  return seed()
}

function saveDb(db: GovDb) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

const db = loadDb()

const EXTRA_KEY = 'dg_mock_gov_extra'
function loadExtra(): { metaTables?: MetaTable[]; standards?: StdItem[] } {
  try {
    const raw = localStorage.getItem(EXTRA_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}
const extra = loadExtra()

export const qualityRules = ref<QualityRule[]>(db.rules)
export const qualityIssues = ref<QualityIssue[]>(db.issues)
export const sensitiveFields = ref<SensitiveField[]>(db.sensitive)

function persist() {
  saveDb({ rules: qualityRules.value, issues: qualityIssues.value, sensitive: sensitiveFields.value })
  try {
    localStorage.setItem('dg_mock_gov_extra', JSON.stringify({ metaTables: metaTables.value, standards: standards.value }))
  } catch { /* ignore */ }
}

export function toggleQualityRule(id: string): boolean {
  const r = qualityRules.value.find((x) => x.id === id)
  if (r) r.enabled = !r.enabled
  persist()
  return r?.enabled ?? false
}

export function saveQualityRule(body: { name: string; type: string; target: string; freq: string }): QualityRule {
  const row: QualityRule = {
    id: 'QR-' + String(qualityRules.value.length + 1).padStart(2, '0'),
    name: body.name,
    type: body.type,
    target: body.target,
    freq: body.freq || '每天 22:00',
    pass: 100,
    trend: [100, 100, 100, 100, 100, 100],
    enabled: true,
  }
  qualityRules.value.push(row)
  persist()
  return row
}

export function saveStandard(body: { name: string; category: string; summary: string; owner: string }): StdItem {
  const row: StdItem = {
    id: 'ST-' + String(standards.value.length + 1).padStart(2, '0'),
    name: body.name,
    category: body.category,
    summary: body.summary,
    status: '试行',
    refs: 0,
    owner: body.owner || 'admin',
  }
  standards.value.push(row)
  persist()
  return row
}

export function updateQualityRule(body: QualityRule): void {
  const i = qualityRules.value.findIndex((x) => x.id === body.id)
  if (i >= 0) qualityRules.value[i] = { ...body }
  persist()
}

export function deleteQualityRule(id: string): void {
  qualityRules.value = qualityRules.value.filter((x) => x.id !== id)
  persist()
}

export function resolveIssue(id: string, note: string): void {
  const it = qualityIssues.value.find((x) => x.id === id)
  if (it) {
    it.resolved = true
    it.note = note || '已处理'
    it.level = 'ok'
  }
  persist()
}

export function markSensitive(field: string, type = '敏感'): void {
  const exist = sensitiveFields.value.find((s) => s.field === field)
  if (exist) {
    exist.type = type
  } else {
    sensitiveFields.value.push({
      id: 'SF-' + String(sensitiveFields.value.length + 1).padStart(2, '0'),
      field,
      pos: '手动标记',
      type,
      mode: '手动标记',
      rule: '待配置',
    })
  }
  persist()
}
/* ---- 元数据（静态样例：ODS_采油日报字段清单） ---- */
export interface MetaTable {
  name: string
  source: string
  rows: string
  columns: MetaColumn[]
}

export const metaTables = ref<MetaTable[]>(extra.metaTables ?? [])

/** 采集结果合并：同名表覆盖，新表追加（采集元数据按钮用） */
export function mergeMetaTables(tables: MetaTable[]): { added: number; updated: number } {
  let added = 0
  let updated = 0
  for (const t of tables) {
    const i = metaTables.value.findIndex((x) => x.name === t.name)
    if (i >= 0) {
      metaTables.value[i] = t
      updated++
    } else {
      metaTables.value.push(t)
      added++
    }
  }
  persist()
  return { added, updated }
}

export function updateColumnSensitive(tableName: string, colName: string, sensitive: string): void {
  const t = metaTables.value.find((x) => x.name === tableName)
  const c = t?.columns.find((x) => x.name === colName)
  if (c) {
    c.sensitive = sensitive
    persist()
  }
}

export const activeMetaTable = ref('')

export function updateStandard(body: StdItem): void {
  const i = standards.value.findIndex((x) => x.id === body.id)
  if (i >= 0) standards.value[i] = { ...body }
  persist()
}

export function deleteStandard(id: string): void {
  standards.value = standards.value.filter((x) => x.id !== id)
  persist()
}

export function publishStandard(id: string): void {
  const s = standards.value.find((x) => x.id === id)
  if (s) s.status = '已发布'
  persist()
}

/* ---- 数据血缘 ----
  { name: '井号', type: 'VARCHAR', desc: '生产井唯一标识', sensitive: '—', rule: '唯一性 QR-02' },
  { name: '日产油量', type: 'DECIMAL', desc: '井口产油量（吨）', sensitive: '—', rule: '非空 QR-01' },
  { name: '含水率', type: 'DECIMAL', desc: '产液量中水所占百分比', sensitive: '—', rule: '范围 QR-03' },
  { name: '联系电话', type: 'VARCHAR', desc: '井场负责人电话', sensitive: '手机号', rule: '掩码 MK-01' },
  { name: '数据时间', type: 'TIMESTAMP', desc: '采集时间', sensitive: '—', rule: '—' },
])

/* ---- 数据标准（静态样例） ---- */
export const standards = ref<StdItem[]>(extra.standards ?? [
  { id: 'ST-01', name: '井号编码规范', category: '命名规范', summary: '井号 = 矿区代码 + 井型 + 序号（如 AN-07-023）', status: '已发布', refs: 26, owner: '张伟' },
  { id: 'ST-02', name: '产量计量单位', category: '值域', summary: '原油：万吨（保留 1 位小数）；天然气：亿方', status: '已发布', refs: 15, owner: '李秀兰' },
  { id: 'ST-03', name: '日期字段格式', category: '格式', summary: '统一 yyyy-MM-dd，时间戳字段 yyyy-MM-dd HH:mm:ss', status: '试行', refs: 41, owner: '张伟' },
])

/* ---- 数据血缘（静态样例：数据源→数据集→指标→看板） ---- */
export interface LineageNode { id: string; name: string; level: number }
export interface LineageEdge { from: string; to: string }
export const lineageNodes = ref<LineageNode[]>([
  { id: 'src', name: '华北油田生产库', level: 0 },
  { id: 'ds1', name: 'DS_采油日报', level: 1 },
  { id: 'm1', name: '原油产量', level: 2 },
  { id: 'm2', name: '井口综合含水率', level: 2 },
  { id: 'b1', name: '华北油田生产日报', level: 3 },
  { id: 'a1', name: '日产油低于阈值', level: 3 },
])
export interface LineageNodeDetail {
  upstream: string[]
  downstream: string[]
  fieldMap: string[]
  updateFreq: string
}

export function lineageDetail(nodeId: string): LineageNodeDetail {
  const name = (id: string) => lineageNodes.value.find((n) => n.id === id)?.name ?? id
  const upstream = lineageEdges.value.filter((e) => e.to === nodeId).map((e) => name(e.from))
  const downstream = lineageEdges.value.filter((e) => e.from === nodeId).map((e) => name(e.to))
  const mapByNode: Record<string, string[]> = {
    src: ['全字段同步 · 增量 CDC'],
    ds1: ['井号 → 井号', '日产油量 → 日产油量', '含水率 → 含水率'],
    m1: ['SUM(日产油量) → 指标值'],
    m2: ['AVG(含水率) → 指标值'],
    b1: ['指标值 → KPI 卡/图表'],
    a1: ['指标值 → 阈值比较'],
  }
  return {
    upstream,
    downstream,
    fieldMap: mapByNode[nodeId] || ['—'],
    updateFreq: '每天 22:00 增量',
  }
}

export const lineageEdges = ref<LineageEdge[]>([
  { from: 'src', to: 'ds1' },
  { from: 'ds1', to: 'm1' },
  { from: 'ds1', to: 'm2' },
  { from: 'm1', to: 'b1' },
  { from: 'm1', to: 'a1' },
  { from: 'm2', to: 'b1' },
])
