/**
 * 关键字相关类型定义
 */

// 关键字类型
export type KeywordType = 'request' | 'assertion' | 'extract' | 'sql' | 'wait' | 'custom'

// 关键字类型信息
export interface KeywordTypeInfo {
  type: string
  name: string
  description: string
}

// 关键字
export interface Keyword {
  id: string
  keyword_type: KeywordType
  name: string
  method_name: string
  code: string | null
  params_schema: Record<string, unknown> | null
  is_builtin: boolean
  is_enabled: boolean
  created_at: string
}

// 关键字简要
export interface KeywordBrief {
  id: string
  keyword_type: KeywordType
  name: string
  method_name: string
  is_builtin: boolean
  is_enabled: boolean
}

// 创建关键字
export interface KeywordCreate {
  keyword_type: KeywordType
  name: string
  method_name: string
  code?: string
  params_schema?: Record<string, unknown>
  is_enabled?: boolean
}

// 更新关键字
export interface KeywordUpdate {
  keyword_type?: KeywordType
  name?: string
  method_name?: string
  code?: string
  params_schema?: Record<string, unknown>
  is_enabled?: boolean
}

// 关键字列表响应
export interface KeywordListResponse {
  items: Keyword[]
  total: number
}

// 关键字查询参数
export interface KeywordListParams {
  keyword_type?: KeywordType
  is_enabled?: boolean
  search?: string
  page?: number
  page_size?: number
}
