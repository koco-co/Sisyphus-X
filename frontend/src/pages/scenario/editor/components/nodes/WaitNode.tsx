import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Clock, Hourglass } from 'lucide-react';
import type { NodeData } from '../../types/index';
import { cn } from '@/lib/utils';

export const WaitNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    return (
        <div className={cn(
            "group relative flex items-center gap-3 p-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all min-w-[180px]",
            selected && "border-emerald-500/50 ring-2 ring-emerald-500/20"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />

            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Clock className="w-5 h-5 animate-[spin_4s_linear_infinite]" />
            </div>

            <div className="flex-1">
                <span className="text-sm font-bold text-white block truncate uppercase tracking-tight">{data.label}</span>
                <div className="flex items-center gap-1.5 mt-1">
                    <Hourglass className="w-3 h-3 text-emerald-500/50" />
                    <span className="text-[11px] font-mono text-emerald-400">
                        {data.config?.wait_time || 1000}ms
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />
        </div>
    );
});

WaitNode.displayName = 'WaitNode';
