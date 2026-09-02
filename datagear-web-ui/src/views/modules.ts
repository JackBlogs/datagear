import { createPagingLoader } from '@/api/paging'
import { moduleDelete } from '@/api/crud'
import type { PagingColumn, RowAction } from '@/components/PagingTable.vue'

/** 常规 CRUD 模块列表页配置（阶段四批量迁移） */
export interface ModuleListConfig {
  module: string
  title: string
  columns: PagingColumn[]
  /** 新建按钮（路由） */
  createPath?: string
  createLabel?: string
  /** 行操作按钮 */
  rowActions?: RowAction[]
}

/** 生成某模块的「编辑 + 删除」行操作 */
function crudActions(module: string): RowAction[] {
  return [
    { label: '编辑', path: (id) => `/${module}/${id}/edit` },
    { label: '删除', action: (id) => moduleDelete(module, [id]) },
  ]
}

/** 「授权」行操作（资源类型见后端 Authorization.AUTHORIZATION_RESOURCE_TYPE 语义） */
function authAction(resourceType: string): RowAction {
  return { label: '授权', path: (id) => `/authorization/${resourceType}/${id}` }
}

export const moduleListConfigs: Record<string, ModuleListConfig> = {
  dtbsSource: {
    module: 'dtbsSource',
    title: '数据源',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'title', header: '标题', sortable: true },
      { field: 'url', header: 'URL' },
      { field: 'createTime', header: '创建时间' },
    ],
    createPath: '/dtbsSource/add',
    createLabel: '新建数据源',
    rowActions: [
      { label: '编辑', path: (id) => `/dtbsSource/${id}/edit` },
      { label: 'SQL 工作台', path: (id) => `/sqlpad/${id}` },
      { label: '导入', path: (id) => `/dataExchange-import/${id}` },
      { label: '导出', path: (id) => `/dataExchange-export/${id}` },
      authAction('DtbsSource'),
      { label: '删除', action: (id) => moduleDelete('dtbsSource', [id]) },
    ],
  },
  fileSource: {
    module: 'fileSource',
    title: '文件源',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'directory', header: '目录' },
      { field: 'description', header: '描述' },
    ],
    createPath: '/fileSource/add',
    createLabel: '新建文件源',
    rowActions: [...crudActions('fileSource'), authAction('FileSource')],
  },
  analysisProject: {
    module: 'analysisProject',
    title: '分析项目',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
    createPath: '/analysisProject/add',
    createLabel: '新建项目',
    rowActions: [...crudActions('analysisProject'), authAction('AnalysisProject')],
  },
  dataSet: {
    module: 'dataSet',
    title: '数据集',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
    createPath: '/dataSet/add',
    createLabel: '新建数据集',
    rowActions: [
      { label: '编辑', path: (id) => `/dataSet/${id}/edit` },
      authAction('DataSet'),
      { label: '删除', action: (id) => moduleDelete('dataSet', [id]) },
    ],
  },
  chart: {
    module: 'chart',
    title: '图表',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
    rowActions: [
      { label: '设计', path: (id) => `/chart/${id}/design` },
      authAction('Chart'),
      { label: '删除', action: (id) => moduleDelete('chart', [id]) },
    ],
  },
  dashboard: {
    module: 'dashboard',
    title: '看板',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
    createPath: '/dashboard/add',
    createLabel: '新建看板',
    rowActions: [
      { label: '编辑', path: (id) => `/dashboard/${id}/edit` },
      { label: '设计', path: (id) => `/dashboard/${id}/design` },
      authAction('Dashboard'),
      { label: '删除', action: (id) => moduleDelete('dashboard', [id]) },
    ],
  },
  dtbsSourceGuard: {
    module: 'dtbsSourceGuard',
    title: '数据源防护',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'pattern', header: '匹配模式' },
      { field: 'permitted', header: '允许' },
      { field: 'enabled', header: '启用' },
    ],
    createPath: '/dtbsSourceGuard/add',
    createLabel: '新建防护规则',
    rowActions: crudActions('dtbsSourceGuard'),
  },
}

/** 生成模块分页 loader */
export function moduleLoader(module: string) {
  return createPagingLoader(module)
}
