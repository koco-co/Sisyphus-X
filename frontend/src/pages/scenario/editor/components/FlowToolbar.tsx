import { useTranslation } from 'react-i18next';
import { Play, Save, Layout, Share2, MousePointer2, Download, X, Loader2, Settings, Sliders, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { scenariosApi, projectsApi } from '@/api/client';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { flowNodesToSteps } from '../utils/flowToSteps';

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
    const [saveForm, setSaveForm] = useState({
        name: '',
        project_id: '',
        description: '',
        priority: 'P2',
        tags: [] as string[],
        variables: {} as Record<string, string>,
        pre_sql: '',
        post_sql: '',
    });

    // 调试用：环境与数据集选择
    const [debugEnvId, setDebugEnvId] = useState<string>('');
    const [debugDatasetId, setDebugDatasetId] = useState<string>('');

    // Fetch projects for the dropdown
    const { data: projectData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data
    });
    const projects = projectData?.items || [];

    // 调试用：项目环境列表
    const { data: envData } = useQuery({
        queryKey: ['project-environments', saveForm.project_id],
        queryFn: () => projectsApi.listEnvironments(saveForm.project_id),
        enabled: !!saveForm.project_id,
        select: (d) => (d?.data?.data ?? d?.data ?? d) as Array<{ id: string; name: string }>,
    });
    const environments = Array.isArray(envData) ? envData : [];

    // 调试用：场景数据集列表
    const { data: datasetData } = useQuery({
        queryKey: ['scenario-datasets', id],
        queryFn: () => scenariosApi.listDatasets(id),
        enabled: !!id && id !== 'new',
        select: (d) => (d?.data?.data ?? d?.data ?? d) as Array<{ id: string; name: string }>,
    });
    const datasets = Array.isArray(datasetData) ? datasetData : [];

    // Pre-fill form if editing
    useEffect(() => {
        if (id && id !== 'new') {
            const fetchScenario = async () => {
                try {
                    const res = await scenariosApi.get(id);
                    if (res?.data?.data) {
                        const d = res.data.data as Record<string, unknown>;
                        setSaveForm({
                            name: (d.name as string) || '',
                            project_id: (d.project_id as string) || '',
                            description: (d.description as string) || '',
                            priority: (d.priority as string) || 'P2',
                            tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
                            variables: (typeof d.variables === 'object' && d.variables && !Array.isArray(d.variables))
                                ? (d.variables as Record<string, string>) : {},
                            pre_sql: (d.pre_sql as string) || '',
                            post_sql: (d.post_sql as string) || '',
                        });
                    }
                } catch {
                    console.error('Failed to fetch scenario details');
                }
            };
            fetchScenario();
        }
    }, [id]);

    // 保存场景（含步骤同步）
    const saveMutation = useMutation({
        mutationFn: async () => {
            setIsSaving(true);
            const scenarioData = {
                project_id: saveForm.project_id,
                name: saveForm.name,
                created_by: 'system',
                description: saveForm.description || undefined,
                priority: saveForm.priority,
                tags: saveForm.tags.length ? saveForm.tags : undefined,
                variables: Object.keys(saveForm.variables || {}).length ? saveForm.variables : undefined,
                pre_sql: saveForm.pre_sql || undefined,
                post_sql: saveForm.post_sql || undefined,
            };

            let scenarioId: string;
            if (id && id !== 'new') {
                await scenariosApi.update(id, scenarioData);
                scenarioId = id;
            } else {
                const res = await scenariosApi.create({ ...scenarioData, project_id: saveForm.project_id });
                scenarioId = (res.data?.data?.id ?? res.data?.id) as string;
            }

            const stepsToSync = flowNodesToSteps(nodes, edges);
            const scenarioRes = await scenariosApi.get(scenarioId);
            const scenario = scenarioRes?.data?.data ?? scenarioRes?.data;
            const existingSteps = (scenario?.steps ?? []) as Array<{ id: string; sort_order: number }>;

            for (const step of existingSteps) {
                if (step.sort_order >= stepsToSync.length) {
                    await scenariosApi.deleteStep(scenarioId, step.id);
                }
            }

            for (let i = 0; i < stepsToSync.length; i++) {
                await scenariosApi.createStep(scenarioId, {
                    ...stepsToSync[i],
                    sort_order: i,
                });
            }

            return { scenarioId };
        },
        onSuccess: (data) => {
            toast.success('场景保存成功');
            setIsSaveModalOpen(false);
            if (id === 'new' || !id) {
                navigate(`/scenarios/editor/${data.scenarioId}`, { replace: true });
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

    // 调试场景：调用 debug API，打开 Allure 报告
    const runMutation = useMutation({
        mutationFn: async () => {
            if (!id || id === 'new') {
                throw new Error('请先保存场景后再调试');
            }
            const payload: { environment_id?: string; dataset_id?: string } = {};
            if (debugEnvId) payload.environment_id = debugEnvId;
            if (debugDatasetId) payload.dataset_id = debugDatasetId;
            const res = await scenariosApi.debug(id, payload);
            const data = res?.data?.data ?? res?.data;
            const reportUrl = data?.report_url;
            // 调试模式不创建报告，report_url 为 null 时不打开新标签
            const fullUrl = reportUrl
                ? (reportUrl.startsWith('http') ? reportUrl : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')}${reportUrl.startsWith('/') ? '' : '/'}${reportUrl}`)
                : undefined;
            return { fullUrl, execution_id: data?.execution_id };
        },
        onSuccess: (data) => {
            toast.success('场景执行完成');
            if (data?.fullUrl) {
                window.open(data.fullUrl, '_blank');
            }
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

    const handleClose = () => navigate('/scenarios');
    const handleEnvManage = () => {
        if (saveForm.project_id) navigate(`/projects/${saveForm.project_id}/environments`);
        else toast.error('请先选择项目');
    };
    const handleGlobalParams = () => navigate('/global-params');

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
                <button
                    onClick={handleClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    title="关闭"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
                    <button className="p-2 rounded-xl text-white bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 transition-all">
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <Layout className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <button onClick={handleEnvManage} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="环境管理">
                        <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={handleGlobalParams} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="全局参数">
                        <Sliders className="w-4 h-4" />
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
                    {id && id !== 'new' && (
                        <>
                            <select
                                value={debugEnvId}
                                onChange={(e) => setDebugEnvId(e.target.value)}
                                className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
                                title="运行环境"
                            >
                                <option value="">环境(可选)</option>
                                {environments.map((e: { id: string; name: string }) => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <select
                                value={debugDatasetId}
                                onChange={(e) => setDebugDatasetId(e.target.value)}
                                className="h-9 px-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
                                title="测试数据集"
                            >
                                <option value="">数据集(可选)</option>
                                {datasets.map((d: { id: string; name: string }) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <div className="w-px h-4 bg-white/10" />
                        </>
                    )}
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
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 pb-0">
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

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">场景名称 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={saveForm.name}
                                        onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                                        placeholder="例如: 核心业务链路测试"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">所属项目 <span className="text-red-500">*</span></label>
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
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">描述</label>
                                    <textarea
                                        value={saveForm.description}
                                        onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                                        placeholder="场景描述"
                                        rows={2}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">优先级</label>
                                    <select
                                        value={saveForm.priority}
                                        onChange={(e) => setSaveForm({ ...saveForm, priority: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    >
                                        <option value="P0">P0</option>
                                        <option value="P1">P1</option>
                                        <option value="P2">P2</option>
                                        <option value="P3">P3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">标签 (逗号分隔)</label>
                                    <input
                                        type="text"
                                        value={saveForm.tags.join(', ')}
                                        onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                                        placeholder="tag1, tag2"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">场景变量 (key=value 每行一个)</label>
                                    <textarea
                                        value={Object.entries(saveForm.variables || {}).map(([k, v]) => `${k}=${v}`).join('\n')}
                                        onChange={(e) => {
                                            const obj: Record<string, string> = {};
                                            e.target.value.split('\n').forEach((line) => {
                                                const idx = line.indexOf('=');
                                                if (idx > 0) {
                                                    const k = line.slice(0, idx).trim();
                                                    if (k) obj[k] = line.slice(idx + 1).trim();
                                                }
                                            });
                                            setSaveForm({ ...saveForm, variables: obj });
                                        }}
                                        placeholder={'token=xxx\nbase_url=https://api.example.com'}
                                        rows={3}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">前置 SQL</label>
                                    <textarea
                                        value={saveForm.pre_sql}
                                        onChange={(e) => setSaveForm({ ...saveForm, pre_sql: e.target.value })}
                                        placeholder="SELECT 1;"
                                        rows={3}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">后置 SQL</label>
                                    <textarea
                                        value={saveForm.post_sql}
                                        onChange={(e) => setSaveForm({ ...saveForm, post_sql: e.target.value })}
                                        placeholder="DELETE FROM tmp;"
                                        rows={3}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-white/5">
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
