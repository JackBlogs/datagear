import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/** 关于信息（/api/about） */
export interface AboutInfo {
  name: string
  fullName: string
  version: string
  officialSite: string
  sourceCode: string
  license: string
}

/** 版本更新日志（/api/changelog） */
export interface VersionContent {
  version?: { major?: string; minor?: string; revision?: string; version?: string }
  contents?: string[]
  [key: string]: unknown
}

export async function getAbout(): Promise<AboutInfo> {
  const res = await request.get<OperationMessage<AboutInfo>>('/api/about')
  return unwrap(res)!
}

export async function getChangelog(): Promise<VersionContent[]> {
  const res = await request.get<OperationMessage<VersionContent[]>>('/api/changelog')
  return unwrap(res) ?? []
}
