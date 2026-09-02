import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'
import type { DataSetField } from '@/types/dashboard'

/** 数据集列表项 */
export interface DataSetEntity {
  id: string
  name: string
  dataSetType?: string
  analysisProject?: { id?: string; name?: string }
  createUser?: { id?: string; name?: string; realName?: string }
  createTime?: string
}

/** 数据集类型常量（对应后端 org.datagear.management.domain.DataSetEntity） */
export const DATA_SET_TYPE_SQL = 'SQL'
export const DATA_SET_TYPE_Excel = 'Excel'
export const DATA_SET_TYPE_CsvValue = 'CsvValue'
export const DATA_SET_TYPE_CsvFile = 'CsvFile'
export const DATA_SET_TYPE_JsonValue = 'JsonValue'
export const DATA_SET_TYPE_JsonFile = 'JsonFile'
export const DATA_SET_TYPE_Http = 'Http'

/** 删除数据集（/api/dataSet/delete，批量 ID） */
export async function deleteDataSets(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/dataSet/delete', ids)
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

/** 数据集参数（对应后端 org.datagear.analysis.DataSetParam） */
export interface DataSetParam {
  name: string
  type: string
  required: boolean
  label?: string
  desc?: string
  inputType?: string
  inputPayload?: string
}

/** SQL 数据集表单（对应后端 SqlDataSetEntity） */
export interface SqlDataSetForm {
  id?: string
  name: string
  sql: string
  dataSetType?: string
  mutableModel?: boolean
  params?: DataSetParam[]
  dtbsCnFty: {
    dtbsSource: { id: string; title?: string }
    schemaName?: string | null
    properties?: unknown[]
  }
}

/** 保存 SQL 数据集（新增，/api/dataSet/saveAdd/SQL，OperationMessage） */
export async function saveSqlDataSet(entity: SqlDataSetForm): Promise<unknown> {
  const res = await request.post<OperationMessage>('/api/dataSet/saveAdd/SQL', entity)
  return unwrap(res)
}

/** 保存 SQL 数据集（编辑，/api/dataSet/saveEdit/SQL，OperationMessage） */
export async function saveSqlDataSetEdit(entity: SqlDataSetForm): Promise<unknown> {
  const res = await request.post<OperationMessage>('/api/dataSet/saveEdit/SQL', entity)
  return unwrap(res)
}

/** 获取 SQL 数据集（/api/dataSet/get/{id}，返回 SqlDataSetEntity JSON） */
export async function getSqlDataSet(id: string): Promise<SqlDataSetForm> {
  const res = await request.get<OperationMessage<SqlDataSetForm>>(`/api/dataSet/get/${id}`)
  return unwrap(res)!
}

/** SQL 数据集预览结果（对应后端 TemplateResolvedDataSetResult，裸返回、非 OperationMessage 包装） */
export interface SqlDataSetPreviewResult {
  result?: { data?: unknown[]; additions?: Record<string, unknown> }
  fields?: DataSetField[]
  templateResult?: string
}

/**
 * 预览 SQL 数据集（旧 /dataSet/preview/SQL 端点，裸返回 TemplateResolvedDataSetResult）。
 * 注：该端点仍在旧 DataSetController（/dataSet 前缀，非 /api 前缀），故直接 request.post 而非 unwrap。
 */
export async function previewSqlDataSet(
  entity: SqlDataSetForm,
  options: { view?: boolean; query?: Record<string, unknown> } = {},
): Promise<SqlDataSetPreviewResult> {
  const res = await request.post<SqlDataSetPreviewResult>('/dataSet/preview/SQL', {
    dataSet: entity,
    query: options.query ?? { resultFetchSize: 100, paramValues: {} },
    view: options.view ?? false,
  })
  return res.data
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

/** 通用数据集表单（非 SQL 类型，字段按 dataSetType 填充） */
export interface DataSetForm {
  id?: string
  name: string
  dataSetType?: string
  value?: string
  uri?: string
  requestMethod?: string
  requestContent?: string
  fileName?: string
  encoding?: string
  nameRow?: number
  resultJsonRule: {
    dataJsonPath?: string
    additionJsonPath?: string
  }
  description?: string
  [key: string]: unknown
}

/** 获取数据集（/api/dataSet/get/{id}，返回具体类型实体 JSON） */
export async function getDataSet(id: string): Promise<DataSetForm> {
  const res = await request.get<OperationMessage<DataSetForm>>(`/api/dataSet/get/${id}`)
  return unwrap(res)!
}

/** 保存数据集（新增，旧 /dataSet/saveAdd/{type}，OperationMessage） */
export async function saveDataSetAdd(type: string, entity: DataSetForm): Promise<DataSetForm> {
  const res = await request.post<OperationMessage<DataSetForm>>(`/api/dataSet/saveAdd/${type}`, entity)
  return unwrap(res)!
}

/** 保存数据集（编辑，旧 /dataSet/saveEdit/{type}，OperationMessage） */
export async function saveDataSetEdit(type: string, entity: DataSetForm): Promise<DataSetForm> {
  const res = await request.post<OperationMessage<DataSetForm>>(`/api/dataSet/saveEdit/${type}`, entity)
  return unwrap(res)!
}
