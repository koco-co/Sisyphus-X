import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/api/client'

export interface Environment {
  id: number
  project_id: number
  name: string
  domain: string
  variables: Record<string, string>
  headers: Record<string, string>
  is_preupload: boolean
  created_at: string
  updated_at: string
}

/**
 * 环境管理 Hook
 */
export function useEnvironment(projectId: number) {
  const queryClient = useQueryClient()

  // 获取环境列表
  const {
    data: environments = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: async () => {
      const res = await projectsApi.listEnvironments(projectId)
      return (res.data || []) as Environment[]
    },
    enabled: !!projectId
  })

  // 创建环境
  const createMutation = useMutation({
    mutationFn: (data: Omit<Environment, 'id' | 'project_id' | 'created_at' | 'updated_at'>) =>
      projectsApi.createEnvironment(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
    }
  })

  // 更新环境
  const updateMutation = useMutation({
    mutationFn: ({ envId, data }: { envId: number; data: Partial<Environment> }) =>
      projectsApi.updateEnvironment(projectId, envId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
    }
  })

  // 删除环境
  const deleteMutation = useMutation({
    mutationFn: (envId: number) =>
      projectsApi.deleteEnvironment(projectId, envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
    }
  })

  // 克隆环境
  const copyMutation = useMutation({
    mutationFn: ({ envId, name }: { envId: number; name: string }) =>
      projectsApi.copyEnvironment(projectId, envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] })
    }
  })

  // 获取单个环境
  const getEnvironment = (envId: number) => {
    return environments.find(env => env.id === envId)
  }

  return {
    environments,
    isLoading,
    error,
    createEnvironment: createMutation.mutate,
    updateEnvironment: updateMutation.mutate,
    deleteEnvironment: deleteMutation.mutate,
    copyEnvironment: copyMutation.mutate,
    getEnvironment,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCopying: copyMutation.isPending
  }
}
