/**
 * 报告 API 客户端
 */

import { get, del } from '@/api/client'
import type {
  ReportDetail,
  ReportListResponse,
  ReportListParams,
  ReportExportFormat,
} from './types'

/**
 * 报告 API
 */
export const reportApi = {
  /**
   * 获取报告列表
   */
  list: async (params?: ReportListParams): Promise<ReportListResponse> => {
    return get('/reports', params)
  },

  /**
   * 获取报告详情
   */
  get: async (reportId: string): Promise<ReportDetail> => {
    return get(`/reports/${reportId}`)
  },

  /**
   * 根据执行 ID 获取报告
   */
  getByExecution: async (executionId: string): Promise<ReportDetail> => {
    return get(`/reports/execution/${executionId}`)
  },

  /**
   * 删除报告
   */
  delete: async (reportId: string): Promise<void> => {
    return del(`/reports/${reportId}`)
  },

  /**
   * 导出报告
   */
  export: async (
    reportId: string,
    format: ReportExportFormat = 'json'
  ): Promise<Blob> => {
    const response = await get(`/reports/${reportId}/export`, { format })
    return response
  },
}
