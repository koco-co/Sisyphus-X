/**
 * 报告 API 客户端
 */

import api from '@/api/client'
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
    const res = await api.get('/reports', { params })
    return res.data
  },

  /**
   * 获取报告详情
   */
  get: async (reportId: string): Promise<ReportDetail> => {
    const res = await api.get(`/reports/${reportId}`)
    return res.data
  },

  /**
   * 根据执行 ID 获取报告
   */
  getByExecution: async (executionId: string): Promise<ReportDetail> => {
    const res = await api.get(`/reports/execution/${executionId}`)
    return res.data
  },

  /**
   * 删除报告
   */
  delete: async (reportId: string): Promise<void> => {
    await api.delete(`/reports/${reportId}`)
  },

  /**
   * 导出报告
   */
  export: async (
    reportId: string,
    format: ReportExportFormat = 'json'
  ): Promise<Blob> => {
    const res = await api.get(`/reports/${reportId}/export`, { params: { format } })
    return res.data
  },
}
