/**
 * 数据治理数据层（后端真实化）：
 * - 存储切换为后端 /api/governance/*（FR-GOV 五表），本地 ref 保持乐观更新
 * - 质量规则「运行校验」切换为后端执行引擎（服务端抽样判定，结果与异常落库）
 * - 敏感识别（列样本正则）仍在前端执行，结果持久化到后端敏感清单
 * - 血缘：解析 SQL 数据集的 FROM/JOIN 表（前端解析，结构数据真实）
 */
import { ref } from 'vue'
import { previewSqlDataSet, type SqlDataSetForm } from '@/api/dataSet'
import {
  govMetaList,
  govMetaSave,
  govStandardList,
  govStandardSave,
  govStandardDelete,
  govRuleList,
  govRuleSave,
  govRuleDelete,
  govRuleRun,
  govIssueList,
  govIssueResolve,
  govSensitiveList,
  govSensitiveSave,
  govSensitiveDelete,
  type GovMetaTableEntity,
  type GovQualityRuleEntity,
  type GovQualityIssueEntity,
} from '@/api/governance'

/* ================= 后端 ↔ 本地 映射 ================= */
function toLocalRule(e: GovQualityRuleEntity): QualityRule {
  return {
    id: e.id || '',
    name: e.name,
    type: (e.type as RuleType) || '非空',
    sourceId: e.sourceId,
    sourceName: e.sourceName,
    tableName: e.tableName,
    columnName: e.columnName,
    threshold: e.threshold,
    freq: e.freq,
    enabled: e.enabled === 1,
    lastRun: e.lastRunTime
      ? { time: String(e.lastRunTime).slice(5, 16), passRate: e.passRate, total: e.total, failed: e.failed, sample: e.sample }
      : undefined,
  }
}

function toEntityRule(r: QualityRule): GovQualityRuleEntity {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    sourceId: r.sourceId,
    sourceName: r.sourceName,
    tableName: r.tableName,
    columnName: r.columnName,
    threshold: r.threshold,
    freq: r.freq,
    enabled: r.enabled ? 1 : 0,
    lastRunTime: r.lastRun ? r.lastRun.time : null,
    passRate: r.lastRun?.passRate ?? 0,
    total: r.lastRun?.total ?? 0,
    failed: r.lastRun?.failed ?? 0,
    sample: r.lastRun?.sample ?? 0,
  }
}

function toLocalIssue(e: GovQualityIssueEntity): QualityIssue {
  return {
    id: e.id,
    ruleId: e.ruleId,
    rule: e.rule,
    target: e.target,
    detail: e.detail,
    time: String(e.createTime || '').slice(5, 16),
    level: (e.level as QualityIssue['level']) || 'warn',
    resolved: e.resolved,
    note: e.note,
    failed: e.failed,
    total: e.total,
  }
}

function metaToEntity(t: MetaTable): GovMetaTableEntity {
  return { id: (t as MetaTable & { id?: string }).id, name: t.name, sourceId: t.sourceId, source: t.source, rows: t.rows, columnsJson: JSON.stringify(t.columns) }
}

function metaToLocal(e: GovMetaTableEntity): MetaTable {
  let cols: MetaColumn[] = []
  try { cols = JSON.parse(e.columnsJson || '[]') } catch { cols = [] }
  const t: MetaTable & { id?: string } = { id: e.id, name: e.name, source: e.source, sourceId: e.sourceId, rows: e.rows, columns: cols }
  return t
}

/** 后端初始化（拉取五块数据覆盖本地） */
export async function initFromBackend(): Promise<void> {
  try {
    const [meta, std, rules, issues, sens] = await Promise.all([
      govMetaList(), govStandardList(), govRuleList(), govIssueList(true), govSensitiveList(),
    ])
    metaTables.value = meta.map(metaToLocal)
    activeMetaTable.value = metaTables.value[0]?.name ?? ''
    standards.value = std.map((e) => ({
      id: e.id || '', name: e.name, category: e.category, summary: e.summary,
      status: e.status, refs: e.refs, owner: e.owner,
    }))
    qualityRules.value = rules.map(toLocalRule)
    qualityIssues.value = issues.map(toLocalIssue)
    sensitiveFields.value = sens.map((e) => ({
      id: e.id || '', field: e.field, tableName: e.tableName, sourceId: e.sourceId,
      type: e.type, hits: e.hits, sample: e.sample, mode: e.mode, rule: e.rule,
    }))
  } catch (e) {
    console.warn('治理后端数据加载失败，使用本地缓存', e)
  }
}

