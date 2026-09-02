import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 角色实体（对应后端 org.datagear.management.domain.Role） */
export interface Role {
  id: string
  name: string
  description?: string
  enabled: boolean
}

/** 角色列定义元数据 */
export interface ColumnMeta {
  field: string
  header: string
  sortable: boolean
}

export interface RoleMeta {
  module: string
  readonlyAction: boolean
  columns: ColumnMeta[]
}

/** 分页查询角色（OperationMessage<PagingData<Role>> 包装，见 RoleApiController） */
export async function rolePagingQueryData(query: PagingQuery): Promise<PagingData<Role>> {
  const res = await request.post<OperationMessage<PagingData<Role>>>('/api/role/pagingQueryData', query)
  return unwrap(res)
}

/** 获取角色模块元数据 */
export async function roleMeta(): Promise<RoleMeta> {
  const res = await request.get<OperationMessage<RoleMeta>>('/api/role/meta')
  return unwrap(res)
}

/** 获取角色（/api/role/get/{id}） */
export async function getRole(id: string): Promise<Role> {
  const res = await request.get<OperationMessage<Role>>(`/api/role/get/${id}`)
  return unwrap(res)!
}

/** 保存角色（新增或更新，/api/role/save） */
export async function saveRole(entity: Role): Promise<Role> {
  const res = await request.post<OperationMessage<Role>>('/api/role/save', entity)
  return unwrap(res)!
}

/** 删除角色（/api/role/delete，批量 ID） */
export async function deleteRoles(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/role/delete', ids)
}
