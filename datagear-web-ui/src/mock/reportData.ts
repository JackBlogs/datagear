/**
 * 统计报表前端演示数据层（对齐 prototypev2 mock-api：/report/list、/report/export）。
 * 报表引擎为 P3 企业版增值（FR-RPT）；开源版提供基础报表模板与预览。
 */
import { ref } from 'vue'
export interface ReportItem {
  id: string
  name: string
  type: '分组报表' | '交叉报表' | '电子表格' | '填报表单'
  updated: string
  owner: string
  subscribed: boolean
  /** 预览数据（中国式报表样例） */
  sheet: ReportSheet
  /** 绑定的 SQL 数据集（新建报表时选择；预览时经 /dataSet/preview/SQL 实时取数） */
  dataSetId?: string
  dataSetName?: string
  sql?: string
}

export interface ReportSheet {
  title: string
  org: string
  unit: string
  no: string
  /** 斜线表头列 */
  cols: string[]
  /** 行：[指标, 单位, 计划, 实际, 完成率] */
  rows: [string, string, string, string, string][]
}

export const REPORT_TYPES = ['分组报表', '交叉报表', '电子表格', '填报表单'] as const

const LS_KEY = 'dg_mock_report_list'

function loadReports(): ReportItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as ReportItem[]
  } catch { /* ignore */ }
  return SEED
}

const SEED: ReportItem[] = [

  {
    id: 'RP-01',
    name: '原油产量月报',
    type: '交叉报表',
    updated: '昨天 22:00',
    owner: '李明',
    subscribed: true,
    sheet: {
      title: '2026 年 8 月 各采油厂生产情况月报',
      org: '生产运行部',
      unit: '万吨、%',
      no: 'SC-2026-08',
      cols: ['原油产量', '天然气产量', '注水', '综合含水率'],
      rows: [
        ['长庆采油厂', '万吨', '92.0', '94.8', '103.0'],
        ['大庆采油厂', '万吨', '90.0', '88.6', '98.4'],
        ['塔里木采油厂', '万吨', '70.0', '71.5', '102.1'],
        ['胜利采油厂', '万吨', '67.0', '68.2', '101.8'],
        ['华北采油厂', '万吨', '60.0', '62.1', '103.5'],
      ],
    },
  },
  {
    id: 'RP-02',
    name: '管输量日报',
    type: '分组报表',
    updated: '今天 07:30',
    owner: '陈广',
    subscribed: true,
    sheet: {
      title: '天然气管输量日报',
      org: '管道分公司',
      unit: '亿方',
      no: 'GD-2026-0903',
      cols: ['输气量', '门站压力', '输差率'],
      rows: [
        ['西气东输一线', '亿方', '1.85', '1.83', '1.1%'],
        ['西气东输二线', '亿方', '1.62', '1.60', '1.2%'],
        ['陕京一线', '亿方', '1.40', '1.41', '0.7%'],
      ],
    },
  },
  {
    id: 'RP-03',
    name: '煤矿产量旬报',
    type: '分组报表',
    updated: '09-01',
    owner: '马志强',
    subscribed: false,
    sheet: {
      title: '煤矿原煤产量旬报（8 月下旬）',
      org: '安监部 · 生产组',
      unit: '万吨',
      no: 'MK-2026-X3',
      cols: ['原煤产量', '入洗量', '瓦斯超限'],
      rows: [
        ['大同矿区', '万吨', '42.0', '30.5', '1 次'],
        ['神东矿区', '万吨', '38.5', '28.1', '1 次'],
        ['晋城矿区', '万吨', '25.0', '18.2', '0 次'],
      ],
    },
  },
  {
    id: 'RP-04',
    name: '化工品产销存月报',
    type: '电子表格',
    updated: '08-01',
    owner: '周婷',
    subscribed: true,
    sheet: {
      title: '化工品产销存月报（8 月）',
      org: '化工经营组',
      unit: '万吨',
      no: 'HG-2026-08',
      cols: ['产量', '销量', '库存'],
      rows: [
        ['甲醇', '万吨', '32.5', '31.2', '6.8'],
        ['烯烃', '万吨', '18.2', '17.9', '3.1'],
        ['尿素', '万吨', '25.6', '24.8', '5.5'],
      ],
    },
  },
]

export const reports = ref<ReportItem[]>(loadReports())

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(reports.value)) } catch { /* ignore */ }
}

export function createReport(body: {
  name: string
  type: ReportItem['type']
  org: string
  owner: string
  dataSetId: string
  dataSetName: string
  sql: string
  columns: string[]
  rows: string[][]
}): ReportItem {
  const now = new Date()
  const row: ReportItem = {
    id: 'RP-' + String(Date.now() % 100000),
    name: body.name,
    type: body.type,
    updated: `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    owner: body.owner || 'admin',
    subscribed: false,
    dataSetId: body.dataSetId,
    dataSetName: body.dataSetName,
    sql: body.sql,
    sheet: {
      title: body.name,
      org: body.org || '—',
      unit: '—',
      no: `RPT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      cols: body.columns,
      rows: body.rows as unknown as ReportSheet['rows'],
    },
  }
  reports.value.unshift(row)
  persist()
  return row
}

export function deleteReport(id: string) {
  reports.value = reports.value.filter((r) => r.id !== id)
  persist()
}

export function resetReports() {
  reports.value = [...SEED]
  persist()
}

export function exportReport(name: string, format: string): { file: string; size: string; watermark: boolean } {
  return { file: `${name}.${format.toLowerCase()}`, size: '1.2 MB', watermark: true }
}
