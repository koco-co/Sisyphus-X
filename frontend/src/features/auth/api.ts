// Auth API client
import { post, get } from '@/lib/api-client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface UserResponse {
  id: string
  username: string
  email: string
  avatar: string | null
  full_name: string | null
  is_active: boolean
}

export interface TokenResponse {
  token: string
  user: UserResponse
}

export const authApi = {
  login: (data: LoginRequest) =>
    post<TokenResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    post<TokenResponse>('/auth/register', data),

  getMe: () =>
    get<UserResponse>('/auth/me'),

  logout: () =>
    post<void>('/auth/logout'),
}
