import request, { unwrap } from './request'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'
import type { DataSetBind } from '@/types/dashboard'

/** 图表插件简要信息（对应后端 HtmlChartPluginVo，仅列表展示所需字段） */
export interface ChartPluginVo {
  id?: string
  nameLabel?: { value?: string; localeValues?: Record<string, string> }
}

/** 图表实体（对应后端 HtmlChartWidgetEntity，仅设计器 + 列表所需字段） */
export interface ChartEntity {
  id: string
  name: string
  pluginVo?: ChartPluginVo
  updateInterval?: number
  analysisProject?: { id?: string; name?: string }
  createUser?: { id?: string; name?: string; realName?: string }
  createTime?: string | number
  dataSetBinds?: DataSetBind[]
}

/** 获取图表（/api/chart/get/{id}） */
export async function getChart(id: string): Promise<ChartEntity> {
  const res = await request.get<OperationMessage<ChartEntity>>(`/api/chart/get/${id}`)
  return unwrap(res)!
}

function toSaveBody(entity: ChartEntity): Record<string, unknown> {
  return {
    id: entity.id,
    name: entity.name,
    pluginVo: entity.pluginVo,
    dataSetBindVOs: (entity.dataSetBinds ?? []).map((b) => ({
      summaryDataSetEntity: b.dataSet ? { id: b.dataSet.id, name: b.dataSet.name } : undefined,
      dataSetSigns: b.dataSetSigns ?? [],
      fieldSigns: b.fieldSigns ?? {},
      alias: b.alias ?? '',
      fieldAliases: b.fieldAliases ?? {},
      fieldOrders: b.fieldOrders ?? {},
    })),
  }
}

/** 新增图表（POST /api/chart/saveAdd） */
export async function saveAddChart(entity: ChartEntity): Promise<ChartEntity> {
  const res = await request.post<OperationMessage<ChartEntity>>('/api/chart/saveAdd', toSaveBody(entity))
  return unwrap(res)!
}

/** 保存图表（旧 /chart/saveEdit 端点，正确处理 DataSetBindVO + 插件装载） */
export async function saveChart(entity: ChartEntity): Promise<void> {
  await request.post<OperationMessage>('/api/chart/saveEdit', toSaveBody(entity))
}

/** 图表分页查询（POST /api/chart/pagingQueryData） */
export async function chartPagingQueryData(query: PagingQuery): Promise<PagingData<ChartEntity>> {
  const res = await request.post<OperationMessage<PagingData<ChartEntity>>>('/api/chart/pagingQueryData', query)
  return unwrap(res)
}

/** 删除图表（POST /api/chart/delete，批量 ID） */
export async function deleteCharts(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/chart/delete', ids)
}

/** 图表预览数据（/api/chart/preview/{id} 执行结果，供前端 ECharts 渲染，脱离 iframe） */
export interface ChartPreviewData {
  pluginId?: string | null
  columns: string[]
  rows: Array<Record<string, unknown>>
  dataSetSigns: string[]
  fieldSigns: Record<string, string[]>
}

/** 执行图表数据（/api/chart/preview/{id}） */
export async function previewChart(id: string): Promise<ChartPreviewData> {
  const res = await request.get<OperationMessage<ChartPreviewData>>(`/api/chart/preview/${id}`)
  return unwrap(res)!
}
