import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interfacesApi } from '@/api/client'

export interface RequestHistory {
  id: number
  interface_id: number
  user_id: number
  url: string
  method: string
  headers: Record<string, string>
  params: Record<string, unknown>
  body: any
  status_code: number
  response_headers: Record<string, string>
  response_body: any
  elapsed: number
  size: number
  timeline?: {
    dns: number
    tcp: number
    ttfb: number
    download: number
  }
  created_at: string
}

export interface HistoryResponse {
  items: RequestHistory[]
  total: number
  page: number
  size: number
  pages: number
}

/**
 * 请求历史 Hook
 */
export function useRequestHistory(interfaceId?: number) {
  const queryClient = useQueryClient()

  // 获取历史记录列表
  const {
    data: historyData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['request-history', interfaceId],
    queryFn: async () => {
      if (!interfaceId) return { items: [], total: 0, page: 1, size: 20, pages: 0 }
      const res = await interfacesApi.list() // TODO: 需要添加 history API
      return (res.data || { items: [], total: 0, page: 1, size: 20, pages: 0 }) as HistoryResponse
    },
    enabled: !!interfaceId
  })

  // 删除历史记录
  const deleteMutation = useMutation({
    mutationFn: (historyId: number) =>
      interfacesApi.delete(historyId), // TODO: 需要添加 delete history API
    onSuccess: () => {
      if (interfaceId) {
        queryClient.invalidateQueries({ queryKey: ['request-history', interfaceId] })
      }
    }
  })

  // 清空历史记录
  const clearMutation = useMutation({
    mutationFn: () => {
      // TODO: 需要添加 clear history API
      return Promise.resolve()
    },
    onSuccess: () => {
      if (interfaceId) {
        queryClient.invalidateQueries({ queryKey: ['request-history', interfaceId] })
      }
    }
  })

  return {
    history: historyData?.items || [],
    total: historyData?.total || 0,
    isLoading,
    error,
    deleteHistory: deleteMutation.mutate,
    clearHistory: clearMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isClearing: clearMutation.isPending
  }
}
