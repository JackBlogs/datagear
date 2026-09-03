import request, { unwrap } from './request'
import { moduleDelete, moduleSave } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/**
 * 语义层指标 API（对应后端 MetricApiController，/api/metric 前缀）。
 */

/** 指标实体（对应后端 MetricEntity） */
export interface MetricEntity {
  id: string
  name: string
  /** 口径说明 */
  caliber: string
  /** atomic / derived */
  metricType: 'atomic' | 'derived' | string
  /** 数据源 ID */
  sourceId: string
  /** 物理表名 */
  tableName: string
  /** 数值字段（COUNT 可为 "*"） */
  valueField: string
  /** SUM/AVG/COUNT/COUNT_DISTINCT/MAX/MIN */
  aggType: string
  /** 维度字段 JSON 数组字符串，如 '["REGION"]' */
  dimensionsJson: string
  /** 时间字段（可选） */
  timeField: string
  /** 业务域 */
  bizDomain: string
  /** 负责人 */
  owner: string
  /** 0/1 已认证 */
  certified: number
  createTime?: string
  createUserId?: string
}

/** 指标版本 */
export interface MetricVersion {
  id: string
  metricId: string
  versionNo: number
  snapshot: string
  changeNote: string
  createTime?: string
  createUserId?: string
}

/** 指标查询请求 */
export interface MetricQueryForm {
  dimensions?: string[]
  filters?: { field: string; op: string; value: unknown }[]
  orderBy?: string
  orderAsc?: boolean
  limit?: number
}

/** 指标查询结果（对应后端 MetricQueryEngine.MetricQueryResult） */
export interface MetricQueryResult {
  columns: string[]
  rows: unknown[][]
  sql: string
  costMs: number
}

export const AGG_OPTIONS = [
  { value: 'SUM', label: '求和 SUM' },
  { value: 'AVG', label: '平均 AVG' },
  { value: 'COUNT', label: '计数 COUNT' },
  { value: 'COUNT_DISTINCT', label: '去重计数 COUNT DISTINCT' },
  { value: 'MAX', label: '最大 MAX' },
  { value: 'MIN', label: '最小 MIN' },
]

/** 分页查询指标 */
export async function metricPagingQueryData(query: PagingQuery): Promise<PagingData<MetricEntity>> {
  const res = await request.post<OperationMessage<PagingData<MetricEntity>>>('/api/metric/pagingQueryData', query)
  return unwrap(res)
}

/** 获取指标 */
export const getMetric = (id: string) => moduleGetMetric(id)

function moduleGetMetric(id: string): Promise<MetricEntity> {
  return request.get<OperationMessage<MetricEntity>>(`/api/metric/get/${id}`).then((r) => unwrap(r)!)
}

/** 保存指标（新增或更新） */
export const saveMetric = (entity: MetricEntity) => moduleSave<MetricEntity>('metric', entity)

/** 删除指标（批量） */
export const deleteMetrics = (ids: string[]) => moduleDelete('metric', ids)

/** 认证 / 取消认证 */
export async function certifyMetric(id: string, certified: boolean, note = ''): Promise<void> {
  await request.post<OperationMessage>(`/api/metric/certify/${id}`, { certified, note })
}

/** 指标版本历史 */
export async function listMetricVersions(id: string): Promise<MetricVersion[]> {
  const res = await request.get<OperationMessage<MetricVersion[]>>(`/api/metric/versions/${id}`)
  return unwrap(res) ?? []
}

/** 指标查询（分组聚合） */
export async function queryMetric(id: string, query: MetricQueryForm): Promise<MetricQueryResult> {
  const res = await request.post<OperationMessage<MetricQueryResult>>(`/api/metric/query/${id}`, query)
  return unwrap(res)!
}

/** 指标单值查询（指标卡当前值） */
export async function queryMetricValue(
  id: string,
  query: MetricQueryForm = {},
): Promise<{ value: unknown; sql: string; costMs: number }> {
  const res = await request.post<OperationMessage<{ value: unknown; sql: string; costMs: number }>>(
    `/api/metric/queryValue/${id}`,
    query,
  )
  return unwrap(res)!
}

/** 指标试算（定义未落库，向导预览用） */
export async function previewMetric(metric: MetricEntity, query: MetricQueryForm): Promise<MetricQueryResult> {
  const res = await request.post<OperationMessage<MetricQueryResult>>('/api/metric/preview', { metric, query })
  return unwrap(res)!
}
