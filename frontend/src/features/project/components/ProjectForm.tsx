// frontend/src/features/project/components/ProjectForm.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi } from '../api'
import type { Project, ProjectCreate, ProjectUpdate } from '../types'
import { useToast } from '@/components/ui/Toast'

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

interface FormState {
  name: string
  description: string
}

interface FormErrors {
  name?: string
  description?: string
}

// Helper function to get initial form state
const getInitialState = (project: Project | null): FormState => {
  if (project) {
    return { name: project.name, description: project.description || '' }
  }
  return { name: '', description: '' }
}

// Internal form component that resets when key changes
function ProjectFormInner({ project, onOpenChange }: { project: Project | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [form, setForm] = useState<FormState>(() => getInitialState(project))
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    const name = form.name.trim()
    if (!name) {
      errors.name = '项目名称不能为空'
    } else if (name.length > 50) {
      errors.name = `项目名称不能超过50个字符（当前${name.length}个字符）`
    }

    const description = form.description.trim()
    if (description && description.length > 200) {
      errors.description = `项目描述不能超过200个字符（当前${description.length}个字符）`
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: 'name' | 'description', value: string) => {
    setForm({ ...form, [field]: value })

    // Real-time validation
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

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('创建成功')
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const errorMessage = extractErrorMessage(err, '创建失败')
      toast.error(errorMessage)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProjectUpdate) => projectApi.update(project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('更新成功')
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const errorMessage = extractErrorMessage(err, '更新失败')
      toast.error(errorMessage)
    },
  })

  const extractErrorMessage = (err: unknown, defaultMessage: string): string => {
    // Type guard for axios error
    const axiosError = err as { response?: { data?: { detail?: string | Array<{ msg: string }> } }; message?: string }
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail
      if (typeof detail === 'string') {
        return detail
      } else if (Array.isArray(detail)) {
        return detail.map((e) => e.msg).join('; ')
      }
    }
    if (axiosError.message) {
      return axiosError.message
    }
    return defaultMessage
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    if (project) {
      updateMutation.mutate({
        name: form.name.trim(),
        description: form.description.trim(),
      })
    } else {
      // Auto-generate key for new project
      const timestamp = new Date().getTime().toString().slice(-6)
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const autoKey = `PRJ_${timestamp}${randomSuffix}`

      createMutation.mutate({
        name: form.name.trim(),
        description: form.description.trim(),
        key: autoKey,
        owner: 'auto-assigned',
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-8"
      >
        <h3 className="text-xl font-bold text-white mb-6">
          {project ? '编辑项目' : '新建项目'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2 font-medium">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Sisyphus接口自动化测试"
              className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white focus:outline-none placeholder:text-slate-600 transition-colors ${
                formErrors.name
                  ? 'border-red-500/50 focus:border-red-500/50'
                  : 'border-white/10 focus:border-cyan-500/50'
              }`}
            />
            {formErrors.name && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formErrors.name}
              </p>
            )}
            {!formErrors.name && form.name && (
              <p className="text-slate-500 text-xs mt-1.5">
                {form.name.trim().length} / 50
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">项目描述</label>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g. 包含电商核心链路的自动化测试用例集合..."
              rows={3}
              className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white resize-none focus:outline-none placeholder:text-slate-600 transition-colors ${
                formErrors.description
                  ? 'border-red-500/50 focus:border-red-500/50'
                  : 'border-white/10 focus:border-cyan-500/50'
              }`}
            />
            {formErrors.description && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formErrors.description}
              </p>
            )}
            {!formErrors.description && form.description && (
              <p className="text-slate-500 text-xs mt-1.5">
                {form.description.trim().length} / 200
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={form.name.trim() === '' || Object.keys(formErrors).length > 0 || isLoading}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {project ? '保存' : '创建'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  // Use key to force remount when project or open changes, which resets form state
  const formKey = `${project?.id || 'new'}-${open}`

  return (
    <AnimatePresence>
      {open && (
        <ProjectFormInner
          key={formKey}
          project={project}
          onOpenChange={onOpenChange}
        />
      )}
    </AnimatePresence>
  )
}
