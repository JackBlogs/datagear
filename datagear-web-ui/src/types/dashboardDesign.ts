/**
 * 看板可视化设计器数据模型（对齐原型 designer.html 三栏设计器）。
 *
 * 设计产物（DashboardDesign）会被序列化为看板 index.html 资源内容持久化，
 * 展示页从该资源解析并渲染，全程脱离 iframe，复用后端 TplDashboardWidgetResManager。
 */

/** 部件类型 */
export type WidgetType =
  | 'chart'
  | 'kpi'
  | 'table'
  | 'title'
  | 'text'
  | 'divider'
  | 'image'
  | 'iframe'
  | 'filter'
  | 'gauge'
  | 'radar'
  | 'progress'
  | 'funnel'
  | 'tab'
  | 'map'

/** 画布断点 */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

/** 单个看板部件（绝对定位 + 数据 + 样式 + 联动） */
export interface DgWidget {
  id: string
  type: WidgetType
  /** 显示名 */
  name: string
  /** 画布坐标与尺寸（px） */
  x: number
  y: number
  w: number
  h: number
  /** 图表部件绑定的图表 id */
  chartId?: string
  /** 数据配置（数据集/维度/度量/过滤/刷新频率/行级权限继承） */
  data?: {
    dataset?: string
    dims?: string[]
    measures?: string[]
    filter?: string
    refresh?: number
    inheritRowAuth?: boolean
  }
  /** 样式配置 */
  style?: {
    title?: string
    theme?: string
    radius?: number
    opacity?: number
    fontSize?: 'small' | 'medium' | 'large'
    showTrend?: boolean
    showMini?: boolean
    color?: string
  }
  /** 联动配置（点击过滤/下钻/悬停浮层） */
  link?: {
    filters?: string[]
    drill?: string
    hover?: string
  }
  /** 文本类部件内容 */
  text?: string
  /** KPI 数值 */
  value?: number | string
  unit?: string
  /** KPI 环比（百分比，正值上涨） */
  trend?: number
  meta?: Record<string, unknown>
}

/** 设计器画布配置 */
export interface DashboardDesign {
  version: '1.0'
  canvas: {
    width: number
    height: number
    breakpoint: Breakpoint
    columns: number
    padding: number
    gap: number
  }
  widgets: DgWidget[]
}

/** 新建一份空设计 */
export function newDesign(breakpoint: Breakpoint = 'desktop'): DashboardDesign {
  const [width, height] = breakpointSize(breakpoint)
  return {
    version: '1.0',
    canvas: { width, height, breakpoint, columns: 12, padding: 24, gap: 16 },
    widgets: [],
  }
}

/** 新建一份空的数据大屏设计（固定 1920×1080 舞台） */
export function newScreenDesign(): DashboardDesign {
  return {
    version: '1.0',
    canvas: { width: 1920, height: 1080, breakpoint: 'desktop', columns: 12, padding: 24, gap: 16 },
    widgets: [],
  }
}

/** 各断点画布尺寸（px） */
export function breakpointSize(bp: Breakpoint): [number, number] {
  switch (bp) {
    case 'tablet':
      return [768, 900]
    case 'mobile':
      return [375, 720]
    case 'desktop':
    default:
      return [1440, 900]
  }
}

/** 断点显示名 */
export function breakpointLabel(bp: Breakpoint): string {
  const map: Record<Breakpoint, string> = {
    desktop: '桌面端',
    tablet: '平板端',
    mobile: '手机端',
  }
  return map[bp] ?? bp
}

/** 生成部件 id */
export function nextWidgetId(n: number): string {
  return `w${Date.now().toString(36)}${n}`
}
