import request, { unwrap } from './request'
import { moduleGet, moduleSave, moduleDelete } from './crud'
import type { OperationMessage, PagingData, PagingQuery } from '@/types'

/** 分析项目实体（对应后端 org.datagear.management.domain.AnalysisProject） */
export interface AnalysisProject {
  id: string
  name: string
  description?: string
  /** 创建用户（对应后端 User 子对象，列表展示 realName） */
  createUser?: { id?: string; name?: string; realName?: string }
  createTime?: string
}

export const getAnalysisProject = (id: string) => moduleGet<AnalysisProject>('analysisProject', id)
export const saveAnalysisProject = (entity: AnalysisProject) => moduleSave<AnalysisProject>('analysisProject', entity)
export const deleteAnalysisProjects = (ids: string[]) => moduleDelete('analysisProject', ids)

/** 分析项目分页查询（POST /api/analysisProject/pagingQueryData） */
export async function analysisProjectPagingQueryData(query: PagingQuery): Promise<PagingData<AnalysisProject>> {
  const res = await request.post<OperationMessage<PagingData<AnalysisProject>>>(
    '/api/analysisProject/pagingQueryData',
    query,
  )
  return unwrap(res)
}
