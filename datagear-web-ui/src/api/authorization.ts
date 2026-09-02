import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/** 授权实体（对应 org.datagear.management.domain.Authorization） */
export interface Authorization {
  id: string
  resource: string
  resourceType: string
  principal: string
  principalType: string
  permission: number
  enabled: boolean
  principalName?: string
  permissionLabel?: string
}

/** 授权资源元信息（权限选项） */
export interface AuthorizationMeta {
  resourceType: string
  resource: string
  permissions: { permission: number; label: string }[]
}

export const PRINCIPAL_TYPE_USER = 'USER'
export const PRINCIPAL_TYPE_ROLE = 'ROLE'
export const PRINCIPAL_TYPE_ALL = 'ALL'
export const PRINCIPAL_TYPE_ANONYMOUS = 'ANONYMOUS'
export const PRINCIPAL_ALL = 'all'
export const PRINCIPAL_ANONYMOUS = 'anonymous'

export async function getAuthorizationMeta(resourceType: string, resource: string): Promise<AuthorizationMeta> {
  const res = await request.get<OperationMessage<AuthorizationMeta>>(
    `/api/authorization/${resourceType}/${resource}/meta`,
  )
  return unwrap(res)!
}

export async function listAuthorizations(resourceType: string, resource: string): Promise<Authorization[]> {
  const res = await request.get<OperationMessage<Authorization[]>>(
    `/api/authorization/${resourceType}/${resource}/list`,
  )
  return unwrap(res) ?? []
}

export async function saveAuthorization(
  resourceType: string,
  resource: string,
  entity: Authorization,
): Promise<Authorization> {
  const res = await request.post<OperationMessage<Authorization>>(
    `/api/authorization/${resourceType}/${resource}/save`,
    entity,
  )
  return unwrap(res)!
}

export async function deleteAuthorizations(
  resourceType: string,
  resource: string,
  ids: string[],
): Promise<void> {
  await request.post<OperationMessage>(`/api/authorization/${resourceType}/${resource}/delete`, ids)
}
