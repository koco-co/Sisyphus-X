// frontend/src/features/project/components/ProjectList.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Database,
  FolderKanban,
  Globe,
  Loader2,
} from 'lucide-react'
import { projectApi } from '../api'
import type { Project } from '../types'
import { ProjectForm } from './ProjectForm'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { Tooltip } from '@/components/ui/tooltip'

export function ProjectList() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, page, pageSize }],
    queryFn: () => projectApi.list({ search, page, page_size: pageSize }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('删除成功')
      setDeleteProject(null)
    },
    onError: (err: unknown) => {
      // Type guard for axios error
      const axiosError = err as { response?: { data?: { detail?: string } }; message?: string }
      const errorMsg = axiosError.response?.data?.detail || axiosError.message || '删除失败'
      toast.error(typeof errorMsg === 'string' ? errorMsg : '删除失败')
    },
  })

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingProject(null)
    setFormOpen(true)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const projects = data?.items || []
  const total = data?.total || 0
  const pages = data?.pages || Math.ceil(total / pageSize)

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <motion.header
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-cyan-500" />
            项目管理
          </h1>
          <p className="text-slate-400">管理您的自动化测试项目</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          data-testid="create-project-button"
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          新建项目
        </motion.button>
      </motion.header>

      {/* Search Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1) // Reset to first page on search
            }}
            data-testid="project-search-input"
            placeholder="搜索项目名称..."
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
          />
        </div>
      </motion.div>

      {/* Project List */}
      <motion.div
        className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
          </div>
        ) : (
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-800/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[200px]">项目名称</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[300px]">项目描述</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">创建人</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">创建时间</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">更新时间</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.length > 0 ? (
                projects.map((project: Project, index: number) => (
                  <motion.tr
                    key={project.id}
                    className="hover:bg-white/5 transition-colors group"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <td className="px-6 py-4 w-[200px]">
                      <Tooltip content={project.name} position="top">
                        <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full">
                          {project.name}
                        </span>
                      </Tooltip>
                      {project.key && (
                        <div className="text-xs text-slate-500 mt-1 font-mono">#{project.key}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 w-[300px]">
                      <Tooltip content={project.description || '-'} position="top">
                        <span className="truncate block w-full">
                          {project.description || '-'}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-500 font-bold">
                          {(project.owner || project.created_by || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{project.owner || project.created_by || 'Admin'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(project.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Tooltip content="编辑" position="top">
                          <button
                            onClick={() => handleEdit(project)}
                            data-testid={`project-edit-button-${project.id}`}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="数据库配置" position="top">
                          <Link
                            to={`/api/projects/${project.id}/database-configs`}
                            className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                            data-testid="database-config-button"
                          >
                            <Database className="w-4 h-4" />
                          </Link>
                        </Tooltip>
                        <Tooltip content="环境配置" position="top">
                          <Link
                            to={`/projects/${project.id}/environments`}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                          </Link>
                        </Tooltip>
                        <Tooltip content="删除" position="top">
                          <button
                            onClick={() => setDeleteProject(project)}
                            data-testid={`project-delete-button-${project.id}`}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="暂无项目"
                      description="创建一个项目开始您的自动化测试之旅"
                      icon={FolderKanban}
                      action={
                        <button
                          onClick={handleCreate}
                          className="text-cyan-400 hover:underline text-sm"
                        >
                          立即创建
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
            <Pagination
              page={page}
              size={pageSize}
              total={total}
              pages={pages}
              onPageChange={setPage}
            />
          </div>
        )}
      </motion.div>

      {/* Project Form Modal */}
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteProject !== null}
        onClose={() => setDeleteProject(null)}
        onConfirm={() => deleteProject && deleteMutation.mutate(deleteProject.id)}
        title="删除项目"
        description={`请输入项目名称确认删除。此操作无法撤销。`}
        confirmText="删除"
        isDestructive={true}
        verificationText={deleteProject?.name}
      />
    </div>
  )
}
