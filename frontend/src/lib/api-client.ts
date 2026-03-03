// frontend/src/lib/api-client.ts
import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

// API 响应格式
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PagedResponse<T = unknown> {
  code: number
  message: string
  data: {
    items: T[]
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

export interface ApiError {
  code: number
  message: string
  detail?: string | unknown
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token 过期，清除登录状态
      useAuthStore.getState().logout()
      // 跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 通用请求方法
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config)
  if (response.data.code !== 0) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

// GET 请求
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'GET', url, params })
}

// POST 请求
export async function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'POST', url, data })
}

// PUT 请求
export async function put<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'PUT', url, data })
}

// DELETE 请求
export async function del<T>(url: string): Promise<T> {
  return request<T>({ method: 'DELETE', url })
}

export default apiClient
