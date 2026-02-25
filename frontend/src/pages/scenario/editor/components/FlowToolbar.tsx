import { useTranslation } from 'react-i18next';
import { Play, Save, Layout, Share2, MousePointer2, Download, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { scenariosApi, projectsApi } from '@/api/client';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function FlowToolbar() {
    const { t } = useTranslation();
    const { nodes, edges } = useScenarioEditor();
    const queryClient = useQueryClient();
    const { id } = useParams();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveForm, setSaveForm] = useState({ name: '', project_id: '' });

    // Fetch projects for the dropdown
    const { data: projectData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data
    });
    const projects = projectData?.items || [];

    // Pre-fill form if editing
    useEffect(() => {
        if (id && id !== 'new') {
            const fetchScenario = async () => {
                try {
                    const res = await scenariosApi.get(id);
                    if (res?.data?.data) {
                        setSaveForm({
                            name: res.data.data.name || '',
                            project_id: res.data.data.project_id || ''
                        });
                    }
                } catch {
                    console.error('Failed to fetch scenario details');
                }
            };
            fetchScenario();
        }
    }, [id]);

    // 保存场景
    const saveMutation = useMutation({
        mutationFn: async () => {
            setIsSaving(true);
            const scenarioData = {
                project_id: saveForm.project_id,
                name: saveForm.name,
                created_by: 'system', // TODO: 从当前用户上下文获取
            };

            if (id && id !== 'new') {
                return await scenariosApi.update(id, scenarioData);
            } else {
                return await scenariosApi.create({ ...scenarioData, project_id: saveForm.project_id });
            }
        },
        onSuccess: (response) => {
            toast.success('场景保存成功');
            setIsSaveModalOpen(false);

            // 如果是新建场景，跳转到新创建的场景 ID
            if (id === 'new' || !id) {
                const newId = response.data.data?.id;
                if (newId) {
                    navigate(`/scenarios/editor/${newId}`, { replace: true });
                }
            }
            queryClient.invalidateQueries({ queryKey: ['scenarios'] });
        },
        onError: (error: unknown) => {
            const msg = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
                : (error as Error)?.message;
            toast.error(`保存失败: ${msg || '未知错误'}`);
        },
        onSettled: () => {
            setIsSaving(false);
        }
    });

    const handleSaveClick = () => {
        setIsSaveModalOpen(true);
    };

    // 运行场景
    const runMutation = useMutation({
        mutationFn: async () => {
            setIsRunning(true);
            const _scenarioId = id && id !== 'new' ? id : '0';
            // TODO: 实现场景运行逻辑
            return { success: true };
        },
        onSuccess: (data) => {
            toast.success('场景执行成功');
            console.log('Execution result:', data);
        },
        onError: (error: unknown) => {
            const msg = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
                : (error as Error)?.message;
            toast.error(`执行失败: ${msg || '未知错误'}`);
        },
        onSettled: () => {
            setIsRunning(false);
        }
    });

    // 导出场景
    const handleExport = () => {
        const data = { nodes, edges };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scenario-${id || 'new'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('场景已导出');
    };

    return (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
                    <button className="p-2 rounded-xl text-white bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 transition-all">
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <Layout className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <button
                        onClick={handleExport}
                        className="h-9 px-4 flex items-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        {t('common.export')}
                    </button>
                    <button className="h-9 px-4 flex items-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                        <Share2 className="w-4 h-4" />
                        {t('common.share')}
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving || nodes.length === 0}
                        className="h-9 px-4 flex items-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? '保存中...' : t('common.save')}
                    </button>
                    <motion.button
                        onClick={() => runMutation.mutate()}
                        disabled={isRunning || nodes.length === 0}
                        whileHover={{ scale: isRunning ? 1 : 1.02 }}
                        whileTap={{ scale: isRunning ? 1 : 0.98 }}
                        className="h-9 px-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        {isRunning ? '执行中...' : t('scenarios.runScenario')}
                    </motion.button>
                </div>
            </div>

            {/* Save Modal */}
            <AnimatePresence>
                {isSaveModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">
                                    {id === 'new' ? '保存新场景' : '更新场景属性'}
                                </h3>
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">
                                        场景名称 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={saveForm.name}
                                        onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                                        placeholder="例如: 核心业务链路测试"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">
                                        所属项目 <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={saveForm.project_id}
                                        onChange={(e) => setSaveForm({ ...saveForm, project_id: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    >
                                        <option value="">请选择项目</option>
                                        {projects.map((p: { id: string; name: string }) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!saveForm.name.trim() || !saveForm.project_id || saveMutation.isPending}
                                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
                                >
                                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    确认保存
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
