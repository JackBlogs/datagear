import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'
import type { DataSetBind } from '@/types/dashboard'

/** 图表实体（对应后端 HtmlChartWidgetEntity，仅设计器所需字段） */
export interface ChartEntity {
  id: string
  name: string
  pluginVo?: { id: string }
  dataSetBinds?: DataSetBind[]
}

/** 获取图表（/api/chart/get/{id}） */
export async function getChart(id: string): Promise<ChartEntity> {
  const res = await request.get<OperationMessage<ChartEntity>>(`/api/chart/get/${id}`)
  return unwrap(res)!
}

/** 保存图表（旧 /chart/saveEdit 端点，正确处理 DataSetBindVO + 插件装载） */
export async function saveChart(entity: ChartEntity): Promise<void> {
  const body = {
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
  await request.post<OperationMessage>('/chart/saveEdit', body)
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
