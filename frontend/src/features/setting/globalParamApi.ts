/**
 * 全局参数 API 客户端
 */

import api from '@/api/client'
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
    const res = await api.get('/global-params', { params })
    return res.data
  },

  /**
   * 获取全局参数详情
   */
  get: async (paramId: string): Promise<GlobalParam> => {
    const res = await api.get(`/global-params/${paramId}`)
    return res.data
  },

  /**
   * 创建全局参数
   */
  create: async (data: GlobalParamCreate): Promise<GlobalParam> => {
    const res = await api.post('/global-params', data)
    return res.data
  },

  /**
   * 更新全局参数
   */
  update: async (paramId: string, data: GlobalParamUpdate): Promise<GlobalParam> => {
    const res = await api.put(`/global-params/${paramId}`, data)
    return res.data
  },

  /**
   * 删除全局参数
   */
  delete: async (paramId: string): Promise<void> => {
    await api.delete(`/global-params/${paramId}`)
  },
}
