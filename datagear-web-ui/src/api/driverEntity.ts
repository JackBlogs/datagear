import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/** 数据库驱动实体（对应 org.datagear.connection.DriverEntity） */
export interface DriverEntity {
  id: string
  driverClassName?: string
  displayName?: string
  displayDesc?: string
  jreVersion?: string
  databaseName?: string
  databaseVersions?: string[]
  displayText?: string
}

/** 驱动库文件信息（对应 org.datagear.util.FileInfo） */
export interface DriverFileInfo {
  name: string
  size?: string
  displayName?: string
  directory?: boolean
  bytes?: number
}

/** 驱动列表（/api/driverEntity/list） */
export async function listDriverEntities(): Promise<DriverEntity[]> {
  const res = await request.get<OperationMessage<DriverEntity[]>>('/api/driverEntity/list')
  return unwrap(res) ?? []
}

/** 获取驱动（/api/driverEntity/get/{id}） */
export async function getDriverEntity(id: string): Promise<DriverEntity> {
  const res = await request.get<OperationMessage<DriverEntity>>(`/api/driverEntity/get/${id}`)
  return unwrap(res)!
}

/**
 * 保存驱动（新增或更新）。
 * 调用旧端点 /driverEntity/saveAdd 或 /driverEntity/saveEdit，
 * 以复刻原 driverEntity_form.ftl 的 driverLibraryFileNames 持久化逻辑。
 */
export async function saveDriverEntity(
  entity: DriverEntity,
  driverLibraryFileNames: string[] = [],
): Promise<DriverEntity> {
  const isAdd = !entity.id
  const url = isAdd ? '/driverEntity/saveAdd' : '/driverEntity/saveEdit'
  const res = await request.post<OperationMessage<DriverEntity>>(url, {
    driverEntity: entity,
    driverLibraryFileNames,
  })
  return unwrap(res)!
}

/** 删除驱动（/api/driverEntity/delete） */
export async function deleteDriverEntities(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/driverEntity/delete', ids)
}

/** 列出驱动库文件（旧端点 /driverEntity/listDriverFile，返回裸 FileInfo[]） */
export async function listDriverFiles(id: string): Promise<DriverFileInfo[]> {
  const res = await request.get<DriverFileInfo[]>('/driverEntity/listDriverFile', { params: { id } })
  return res.data ?? []
}

/** 上传驱动 jar（旧端点 /driverEntity/uploadDriverFile，multipart，返回裸 Map） */
export async function uploadDriverFile(
  id: string,
  file: File,
): Promise<{ fileInfos: DriverFileInfo[]; driverClassNames: string[] }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await request.post<{ fileInfos: DriverFileInfo[]; driverClassNames: string[] }>(
    '/driverEntity/uploadDriverFile',
    fd,
    { params: { id }, headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

/** 删除驱动库文件（旧端点 /driverEntity/deleteDriverFile，OperationMessage.data = FileInfo[]） */
export async function deleteDriverFile(id: string, file: string): Promise<DriverFileInfo[]> {
  const res = await request.post<OperationMessage<DriverFileInfo[]>>('/driverEntity/deleteDriverFile', null, {
    params: { id, file },
  })
  return unwrap(res) ?? []
}

/** 驱动库文件下载链接（旧端点 /driverEntity/downloadDriverFile） */
export function driverFileDownloadUrl(id: string, file: string): string {
  return `/driverEntity/downloadDriverFile?id=${encodeURIComponent(id)}&file=${encodeURIComponent(file)}`
}
