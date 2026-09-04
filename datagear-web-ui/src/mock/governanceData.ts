/**
 * 数据治理数据层（拿来直接能用版）：
 * - 数据质量：规则绑定真实数据源/表/字段，经 /dataSet/preview/SQL 拉样本行，前端确定性判定（非空/唯一/范围/格式），结果持久化
 * - 数据安全：列样本正则识别（手机号/身份证/银行卡/邮箱），识别结果即敏感清单
 * - 数据血缘：解析 SQL 数据集的 FROM/JOIN 表，生成真实表级血缘
 * - 元数据：由「采集元数据」从数据源读取（v2 key 持久化）
 * 后端治理模块（FR-GOV）就绪后，仅将执行/存储切换为后端接口。
 */
import { ref } from 'vue'
import { previewSqlDataSet, type SqlDataSetForm } from '@/api/dataSet'

/* ================= 类型 ================= */
export type RuleType = '非空' | '唯一' | '范围' | '格式'

export interface QualityRule {
  id: string
  name: string
  type: RuleType
  /** 绑定目标：数据源 id / 表名 / 字段名 */
  sourceId: string
  sourceName: string
  tableName: string
  columnName: string
  /** 范围规则阈值 "0~100"；格式规则正则 */
  threshold: string
  freq: string
  enabled: boolean
  /** 最近一次执行结果 */
  lastRun?: { time: string; passRate: number; total: number; failed: number; sample: number }
}

export interface QualityIssue {
  id: string
  ruleId: string
  rule: string
  target: string
  detail: string
  time: string
  level: 'danger' | 'warn' | 'ok'
  resolved?: boolean
  note?: string
  failed: number
  total: number
}

