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
