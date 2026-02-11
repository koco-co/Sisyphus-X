
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

// Mock 数据
const scenarios = [
    { id: 1, name: '用户注册及登录完整流程', project: '商城核心业务', creator: '张三', updateTime: '2024-01-24 14:20', status: 'success', steps: 12 },
    { id: 2, name: '购物车结算下单异步回掉验证', project: '商城核心业务', creator: '李四', updateTime: '2024-01-23 18:30', status: 'failed', steps: 8 },
    { id: 3, name: '个人中心资料修改接口幂等性测试', project: '用户中心', creator: '王五', updateTime: '2024-01-22 10:45', status: 'idle', steps: 5 },
]

export default function ScenarioListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

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

            {/* 列表内容 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenarios.map((scenario, index) => (
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
                                <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                            {scenario.name}
                        </h3>

                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                            <span>{scenario.project}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span>{scenario.steps} 个节点</span>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white text-sm font-bold">
                                    {scenario.creator[0]}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">{scenario.creator}</p>
                                    <p className="text-slate-500 text-[11px] uppercase tracking-wider">{scenario.updateTime}</p>
                                </div>
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

                        {/* 分状态背景装饰线 */}
                        <div className={cn(
                            "absolute bottom-0 left-0 h-1 transition-all group-hover:w-full",
                            scenario.status === 'success' ? "bg-emerald-500 w-1/3" :
                                scenario.status === 'failed' ? "bg-red-500 w-1/3" : "bg-slate-700 w-2"
                        )} />
                    </motion.div>
                ))}
            </div>

            {/* 分页加载更多示例 */}
            <div className="mt-12 flex justify-center">
                <button className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium">
                    加载更多
                </button>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
