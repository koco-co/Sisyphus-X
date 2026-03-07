/**
 * 关键字 API 客户端
 */

import api from '@/api/client'
import type {
  Keyword,
  KeywordCreate,
  KeywordUpdate,
  KeywordListResponse,
  KeywordListParams,
  KeywordTypeInfo,
} from './types'

/**
 * 关键字 API
 */
export const keywordApi = {
  /**
   * 获取关键字列表
   */
  list: async (params?: KeywordListParams): Promise<KeywordListResponse> => {
    const res = await api.get('/keywords', { params })
    return res.data
  },

  /**
   * 获取关键字类型列表
   */
  getTypes: async (): Promise<KeywordTypeInfo[]> => {
    const res = await api.get('/keywords/types')
    return res.data
  },

  /**
   * 获取关键字详情
   */
  get: async (keywordId: string): Promise<Keyword> => {
    const res = await api.get(`/keywords/${keywordId}`)
    return res.data
  },

  /**
   * 创建关键字
   */
  create: async (data: KeywordCreate): Promise<Keyword> => {
    const res = await api.post('/keywords', data)
    return res.data
  },

  /**
   * 更新关键字
   */
  update: async (keywordId: string, data: KeywordUpdate): Promise<Keyword> => {
    const res = await api.put(`/keywords/${keywordId}`, data)
    return res.data
  },

  /**
   * 删除关键字
   */
  delete: async (keywordId: string): Promise<void> => {
    await api.delete(`/keywords/${keywordId}`)
  },
}
