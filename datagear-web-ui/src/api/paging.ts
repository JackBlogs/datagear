import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 通用实体记录类型（DataTable 按 field 字符串取值） */
export type EntityRecord = Record<string, unknown> & { id: string }

/**
 * 生成模块分页查询函数：调用 POST /api/{module}/pagingQueryData。
 * 与后端 AbstractEntityApiController / AbstractDataPermissionApiController 对齐。
 */
export function createPagingLoader(module: string) {
  return (query: PagingQuery): Promise<PagingData<EntityRecord>> =>
    request
      .post<OperationMessage<PagingData<EntityRecord>>>(`/api/${module}/pagingQueryData`, query)
      .then(unwrap)
}
