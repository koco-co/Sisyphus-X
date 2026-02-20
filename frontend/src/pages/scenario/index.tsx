
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    Workflow,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi, projectsApi } from '@/api/client';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/common/EmptyState';
import { Tooltip } from '@/components/ui/tooltip';

interface Scenario {
    id: string;
    name: string;
    description?: string;
    project_id: string;
    priority: string;
    tags?: string[];
    created_at?: string;
    updated_at?: string;
    steps?: any[];
}

interface Project {
    id: number;
    name: string;
    key: string;
}

const PRIORITY_COLORS: Record<string, string> = {
    P0: 'bg-red-500/10 text-red-400 border-red-500/20',
    P1: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    P2: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    P3: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function ScenarioListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const size = 10;

    // 删除状态
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);

    // 获取项目列表
    const { data: projectData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data
    });
    const projects: Project[] = projectData?.items || [];

    // 获取场景列表
    const { data: scenarioData, isLoading } = useQuery({
        queryKey: ['scenarios', page, size, searchQuery, selectedProjectId],
        queryFn: () => scenariosApi.list({
            page,
            size,
            search: searchQuery || undefined,
            project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
        }),
        select: (data) => data.data
    });

    const scenarios: Scenario[] = scenarioData?.items || [];
    const total = scenarioData?.total || 0;
    const pages = scenarioData?.pages || 0;

    // 删除场景
    const deleteMutation = useMutation({
        mutationFn: (id: number) => scenariosApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scenarios'] });
            setIsDeleteOpen(false);
            setScenarioToDelete(null);
            success('删除成功');
        },
        onError: () => showError('删除失败')
    });

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const getProjectName = (projectId: string) => {
        const p = projects.find(p => String(p.id) === String(projectId));
        return p?.name || projectId;
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
                        <Workflow className="w-8 h-8 text-cyan-500" />
                        {t('scenarios.title')}
                    </h1>
                    <p className="text-slate-400">管理和编排自动化测试执行链路</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/scenarios/editor/new')}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    {t('scenarios.newScenario')}
                </motion.button>
            </motion.header>

            {/* 工具栏 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-4 items-center"
            >
                {/* 项目筛选 */}
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

                {/* 搜索 */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="搜索场景名称..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>
            </motion.div>

            {/* 列表 */}
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
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[180px]">场景名称</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[250px]">场景描述</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">所属项目</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[80px]">优先级</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[80px]">步骤数</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">更新时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[100px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {scenarios.length > 0 ? (
                                scenarios.map((scenario, index) => (
                                    <motion.tr
                                        key={scenario.id}
                                        className="hover:bg-white/5 transition-colors group"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <td className="px-6 py-4 w-[180px]">
                                            <Tooltip content={scenario.name} position="top">
                                                <span
                                                    className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full cursor-pointer"
                                                    onClick={() => navigate(`/scenarios/editor/${scenario.id}`)}
                                                >
                                                    {scenario.name}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 w-[250px]">
                                            <Tooltip content={scenario.description || '-'} position="top">
                                                <span className="truncate block w-full">
                                                    {scenario.description || '-'}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">
                                            {getProjectName(scenario.project_id)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${PRIORITY_COLORS[scenario.priority] || PRIORITY_COLORS.P2}`}>
                                                {scenario.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {scenario.steps?.length || 0}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(scenario.updated_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Tooltip content="编辑" position="top">
                                                    <button
                                                        onClick={() => navigate(`/scenarios/editor/${scenario.id}`)}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="删除" position="top">
                                                    <button
                                                        onClick={() => { setScenarioToDelete(scenario); setIsDeleteOpen(true); }}
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
                                    <td colSpan={7}>
                                        <EmptyState
                                            title="暂无场景"
                                            description="创建一个场景开始编排自动化测试"
                                            icon={Workflow}
                                            action={
                                                <button
                                                    onClick={() => navigate('/scenarios/editor/new')}
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

                {/* 分页 */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
                        <Pagination
                            page={page}
                            size={size}
                            total={total}
                            pages={pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </motion.div>

            {/* 删除确认 */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => scenarioToDelete && deleteMutation.mutate(Number(scenarioToDelete.id))}
                title="删除场景"
                description="请输入场景名称确认删除。此操作无法撤销。"
                confirmText="删除"
                isDestructive={true}
                verificationText={scenarioToDelete?.name}
            />
        </div>
    );
}
