import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/**
 * SQL 工作台数据端点（5b）。
 * 现状：execute/command 已 OperationMessage 包装；message/select/sqlHistoryData 为裸返回（见《端点契约盘点表》§五）。
 */

/** 查询结果（对应后端 SqlSelectResult；Row 为 HashMap，序列化为 {列名: 值}） */
export interface SqlSelectResult {
  sql?: string
  table?: { name?: string; columns?: { name: string; type?: string }[] }
  rows?: Record<string, unknown>[]
  startRow?: number
  fetchSize?: number
  nextStartRow?: number
}

/** 执行消息（Message.type = 子类名；SqlpadMessage 子类见 SqlpadExecutionService） */
export interface SqlpadMessage {
  type: string
  date?: number | string
  timeText?: string
  /** StartMessage */
  sqlCount?: number
  /** SqlSuccessMessage */
  sqlStatementIndex?: number
  sqlResultType?: string
  updateCount?: number
  sqlSelectResult?: SqlSelectResult
  /** ExceptionMessage */
  message?: string
  throwableDetail?: string
  /** TextMessage */
  text?: string
}

/** SQL 历史记录 */
export interface SqlHistory {
  sql: string
  dtbsSourceId?: string
  userId?: string
  createTime?: string
}

/** 结果分页请求体（对应后端 SqlpadSelectForm） */
export interface SqlpadSelectForm {
  sqlpadId: string
  sql: string
  startRow?: number
  fetchSize?: number
  returnMeta?: boolean
}

/** 提交 SQL 执行（异步，返回 OperationMessage） */
export async function executeSql(dtbsSourceId: string, sqlpadId: string, sql: string) {
  const res = await request.post<OperationMessage>(
    `/api/dtbsSourceSqlpad/${dtbsSourceId}/execute`,
    null,
    { params: { sqlpadId, sql } },
  )
  return unwrap(res)
}

/** 轮询执行消息（裸 List<SqlpadMessage>，非 OperationMessage） */
export async function pollMessages(
  dtbsSourceId: string,
  sqlpadId: string,
  messageCount = 50,
): Promise<SqlpadMessage[]> {
  const res = await request.post<SqlpadMessage[]>(
    `/api/dtbsSourceSqlpad/${dtbsSourceId}/message`,
    null,
    { params: { sqlpadId, messageCount } },
  )
  return res.data
}

/** SQL 历史分页（裸 PagingData<SqlHistory>，非 OperationMessage） */
export async function sqlHistoryData(
  dtbsSourceId: string,
  query: PagingQuery,
): Promise<PagingData<SqlHistory>> {
  const res = await request.post<PagingData<SqlHistory>>(
    `/api/dtbsSourceSqlpad/${dtbsSourceId}/sqlHistoryData`,
    query,
  )
  return res.data
}

/** 结果分页（同步查询更多行，裸 SqlSelectResult） */
export async function selectData(dtbsSourceId: string, form: SqlpadSelectForm): Promise<SqlSelectResult> {
  const res = await request.post<SqlSelectResult>(`/api/dtbsSourceSqlpad/${dtbsSourceId}/select`, form)
  return res.data
}

/** 生成 sqlpad 会话 id（客户端生成） */
export function newSqlpadId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
