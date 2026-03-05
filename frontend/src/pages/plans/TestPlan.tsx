import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    X,
    Workflow,
    Play,
    GripVertical,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi, projectsApi, scenariosApi } from '@/api/client';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { Tooltip } from '@/components/ui/tooltip';

interface TestPlanItem {
    id: string;
    name: string;
    project_id: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    plan_scenarios?: unknown[];
}

interface Project {
    id: number;
    name: string;
    key: string;
}

interface Scenario {
    id: string;
    name: string;
    description?: string;
    priority: string;
    tags?: string[];
}

interface PlanScenarioItem {
    id: string;
    scenario_id: string;
    scenario_name?: string;
    execution_order: number;
    created_at?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
    P0: 'bg-red-500/10 text-red-400 border-red-500/20',
    P1: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    P2: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    P3: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function TestPlan() {
    const navigate = useNavigate();
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<TestPlanItem | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<TestPlanItem | null>(null);
    const [createForm, setCreateForm] = useState({ name: '', project_id: '', description: '' });

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerPlanId, setDrawerPlanId] = useState<string | null>(null);
    const [scenarioSearchQuery, setScenarioSearchQuery] = useState('');
    const [scenarioPage, setScenarioPage] = useState(1);

    const [jenkinsExpanded, setJenkinsExpanded] = useState(false);
    const [webhookExpanded, setWebhookExpanded] = useState(false);

    // --- Data queries ---

