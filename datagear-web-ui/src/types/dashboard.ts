/**
 * 看板/图表设计器数据绑定模型。
 * 对应后端：DataSign.java、DataSetBind.java、DataSignSpec.java、ChartDefinition。
 */

/** 数据签名（图表的数据槽位） */
export interface DataSign {
  name: string
  fullname: string
  /** 绑定目标：field（字段级）/ dataset（数据集级） */
  targets: string[]
  required: boolean
  multiple: boolean
  children?: DataSign[]
  additions?: Record<string, unknown>
  /** 国际化显示名 */
  nameLabel?: { value: string }
  descLabel?: { value: string }
}

/** 数据签名的显示名（优先国际化 nameLabel） */
export function dataSignLabel(sign: DataSign): string {
  return sign.nameLabel?.value ?? sign.name
}

/** 数据集字段 */
export interface DataSetField {
  name: string
  fullname?: string
  type?: string
  label?: string
}

/** 字段标识（嵌套字段用 fullname，顶层用 name） */
export function fieldKey(f: DataSetField): string {
  return f.fullname ?? f.name
}

/** 数据集（简化） */
export interface DataSet {
  id: string
  name: string
  fields?: DataSetField[]
}

/** 数据绑定（对应 DataSetBind） */
export interface DataSetBind {
  dataSet?: DataSet
  /** 数据集级绑定的数据签名 */
  dataSetSigns?: string[]
  /** 字段名 -> 数据签名列表（字段级绑定） */
  fieldSigns?: Record<string, string[]>
  alias?: string
  fieldAliases?: Record<string, string>
  fieldOrders?: Record<string, number>
  query?: Record<string, unknown>
}

/** 图表样式（对应 HtmlChartWidget 的基础样式字段） */
export interface ChartStyle {
  name?: string
  title?: string
  width?: number
  height?: number
  backgroundColor?: string
}

/** 图表交互（对应 ECharts 常用交互选项） */
export interface ChartInteraction {
  showTooltip?: boolean
  showLegend?: boolean
  showDataZoom?: boolean
}

/** 图表表单模型（图表属性面板的整体 v-model） */
export interface ChartModel {
  pluginId?: string
  dataSetBinds: DataSetBind[]
  style: ChartStyle
  interaction: ChartInteraction
}

export function newChartModel(): ChartModel {
  return { dataSetBinds: [{ fieldSigns: {} }], style: {}, interaction: {} }
}

/** 扁平化后的数据签名（含层级路径） */
export interface FlatDataSign extends DataSign {
  depth: number
}

/** 将数据签名树扁平化（用于渲染字段选择列表） */
export function flattenDataSigns(signs: DataSign[], depth = 0): FlatDataSign[] {
  const out: FlatDataSign[] = []
  for (const s of signs ?? []) {
    out.push({ ...s, depth })
    if (s.children?.length) out.push(...flattenDataSigns(s.children, depth + 1))
  }
  return out
}

export const TARGET_FIELD = 'field'
export const TARGET_DATASET = 'dataset'

/** 判断数据签名是否可用于字段级绑定（fieldSigns） */
export function isFieldTarget(sign: DataSign): boolean {
  return !sign.targets || sign.targets.length === 0 || sign.targets.includes(TARGET_FIELD)
}

/** 判断数据签名是否可用于数据集级绑定（dataSetSigns） */
export function isDatasetTarget(sign: DataSign): boolean {
  return !!sign.targets?.includes(TARGET_DATASET)
}
