import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Repeat2, MoreVertical } from 'lucide-react';
import type { NodeData } from '../../types/index';
import { cn } from '@/lib/utils';

export const LoopNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    const statusColors = {
        idle: 'bg-slate-500',
        running: 'bg-pink-500 animate-pulse',
        success: 'bg-emerald-500',
        failed: 'bg-red-500',
        skipped: 'bg-slate-400',
    };

    return (
        <div className={cn(
            "group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all min-w-[240px]",
            selected && "border-pink-500/50 ring-2 ring-pink-500/20"
        )}>
            {/* 输入端口 */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-pink-500 !border-2 !border-slate-900 transition-transform group-hover:scale-125"
            />

            {/* 状态指示器 */}
            <div className={cn(
                "flex-shrink-0 w-2 h-10 rounded-full",
                statusColors[data.executionStatus || 'idle']
            )} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
                        <Repeat2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-white truncate">{data.label}</span>
                    <button className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                        LOOP
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                        {data.config?.loops ? `${data.config.loops} 次循环` : '无限循环'}
                    </span>
                </div>
            </div>

            {/* 输出端口 */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-pink-500 !border-2 !border-slate-900 transition-transform group-hover:scale-125"
            />
        </div>
    );
});

LoopNode.displayName = 'LoopNode';
