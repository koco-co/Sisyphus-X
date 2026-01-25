import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Network, MoreVertical, PlayCircle } from 'lucide-react';
import type { NodeData } from '../../types/index';
import { cn } from '@/lib/utils';

export const ApiNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    const statusColors = {
        idle: 'bg-slate-500',
        running: 'bg-cyan-500 animate-pulse',
        success: 'bg-emerald-500',
        failed: 'bg-red-500',
        skipped: 'bg-slate-400',
    };

    return (
        <div className={cn(
            "group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all min-w-[240px]",
            selected && "border-cyan-500/50 ring-2 ring-cyan-500/20"
        )}>
            {/* 输入端口 */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-slate-900 transition-transform group-hover:scale-125"
            />

            {/* 状态指示器 */}
            <div className={cn(
                "flex-shrink-0 w-2 h-10 rounded-full",
                statusColors[data.executionStatus || 'idle']
            )} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Network className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-white truncate">{data.label}</span>
                    <button className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        {data.config?.method || 'GET'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate font-mono">
                        {data.config?.url || '/api/v1/resource'}
                    </span>
                </div>
            </div>

            {/* 快捷运行按钮 */}
            <button className="absolute -right-12 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 shadow-lg shadow-emerald-500/20">
                <PlayCircle className="w-5 h-5 fill-current" />
            </button>

            {/* 输出端口 */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-slate-900 transition-transform group-hover:scale-125"
            />
        </div>
    );
});

ApiNode.displayName = 'ApiNode';
