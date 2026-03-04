/**
 * 全局参数 API 客户端
 */

import { get, post, put, del } from '@/api/client'
import type {
  GlobalParam,
  GlobalParamCreate,
  GlobalParamUpdate,
  GlobalParamListResponse,
  GlobalParamListParams,
} from './globalParamTypes'

/**
 * 全局参数 API
 */
export const globalParamApi = {
  /**
   * 获取全局参数列表
   */
  list: async (params?: GlobalParamListParams): Promise<GlobalParamListResponse> => {
    return get('/global-params', params)
  },

  /**
   * 获取全局参数详情
   */
  get: async (paramId: string): Promise<GlobalParam> => {
    return get(`/global-params/${paramId}`)
  },

  /**
   * 创建全局参数
   */
  create: async (data: GlobalParamCreate): Promise<GlobalParam> => {
    return post('/global-params', data)
  },

  /**
   * 更新全局参数
   */
  update: async (paramId: string, data: GlobalParamUpdate): Promise<GlobalParam> => {
    return put(`/global-params/${paramId}`, data)
  },

  /**
   * 删除全局参数
   */
  delete: async (paramId: string): Promise<void> => {
    return del(`/global-params/${paramId}`)
  },
}
