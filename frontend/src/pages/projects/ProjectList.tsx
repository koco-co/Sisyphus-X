import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Calendar,
  FolderKanban
} from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { projectsApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Project {
  id: number
  name: string
  key: string
  description: string
  owner?: string
  created_at?: string
  updated_at?: string
}

export default function ProjectList() {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const size = 12

  // Delete state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // Create state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({})

  // Validate form
  const validateForm = (): boolean => {
    const errors: { name?: string; description?: string } = {}

    const name = createForm.name.trim()
    if (!name) {
      errors.name = '项目名称不能为空'
    } else if (name.length > 50) {
      errors.name = `项目名称不能超过50个字符（当前${name.length}个字符）`
    }

    const description = createForm.description.trim()
    if (description && description.length > 200) {
      errors.description = `项目描述不能超过200个字符（当前${description.length}个字符）`
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle input change
  const handleInputChange = (field: 'name' | 'description', value: string) => {
    setCreateForm({ ...createForm, [field]: value })

    const trimmedValue = value.trim()
    if (field === 'name' && trimmedValue) {
      if (trimmedValue.length > 50) {
        setFormErrors(prev => ({
          ...prev,
          name: `项目名称不能超过50个字符（当前${trimmedValue.length}个字符）`
        }))
      } else {
        setFormErrors(prev => ({ ...prev, name: undefined }))
      }
    } else if (field === 'description' && trimmedValue) {
      if (trimmedValue.length > 200) {
        setFormErrors(prev => ({
          ...prev,
          description: `项目描述不能超过200个字符（当前${trimmedValue.length}个字符）`
        }))
      } else {
        setFormErrors(prev => ({ ...prev, description: undefined }))
      }
    }
  }

  // Fetch projects
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['projects', page, size, searchQuery],
    queryFn: () => projectsApi.list({ page, size, name: searchQuery || undefined }),
    select: (data) => data.data
  })

  const projects = projectData?.items || []
  const total = projectData?.total || 0
  const pages = projectData?.pages || 0

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDeleteOpen(false)
      setProjectToDelete(null)
      success('删除成功')
    },
    onError: () => showError('删除失败')
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; key: string; owner: string; description?: string }) =>
      projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      closeCreateModal()
      success('创建成功')
    },
    onError: (err: { response?: { data?: { detail?: string | string[] } } }) => {
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          showError(detail)
        } else if (Array.isArray(detail)) {
          const errorMsg = detail.map((e: any) => e.msg).join('; ')
          showError(errorMsg)
        }
      } else {
        showError('创建失败')
      }
    }
  })

  const openCreateModal = () => {
    setCreateForm({ name: '', description: '' })
    setFormErrors({})
    setIsCreateOpen(true)
  }

  const closeCreateModal = () => {
    setIsCreateOpen(false)
    setCreateForm({ name: '', description: '' })
    setFormErrors({})
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
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
          <p className="text-slate-400">管理和查看所有测试项目</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
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
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            data-testid="project-search-input"
            placeholder="搜索项目名称..."
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
          />
        </div>
      </motion.div>

      {/* Project Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            加载中...
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: Project, index: number) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="bg-slate-900 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer h-full" data-testid={`project-card-${project.id}`}>
                    <Link to={`/api/projects/${project.id}/settings`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl text-white truncate">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs mt-1">
                              #{project.key}
                            </CardDescription>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setProjectToDelete(project)
                              setIsDeleteOpen(true)
                            }}
                            data-testid={`project-delete-button-${project.id}`}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                          {project.description || '暂无描述'}
                        </p>
                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          创建于 {formatDate(project.created_at)}
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  page={page}
                  size={size}
                  total={total}
                  pages={pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <Card className="bg-slate-900 border border-white/5">
            <CardContent className="pt-12 pb-12">
              <EmptyState
                title="暂无项目"
                description="创建一个项目开始您的自动化测试之旅"
                action={
                  <button
                    onClick={openCreateModal}
                    data-testid="empty-state-create-project-button"
                    className="text-cyan-400 hover:underline text-sm mt-4"
                  >
                    立即创建
                  </button>
                }
              />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => projectToDelete && deleteMutation.mutate(projectToDelete.id)}
        title="删除项目"
        description="此操作无法撤销。确定要删除该项目吗？"
        confirmText="删除"
        isDestructive={true}
        verificationText={projectToDelete?.name}
      />

      {/* Create Project Dialog */}
      <AnimatePresence>
        {isCreateOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeCreateModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-8"
            >
              <h3 className="text-xl font-bold text-white mb-6">新建项目</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">
                    项目名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    type="text"
                    value={createForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    data-testid="project-name-input"
                    placeholder="e.g. Sisyphus接口自动化测试"
                    className={`mt-2 ${
                      formErrors.name
                        ? 'border-red-500/50 focus:border-red-500/50'
                        : 'border-white/10 focus:border-cyan-500/50'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {formErrors.name}
                    </p>
                  )}
                  {!formErrors.name && createForm.name && (
                    <p className="text-slate-500 text-xs mt-1.5">
                      {createForm.name.trim().length} / 50
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="project-description">项目描述</Label>
                  <Textarea
                    id="project-description"
                    value={createForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    data-testid="project-description-input"
                    placeholder="e.g. 包含电商核心链路的自动化测试用例集合，覆盖登录、购物车、下单等场景..."
                    rows={3}
                    className={`mt-2 resize-none ${
                      formErrors.description
                        ? 'border-red-500/50 focus:border-red-500/50'
                        : 'border-white/10 focus:border-cyan-500/50'
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {formErrors.description}
                    </p>
                  )}
                  {!formErrors.description && createForm.description && (
                    <p className="text-slate-500 text-xs mt-1.5">
                      {createForm.description.trim().length} / 200
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <Button
                  variant="ghost"
                  onClick={closeCreateModal}
                  data-testid="cancel-project-button"
                  className="text-slate-400 hover:text-white"
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (!validateForm()) {
                      return
                    }

                    const timestamp = new Date().getTime().toString().slice(-6)
                    const randomSuffix = Math.floor(Math.random() * 1000)
                      .toString()
                      .padStart(3, '0')
                    const autoKey = `PRJ_${timestamp}${randomSuffix}`

                    const payload = {
                      name: createForm.name.trim(),
                      description: createForm.description.trim() || undefined,
                      key: autoKey,
                      owner: 'auto-assigned'
                    }

                    createMutation.mutate(payload)
                  }}
                  disabled={
                    createForm.name.trim() === '' ||
                    Object.keys(formErrors).length > 0 ||
                    createMutation.isPending
                  }
                  data-testid="submit-project-button"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  创建
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
