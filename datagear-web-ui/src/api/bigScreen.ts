import request, { unwrap } from './request'
import { moduleDelete, moduleSave } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 数据大屏实体（对应后端 org.datagear.management.domain.BigScreenEntity） */
export interface BigScreenEntity {
  id: string
  name: string
  description?: string
  theme?: string
  designJson?: string
  createTime?: string | number
}

/** 分页查询大屏（POST /api/bigScreen/pagingQueryData） */
export async function bigScreenPagingQueryData(query: PagingQuery): Promise<PagingData<BigScreenEntity>> {
  const res = await request.post<OperationMessage<PagingData<BigScreenEntity>>>(
    '/api/bigScreen/pagingQueryData',
    query,
  )
  return unwrap(res)
}

/** 获取大屏（/api/bigScreen/get/{id}，不含 designJson 的列表视图可能为空） */
export async function getBigScreen(id: string): Promise<BigScreenEntity> {
  const res = await request.get<OperationMessage<BigScreenEntity>>(`/api/bigScreen/get/${id}`)
  return unwrap(res)!
}

/** 保存大屏（新增或更新，/api/bigScreen/save） */
export const saveBigScreen = (entity: BigScreenEntity) => moduleSave<BigScreenEntity>('bigScreen', entity)

/** 删除大屏（POST /api/bigScreen/delete，批量 ID） */
export const deleteBigScreens = (ids: string[]) => moduleDelete('bigScreen', ids)

/** 获取大屏设计产物 JSON（/api/bigScreen/getDesign/{id}） */
export async function getBigScreenDesign(id: string): Promise<string> {
  const res = await request.get<OperationMessage<string>>(`/api/bigScreen/getDesign/${id}`)
  return unwrap(res) ?? ''
}

/** 保存大屏设计产物 JSON（POST /api/bigScreen/saveDesign） */
export async function saveBigScreenDesign(id: string, designJson: string): Promise<void> {
  await request.post<OperationMessage>('/api/bigScreen/saveDesign', { id, designJson })
}
