import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/**
 * ChatBI 智能问数 API（对应后端 AiApiController，/api/ai 前缀，FR-AI-01~08）。
 * 契约对齐 prototypev2 mock-api：/ai/session/*、/ai/chat/*、/ai/insight/attribute。
 */

/** 问数会话 */
export interface AiSessionItem {
  id: string
  title: string
  turns: number
  createTime?: string
  updateTime?: string
}

/** 图表推荐规格（规则引擎产出） */
export interface LiveChartSpec {
  type: 'bar' | 'line' | string
  x: unknown[]
  y: unknown[]
  yName?: string
}

/** 取数透明化 explain */
export interface LiveExplain {
  metric: string
  metricName: string
  dsl: Record<string, unknown>
  sql: string
  permission: string
  costMs: number
  cacheHit: boolean
  appliedRowPerms?: string[]
  appliedMasks?: string[]
}

/** 问数回答（type=answer） */
export interface LiveAnswer {
  type: 'answer'
  metric: string
  title: string
  conclusion: string
  columns: string[]
  data: Record<string, unknown>[]
  chart: LiveChartSpec
  dimLabel: string
  explain: LiveExplain
  sessionId?: string
}

/** 澄清响应（type=clarify） */
export interface LiveClarify {
  type: 'clarify'
  message: string
  options: string[]
}

export type ChatResponse = LiveAnswer | LiveClarify

/** 归因行（维度贡献度） */
export interface AttrRow {
  dim: string
  topValue: string
  pct: number
  seriesCount: number
}

export const aiSessionList = (): Promise<AiSessionItem[]> =>
  request.get<OperationMessage<AiSessionItem[]>>('/api/ai/session/list').then((r) => unwrap(r) ?? [])

export const aiSessionCreate = (title = ''): Promise<AiSessionItem> =>
  request.post<OperationMessage<AiSessionItem>>('/api/ai/session/create', { title }).then((r) => unwrap(r)!)

export const aiSessionDelete = (id: string): Promise<void> =>
  request.post<OperationMessage>(`/api/ai/session/delete/${id}`).then(() => undefined)

export const aiChatHistory = (sessionId: string): Promise<{ role: string; content: string; time?: string }[]> =>
  request
    .get<OperationMessage<{ role: string; content: string; time?: string }[]>>(`/api/ai/chat/history/${sessionId}`)
    .then((r) => unwrap(r) ?? [])

export const aiChatAsk = (sessionId: string, question: string): Promise<ChatResponse> =>
  request
    .post<OperationMessage<ChatResponse>>('/api/ai/chat/ask', { sessionId, question })
    .then((r) => unwrap(r)!)

/** 澄清选项（指标名）确认后重新取数 */
export const aiChatClarify = (sessionId: string, option: string): Promise<ChatResponse> =>
  request
    .post<OperationMessage<ChatResponse>>('/api/ai/chat/clarify', { sessionId, option })
    .then((r) => unwrap(r)!)

/** 波动归因（维度贡献度） */
export const aiInsightAttribute = (metric: string): Promise<AttrRow[]> =>
  request
    .post<OperationMessage<AttrRow[]>>('/api/ai/insight/attribute', { metric })
    .then((r) => unwrap(r) ?? [])
