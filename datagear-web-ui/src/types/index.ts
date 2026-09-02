/**
 * 与后端契约对齐的类型定义。
 * 后端：OperationMessage.java（阶段二泛型化为 OperationMessage<T>）、PagingData.java、
 * ModulePermissions.java、AuthApiController。
 */

export type MessageType = 'SUCCESS' | 'FAIL'

/** 统一响应包装（后端 OperationMessage<T>，Jackson 同时序列化 isSuccess()/isFail() 为 success/fail） */
export interface OperationMessage<T = unknown> {
  type: MessageType
  code: string
  message: string
  detail?: string | null
  throwableDetail?: boolean
  data?: T
  /** isSuccess() 序列化字段 */
  success?: boolean
  /** isFail() 序列化字段 */
  fail?: boolean
}

/** 分页数据 */
export interface PagingData<T> {
  total: number
  items: T[]
  pages: number
  page: number
  pageSize: number
}

/** 排序项（对应后端 org.datagear.util.query.Order） */
export interface Order {
  name: string
  type: 'ASC' | 'DESC'
}

/** 分页查询请求参数（对应后端 DataFilterPagingQuery） */
export interface PagingQuery {
  page: number
  pageSize: number
  keyword?: string
  orders?: Order[]
  [key: string]: unknown
}

/** 模块权限（ModulePermission） */
export interface ModulePermission {
  accessor: boolean
  operator: boolean
  visible: boolean
}

/** 模块权限集（ModulePermissions） */
export interface ModulePermissions {
  dtbsSourcePermission: ModulePermission
  analysisProjectPermission: ModulePermission
  dataSetPermission: ModulePermission
  chartPermission: ModulePermission
  dashboardPermission: ModulePermission
}

/** 用户信息（User 子对象） */
export interface UserInfo {
  id: string
  name: string
  realName?: string
  admin?: boolean
  anonymous: boolean
}

/** GET /api/auth/me 的 data 结构 */
export interface AuthMe {
  user: UserInfo
  roles: string[]
  anonymous: boolean
  readonlyAction: boolean
  modulePermissions: ModulePermissions
}