export interface SensitiveField {
  id: string
  field: string
  tableName: string
  sourceId: string
  type: string
  hits: number
  sample: string
  mode: string
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

export interface MetaColumn {
  name: string
  type: string
  desc: string
  sensitive: string
  rule: string
}

export interface MetaTable {
  name: string
  source: string
  sourceId: string
  rows: string
  columns: MetaColumn[]
}

/* ================= 敏感识别正则 ================= */
export const SENSITIVE_PATTERNS: { type: string; re: RegExp }[] = [
  { type: '手机号', re: /(?:^|\D)(1[3-9]\d{9})(?:\D|$)/ },
  { type: '身份证', re: /(?:^|\D)(\d{17}[\dXx])(?:\D|$)/ },
  { type: '银行卡', re: /(?:^|\D)(\d{16,19})(?:\D|$)/ },
  { type: '邮箱', re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
]

export function identifyValue(v: string): string | null {
  for (const p of SENSITIVE_PATTERNS) if (p.re.test(v)) return p.type
  return null
}

/* ================= 响应式状态 ================= */
const DB_KEY = 'dg_gov_store_v2'

interface GovStore {
  rules: QualityRule[]
  issues: QualityIssue[]
  sensitive: SensitiveField[]
  standards: StdItem[]
  metaTables: MetaTable[]
}

function loadStore(): GovStore {
  const fallback: GovStore = { rules: [], issues: [], sensitive: [], standards: [], metaTables: [] }
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return { ...fallback, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return fallback
}

function saveStore() {
  try {
    localStorage.setItem(
      DB_KEY,
      JSON.stringify({
        rules: qualityRules.value,
        issues: qualityIssues.value,
        sensitive: sensitiveFields.value,
        standards: standards.value,
        metaTables: metaTables.value,
      }),
    )
  } catch { /* ignore */ }
}

const store = loadStore()

export const qualityRules = ref<QualityRule[]>(store.rules)
export const qualityIssues = ref<QualityIssue[]>(store.issues)
export const sensitiveFields = ref<SensitiveField[]>(store.sensitive)
export const standards = ref<StdItem[]>(store.standards)
export const metaTables = ref<MetaTable[]>(store.metaTables)
export const activeMetaTable = ref(metaTables.value[0]?.name ?? '')

function persist() {
  saveStore()
}

/* ================= 元数据 ================= */
export function mergeMetaTables(tables: MetaTable[]): { added: number; updated: number } {
  let added = 0
  let updated = 0
  for (const t of tables) {
    const i = metaTables.value.findIndex((x) => x.name === t.name && x.sourceId === t.sourceId)
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

export function updateColumnSensitive(tableName: string, sourceId: string, colName: string, sensitive: string): void {
  const t = metaTables.value.find((x) => x.name === tableName && x.sourceId === sourceId)
  const c = t?.columns.find((x) => x.name === colName)
  if (c) {
    c.sensitive = sensitive
    persist()
  }
}

/* ================= 数据标准 ================= */
export function saveStandard(body: { name: string; category: string; summary: string; owner: string }): StdItem {
  const row: StdItem = {
    id: 'ST-' + String(Date.now() % 100000),
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

/* ================= 数据质量 ================= */
export function toggleQualityRule(id: string): boolean {
  const r = qualityRules.value.find((x) => x.id === id)
  if (r) r.enabled = !r.enabled
  persist()
  return r?.enabled ?? false
}

export function saveQualityRule(body: Omit<QualityRule, 'id' | 'lastRun'>): QualityRule {
  const row: QualityRule = { ...body, id: 'QR-' + String(Date.now() % 100000) }
  qualityRules.value.push(row)
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

export function saveIssue(issue: QualityIssue): void {
  qualityIssues.value.unshift(issue)
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

/* ================= 数据安全 ================= */
export function addSensitive(row: SensitiveField): void {
  const exist = sensitiveFields.value.find((s) => s.tableName === row.tableName && s.field === row.field && s.sourceId === row.sourceId)
  if (exist) {
    exist.type = row.type
    exist.hits = row.hits
    exist.sample = row.sample
    exist.rule = row.rule
  } else {
    sensitiveFields.value.push(row)
  }
  persist()
}

export function removeSensitive(id: string): void {
  sensitiveFields.value = sensitiveFields.value.filter((s) => s.id !== id)
  persist()
}

/* ================= 真实执行引擎 ================= */
export interface ExecResult {
  passRate: number
  total: number
  failed: number
  sample: number
  detail: string
}

/** 构造 SQL 数据集预览表单（只传最小字段，connectionFactory 等服务端字段不可回传） */
export function toPreviewForm(sourceId: string, name: string, sql: string): SqlDataSetForm {
  return {
    id: undefined as unknown as string,
    name: name || 'gov-preview',
    sql,
    dataSetType: 'SQL',
    params: [],
    dtbsCnFty: { dtbsSource: { id: sourceId } },
  }
}

/** 拉取列样本（最多 500 行，跨库：SELECT 单列） */
export async function fetchColumnSample(sourceId: string, table: string, column: string, limit = 500): Promise<string[]> {
  const form = toPreviewForm(sourceId, 'gov-sample', `SELECT ${column} FROM ${table} LIMIT ${limit}`)
  const res = await previewSqlDataSet(form, { query: { resultFetchSize: limit, paramValues: {} } })
  const data = (res.result?.data ?? []) as Record<string, unknown>[]
  const key = res.fields?.[0]?.name || column
  return data.map((row) => (row[key] === null || row[key] === undefined ? '' : String(row[key])))
}

/** 前端规则判定（样本内确定性执行） */
/** SQL 标识符白名单（表/字段来自元数据，防注入） */
export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

export function judgeSamples(type: RuleType, values: string[], threshold: string): { total: number; failed: number } {
  const total = values.length
  let failed = 0
  for (const v of values) {
    const empty = v === '' || v === 'null' || v === 'undefined'
    switch (type) {
      case '非空':
        if (empty) failed++
        break
      case '唯一':
        break // 单列唯一性需全量，样本内跳过（由 SQL COUNT DISTINCT 判定的场景后续扩展）
      case '范围': {
        if (empty) { failed++; break }
        const m = /^(-?[\d.]+)~(-?[\d.]+)$/.exec(threshold || '')
        const n = Number(v)
        if (m && (Number.isNaN(n) || n < Number(m[1]) || n > Number(m[2]))) failed++
        break
      }
      case '格式':
        if (!empty && threshold && !new RegExp(threshold).test(v)) failed++
        break
    }
  }
  if (type === '唯一') {
    const nonEmpty = values.filter((v) => v !== '')
    failed = nonEmpty.length - new Set(nonEmpty).size
  }
  return { total, failed }
}
