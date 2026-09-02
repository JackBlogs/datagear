import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/**
 * 通用实体 CRUD（与后端 AbstractEntityApiController / AbstractDataPermissionApiController 对齐）。
 * 适用于 role / user 之外的简单实体模块（analysisProject / fileSource / dtbsSourceGuard 等）。
 */

/** 获取实体（/api/{module}/get/{id}） */
export function moduleGet<T>(module: string, id: string): Promise<T> {
  return request.get<OperationMessage<T>>(`/api/${module}/get/${id}`).then((r) => unwrap(r)!)
}

/** 保存实体（新增或更新，/api/{module}/save） */
export function moduleSave<T>(module: string, entity: T): Promise<T> {
  return request.post<OperationMessage<T>>(`/api/${module}/save`, entity).then((r) => unwrap(r)!)
}

/** 删除实体（/api/{module}/delete，批量 ID） */
export function moduleDelete(module: string, ids: string[]): Promise<void> {
  return request.post<OperationMessage>(`/api/${module}/delete`, ids).then(() => undefined)
}
