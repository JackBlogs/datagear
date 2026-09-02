import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 用户实体（对应后端 org.datagear.management.domain.User） */
export interface User {
  id: string
  name: string
  realName?: string
  email?: string
  admin: boolean
  anonymous: boolean
  createTime?: string
  nameLabel?: string
}

/** 分页查询用户（OperationMessage<PagingData<User>> 包装，见 UserApiController） */
export async function userPagingQueryData(query: PagingQuery): Promise<PagingData<User>> {
  const res = await request.post<OperationMessage<PagingData<User>>>('/api/user/pagingQueryData', query)
  return unwrap(res)
}
