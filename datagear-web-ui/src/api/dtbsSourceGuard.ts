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

/** 防护测试对象（对应后端 org.datagear.management.util.GuardEntity） */
export interface GuardTestEntity {
  url: string
  user?: string
  properties?: { name: string; value: string }[]
}

/**
 * 执行防护测试（POST /dtbsSourceGuard/testExecute，返回 data=boolean 是否允许创建）。
 * 核验：后端无 /api 版端点（DtbsSourceGuardApiController 仅有 delete 等管理端点），
 * 故直接调用旧端点（vite proxy 已配 /dtbsSourceGuard/testExecute）。
 */
export async function testGuardExecute(entity: GuardTestEntity): Promise<boolean> {
  const res = await request.post<OperationMessage<boolean>>('/dtbsSourceGuard/testExecute', entity)
  return unwrap(res) ?? false
}
