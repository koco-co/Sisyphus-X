import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { HelpCircle, GitBranch } from 'lucide-react';
import type { NodeData } from '../../types/index';
import { cn } from '@/lib/utils';

export const ConditionNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    return (
        <div className={cn(
            "group relative flex flex-col p-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all min-w-[200px]",
            selected && "border-amber-500/50 ring-2 ring-amber-500/20"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900" />

            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-white uppercase tracking-tight">{data.label}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    IF CONDITION
                </div>
                <div className="text-xs text-amber-200/70 font-mono truncate">
                    {data.config?.condition || "response.code == 200"}
                </div>
            </div>

            {/* 输出端口 - True */}
            <div className="absolute -right-3 top-1/4 flex flex-col items-center">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="true"
                    className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-slate-900 !static"
                />
                <span className="text-[8px] font-black text-emerald-500 mt-1 uppercase">True</span>
            </div>

            {/* 输出端口 - False */}
            <div className="absolute -right-3 bottom-1/4 flex flex-col items-center">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="false"
                    className="!w-4 !h-4 !bg-red-500 !border-2 !border-slate-900 !static"
                />
                <span className="text-[8px] font-black text-red-500 mt-1 uppercase">False</span>
            </div>
        </div>
    );
});

ConditionNode.displayName = 'ConditionNode';
