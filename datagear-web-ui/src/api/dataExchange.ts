import request from './request'
import type { OperationMessage } from '@/types'

/**
 * 数据交换导出数据端点（5a）。
 * 现状：doExport 为 OperationMessage 包装；getAllTableNames/message 为裸返回（见《端点契约盘点表》§五）。
 */

export type ExportType = 'csv' | 'excel' | 'sql' | 'json'

/**
 * 数据格式（对应后端 org.datagear.dataexchange.DataFormat）。
 * dateFormat/timeFormat/timestampFormat/numberFormat 继承自 DateNumberFormat。
 */
export interface DataFormat {
  dateFormat?: string
  timeFormat?: string
  timestampFormat?: string
  numberFormat?: string
  /** Hex / Base64 / NULL */
  binaryFormat?: string
}

/**
 * 导出选项。
 * SQL 导出：org.datagear.dataexchange.support.SqlDataExportOption（exportCreationSql）；
 * JSON 导出：JsonDataExportOption（jsonDataFormat + prettyPrint）；
 * CSV/Excel：TextDataExportOption 无额外字段。
 */
export interface DataExportOption {
  exportCreationSql?: boolean
  /** TABLE_OBJECT / ROW_ARRAY */
  jsonDataFormat?: string
  prettyPrint?: boolean
}

/**
 * 导入选项。
 * 基类 DataImportOption（exceptionResolve：ABORT/IGNORE/ROLLBACK）；
 * ValueDataImportOption（ignoreInexistentColumn/nullForIllegalColumnValue/nullForEmptyImportKey）；
 * JSON 导入：JsonDataImportOption（jsonDataFormat）。
 */
export interface DataImportOption {
  exceptionResolve?: string
  ignoreInexistentColumn?: boolean
  nullForIllegalColumnValue?: boolean
  nullForEmptyImportKey?: boolean
  jsonDataFormat?: string
}

export interface SubDataExportForm {
  id: string
  fileName: string
  query: string
}

export interface DataExportForm {
  dataExchangeId: string
  fileEncoding: string
  subDataExchanges: SubDataExportForm[]
  dataFormat?: DataFormat
  exportOption?: DataExportOption
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/** 获取数据源下的所有表名 */
export async function getAllTableNames(dtbsSourceId: string): Promise<string[]> {
  const res = await request.get<string[]>(`/api/dtbsSourceExchange/${dtbsSourceId}/getAllTableNames`)
  return res.data ?? []
}

/** 提交导出（异步） */
export async function doExport(dtbsSourceId: string, type: ExportType, form: DataExportForm): Promise<void> {
  await request.post<OperationMessage>(`/api/dtbsSourceExchange/${dtbsSourceId}/export/${type}/doExport`, form)
}

/** 轮询导出消息 */
export async function pollExportMessages(
  dtbsSourceId: string,
  dataExchangeId: string,
  messageCount = 50,
): Promise<unknown[]> {
  const res = await request.post<unknown[]>(`/api/dtbsSourceExchange/${dtbsSourceId}/message`, null, {
    params: { dataExchangeId, messageCount },
  })
  return res.data ?? []
}

/** 导出 ZIP 下载地址（export/downloadAll） */
export function downloadAllUrl(dtbsSourceId: string, dataExchangeId: string, fileName: string): string {
  return `/api/dtbsSourceExchange/${dtbsSourceId}/export/downloadAll?dataExchangeId=${encodeURIComponent(
    dataExchangeId,
  )}&fileName=${encodeURIComponent(fileName)}`
}

/** 单文件下载地址（export/download，按行下载） */
export function downloadUrl(dtbsSourceId: string, dataExchangeId: string, fileName: string): string {
  return `/api/dtbsSourceExchange/${dtbsSourceId}/export/download?dataExchangeId=${encodeURIComponent(
    dataExchangeId,
  )}&fileName=${encodeURIComponent(fileName)}`
}

/** 取消交换任务（POST /{dtbsSourceId}/cancel，CancelDataExchangeForm） */
export async function cancelExchange(
  dtbsSourceId: string,
  dataExchangeId: string,
  subDataExchangeIds: string[],
): Promise<void> {
  await request.post<OperationMessage>(`/api/dtbsSourceExchange/${dtbsSourceId}/cancel`, {
    dataExchangeId,
    subDataExchangeIds,
  })
}

/** 查看子交换日志（GET /{dtbsSourceId}/getLogContent，返回 HTML 片段） */
export async function getLogContent(
  dtbsSourceId: string,
  dataExchangeId: string,
  subDataExchangeId: string,
): Promise<string> {
  const res = await request.get<string>(`/api/dtbsSourceExchange/${dtbsSourceId}/getLogContent`, {
    params: { dataExchangeId, subDataExchangeId },
    responseType: 'text',
  })
  return String(res.data ?? '')
}

export type ImportType = 'csv' | 'sql' | 'json' | 'excel'

/** 导入文件信息（DataImportFileInfo） */
export interface DataImportFileInfo {
  name?: string
  fileName?: string
  tableName?: string
  size?: number
}

/** 导入子表单（TextValueFileSubDataImportForm / FileSubDataImportForm） */
export interface SubDataImportForm {
  id: string
  fileName: string
  tableName?: string
  /** 导入条目编号（必填） */
  number?: string
  /** 导入条目依赖编号 */
  dependentNumber?: string
}

/** 导入表单（DefaultTextValueFileBatchDataImportForm / SqlFileBatchDataImportForm） */
export interface DataImportForm {
  dataExchangeId: string
  fileEncoding: string
  subDataExchanges: SubDataImportForm[]
  dataFormat?: DataFormat
  importOption?: DataImportOption
  /** 自动处理导入条目依赖编号的字面值 */
  dependentNumberAuto?: string
}

/** 上传导入文件（multipart，返回裸 List<DataImportFileInfo>） */
export async function uploadImportFile(
  dtbsSourceId: string,
  type: ImportType,
  dataExchangeId: string,
  file: File,
): Promise<DataImportFileInfo[]> {
  const fd = new FormData()
  fd.append('dataExchangeId', dataExchangeId)
  fd.append('file', file)
  const res = await request.post<DataImportFileInfo[]>(
    `/api/dtbsSourceExchange/${dtbsSourceId}/import/${type}/uploadImportFile`,
    fd,
  )
  return res.data ?? []
}

/** 提交导入（异步） */
export async function doImport(
  dtbsSourceId: string,
  type: ImportType,
  form: DataImportForm,
): Promise<void> {
  await request.post(`/api/dtbsSourceExchange/${dtbsSourceId}/import/${type}/doImport`, form)
}
