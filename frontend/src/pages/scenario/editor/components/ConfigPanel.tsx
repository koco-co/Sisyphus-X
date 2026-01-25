import React from 'react';
import { useTranslation } from 'react-i18next';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { X, Settings2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ConfigPanel() {
    const { t } = useTranslation();
    const { selectedNode, setSelectedNode, setNodes } = useScenarioEditor();

    if (!selectedNode) return null;

    const onDelete = () => {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setSelectedNode(null);
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
                        />
                    </div>

                    {/* 节点特有配置 - 占位 */}
                    <div className="pt-4 border-t border-white/5">
                        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-sm">
                            这里将集成 Monaco Editor 以配置详细的 {selectedNode.data.type} 参数。
                        </div>
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
                    <button className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-all font-medium shadow-lg shadow-cyan-500/20">
                        <Save className="w-4 h-4" />
                        {t('common.save')}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
