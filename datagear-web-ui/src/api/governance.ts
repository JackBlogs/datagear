import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/**
 * 数据治理 API（对应后端 GovernanceApiController，/api/governance 前缀，FR-GOV-01~05）。
 * 元数据目录 / 数据标准 / 质量规则（服务端执行引擎）/ 质量异常 / 敏感字段。
 */

/* ================= 后端实体 ================= */
export interface GovMetaTableEntity {
  id?: string
  name: string
  sourceId: string
  source: string
  rows: string
  columnsJson: string
  createTime?: string
}

export interface GovStandardEntity {
  id?: string
  name: string
  category: string
  summary: string
  status: string
  refs: number
  owner: string
  createTime?: string
}

export interface GovQualityRuleEntity {
  id?: string
  name: string
  type: string
  sourceId: string
  sourceName: string
  tableName: string
  columnName: string
  threshold: string
  freq: string
  enabled: number
  lastRunTime?: string | null
  passRate: number
  total: number
  failed: number
  sample: number
  createTime?: string
}

export interface GovQualityIssueEntity {
  id: string
  ruleId: string
  rule: string
  target: string
  detail: string
  level: string
  resolved: boolean
  note?: string
  failed: number
  total: number
  createTime?: string
}

export interface GovSensitiveFieldEntity {
  id?: string
  field: string
  tableName: string
  sourceId: string
  type: string
  hits: number
  sample: string
  mode: string
  rule: string
  createTime?: string
}

export interface RuleRunResult {
  passRate: number
  total: number
  failed: number
  sample: number
  rule: GovQualityRuleEntity
}

/* ================= 元数据 ================= */
export const govMetaList = (): Promise<GovMetaTableEntity[]> =>
  request.get<OperationMessage<GovMetaTableEntity[]>>('/api/governance/meta/list').then((r) => unwrap(r) ?? [])

export const govMetaSave = (entity: GovMetaTableEntity): Promise<GovMetaTableEntity> =>
  request.post<OperationMessage<GovMetaTableEntity>>('/api/governance/meta/save', entity).then((r) => unwrap(r)!)

/* ================= 数据标准 ================= */
export const govStandardList = (): Promise<GovStandardEntity[]> =>
  request.get<OperationMessage<GovStandardEntity[]>>('/api/governance/standard/list').then((r) => unwrap(r) ?? [])

export const govStandardSave = (entity: GovStandardEntity): Promise<GovStandardEntity> =>
  request.post<OperationMessage<GovStandardEntity>>('/api/governance/standard/save', entity).then((r) => unwrap(r)!)

export const govStandardDelete = (ids: string[]): Promise<void> =>
  request.post<OperationMessage>('/api/governance/standard/delete', ids).then(() => undefined)

/* ================= 质量规则 ================= */
export const govRuleList = (): Promise<GovQualityRuleEntity[]> =>
  request.get<OperationMessage<GovQualityRuleEntity[]>>('/api/governance/quality/rule/list').then((r) => unwrap(r) ?? [])

export const govRuleSave = (entity: GovQualityRuleEntity): Promise<GovQualityRuleEntity> =>
  request.post<OperationMessage<GovQualityRuleEntity>>('/api/governance/quality/rule/save', entity).then((r) => unwrap(r)!)

export const govRuleDelete = (ids: string[]): Promise<void> =>
  request.post<OperationMessage>('/api/governance/quality/rule/delete', ids).then(() => undefined)

/** 服务端执行引擎：抽样 → 判定 → 结果与异常落库 */
export const govRuleRun = (id: string): Promise<RuleRunResult> =>
  request.post<OperationMessage<RuleRunResult>>('/api/governance/quality/rule/run', { id }).then((r) => unwrap(r)!)

/* ================= 质量异常 ================= */
export const govIssueList = (all = true): Promise<GovQualityIssueEntity[]> =>
  request
    .get<OperationMessage<GovQualityIssueEntity[]>>(`/api/governance/quality/issue/list?all=${all}`)
    .then((r) => unwrap(r) ?? [])

export const govIssueResolve = (id: string, note: string): Promise<void> =>
  request.post<OperationMessage>('/api/governance/quality/issue/resolve', { id, note }).then(() => undefined)

/* ================= 敏感字段 ================= */
export const govSensitiveList = (): Promise<GovSensitiveFieldEntity[]> =>
  request.get<OperationMessage<GovSensitiveFieldEntity[]>>('/api/governance/sensitive/list').then((r) => unwrap(r) ?? [])

export const govSensitiveSave = (entity: GovSensitiveFieldEntity): Promise<GovSensitiveFieldEntity> =>
  request.post<OperationMessage<GovSensitiveFieldEntity>>('/api/governance/sensitive/save', entity).then((r) => unwrap(r)!)

export const govSensitiveDelete = (ids: string[]): Promise<void> =>
  request.post<OperationMessage>('/api/governance/sensitive/delete', ids).then(() => undefined)
