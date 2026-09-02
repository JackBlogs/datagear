import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'
import type { DataSetField } from '@/types/dashboard'

/** 数据集列表项 */
export interface DataSetEntity {
  id: string
  name: string
  createTime?: string
}

/** 数据集概要（含字段，供数据绑定映射数据签名） */
export interface ProfileDataSet {
  id: string
  name: string
  fields?: DataSetField[]
  params?: unknown[]
}

/** 数据集分页（OperationMessage<PagingData<DataSetEntity>>） */
export async function dataSetPagingQueryData(query: PagingQuery): Promise<PagingData<DataSetEntity>> {
  const res = await request.post<OperationMessage<PagingData<DataSetEntity>>>(
    '/api/dataSet/pagingQueryData',
    query,
  )
  return unwrap(res)
}

/** 数据集概要（含字段，OperationMessage<List<ProfileDataSet>>） */
export async function getProfileDataSetByIds(ids: string[]): Promise<ProfileDataSet[]> {
  if (!ids.length) return []
  const res = await request.get<OperationMessage<ProfileDataSet[]>>('/api/dataSet/getProfileDataSetByIds', {
    params: { id: ids },
  })
  return unwrap(res) ?? []
}

/** SQL 数据集表单（对应后端 SqlDataSetEntity，仅必填字段） */
export interface SqlDataSetForm {
  name: string
  sql: string
  connectionFactory: {
    dtbsSource: { id: string }
    schemaName?: string | null
    properties?: unknown[]
  }
}

/** 保存 SQL 数据集（旧 /dataSet/saveAdd/SQL 端点，OperationMessage） */
export async function saveSqlDataSet(entity: SqlDataSetForm): Promise<unknown> {
  const res = await request.post<OperationMessage>('/dataSet/saveAdd/SQL', entity)
  return unwrap(res)
}

/** 解析 SQL 数据集模板（/api/dataSet/resolveSql，返回解析后的 SQL） */
export async function resolveSql(sql: string): Promise<string> {
  const res = await request.post<OperationMessage<string>>('/api/dataSet/resolveSql', {
    sql,
    dataSetParams: [],
    paramValues: {},
  })
  return unwrap(res) ?? ''
}
