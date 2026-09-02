import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'
import type { DataSign } from '@/types/dashboard'

/** 数据签名规格（对应后端 DataSignSpec） */
export interface DataSignSpec {
  dataSigns?: DataSign[]
}

/** 图表插件详情（对应后端 HtmlChartPluginVo，查看表单所需字段） */
export interface ChartPlugin {
  id: string
  nameLabel?: { value?: string }
  descLabel?: { value?: string }
  version?: string
  apiVersion?: string
  platformVersion?: string
  author?: string
  contact?: string
  issueDate?: string
  hasManual?: boolean
  dataSignSpec?: DataSignSpec
}

/** 获取图表插件详情（对应 /api/chartPlugin/get/{id}） */
export async function getChartPlugin(id: string): Promise<ChartPlugin> {
  const res = await request.get<OperationMessage<ChartPlugin>>(`/api/chartPlugin/get/${id}`)
  return unwrap(res)!
}

/** 获取图表插件使用手册内容（/chartPlugin/manualContent/{id}，原始文本） */
export async function getChartPluginManualContent(id: string): Promise<string> {
  const res = await request.get<string>(`/chartPlugin/manualContent/${encodeURIComponent(id)}`, {
    responseType: 'text',
  })
  return res.data ?? ''
}

/** 获取图表插件的数据签名（对应 /api/chartPlugin/dataSigns/{id}） */
export async function getChartPluginDataSigns(pluginId: string): Promise<DataSign[]> {
  const res = await request.get<OperationMessage<DataSignSpec>>(`/api/chartPlugin/dataSigns/${pluginId}`)
  return unwrap(res)?.dataSigns ?? []
}

/** 图表插件列表项 */
export interface ChartPluginItem {
  id: string
  name: string
}

/** 获取图表插件列表（对应 /api/chartPlugin/list） */
export async function listChartPlugins(): Promise<ChartPluginItem[]> {
  const res = await request.get<OperationMessage<ChartPluginItem[]>>('/api/chartPlugin/list')
  return unwrap(res) ?? []
}

/** 删除图表插件（/api/chartPlugin/delete） */
export async function deleteChartPlugins(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/chartPlugin/delete', ids)
}

/** 上传插件文件（/chartPlugin/uploadFile，multipart）→ 返回临时文件名 + 插件信息 */
export async function uploadChartPluginFile(file: File): Promise<{ pluginFileName: string; pluginInfos: unknown[] }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await request.post<{ pluginFileName: string; pluginInfos: unknown[] }>(
    '/api/chartPlugin/uploadFile',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

/** 保存上传（/chartPlugin/saveUpload） */
export async function saveChartPluginUpload(pluginFileName: string): Promise<void> {
  await request.post<OperationMessage>('/api/chartPlugin/saveUpload', { pluginFileName })
}
