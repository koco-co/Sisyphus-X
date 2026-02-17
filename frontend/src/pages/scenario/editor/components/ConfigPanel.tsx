
import { useTranslation } from 'react-i18next';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { X, Settings2, Trash2, Save, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { scenariosApi } from '@/api/client';
import { toast } from 'sonner';

export function ConfigPanel() {
    const { t } = useTranslation();
    const { selectedNode, setSelectedNode, setNodes, nodes, edges } = useScenarioEditor();
    const [isExecuting, setIsExecuting] = useState(false);

    if (!selectedNode) return null;

    const onDelete = () => {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setSelectedNode(null);
    };

    const onSave = () => {
        toast.success('节点配置已保存');
        setSelectedNode(null);
    };

    // 执行单个节点
    const executeMutation = useMutation({
        mutationFn: async () => {
            setIsExecuting(true);
            const result = await scenariosApi.run({
                nodes: [selectedNode],
                edges: []
            });
            return result.data;
        },
        onSuccess: (data) => {
            toast.success('节点执行成功');
            console.log('Execution result:', data);
        },
        onError: (error: any) => {
            toast.error(`节点执行失败: ${error.message}`);
        },
        onSettled: () => {
            setIsExecuting(false);
        }
    });

    // 根据节点类型渲染不同的配置表单
    const renderConfigForm = () => {
        switch (selectedNode.data.type) {
            case 'api':
                return <ApiConfig node={selectedNode} setNodes={setNodes} />;
            case 'condition':
                return <ConditionConfig node={selectedNode} setNodes={setNodes} />;
            case 'wait':
                return <WaitConfig node={selectedNode} setNodes={setNodes} />;
            case 'sql':
                return <SQLConfig node={selectedNode} setNodes={setNodes} />;
            case 'loop':
                return <LoopConfig node={selectedNode} setNodes={setNodes} />;
            case 'script':
                return <ScriptConfig node={selectedNode} setNodes={setNodes} />;
            default:
                return <div className="text-slate-500">未知节点类型</div>;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className="w-96 border-l border-white/5 bg-slate-900/80 backdrop-blur-2xl flex flex-col shadow-2xl z-50"
            >
                {/* 头部 */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-cyan-400" />
                        <span className="font-semibold text-white">{t('scenarios.config')}</span>
                    </div>
                    <button
                        onClick={() => setSelectedNode(null)}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 通用配置 */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('common.name')}</label>
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                            value={selectedNode.data.label}
                            onChange={(e) => {
                                const label = e.target.value;
                                setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n));
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('common.description')}</label>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 h-24 resize-none"
                            placeholder="添加描述..."
                            value={selectedNode.data.description || ''}
                            onChange={(e) => {
                                const description = e.target.value;
                                setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, description } } : n));
                            }}
                        />
                    </div>

                    {/* 节点特有配置 */}
                    <div className="pt-4 border-t border-white/5">
                        {renderConfigForm()}
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="p-4 bg-slate-900 border-t border-white/5 flex gap-3">
                    <button
                        onClick={onDelete}
                        className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-medium border border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete')}
                    </button>
                    <button
                        onClick={() => executeMutation.mutate()}
                        disabled={isExecuting}
                        className="h-11 flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlayCircle className="w-4 h-4" />
                        {isExecuting ? '执行中...' : '运行'}
                    </button>
                    <button onClick={onSave} className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-all font-medium shadow-lg shadow-cyan-500/20">
                        <Save className="w-4 h-4" />
                        {t('common.save')}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// HTTP 请求节点配置
function ApiConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-cyan-400">HTTP 请求配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">请求方法</label>
                <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                    value={node.data.config?.method || 'GET'}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, method: e.target.value }
                            }
                        } : n));
                    }}
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">URL</label>
                <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
                    placeholder="https://api.example.com/v1/resource"
                    value={node.data.config?.url || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, url: e.target.value }
                            }
                        } : n));
                    }}
                />
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-xs">
                提示: 可以使用 {'{{变量名}}'} 引用环境变量或提取的变量
            </div>
        </div>
    );
}

// 条件判断节点配置
function ConditionConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-amber-400">条件判断配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">条件表达式</label>
                <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50 h-24 resize-none font-mono text-sm"
                    placeholder="{{status_code}} == 200"
                    value={node.data.config?.condition || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, condition: e.target.value }
                            }
                        } : n));
                    }}
                />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs">
                支持变量引用和比较运算符: ==, !=, &gt;, &lt;, &gt;=, &lt;=, and, or
            </div>
        </div>
    );
}

// 等待节点配置
function WaitConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-emerald-400">等待延迟配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">等待时间（秒）</label>
                <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="5"
                    value={node.data.config?.wait_time || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, wait_time: parseInt(e.target.value) || 0 }
                            }
                        } : n));
                    }}
                />
            </div>
        </div>
    );
}

// SQL 节点配置
function SQLConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-violet-400">数据库操作配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">SQL 语句</label>
                <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50 h-32 resize-none font-mono text-sm"
                    placeholder="SELECT * FROM users WHERE id = {{user_id}}"
                    value={node.data.config?.sql || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, sql: e.target.value }
                            }
                        } : n));
                    }}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">数据源</label>
                <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50"
                    value={node.data.config?.datasource || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, datasource: e.target.value }
                            }
                        } : n));
                    }}
                >
                    <option value="">选择数据源</option>
                    <option value="postgres_main">PostgreSQL 主库</option>
                    <option value="mysql_replica">MySQL 从库</option>
                </select>
            </div>
        </div>
    );
}

// 循环节点配置
function LoopConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-pink-400">循环配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">循环次数</label>
                <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500/50"
                    placeholder="10"
                    value={node.data.config?.loops || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, loops: parseInt(e.target.value) || 0 }
                            }
                        } : n));
                    }}
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="infinite-loop"
                    className="rounded bg-white/5 border-white/10 text-pink-500 focus:ring-pink-500"
                    checked={!node.data.config?.loops}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                                ...n,
                                data: {
                                    ...n.data,
                                    config: { ...n.data.config, loops: 0 }
                                }
                            } : n));
                        }
                    }}
                />
                <label htmlFor="infinite-loop" className="text-xs text-slate-400">无限循环</label>
            </div>
        </div>
    );
}

// 自定义脚本节点配置
function ScriptConfig({ node, setNodes }: { node: any; setNodes: any }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-amber-400">自定义关键字配置</h4>

            <div className="space-y-2">
                <label className="text-xs text-slate-500">关键字名称</label>
                <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                    value={node.data.config?.keyword_name || ''}
                    onChange={(e) => {
                        setNodes((nds: any[]) => nds.map((n) => n.id === node.id ? {
                            ...n,
                            data: {
                                ...n.data,
                                config: { ...n.data.config, keyword_name: e.target.value }
                            }
                        } : n));
                    }}
                >
                    <option value="">选择关键字</option>
                    <option value="custom_assertion">自定义断言</option>
                    <option value="data_generator">数据生成器</option>
                    <option value="text_processor">文本处理器</option>
                </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs">
                自定义关键字需要在全局参数中定义
            </div>
        </div>
    );
}
