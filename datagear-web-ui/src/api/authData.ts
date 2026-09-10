import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/**
 * 行列级数据权限 / 动态脱敏 / 审计日志 API（对应后端 AuthApiController / AuditApiController）。
 * 契约对齐 prototypev2 mock-api：/auth/rowperm/*、/auth/mask/*、/management/audit/list。
 */

/** 行级数据权限规则（FR-AUTH-10） */
export interface RowPermEntity {
  id: string
  name: string
  resource: string
  /** 条件模板，如 org_code = ${currentOrg} */
  cond: string
  rolesJson: string
  /** 作用物理表（指标查询改写用，可选） */
  tableName: string
  /** 作用物理字段（可选） */
  fieldName: string
  enabled: number
  createTime?: string
  createUserId?: string
}

/** 动态脱敏规则（FR-AUTH-11） */
export interface MaskRuleEntity {
  id: string
  field: string
  tableName: string
  fieldName: string
  /** 掩码 / 哈希 / 置空 / 截断 */
  algo: string
  sample: string
  roles: string
  enabled: number
  createTime?: string
  createUserId?: string
}

/** 审计日志（FR-AUTH-12） */
export interface AuditLogEntity {
  id: string
  op: string
  user: string
  target: string
  ip: string
  result: string
  createTime?: string
}

export const rowPermList = (): Promise<RowPermEntity[]> =>
  request.get<OperationMessage<RowPermEntity[]>>('/api/auth/rowperm/list').then((r) => unwrap(r) ?? [])

export const saveRowPermApi = (body: {
  id?: string
  name: string
  resource: string
  cond: string
  roles?: string[]
  tableName?: string
  fieldName?: string
}): Promise<RowPermEntity> =>
  request.post<OperationMessage<RowPermEntity>>('/api/auth/rowperm/save', body).then((r) => unwrap(r)!)

export const toggleRowPermApi = (id: string): Promise<boolean> =>
  request
    .post<OperationMessage<{ enabled: boolean }>>(`/api/auth/rowperm/toggle/${id}`)
    .then((r) => unwrap(r)?.enabled ?? false)

export const deleteRowPerms = (ids: string[]): Promise<void> =>
  request.post<OperationMessage>('/api/auth/rowperm/delete', ids).then(() => undefined)

export const maskList = (): Promise<MaskRuleEntity[]> =>
  request.get<OperationMessage<MaskRuleEntity[]>>('/api/auth/mask/list').then((r) => unwrap(r) ?? [])

export const saveMaskApi = (body: {
  id?: string
  field: string
  algo?: string
  sample?: string
  roles?: string
  tableName?: string
  fieldName?: string
}): Promise<MaskRuleEntity> =>
  request.post<OperationMessage<MaskRuleEntity>>('/api/auth/mask/save', body).then((r) => unwrap(r)!)

export const toggleMaskApi = (id: string): Promise<boolean> =>
  request
    .post<OperationMessage<{ enabled: boolean }>>(`/api/auth/mask/toggle/${id}`)
    .then((r) => unwrap(r)?.enabled ?? false)

export const deleteMasks = (ids: string[]): Promise<void> =>
  request.post<OperationMessage>('/api/auth/mask/delete', ids).then(() => undefined)

/** 审计日志（{total, rows}） */
export const auditList = (op = ''): Promise<{ total: number; rows: AuditLogEntity[] }> =>
  request
    .get<OperationMessage<{ total: number; rows: AuditLogEntity[] }>>(
      op ? `/api/management/audit/list?op=${encodeURIComponent(op)}` : '/api/management/audit/list',
    )
    .then((r) => unwrap(r) ?? { total: 0, rows: [] })
