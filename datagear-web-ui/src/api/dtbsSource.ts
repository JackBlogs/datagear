import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 数据源实体（对应后端 org.datagear.management.domain.DtbsSource） */
export interface DtbsSource {
  id: string
  title: string
  url: string
  user?: string
  password?: string
  schemaName?: string
  driverEntity?: { id: string; displayName?: string }
  properties?: { name: string; value: string }[]
  createUser?: { id?: string; name?: string; realName?: string; nameLabel?: string }
  createTime?: string
}

/** 数据库驱动实体（对应 org.datagear.connection.DriverEntity） */
export interface DriverEntity {
  id: string
  driverClassName?: string
  displayName?: string
  displayDesc?: string
  databaseName?: string
  displayText?: string
}

export const getDtbsSource = (id: string) => moduleGet<DtbsSource>('dtbsSource', id)
export const saveDtbsSource = (entity: DtbsSource) => moduleSave<DtbsSource>('dtbsSource', entity)
export const deleteDtbsSources = (ids: string[]) => moduleDelete('dtbsSource', ids)

/** 数据源分页查询（POST /api/dtbsSource/pagingQueryData） */
export async function dtbsSourcePagingQueryData(query: PagingQuery): Promise<PagingData<DtbsSource>> {
  const res = await request.post<OperationMessage<PagingData<DtbsSource>>>('/api/dtbsSource/pagingQueryData', query)
  return unwrap(res)
}

/** 测试数据源连接（POST /api/dtbsSource/testConnection） */
export async function testDtbsSourceConnection(entity: DtbsSource): Promise<void> {
  await request.post<OperationMessage>('/api/dtbsSource/testConnection', entity)
}

/** 数据源表数量（POST /api/dtbsSource/{id}/pagingQueryTable，取 total） */
export async function getDtbsSourceTableCount(id: string): Promise<number> {
  const res = await request.post<PagingData<unknown>>(`/api/dtbsSource/${id}/pagingQueryTable`, {
    page: 1,
    pageSize: 1,
  })
  return res.data?.total ?? 0
}

/** 数据库产品信息（对应旧版 /dtbsSource/dbinfo 页） */
export interface DtbsSourceDbInfo {
  /** 数据库产品名 */
  name?: string
  /** 驱动名 */
  driverName?: string
  /** 支持的表类型 */
  tableTypes?: string[]
}

/**
 * 获取数据库信息。
 * 核验结论（2026-09 实测）：后端无 /api 版 JSON 端点；旧版 GET /dtbsSource/dbinfo?id=
 * 对应的服务端渲染模板（dtbsSource_dbinfo.ftl）已下线（移至 deprecated/），
 * 当前该路径返回 SPA index.html 而非旧页面，无法取得数据库产品名/表类型。
 * 保留对旧页面内嵌 formModel JSON 的解析尝试（若后端恢复旧页仍可用），
 * 解析失败时抛出错误，由调用方降级展示（URL 推导信息 + 不可用说明）。
 */
export async function getDtbsSourceDbInfo(id: string): Promise<DtbsSourceDbInfo> {
  const res = await request.get<string>('/dtbsSource/dbinfo', {
    params: { id },
    responseType: 'text',
  })
  const html = String(res.data ?? '')
  const m = html.match(/\$\.unescapeHtmlForJson\((\{[\s\S]*?\})\s*\)/)
  if (!m) throw new Error('后端暂无数据库信息 JSON 端点（旧页面已下线）')
  // 还原 HTML 实体（writeJson 输出经 HTML 转义）
  const text = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  return JSON.parse(text) as DtbsSourceDbInfo
}

/** 获取数据库驱动列表（/api/driverEntity/list） */
export async function listDriverEntities(): Promise<DriverEntity[]> {
  const res = await request.get<OperationMessage<DriverEntity[]>>('/api/driverEntity/list')
  return unwrap(res) ?? []
}
