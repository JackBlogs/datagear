import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 文件源实体（对应后端 org.datagear.management.domain.FileSource） */
export interface FileSource {
  id: string
  name: string
  directory?: string
  description?: string
  createUser?: { id: string; name?: string; realName?: string }
  createTime?: string
}

export const getFileSource = (id: string) => moduleGet<FileSource>('fileSource', id)
export const saveFileSource = (entity: FileSource) => moduleSave<FileSource>('fileSource', entity)
export const deleteFileSources = (ids: string[]) => moduleDelete('fileSource', ids)

/** 文件源分页查询（POST /api/fileSource/pagingQueryData） */
export async function fileSourcePagingQueryData(query: PagingQuery): Promise<PagingData<FileSource>> {
  const res = await request.post<OperationMessage<PagingData<FileSource>>>('/api/fileSource/pagingQueryData', query)
  return unwrap(res)
}
