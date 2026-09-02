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

/** 保存驱动（新增或更新，/api/driverEntity/save） */
export async function saveDriverEntity(entity: DriverEntity): Promise<DriverEntity> {
  const res = await request.post<OperationMessage<DriverEntity>>('/api/driverEntity/save', entity)
  return unwrap(res)!
}

/** 删除驱动（/api/driverEntity/delete） */
export async function deleteDriverEntities(ids: string[]): Promise<void> {
  await request.post<OperationMessage>('/api/driverEntity/delete', ids)
}

/** 上传驱动 jar 文件（/driverEntity/uploadDriverFile，multipart） */
export async function uploadDriverFile(
  id: string,
  file: File,
): Promise<{ fileInfos: unknown[]; driverClassNames: string[] }> {
  const fd = new FormData()
  fd.append('id', id)
  fd.append('file', file)
  const res = await request.post<{ fileInfos: unknown[]; driverClassNames: string[] }>(
    '/api/driverEntity/uploadFile',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}
