import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Network,
    Clock,
    Database,
    Code,
    HelpCircle,
    Plus
} from 'lucide-react';

const nodeTypes = [
    { type: 'api', icon: Network, labelKey: 'scenarios.apiRequest', color: 'text-cyan-400' },
    { type: 'condition', icon: HelpCircle, labelKey: 'scenarios.condition', color: 'text-amber-400' },
    { type: 'wait', icon: Clock, labelKey: 'scenarios.waitDelay', color: 'text-emerald-400' },
    { type: 'sql', icon: Database, labelKey: 'keywords.dbOperation', color: 'text-violet-400' },
    { type: 'script', icon: Code, labelKey: 'keywords.customOperation', color: 'text-pink-400' },
];

export function NodeSidebar() {
    const { t } = useTranslation();

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="p-4 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
                {t('scenarios.components')}
            </h3>

            <div className="space-y-3">
                {nodeTypes.map((node) => (
                    <div
                        key={node.type}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing group"
                        onDragStart={(event) => onDragStart(event, node.type)}
                        draggable
                    >
                        <div className={`p-2 rounded-lg bg-slate-900 ${node.color}`}>
                            <node.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                            {t(node.labelKey)}
                        </span>
                        <Plus className="w-4 h-4 text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>

            <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20">
                <p className="text-xs text-slate-400 leading-relaxed">
                    拖放组件到画布中开始编排您的测试流程。
                </p>
            </div>
        </div>
    );
}
