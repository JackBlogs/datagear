import request, { unwrap } from './request'
import { moduleDelete, moduleSave } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 看板实体（对应后端 HtmlTplDashboardWidgetEntity） */
export interface DashboardEntity {
  id: string
  name: string
  /** 看板 API 版本（"1.0" / "2.0"，新建默认 "2.0"） */
  apiVersion?: string
  /** 所属分析项目（引用） */
  analysisProject?: { id?: string; name?: string }
  description?: string
  createUser?: { id?: string; name?: string; realName?: string }
  createTime?: string | number
  firstTemplate?: string
  templates?: Record<string, string>
}

/** 看板列表项（分页查询结果，对应 HtmlTplDashboardWidgetEntity 列表投影） */
export interface DashboardListItem {
  id: string
  name: string
  apiVersion?: string
  analysisProject?: { id?: string; name?: string }
  createUser?: { id?: string; name?: string; realName?: string }
  createTime?: string | number
}

/** 获取看板（/api/dashboard/get/{id}） */
export async function getDashboard(id: string): Promise<DashboardEntity> {
  const res = await request.get<OperationMessage<DashboardEntity>>(`/api/dashboard/get/${id}`)
  return unwrap(res)!
}

/** 保存看板（新增或更新，/api/dashboard/save） */
export const saveDashboard = (entity: DashboardEntity) => moduleSave<DashboardEntity>('dashboard', entity)

/** 看板分页查询（POST /api/dashboard/pagingQueryData） */
export async function dashboardPagingQueryData(query: PagingQuery): Promise<PagingData<DashboardListItem>> {
  const res = await request.post<OperationMessage<PagingData<DashboardListItem>>>(
    '/api/dashboard/pagingQueryData',
    query,
  )
  return unwrap(res)
}

/** 删除看板（POST /api/dashboard/delete，批量 ID） */
export const deleteDashboards = (ids: string[]) => moduleDelete('dashboard', ids)

/** 看板资源内容（旧 /dashboard/getResourceContent，裸 Map） */
export interface DashboardResource {
  resourceExists: boolean
  resourceContent: string
  resourceName: string
  id: string
}

/** 获取看板模板内容 */
export async function getDashboardResourceContent(id: string, resourceName = 'index.html'): Promise<DashboardResource> {
  const res = await request.get<DashboardResource>('/api/dashboard/getResourceContent', {
    params: { id, resourceName },
  })
  return res.data
}

/** 保存看板模板内容（旧 /dashboard/saveResourceContent，表单 POST） */
export async function saveDashboardResourceContent(id: string, resourceName: string, content: string): Promise<void> {
  const form = new URLSearchParams()
  form.append('id', id)
  form.append('resourceName', resourceName)
  form.append('resourceContent', content)
  form.append('isTemplate', 'true')
  await request.post('/api/dashboard/saveResourceContent', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

/** 看板分享设置（对应后端 DashboardShareSet） */
export interface DashboardShareSet {
  id: string
  enablePassword: boolean
  anonymousPassword: boolean
  password?: string
}

/** 获取看板分享设置（/api/dashboard/shareSet/{id}） */
export async function getDashboardShareSet(id: string): Promise<DashboardShareSet> {
  const res = await request.get<OperationMessage<DashboardShareSet>>(`/api/dashboard/shareSet/${id}`)
  return unwrap(res)!
}

/** 保存看板分享设置（/api/dashboard/shareSet） */
export async function saveDashboardShareSet(entity: DashboardShareSet): Promise<void> {
  await request.post<OperationMessage>('/api/dashboard/shareSet', entity)
}

/** 上传看板导入文件（/dashboard/uploadImportFile，multipart）→ 返回临时文件名/名称/模板 */
export async function uploadDashboardImportFile(
  file: File,
): Promise<{ dashboardName: string; dashboardFileName: string; templates: string[] }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await request.post<{ dashboardName: string; dashboardFileName: string; templates: string[] }>(
    '/api/dashboard/uploadImportFile',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

/** 保存看板导入（/dashboard/saveImport） */
export async function saveDashboardImport(form: {
  name: string
  template: string
  dashboardFileName: string
  apiVersion?: string
}): Promise<unknown> {
  const res = await request.post<OperationMessage>('/api/dashboard/saveImport', {
    ...form,
    apiVersion: form.apiVersion ?? '2.0',
  })
  return res.data.data
}

/** 解析看板模板中的图表挂件（dg-chart-widget="chartId"） */
export function parseChartWidgets(html: string): string[] {
  const re = /dg-chart-widget="([^"]*)"/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) out.push(m[1] ?? '')
  return out
}

/** 用新图表挂件列表重建模板 HTML（值替换，保持原顺序） */
export function rebuildChartWidgets(html: string, widgets: string[]): string {
  let i = 0
  return html.replace(/dg-chart-widget="([^"]*)"/g, () => `dg-chart-widget="${widgets[i++] ?? ''}"`)
}

/** 按 widgets 顺序重建图表挂件 div（支持拖拽重排：拆出所有挂件 div 后按新顺序重建） */
export function reorderChartWidgets(html: string, widgets: string[]): string {
  const WIDGET_RE = /<div[^>]*dg-chart-widget="[^"]*"[^>]*>\s*<\/div>/g
  const parts = html.split(WIDGET_RE)
  let result = parts[0] ?? ''
  for (let i = 0; i < widgets.length; i++) {
    result += `<div class="chart" dg-chart-widget="${widgets[i] ?? ''}"></div>`
    result += parts[i + 1] ?? ''
  }
  return result
}
