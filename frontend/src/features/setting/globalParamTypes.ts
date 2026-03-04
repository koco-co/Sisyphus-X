/**
 * 全局参数（辅助函数）相关类型定义
 */

// 参数定义
export interface ParamDefinition {
  name: string
  type: string
  description: string | null
  default: unknown | null
}

// 全局参数
export interface GlobalParam {
  id: string
  class_name: string
  method_name: string
  code: string
  description: string | null
  input_params: ParamDefinition[]
  output_params: ParamDefinition[]
  created_at: string
}

// 全局参数简要
export interface GlobalParamBrief {
  id: string
  class_name: string
  method_name: string
  description: string | null
}

// 创建全局参数
export interface GlobalParamCreate {
  class_name: string
  method_name: string
  code: string
  description?: string
  input_params?: ParamDefinition[]
  output_params?: ParamDefinition[]
}

// 更新全局参数
export interface GlobalParamUpdate {
  class_name?: string
  method_name?: string
  code?: string
  description?: string
  input_params?: ParamDefinition[]
  output_params?: ParamDefinition[]
}

// 全局参数列表响应
export interface GlobalParamListResponse {
  items: GlobalParam[]
  total: number
}

// 全局参数查询参数
export interface GlobalParamListParams {
  search?: string
  page?: number
  page_size?: number
}
