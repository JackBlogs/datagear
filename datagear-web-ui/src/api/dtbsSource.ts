import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 数据源实体（对应后端 org.datagear.management.domain.DtbsSource） */
export interface DtbsSource {
  id: string
  title: string
  url: string
  user?: string
  password?: string
  schemaName?: string
  driverEntity?: { id: string; displayName?: string }
  properties?: { name: string; value: string }[]
  createUser?: { id?: string; name?: string; realName?: string; nameLabel?: string }
  createTime?: string
}

/** 数据库驱动实体（对应 org.datagear.connection.DriverEntity） */
export interface DriverEntity {
  id: string
  driverClassName?: string
  displayName?: string
  displayDesc?: string
  databaseName?: string
  displayText?: string
}

export const getDtbsSource = (id: string) => moduleGet<DtbsSource>('dtbsSource', id)
export const saveDtbsSource = (entity: DtbsSource) => moduleSave<DtbsSource>('dtbsSource', entity)
export const deleteDtbsSources = (ids: string[]) => moduleDelete('dtbsSource', ids)

/** 数据源分页查询（POST /api/dtbsSource/pagingQueryData） */
export async function dtbsSourcePagingQueryData(query: PagingQuery): Promise<PagingData<DtbsSource>> {
  const res = await request.post<OperationMessage<PagingData<DtbsSource>>>('/api/dtbsSource/pagingQueryData', query)
  return unwrap(res)
}

/** 测试数据源连接（POST /api/dtbsSource/testConnection） */
export async function testDtbsSourceConnection(entity: DtbsSource): Promise<void> {
  await request.post<OperationMessage>('/api/dtbsSource/testConnection', entity)
}

/** 获取数据库驱动列表（/api/driverEntity/list） */
export async function listDriverEntities(): Promise<DriverEntity[]> {
  const res = await request.get<OperationMessage<DriverEntity[]>>('/api/driverEntity/list')
  return unwrap(res) ?? []
}
