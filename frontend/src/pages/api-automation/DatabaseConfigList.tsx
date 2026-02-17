
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { projectsApi } from '@/api/client';
import {
    Database,
    Plus,
    Trash2,
    ArrowLeft,
    Loader2,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Copy,
    Edit2,
    HelpCircle
} from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import { motion } from 'framer-motion';
import { Tooltip } from '@/components/ui/tooltip';

interface DataSource {
    id: number;
    name: string;
    db_type: string;
    host: string;
    port: number;
    db_name?: string;
    username?: string;
    variable_name?: string;
    is_enabled: boolean;
    status?: string; // connected, error, unchecked
    last_test_at?: string;
    error_msg?: string;
}

export default function DatabaseConfigList() {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success, error } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDs, setEditingDs] = useState<DataSource | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Fetch Project Info (for header)
    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(Number(projectId)),
        enabled: !!projectId,
        select: (res) => res.data
    });

    // Fetch DataSources
    const { data: dataSources = [], isLoading, refetch } = useQuery({
        queryKey: ['datasources', projectId],
        queryFn: () => projectsApi.listDataSources(Number(projectId)),
        enabled: !!projectId,
        refetchInterval: 30000, // Auto-refresh every 30s to see status updates
        select: (res) => res.data
    });

    // Toggle Enable Mutation
    const toggleMutation = useMutation({
        mutationFn: (ds: DataSource) =>
            projectsApi.updateDataSource(Number(projectId), ds.id, { is_enabled: !ds.is_enabled } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] });
        },
        onError: () => error('更新状态失败')
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => projectsApi.deleteDataSource(Number(projectId), id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] });
            setDeleteId(null);
            success('删除成功');
        },
        onError: () => error('删除失败')
    });

    const handleCopyConfig = (ds: DataSource) => {
        const config = {
            host: ds.host,
            port: ds.port,
            init_db: ds.db_name,
            user: ds.username,
            password: '***' // Hide password
        };
        navigator.clipboard.writeText(JSON.stringify(config));
        success('配置信息已复制到剪贴板');
    };

    const getStatusBadge = (ds: DataSource) => {
        if (!ds.is_enabled) return <span className="text-slate-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Disabled</span>;

        switch (ds.status) {
            case 'connected':
                return <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>;
            case 'error':
                return <span className="text-red-400 text-xs flex items-center gap-1" title={ds.error_msg}><XCircle className="w-3 h-3" /> Error</span>;
            default:
                return <span className="text-slate-400 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking</span>;
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] p-6 md:p-8 flex flex-col">
            {/* Header */}
            <motion.div
                className="flex items-center justify-between mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/api/projects')}
                        className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Database className="w-6 h-6 text-cyan-500" />
                            数据库配置
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">{project?.name || 'Loading...'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="刷新状态"
                    >
                        <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setEditingDs(null); setIsCreateOpen(true); }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2"
                        data-testid="add-database-config-button"
                    >
                        <Plus className="w-4 h-4" />
                        新增配置
                    </motion.button>
                </div>
            </motion.div>

            {/* List */}
            <motion.div
                className="flex-1 bg-slate-900 border border-white/5 rounded-3xl shadow-xl overflow-hidden flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                data-testid="database-config-list"
            >
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-800/50 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">连接名称</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">引用变量</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">配置信息</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400 relative">
                                <div className="flex items-center gap-1">
                                    连接状态
                                    <Tooltip content="默认每10分钟自动检测一次连接状态" position="top">
                                        <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
                                    </Tooltip>
                                </div>
                            </th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">启用状态</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400 text-left">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dataSources.map((ds: DataSource, index: number) => (
                            <motion.tr
                                key={ds.id}
                                className="hover:bg-white/5 transition-colors group"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 + index * 0.05 }}
                                data-testid={`database-config-item-${ds.id}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{ds.name}</div>
                                    <div className="text-xs text-slate-500 uppercase mt-0.5">{ds.db_type}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {ds.variable_name ? (
                                        <div className="flex items-center gap-2">
                                            <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400 text-xs font-mono">
                                                ${`{${ds.variable_name}}`}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    const fullVar = '${' + ds.variable_name + '}'
                                                    navigator.clipboard.writeText(fullVar)
                                                    success(`变量 ${fullVar} 已复制到剪贴板`)
                                                }}
                                                className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors"
                                                title="复制变量"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                                    {ds.host}:{ds.port}/{ds.db_name}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 items-start">
                                        {getStatusBadge(ds)}
                                        {ds.last_test_at && (
                                            <span className="text-[10px] text-slate-600">
                                                Last: {new Date(ds.last_test_at + 'Z').toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge
                                        active={ds.is_enabled}
                                        activeLabel="已启用"
                                        inactiveLabel="已禁用"
                                        onClick={() => toggleMutation.mutate(ds)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <div className="flex justify-start gap-2">
                                        <button
                                            onClick={() => handleCopyConfig(ds)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            title="复制配置"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingDs(ds); setIsCreateOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                            title="编辑"
                                            data-testid={`edit-database-config-button-${ds.id}`}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(ds.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            title="删除"
                                            data-testid={`delete-database-config-button-${ds.id}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                        {dataSources.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={6}>
                                    <EmptyState
                                        title="暂无数据库配置"
                                        description="请点击右上角添加新的数据库配置"
                                        icon={Database}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </motion.div>

            {/* Modal - Reusing/Creating Create/Edit Modal */}
            {isCreateOpen && (
                <DatabaseConfigModal
                    isOpen={isCreateOpen}
                    onClose={() => {
                        setIsCreateOpen(false);
                        setEditingDs(null);
                        // 立即刷新数据列表
                        setTimeout(() => refetch(), 100);
                    }}
                    projectId={Number(projectId)}
                    projectName={project?.name || ''}
                    editData={editingDs || undefined} // Pass editing data
                />
            )}

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="删除配置"
                description="确定要删除该数据库配置吗？"
                confirmText="删除"
                isDestructive
            />
        </div>
    );
}
