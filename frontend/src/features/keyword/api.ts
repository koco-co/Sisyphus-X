/**
 * 关键字 API 客户端
 */

import { get, post, put, del } from '@/api/client'
import type {
  Keyword,
  KeywordBrief,
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
    return get('/keywords', params)
  },

  /**
   * 获取关键字类型列表
   */
  getTypes: async (): Promise<KeywordTypeInfo[]> => {
    return get('/keywords/types')
  },

  /**
   * 获取关键字详情
   */
  get: async (keywordId: string): Promise<Keyword> => {
    return get(`/keywords/${keywordId}`)
  },

  /**
   * 创建关键字
   */
  create: async (data: KeywordCreate): Promise<Keyword> => {
    return post('/keywords', data)
  },

  /**
   * 更新关键字
   */
  update: async (keywordId: string, data: KeywordUpdate): Promise<Keyword> => {
    return put(`/keywords/${keywordId}`, data)
  },

  /**
   * 删除关键字
   */
  delete: async (keywordId: string): Promise<void> => {
    return del(`/keywords/${keywordId}`)
  },
}
