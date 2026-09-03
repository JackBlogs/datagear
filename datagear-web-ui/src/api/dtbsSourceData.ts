import request from './request'
import type { OperationMessage, PagingData } from '@/types'

/** 表（SimpleTable） */
export interface SimpleTable {
  name: string
  type?: string
  comment?: string
}

/** 列元信息 */
export interface ColumnMeta {
  name: string
  type: number
  typeName?: string
  nullable: boolean
  comment?: string
  position?: number
}

/** 表结构 */
export interface TableMeta {
  name: string
  columns?: ColumnMeta[]
  readonly?: boolean
}

/** 数据行（列名 -> 值） */
export type DataRow = Record<string, unknown>

/** 表列表（POST /dtbsSource/{id}/pagingQueryTable，裸 PagingData<SimpleTable>） */
export async function listTables(dtbsSourceId: string, keyword = ''): Promise<SimpleTable[]> {
  const res = await request.post<PagingData<SimpleTable>>(`/api/dtbsSource/${dtbsSourceId}/pagingQueryTable`, {
    page: 1,
    pageSize: 500,
    keyword,
  })
  return res.data?.items ?? []
}

/** 表结构（GET /dtbsSource/{id}/table/{tableName}，裸 Table） */
export async function getTable(dtbsSourceId: string, tableName: string): Promise<TableMeta> {
  const res = await request.get<TableMeta>(`/api/dtbsSource/${dtbsSourceId}/table/${tableName}`)
  return res.data
}

/** 表数据分页查询参数（对应后端 org.datagear.persistence.PagingQuery） */
export interface TableDataPagingQuery {
  page: number
  pageSize: number
  keyword?: string
  /** SQL 条件（WHERE 之后的片段） */
  condition?: string
  /** 关键字取反（NOT LIKE） */
  notLike?: boolean
  orders?: { name: string; type: 'ASC' | 'DESC' }[]
}

/** 表数据分页（POST /dtbsSourceData/{id}/{table}/pagingQueryData，裸 PagingData<Row>） */
export async function pagingQueryData(
  dtbsSourceId: string,
  tableName: string,
  query: TableDataPagingQuery,
): Promise<PagingData<DataRow>> {
  const res = await request.post<PagingData<DataRow>>(
    `/api/dtbsSourceData/${dtbsSourceId}/${tableName}/pagingQueryData`,
    query,
  )
  return res.data
}

/**
 * 获取当前查询对应的 SQL（旧端点 /dtbsSourceData/{id}/{table}/getQuerySql，裸返回 {query, sql}）。
 * 核验：/api 版 DtbsSourceDataApiController 未提供该端点，故沿用旧端点（vite proxy 已配 /dtbsSourceData）。
 */
export async function getQuerySql(
  dtbsSourceId: string,
  tableName: string,
  query: { keyword?: string; condition?: string; notLike?: boolean },
): Promise<{ query: unknown; sql: string }> {
  const res = await request.post<{ query: unknown; sql: string }>(
    `/dtbsSourceData/${dtbsSourceId}/${tableName}/getQuerySql`,
    query,
  )
  return res.data
}

/** 新增行（POST /dtbsSourceData/{id}/{table}/saveAdd） */
export async function saveRow(
  dtbsSourceId: string,
  tableName: string,
  row: DataRow,
): Promise<DataRow> {
  const res = await request.post<OperationMessage<DataRow>>(
    `/api/dtbsSourceData/${dtbsSourceId}/${tableName}/saveAdd`,
    row,
  )
  return res.data.data ?? row
}

/** 编辑行（POST /dtbsSourceData/{id}/{table}/saveEdit） */
export async function updateRow(
  dtbsSourceId: string,
  tableName: string,
  originalData: DataRow,
  data: DataRow,
): Promise<DataRow> {
  const res = await request.post<OperationMessage<DataRow>>(
    `/api/dtbsSourceData/${dtbsSourceId}/${tableName}/saveEdit`,
    { originalData, data },
  )
  return res.data.data ?? data
}

/** 删除行（POST /dtbsSourceData/{id}/{table}/delete，行条件数组） */
export async function deleteRows(
  dtbsSourceId: string,
  tableName: string,
  rows: DataRow[],
): Promise<void> {
  await request.post<OperationMessage>(`/api/dtbsSourceData/${dtbsSourceId}/${tableName}/delete`, rows)
}
