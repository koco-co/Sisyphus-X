
import { useTranslation } from 'react-i18next';
import { Play, Save, Layout, Share2, MousePointer2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi, projectsApi } from '@/api/client';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function FlowToolbar() {
    const { t } = useTranslation();
    const { nodes, edges } = useScenarioEditor();
    const queryClient = useQueryClient();
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    // 保存场景
    const saveMutation = useMutation({
        mutationFn: async () => {
            setIsSaving(true);
            const scenarioData = {
                project_id: 1, // TODO: 从路由或上下文获取项目 ID
                name: `场景 ${id || 'new'}`,
                graph_data: { nodes, edges }
            };

            if (id && id !== 'new') {
                return await scenariosApi.update(parseInt(id), scenarioData);
            } else {
                return await scenariosApi.create(scenarioData);
            }
        },
        onSuccess: (response) => {
            toast.success('场景保存成功');
            // 如果是新建场景，跳转到新创建的场景 ID
            if (id === 'new' || !id) {
                const newId = response.data.data?.id;
                if (newId) {
                    navigate(`/scenarios/editor/${newId}`, { replace: true });
                }
            }
            queryClient.invalidateQueries({ queryKey: ['scenarios'] });
        },
        onError: (error: any) => {
            toast.error(`保存失败: ${error.response?.data?.message || error.message}`);
        },
        onSettled: () => {
            setIsSaving(false);
        }
    });

    // 运行场景
    const runMutation = useMutation({
        mutationFn: async () => {
            setIsRunning(true);
            const result = await scenariosApi.run({ nodes, edges });
            return result.data;
        },
        onSuccess: (data) => {
            toast.success('场景执行成功');
            console.log('Execution result:', data);
            // TODO: 跳转到执行结果页面
        },
        onError: (error: any) => {
            toast.error(`执行失败: ${error.response?.data?.message || error.message}`);
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
                        onClick={() => saveMutation.mutate()}
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
        </div>
    );
}