    const { data: projectData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data
    });
    const projects: Project[] = projectData?.items || [];

    const { data: planData, isLoading } = useQuery({
        queryKey: ['plans', page, pageSize, searchQuery, selectedProjectId],
        queryFn: () => plansApi.list({
            page,
            size: pageSize,
            search: searchQuery.trim() || undefined,
            project_id: selectedProjectId || undefined,
        }),
        select: (data) => data.data
    });

    const plans: TestPlanItem[] = planData?.items || [];
    const total = planData?.total || 0;
    const pages = planData?.pages || 0;

    const { data: scenarioData, isLoading: scenariosLoading } = useQuery({
        queryKey: ['scenarios-for-plan', scenarioPage, scenarioSearchQuery, editingPlan?.project_id || createForm.project_id],
        queryFn: () => scenariosApi.list({
            page: scenarioPage,
            size: 10,
            search: scenarioSearchQuery || undefined,
            project_id: (editingPlan?.project_id || createForm.project_id) || undefined,
        }),
        select: (data) => data.data,
        enabled: isDrawerOpen,
    });

    const availableScenarios: Scenario[] = scenarioData?.items || [];
    const scenarioTotalPages = scenarioData?.pages || 0;

    // Fetch associated scenarios when editing a plan
    const { data: planScenariosData, refetch: refetchPlanScenarios } = useQuery({
        queryKey: ['plan-scenarios', editingPlan?.id],
        queryFn: async () => {
            const res = await plansApi.listScenarios(editingPlan!.id);
            return (res.data?.items ?? res.data) as PlanScenarioItem[];
        },
        enabled: !!editingPlan,
    });
    const planScenarios: PlanScenarioItem[] = planScenariosData || [];

    // --- Mutations ---

    const createMutation = useMutation({
        mutationFn: (data: { name: string; project_id: string; description?: string }) => plansApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            closeCreateModal();
            toast.success('创建成功');
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(msg || '创建失败');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
            plansApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            closeCreateModal();
            toast.success('编辑成功');
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(msg || '编辑失败');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => plansApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            setIsDeleteOpen(false);
            setPlanToDelete(null);
            toast.success('删除成功');
        },
        onError: () => toast.error('删除失败')
    });

    const addScenarioMutation = useMutation({
        mutationFn: ({ planId, scenarioId, executionOrder }: { planId: string; scenarioId: string; executionOrder: number }) =>
            plansApi.addScenario(planId, { scenario_id: scenarioId, execution_order: executionOrder }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            refetchPlanScenarios();
            toast.success('场景已添加');
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(msg || '添加失败');
        },
    });

    const removeScenarioMutation = useMutation({
        mutationFn: ({ planId, scenarioId }: { planId: string; scenarioId: string }) =>
            plansApi.removeScenario(planId, scenarioId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            refetchPlanScenarios();
            toast.success('场景已移除');
        },
        onError: () => toast.error('移除失败'),
    });

    const reorderMutation = useMutation({
        mutationFn: ({ planId, items }: { planId: string; items: Array<{ scenario_id: string; execution_order: number }> }) =>
            plansApi.reorderScenarios(planId, items),
        onSuccess: () => {
            refetchPlanScenarios();
        },
        onError: () => toast.error('排序失败'),
    });

    // --- Helpers ---

    const openCreateModal = () => {
        setEditingPlan(null);
        setCreateForm({ name: '', project_id: '', description: '' });
        setIsCreateOpen(true);
    };

    const openEditModal = (plan: TestPlanItem) => {
        setEditingPlan(plan);
        setCreateForm({
            name: plan.name,
            project_id: plan.project_id || '',
            description: plan.description || '',
        });
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        setEditingPlan(null);
        setCreateForm({ name: '', project_id: '', description: '' });
    };

    const openScenarioDrawer = useCallback((planId: string) => {
        setDrawerPlanId(planId);
        setIsDrawerOpen(true);
        setScenarioSearchQuery('');
        setScenarioPage(1);
    }, []);

    const getProjectName = (projectId: string) => {
        const p = projects.find(p => String(p.id) === String(projectId));
        return p?.name || projectId || '-';
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const handleSavePlan = () => {
        if (!createForm.name.trim() || !createForm.project_id) {
            toast.error('请填写必填项');
            return;
        }
        if (editingPlan) {
            updateMutation.mutate({
                id: editingPlan.id,
                name: createForm.name.trim(),
                description: createForm.description.trim() || undefined,
            });
        } else {
            createMutation.mutate({
                name: createForm.name.trim(),
                project_id: createForm.project_id,
                description: createForm.description.trim() || undefined,
            });
        }
    };

    const handleMoveScenario = (index: number, direction: 'up' | 'down') => {
        if (!editingPlan) return;
        const list = [...planScenarios];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
        const items = list.map((s, i) => ({ scenario_id: s.scenario_id, execution_order: i }));
        reorderMutation.mutate({ planId: editingPlan.id, items });
    };

    const handleAddScenarioFromDrawer = (scenario: Scenario) => {
        const targetPlanId = drawerPlanId || editingPlan?.id;
        if (!targetPlanId) return;
        const nextOrder = planScenarios.length;
        addScenarioMutation.mutate({
            planId: targetPlanId,
            scenarioId: scenario.id,
            executionOrder: nextOrder,
        });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <motion.header
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-cyan-500" />
                        测试计划
                    </h1>
                    <p className="text-slate-400">编排测试场景，组织完整的测试流程</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openCreateModal}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    新建计划
                </motion.button>
            </motion.header>

            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-4 items-center"
            >
                <select
                    value={selectedProjectId}
                    onChange={(e) => { setSelectedProjectId(e.target.value); setPage(1); }}
                    className="h-12 rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                    <option value="">全部项目</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
                        placeholder="搜索计划名称..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>
            </motion.div>

            {/* Plan list table */}
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
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[200px]">计划名称</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[250px]">描述</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">所属项目</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[80px]">场景数</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">更新时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[140px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {plans.length > 0 ? (
                                plans.map((plan, index) => (
                                    <motion.tr
                                        key={plan.id}
                                        className="hover:bg-white/5 transition-colors group"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <td className="px-6 py-4 w-[200px]">
                                            <Tooltip content={plan.name} position="top">
                                                <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full">
                                                    {plan.name}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 w-[250px]">
                                            <span className="truncate block w-full">
                                                {plan.description || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">
                                            {getProjectName(plan.project_id)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-md text-xs font-medium">
                                                {plan.plan_scenarios?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(plan.updated_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Tooltip content="编辑" position="top">
                                                    <button
                                                        onClick={() => openEditModal(plan)}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="添加场景" position="top">
                                                    <button
                                                        onClick={() => openScenarioDrawer(plan.id)}
                                                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Workflow className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="执行" position="top">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const res = await plansApi.execute(plan.id);
                                                                const executionId = (res.data as { execution_id?: string })?.execution_id;
                                                                if (executionId) {
                                                                    toast.success('已开始执行');
                                                                    navigate(`/plans/${plan.id}/executions/${executionId}`);
                                                                } else {
                                                                    toast.error('执行失败：未返回执行 ID');
                                                                }
                                                            } catch {
                                                                toast.error('执行失败');
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="删除" position="top">
                                                    <button
                                                        onClick={() => { setPlanToDelete(plan); setIsDeleteOpen(true); }}
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
                                            title="暂无测试计划"
                                            description="创建测试计划，编排您的测试场景"
                                            icon={Calendar}
                                            action={
                                                <button
                                                    onClick={openCreateModal}
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

                {total > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
                        <Pagination
                            page={page}
                            size={pageSize}
                            total={total}
                            pages={pages}
                            onPageChange={setPage}
                            onSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
                        />
                    </div>
                )}
            </motion.div>

            {/* Delete confirmation */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => planToDelete && deleteMutation.mutate(planToDelete.id)}
                title="删除测试计划"
                description="请输入计划名称确认删除。此操作无法撤销。"
                confirmText="删除"
                isDestructive={true}
                verificationText={planToDelete?.name}
            />

            {/* Create / Edit panel */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeCreateModal}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-white mb-6">
                                    {editingPlan ? '编辑计划' : '新建测试计划'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2 font-medium">
                                            计划名称 <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                            placeholder="例如: 核心链路回归测试"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2 font-medium">
                                            所属项目 <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={createForm.project_id}
                                            onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                                            disabled={!!editingPlan}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
                                        >
                                            <option value="">请选择项目</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-2">描述</label>
                                        <textarea
                                            value={createForm.description}
                                            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                            placeholder="测试计划描述..."
                                            rows={3}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                                        />
                                    </div>

                                    {/* Associated scenarios (only when editing) */}
                                    {editingPlan && (
                                        <div className="border-t border-white/5 pt-4 mt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-white font-medium text-sm flex items-center gap-2">
                                                    <Workflow className="w-4 h-4 text-cyan-400" />
                                                    关联场景
                                                    <span className="text-xs text-slate-500">({planScenarios.length})</span>
                                                </h4>
                                                <button
                                                    onClick={() => openScenarioDrawer(editingPlan.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> 添加场景
                                                </button>
                                            </div>

                                            {planScenarios.length === 0 ? (
                                                <div className="text-center py-6 text-slate-500 text-sm bg-slate-800/30 rounded-xl border border-dashed border-white/10">
                                                    <Workflow className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                    暂无关联场景，点击上方按钮添加
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                                                    {planScenarios.map((ps, idx) => (
                                                        <motion.div
                                                            key={ps.id}
                                                            layout
                                                            className="flex items-center gap-3 p-3 bg-slate-800/50 border border-white/5 rounded-xl group hover:border-white/10 transition-colors"
                                                        >
                                                            <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />

                                                            <span className="text-xs text-slate-500 font-mono w-5 text-right flex-shrink-0">
                                                                {idx + 1}
                                                            </span>

                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-white text-sm truncate block">
                                                                    {ps.scenario_name || ps.scenario_id}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleMoveScenario(idx, 'up')}
                                                                    disabled={idx === 0 || reorderMutation.isPending}
                                                                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                                                    title="上移"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveScenario(idx, 'down')}
                                                                    disabled={idx === planScenarios.length - 1 || reorderMutation.isPending}
                                                                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                                                    title="下移"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => removeScenarioMutation.mutate({
                                                                        planId: editingPlan.id,
                                                                        scenarioId: ps.scenario_id,
                                                                    })}
                                                                    disabled={removeScenarioMutation.isPending}
                                                                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                                    title="移除"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Jenkins (placeholder) */}
                                    <div className="border border-white/5 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setJenkinsExpanded((v) => !v)}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left text-slate-400 hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-sm font-medium">Jenkins 环境（预留）</span>
                                            {jenkinsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        {jenkinsExpanded && (
                                            <div className="px-4 pb-3 text-slate-500 text-sm">敬请期待：后续版本将支持 Jenkins 环境配置。</div>
                                        )}
                                    </div>

                                    {/* Webhook (placeholder) */}
                                    <div className="border border-white/5 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setWebhookExpanded((v) => !v)}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left text-slate-400 hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-sm font-medium">Webhook 配置（预留）</span>
                                            {webhookExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        {webhookExpanded && (
                                            <div className="px-4 pb-3 text-slate-500 text-sm">敬请期待：后续版本将支持 Webhook 通知配置。</div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-8">
                                    <button
                                        onClick={closeCreateModal}
                                        className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleSavePlan}
                                        disabled={!createForm.name.trim() || !createForm.project_id || createMutation.isPending || updateMutation.isPending}
                                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {editingPlan ? '保存' : '创建'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Scenario selection drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDrawerOpen(false)}
                        />
                        <motion.div
                            className="fixed right-0 top-0 h-full w-[480px] z-50 bg-slate-900 border-l border-white/10 shadow-2xl overflow-y-auto"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">添加测试场景</h3>
                                    <button
                                        onClick={() => setIsDrawerOpen(false)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={scenarioSearchQuery}
                                        onChange={(e) => { setScenarioSearchQuery(e.target.value); setScenarioPage(1); }}
                                        placeholder="搜索场景名称..."
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                                    />
                                </div>

                                {scenariosLoading ? (
                                    <div className="flex justify-center py-10 text-slate-500">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
                                    </div>
                                ) : availableScenarios.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">暂无可添加的场景</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {availableScenarios.map((scenario) => {
                                            const alreadyAdded = planScenarios.some(ps => ps.scenario_id === scenario.id);
                                            return (
                                                <div
                                                    key={scenario.id}
                                                    className="flex items-center justify-between p-4 bg-slate-800/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <p className="text-white text-sm font-medium truncate">
                                                            {scenario.name}
                                                        </p>
                                                        <p className="text-slate-500 text-xs mt-1 truncate">
                                                            {scenario.description || '-'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_STYLES[scenario.priority] || PRIORITY_STYLES.P2}`}>
                                                                {scenario.priority}
                                                            </span>
                                                            {scenario.tags?.slice(0, 2).map((tag, i) => (
                                                                <span key={i} className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {alreadyAdded ? (
                                                        <span className="px-3 py-1.5 text-xs text-slate-500 bg-slate-700/30 rounded-lg">已添加</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddScenarioFromDrawer(scenario)}
                                                            disabled={addScenarioMutation.isPending}
                                                            className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> 添加
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {scenarioTotalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                        <span>第 {scenarioPage} / {scenarioTotalPages} 页</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setScenarioPage(Math.max(1, scenarioPage - 1))}
                                                disabled={scenarioPage <= 1}
                                                className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                            >
                                                上一页
                                            </button>
                                            <button
                                                onClick={() => setScenarioPage(Math.min(scenarioTotalPages, scenarioPage + 1))}
                                                disabled={scenarioPage >= scenarioTotalPages}
                                                className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                            >
                                                下一页
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
