import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { OperationMessage } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * axios 实例。
 * 阶段一：Session + Cookie 同源，携带 X-Requested-With 与 locale/theme 参数（沿用现有拦截器语义）。
 */
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
})

// 请求拦截器：沿用现有拦截器语义，直至后端拦截器下线
request.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  // locale/theme 参数与后端约定对齐（阶段二后端拦截器下线后移除）
  return config
})

// 响应拦截器：解包 OperationMessage<T>；type=fail 统一 Toast + reject；401 清 auth 跳登录
request.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // 阶段一：跳登录（redirectUrl 回跳）。此处 import 延迟引用避免循环依赖。
      import('@/stores/auth').then(({ useAuthStore }) => {
        const auth = useAuthStore()
        auth.clear()
      })
      import('@/router').then(({ default: router }) => {
        const redirectUrl = encodeURIComponent(router.currentRoute.value.fullPath)
        router.push({ path: '/login', query: { redirectUrl } })
      })
    }
    // 后端对部分业务异常（如数据源连接失败）以非 2xx 状态码返回 OperationMessage，
    // 真实原因在 body.message 里：此处转译，避免页面只显示 "Request failed with status code 400"
    const body = error?.response?.data
    if (body && typeof body === 'object' && body.type === 'FAIL' && body.message) {
      return Promise.reject(new Error(body.message))
    }
    return Promise.reject(error)
  },
)

/** 解包统一响应体，type=fail 时抛错（由调用方/组合函数统一 Toast） */
export function unwrap<T>(res: { data: OperationMessage<T> }): T {
  const body = res.data
  if (body && body.type === 'FAIL') {
    throw new Error(body.message || body.code || '操作失败')
  }
  return body?.data as T
}

/** GET JSON（返回 OperationMessage<T> 原始体，由 unwrap 解包） */
export function httpGet<T>(url: string, config?: AxiosRequestConfig) {
  return request.get<OperationMessage<T>>(url, config)
}

/** POST JSON */
export function httpPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return request.post<OperationMessage<T>>(url, data, config)
}

export default request
