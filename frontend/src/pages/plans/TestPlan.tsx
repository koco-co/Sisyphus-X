import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Calendar, Plus, Search, Play, Pause, Edit, Trash2, Clock, Loader2, Square, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi, scenariosApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { useToast } from '@/hooks/use-toast'

interface TestPlanItem {
    id: number
    name: string
    scenario_id: number
    scenario_name?: string
    cron_expression: string
    next_run?: string
    last_run?: string
    status: string
}

export default function TestPlan() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const [showModal, setShowModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<TestPlanItem | null>(null)
    const [executingPlanId, setExecutingPlanId] = useState<number | null>(null)

    // 表单状态
    const [formData, setFormData] = useState({
        name: '',
        scenario_id: 0,
        cron_expression: '',
    })

    // 获取测试计划列表
    const { data: plansData, isLoading } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const res = await plansApi.list()
            return (res.data?.items ?? res.data ?? []) as TestPlanItem[]
        }
    })

    // 获取场景列表（用于下拉选择）
    const { data: scenarios = [] } = useQuery({
        queryKey: ['scenarios'],
        queryFn: async () => {
            const res = await scenariosApi.list()
            return (res.data?.items ?? res.data ?? []) as { id: number; name: string }[]
        }
    })

    // 创建计划
    const createMutation = useMutation({
        mutationFn: (data: { name: string; scenario_id: number; cron_expression: string }) =>
            plansApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] })
            setShowModal(false)
            setFormData({ name: '', scenario_id: 0, cron_expression: '' })
        }
    })

    // 暂停计划
    const pauseMutation = useMutation({
        mutationFn: (id: number) => plansApi.pause(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] })
    })

    // 恢复计划
    const resumeMutation = useMutation({
        mutationFn: (id: number) => plansApi.resume(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] })
    })

    // 删除计划
    const deleteMutation = useMutation({
        mutationFn: (id: number) => plansApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] })
            setDeleteTarget(null)
            toast({
                title: '删除成功',
                description: '测试计划已删除'
            })
        }
    })

    // 执行测试计划
    const executeMutation = useMutation({
        mutationFn: (id: number) => plansApi.execute(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] })
            toast({
                title: '执行开始',
                description: '测试计划已开始执行'
            })
            setExecutingPlanId(null)
        },
        onError: () => {
            setExecutingPlanId(null)
        }
    })

    // 终止执行
    const terminateMutation = useMutation({
        mutationFn: (id: number) => plansApi.terminate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] })
            toast({
                title: '已终止',
                description: '测试执行已终止'
            })
        }
    })

    const handleSubmit = () => {
        if (!formData.name || !formData.scenario_id || !formData.cron_expression) return
        createMutation.mutate(formData)
    }

    const filteredPlans = (plansData ?? []).filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-8">
            {/* 页面标题 */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-cyan-400" />
                        {t('plans.title')}
                    </h1>
                    <p className="text-slate-400 mt-1">配置定时执行任务，自动化运行测试</p>
                </div>
                <motion.button
                    data-testid="create-plan-button"
                    onClick={() => setShowModal(true)}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    <span>{t('plans.newPlan')}</span>
                </motion.button>
            </motion.div>

            {/* 搜索 */}
            <motion.div
                className="flex gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索计划..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                </div>
            </motion.div>

            {/* 加载状态 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            ) : (
                /* 计划列表 */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredPlans.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            data-testid={`plan-card-${plan.id}`}
                            data-testid-plan={plan.id}
                            className="p-6 rounded-2xl glass border border-white/5 hover:border-cyan-500/30 transition-all group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                                        {plan.status === 'active' || plan.status === 'running' ? (
                                            <span
                                                data-testid={`execution-status-${plan.id}`}
                                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                运行中
                                            </span>
                                        ) : plan.status === 'paused' ? (
                                            <span
                                                data-testid={`execution-status-${plan.id}`}
                                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                已暂停
                                            </span>
                                        ) : (
                                            <span
                                                data-testid={`execution-status-${plan.id}`}
                                                className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500"
                                            >
                                                待执行
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {plan.scenario_name || `场景 #${plan.scenario_id}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* 执行按钮 */}
                                    <button
                                        data-testid="execute-button"
                                        onClick={() => {
                                            setExecutingPlanId(plan.id)
                                            executeMutation.mutate(plan.id)
                                        }}
                                        className="p-2 rounded-lg text-cyan-400 hover:bg-white/5 transition-colors"
                                        disabled={executeMutation.isPending || executingPlanId === plan.id}
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>

                                    {/* 暂停/恢复按钮 */}
                                    {plan.status === 'active' || plan.status === 'running' ? (
                                        <button
                                            data-testid="pause-button"
                                            onClick={() => pauseMutation.mutate(plan.id)}
                                            className="p-2 rounded-lg text-amber-400 hover:bg-white/5 transition-colors"
                                            disabled={pauseMutation.isPending}
                                        >
                                            <Pause className="w-4 h-4" />
                                        </button>
                                    ) : plan.status === 'paused' ? (
                                        <button
                                            data-testid="resume-button"
                                            onClick={() => resumeMutation.mutate(plan.id)}
                                            className="p-2 rounded-lg text-emerald-400 hover:bg-white/5 transition-colors"
                                            disabled={resumeMutation.isPending}
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    ) : null}

                                    {/* 终止按钮 */}
                                    {(plan.status === 'active' || plan.status === 'running' || plan.status === 'paused') && (
                                        <button
                                            data-testid="terminate-button"
                                            onClick={() => terminateMutation.mutate(plan.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-white/5 transition-colors"
                                            disabled={terminateMutation.isPending}
                                        >
                                            <Square className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        data-testid="edit-plan-button"
                                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        data-testid="delete-plan-button"
                                        onClick={() => setDeleteTarget(plan)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-400">{t('plans.cronExpression')}:</span>
                                    <code className="px-2 py-0.5 rounded bg-white/5 text-cyan-400 font-mono text-xs">
                                        {plan.cron_expression}
                                    </code>
                                </div>
                                {plan.next_run && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span className="text-slate-400">{t('plans.nextExecution')}:</span>
                                        <span className="text-white">{plan.next_run}</span>
                                    </div>
                                )}
                                {plan.last_run && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span className="text-slate-400">{t('plans.lastExecution')}:</span>
                                        <span className="text-slate-300">{plan.last_run}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {/* 添加计划卡片 */}
                    <motion.button
                        onClick={() => setShowModal(true)}
                        className="p-6 rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-cyan-400 min-h-[200px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <Plus className="w-10 h-10" />
                        <span className="font-medium">{t('plans.newPlan')}</span>
                    </motion.button>
                </div>
            )}

            {/* 新建计划模态框 */}
            {showModal && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setShowModal(false)}
                >
                    <motion.div
                        className="w-full max-w-lg bg-slate-900 rounded-3xl border border-white/10 p-8"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold text-white mb-6">{t('plans.newPlan')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">{t('plans.planName')}</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                    placeholder="输入计划名称"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">关联场景</label>
                                <CustomSelect
                                    value={formData.scenario_id || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, scenario_id: Number(val) }))}
                                    options={scenarios.map(s => ({ label: s.name, value: s.id }))}
                                    placeholder="选择测试场景"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">{t('plans.cronExpression')}</label>
                                <input
                                    value={formData.cron_expression}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cron_expression: e.target.value }))}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono focus:outline-none focus:border-cyan-500/50"
                                    placeholder="0 8 * * *"
                                />
                                <p className="text-xs text-slate-500 mt-2">示例: 每天8点执行 (0 8 * * *)</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium disabled:opacity-50"
                            >
                                {createMutation.isPending ? '保存中...' : t('common.save')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="删除测试计划"
                message={`确定要删除计划「${deleteTarget?.name}」吗？此操作无法撤销。`}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
