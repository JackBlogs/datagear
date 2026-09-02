import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage } from '@/types'

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

/** 获取数据库驱动列表（/api/driverEntity/list） */
export async function listDriverEntities(): Promise<DriverEntity[]> {
  const res = await request.get<OperationMessage<DriverEntity[]>>('/api/driverEntity/list')
  return unwrap(res) ?? []
}
