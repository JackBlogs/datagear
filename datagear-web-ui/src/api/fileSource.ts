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

/** 文件浏览条目（对应后端 org.datagear.util.dirquery.ResultFileInfo） */
export interface FileSourceFileItem {
  name: string
  displayName?: string
  directory?: boolean
  bytes?: number
  size?: string
  /** 相对于根目录的完整路径 */
  path?: string
  displayLastModified?: string
}

/** 文件浏览查询（对应后端 DirectoryPagingQuery，分页在 paging 子对象） */
export interface FileSourceFileQuery {
  keyword?: string
  /** 相对目录路径（空为根目录） */
  path?: string
  /** children / descendant */
  queryRange?: string
  onlyDirectory?: boolean
  page: number
  pageSize: number
}

/**
 * 文件源文件浏览（旧端点 POST /fileSource/file/pagingQueryData?id=...，裸 PagingData<ResultFileInfo>）。
 * 核验：FileSourceApiController 无对应端点，故沿用旧端点（vite proxy 已配 /fileSource/file）。
 */
export async function fileSourceFilePagingQueryData(
  id: string,
  query: FileSourceFileQuery,
): Promise<PagingData<FileSourceFileItem>> {
  const res = await request.post<PagingData<FileSourceFileItem>>(
    '/fileSource/file/pagingQueryData',
    {
      keyword: query.keyword || undefined,
      path: query.path || undefined,
      queryRange: query.queryRange || 'children',
      onlyDirectory: query.onlyDirectory ?? false,
      paging: { page: query.page, pageSize: query.pageSize },
    },
    { params: { id } },
  )
  return res.data
}
