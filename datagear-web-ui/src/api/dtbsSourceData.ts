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
  const res = await request.post<PagingData<SimpleTable>>(`/dtbsSource/${dtbsSourceId}/pagingQueryTable`, {
    page: 1,
    pageSize: 500,
    keyword,
  })
  return res.data?.items ?? []
}

/** 表结构（GET /dtbsSource/{id}/table/{tableName}，裸 Table） */
export async function getTable(dtbsSourceId: string, tableName: string): Promise<TableMeta> {
  const res = await request.get<TableMeta>(`/dtbsSource/${dtbsSourceId}/table/${tableName}`)
  return res.data
}

/** 表数据分页（POST /dtbsSourceData/{id}/{table}/pagingQueryData，裸 PagingData<Row>） */
export async function pagingQueryData(
  dtbsSourceId: string,
  tableName: string,
  page: number,
  pageSize: number,
): Promise<PagingData<DataRow>> {
  const res = await request.post<PagingData<DataRow>>(
    `/dtbsSourceData/${dtbsSourceId}/${tableName}/pagingQueryData`,
    { page, pageSize },
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
    `/dtbsSourceData/${dtbsSourceId}/${tableName}/saveAdd`,
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
    `/dtbsSourceData/${dtbsSourceId}/${tableName}/saveEdit`,
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
  await request.post<OperationMessage>(`/dtbsSourceData/${dtbsSourceId}/${tableName}/delete`, rows)
}
