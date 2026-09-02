import request, { unwrap } from './request'
import type { OperationMessage, AuthMe } from '@/types'

/**
 * 认证相关 API。
 * 后端事实（已核查）：登录提交 POST /login/doLogin（表单，字段 name/password/checkCode），
 * 成功 302 → /login/success（返回 OperationMessage JSON），失败 → /login/error（JSON）。
 * 校验码：GET /checkCode?_=<随机>&m=LOGIN。
 */
export interface LoginForm {
  name: string
  password: string
  checkCode?: string
  rememberMe?: boolean
}

/** 表单登录（axios 自动跟随 302 重定向，取 /login/success 的 JSON） */
export function doLogin(form: LoginForm) {
  const params = new URLSearchParams()
  params.append('name', form.name)
  params.append('password', form.password)
  if (form.checkCode) params.append('checkCode', form.checkCode)
  // 现状表单字段为 remremberLogin（原拼写），此处保留语义，阶段一 POC 时核对后端 remember-me 参数。
  if (form.rememberMe) params.append('remember-me', 'true')

  return request.post<OperationMessage>('/login/doLogin', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

/** 当前用户 + 模块权限（GET /api/auth/me，返回 data 结构） */
export async function getMe(): Promise<AuthMe> {
  const res = await request.get<OperationMessage<AuthMe>>('/api/auth/me')
  return unwrap(res)
}

/** 校验码图片地址（m=LOGIN，模块常量已核查） */
export function checkCodeUrl(module = 'LOGIN'): string {
  return `/checkCode?_=${Date.now()}&m=${module}`
}
