import request, { unwrap } from './request'
import type { OperationMessage } from '@/types'

/** 重置密码步骤（对应后端 ResetPasswordStep） */
export interface ResetPasswordStep {
  total: number
  step: number
  action?: string
  username?: string
  checkFileName?: string
  checkFileTip?: string
  checkOk?: boolean
}

/** 初始化重置密码会话（/resetPassword/init） */
export async function initResetPassword(): Promise<ResetPasswordStep> {
  const res = await request.get<OperationMessage<ResetPasswordStep>>('/resetPassword/init')
  return unwrap(res)!
}

/** 获取当前重置密码步骤（/resetPassword/step） */
export async function getResetPasswordStep(): Promise<ResetPasswordStep> {
  const res = await request.get<OperationMessage<ResetPasswordStep>>('/resetPassword/step')
  return unwrap(res)!
}

/** 填写用户名（/resetPassword/fillUserInfo） */
export async function fillUserInfo(username: string): Promise<void> {
  await request.post<OperationMessage>('/resetPassword/fillUserInfo', { username })
}

/** 校验用户信息（/resetPassword/checkUserInfo） */
export async function checkUserInfo(): Promise<void> {
  await request.post<OperationMessage>('/resetPassword/checkUserInfo')
}

/** 设置新密码（/resetPassword/setNewPassword） */
export async function setNewPassword(password: string): Promise<void> {
  await request.post<OperationMessage>('/resetPassword/setNewPassword', { password })
}
