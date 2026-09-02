import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 数据源防护实体（对应后端 org.datagear.management.domain.DtbsSourceGuard） */
export interface DtbsSourceGuard {
  id: string
  name: string
  pattern: string
  userPattern?: string
  propertyPatterns?: { namePattern: string; valuePattern: string }[]
  propertiesMatchMode?: string
  emptyPropertyPatternsForAll?: boolean
  priority?: number
  permitted: boolean
  enabled: boolean
}

export const getDtbsSourceGuard = (id: string) => moduleGet<DtbsSourceGuard>('dtbsSourceGuard', id)
export const saveDtbsSourceGuard = (entity: DtbsSourceGuard) => moduleSave<DtbsSourceGuard>('dtbsSourceGuard', entity)
export const deleteDtbsSourceGuards = (ids: string[]) => moduleDelete('dtbsSourceGuard', ids)

/** 数据源防护分页查询（POST /api/dtbsSourceGuard/pagingQueryData） */
export async function dtbsSourceGuardPagingQueryData(query: PagingQuery): Promise<PagingData<DtbsSourceGuard>> {
  const res = await request.post<OperationMessage<PagingData<DtbsSourceGuard>>>('/api/dtbsSourceGuard/pagingQueryData', query)
  return unwrap(res)
}
