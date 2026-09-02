import { createPagingLoader } from '@/api/paging'
import type { PagingColumn } from '@/components/PagingTable.vue'

/** 常规 CRUD 模块列表页配置（阶段四批量迁移） */
export interface ModuleListConfig {
  module: string
  title: string
  columns: PagingColumn[]
  /** 新建按钮（路由） */
  createPath?: string
  createLabel?: string
  /** 行操作按钮 */
  rowActions?: { label: string; path: (id: string) => string }[]
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
    rowActions: [
      { label: 'SQL 工作台', path: (id) => `/sqlpad-editor/${id}` },
      { label: '导入', path: (id) => `/dataExchange-import/${id}` },
      { label: '导出', path: (id) => `/dataExchange-export/${id}` },
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
  },
  analysisProject: {
    module: 'analysisProject',
    title: '分析项目',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
  },
  dataSet: {
    module: 'dataSet',
    title: '数据集',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
    ],
    createPath: '/dataSet/add/sql',
    createLabel: '新建 SQL 数据集',
  },
  chart: {
    module: 'chart',
    title: '图表',
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: '名称', sortable: true },
      { field: 'createTime', header: '创建时间' },
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
  },
}

/** 生成模块分页 loader */
export function moduleLoader(module: string) {
  return createPagingLoader(module)
}
