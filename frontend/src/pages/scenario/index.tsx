
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    Play,
    Edit2,
    Trash2,
    MoreHorizontal,
    Workflow
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi } from '@/api/client';
import { toast } from 'sonner';

export default function ScenarioListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 获取场景列表
    const { data: scenariosData, isLoading } = useQuery({
        queryKey: ['scenarios'],
        queryFn: async () => {
            const response = await scenariosApi.list();
            return response.data.data || [];
        }
    });

    const scenarios = scenariosData || [];

    // 删除场景
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return await scenariosApi.delete(id);
        },
        onSuccess: () => {
            toast.success('场景删除成功');
            queryClient.invalidateQueries({ queryKey: ['scenarios'] });
        },
        onError: (error: any) => {
            toast.error(`删除失败: ${error.message}`);
        }
    });

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('scenarios.title')}</h1>
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
            </header>

            {/* 过滤器 */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索场景名称、项目名称..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all shadow-xl"
                    />
                </div>
            </div>

            {/* 加载状态 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : scenarios.length === 0 ? (
                /* 空状态 */
                <div className="flex flex-col items-center justify-center py-20">
                    <Workflow className="w-20 h-20 text-slate-700 mb-4" />
                    <p className="text-slate-500 text-lg mb-6">还没有场景</p>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/scenarios/editor/new')}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        创建第一个场景
                    </motion.button>
                </div>
            ) : (
                /* 列表内容 */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((scenario: any, index: number) => (
                        <motion.div
                            key={scenario.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-slate-900 border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 transition-all shadow-xl hover:shadow-cyan-500/5 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                                    <Workflow className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (confirm('确定要删除这个场景吗？')) {
                                                deleteMutation.mutate(scenario.id);
                                            }
                                        }}
                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                {scenario.name}
                            </h3>

                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                                <span>项目 {scenario.project_id}</span>
                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                <span>{scenario.graph_data?.nodes?.length || 0} 个节点</span>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                                <div className="text-xs text-slate-500">
                                    {new Date(scenario.updated_at).toLocaleString('zh-CN')}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/scenarios/editor/${scenario.id}`)}
                                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-white/5"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                                        <Play className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                            </div>

                            {/* 状态装饰线 */}
                            <div className="absolute bottom-0 left-0 h-1 w-2 bg-cyan-500 transition-all group-hover:w-full" />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 分页加载更多示例 */}
            {scenarios.length > 0 && (
                <div className="mt-12 flex justify-center">
                    <button className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium">
                        加载更多
                    </button>
                </div>
            )}
        </div>
    );
}
