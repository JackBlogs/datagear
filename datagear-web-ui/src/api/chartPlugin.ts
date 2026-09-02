import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'
import type { DataSign } from '@/types/dashboard'

/** 数据签名规格（对应后端 DataSignSpec） */
export interface DataSignSpec {
  dataSigns?: DataSign[]
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
