import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 用户角色（仅 ID + 名称） */
export interface UserRole {
  id: string
  name?: string
}

/** 用户实体（对应后端 org.datagear.management.domain.User） */
export interface User {
  id: string
  name: string
  realName?: string
  email?: string
  password?: string
  admin: boolean
  anonymous: boolean
  createTime?: string
  nameLabel?: string
  roles?: UserRole[]
}

/** 分页查询用户（OperationMessage<PagingData<User>> 包装，见 UserApiController） */
export async function userPagingQueryData(query: PagingQuery): Promise<PagingData<User>> {
  const res = await request.post<OperationMessage<PagingData<User>>>('/api/user/pagingQueryData', query)
  return unwrap(res)
}

/** 获取用户（/api/user/get/{id}，密码已清除） */
export async function getUser(id: string): Promise<User> {
  const res = await request.get<OperationMessage<User>>(`/api/user/get/${id}`)
  return unwrap(res)!
}

/** 保存用户（新增或更新，/api/user/save） */
export async function saveUser(entity: User): Promise<User> {
  const res = await request.post<OperationMessage<User>>('/api/user/save', entity)
  return unwrap(res)!
}

/** 删除用户（/api/user/delete，业务数据迁移至目标用户） */
export async function deleteUsers(ids: string[], migrateToId: string): Promise<void> {
  await request.post<OperationMessage>('/api/user/delete', { ids, migrateToId })
}

/** 管理员修改用户密码（旧 /user/saveEditPsd，字段 id + password） */
export async function changeUserPassword(id: string, password: string): Promise<void> {
  await request.post<OperationMessage>('/api/user/password', { id, password })
}
