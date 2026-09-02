import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/** 内置 URL 模板（dbType + template + 默认值） */
export interface DbTypeUrlTemplate {
  dbType: string
  template: string
  defaultValue?: { host?: string; port?: string; name?: string }
}

/** 获取内置 JDBC URL 模板（/api/dtbsSourceUrlBuilder/builders） */
export async function getUrlBuilders(): Promise<DbTypeUrlTemplate[]> {
  const res = await request.get<OperationMessage<DbTypeUrlTemplate[]>>('/api/dtbsSourceUrlBuilder/builders')
  return unwrap(res) ?? []
}