function syncError(op: string) {
  return (e: unknown) => console.warn(`治理后端同步失败（${op}）`, e)
}

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
      const id = (metaTables.value[i] as MetaTable & { id?: string }).id
      const merged = { ...t, id } as MetaTable & { id?: string }
      metaTables.value[i] = merged
      updated++
      govMetaSave(metaToEntity(merged)).catch(syncError('meta/save'))
    } else {
      metaTables.value.push(t)
      added++
      govMetaSave(metaToEntity(t)).catch(syncError('meta/save'))
    }
  }
  persist()
  return { added, updated }
}

export function updateColumnSensitive(tableName: string, sourceId: string, colName: string, sensitive: string): void {
  const t = metaTables.value.find((x) => x.name === tableName && x.sourceId === sourceId)
  const c = t?.columns.find((x) => x.name === colName)
  if (c && t) {
    c.sensitive = sensitive
    persist()
    govMetaSave(metaToEntity(t)).catch(syncError('meta/save'))
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
  govStandardSave({ name: row.name, category: row.category, summary: row.summary, status: row.status, refs: row.refs, owner: row.owner })
    .then((e) => { row.id = e.id || row.id })
    .catch(syncError('standard/save'))
  return row
}

export function updateStandard(body: StdItem): void {
  const i = standards.value.findIndex((x) => x.id === body.id)
  if (i >= 0) standards.value[i] = { ...body }
  persist()
  govStandardSave({ id: body.id, name: body.name, category: body.category, summary: body.summary, status: body.status, refs: body.refs, owner: body.owner })
    .catch(syncError('standard/save'))
}

export function deleteStandard(id: string): void {
  standards.value = standards.value.filter((x) => x.id !== id)
  persist()
  govStandardDelete([id]).catch(syncError('standard/delete'))
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
  if (r) govRuleSave(toEntityRule(r)).catch(syncError('rule/save'))
  return r?.enabled ?? false
}

export function saveQualityRule(body: Omit<QualityRule, 'id' | 'lastRun'>): QualityRule {
  const row: QualityRule = { ...body, id: 'QR-' + String(Date.now() % 100000) }
  qualityRules.value.push(row)
  persist()
  govRuleSave(toEntityRule({ ...body, id: '' }))
    .then((e) => { row.id = e.id || row.id })
    .catch(syncError('rule/save'))
  return row
}

export function updateQualityRule(body: QualityRule): void {
  const i = qualityRules.value.findIndex((x) => x.id === body.id)
  if (i >= 0) qualityRules.value[i] = { ...body }
  persist()
  govRuleSave(toEntityRule(body)).catch(syncError('rule/save'))
}

export function deleteQualityRule(id: string): void {
  qualityRules.value = qualityRules.value.filter((x) => x.id !== id)
  persist()
  govRuleDelete([id]).catch(syncError('rule/delete'))
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
  govIssueResolve(id, note).catch(syncError('issue/resolve'))
}

/** 后端执行质量规则（FR-GOV-04 引擎），同步规则 lastRun 与异常清单 */
export async function runRuleOnBackend(id: string): Promise<{ passRate: number; total: number; failed: number } | null> {
  const res = await govRuleRun(id)
  const r = qualityRules.value.find((x) => x.id === id)
  if (r && res.rule) {
    r.lastRun = {
      time: String(res.rule.lastRunTime || '').slice(5, 16),
      passRate: res.passRate,
      total: res.total,
      failed: res.failed,
      sample: res.sample,
    }
    persist()
  }
  try {
    qualityIssues.value = (await govIssueList(true)).map(toLocalIssue)
  } catch (e) {
    console.warn('异常清单刷新失败', e)
  }
  return { passRate: res.passRate, total: res.total, failed: res.failed }
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
  govSensitiveSave({ id: (row as SensitiveField & { id?: string }).id?.startsWith('SF-') ? undefined : (row as SensitiveField & { id?: string }).id,
    field: row.field, tableName: row.tableName, sourceId: row.sourceId, type: row.type, hits: row.hits, sample: row.sample, mode: row.mode, rule: row.rule })
    .catch(syncError('sensitive/save'))
}

export function removeSensitive(id: string): void {
  sensitiveFields.value = sensitiveFields.value.filter((s) => s.id !== id)
  persist()
  govSensitiveDelete([id]).catch(syncError('sensitive/delete'))
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
