import request from './request'
import type { OperationMessage } from '@/types'

/**
 * 数据交换导出数据端点（5a）。
 * 现状：doExport 为 OperationMessage 包装；getAllTableNames/message 为裸返回（见《端点契约盘点表》§五）。
 */

export type ExportType = 'csv' | 'excel' | 'sql' | 'json'

export interface SubDataExportForm {
  id: string
  fileName: string
  query: string
}

export interface DataExportForm {
  dataExchangeId: string
  fileEncoding: string
  subDataExchanges: SubDataExportForm[]
  dataFormat?: Record<string, unknown>
  exportOption?: Record<string, unknown>
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/** 获取数据源下的所有表名 */
export async function getAllTableNames(dtbsSourceId: string): Promise<string[]> {
  const res = await request.get<string[]>(`/dtbsSourceExchange/${dtbsSourceId}/getAllTableNames`)
  return res.data ?? []
}

/** 提交导出（异步） */
export async function doExport(dtbsSourceId: string, type: ExportType, form: DataExportForm): Promise<void> {
  await request.post<OperationMessage>(`/dtbsSourceExchange/${dtbsSourceId}/export/${type}/doExport`, form)
}

/** 轮询导出消息 */
export async function pollExportMessages(
  dtbsSourceId: string,
  dataExchangeId: string,
  messageCount = 50,
): Promise<unknown[]> {
  const res = await request.post<unknown[]>(`/dtbsSourceExchange/${dtbsSourceId}/message`, null, {
    params: { dataExchangeId, messageCount },
  })
  return res.data ?? []
}

/** 导出 ZIP 下载地址（export/downloadAll） */
export function downloadAllUrl(dtbsSourceId: string, dataExchangeId: string, fileName: string): string {
  return `/dtbsSourceExchange/${dtbsSourceId}/export/downloadAll?dataExchangeId=${encodeURIComponent(
    dataExchangeId,
  )}&fileName=${encodeURIComponent(fileName)}`
}

export type ImportType = 'csv' | 'sql' | 'json' | 'excel'

/** 导入文件信息（DataImportFileInfo） */
export interface DataImportFileInfo {
  name?: string
  fileName?: string
  tableName?: string
  size?: number
}

/** 导入子表单（TextValueFileSubDataImportForm 最小必填） */
export interface SubDataImportForm {
  id: string
  fileName: string
  tableName: string
}

/** 导入表单（DefaultTextValueFileBatchDataImportForm 最小必填） */
export interface DataImportForm {
  dataExchangeId: string
  fileEncoding: string
  subDataExchanges: SubDataImportForm[]
  dataFormat?: Record<string, unknown>
  importOption?: Record<string, unknown>
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
    `/dtbsSourceExchange/${dtbsSourceId}/import/${type}/uploadImportFile`,
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
  await request.post(`/dtbsSourceExchange/${dtbsSourceId}/import/${type}/doImport`, form)
}
