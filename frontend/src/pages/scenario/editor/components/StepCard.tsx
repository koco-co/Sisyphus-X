import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ScenarioStep } from '../types/index';
import { KeywordCascade } from './KeywordCascade';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { ApiRequestParams } from './params/ApiRequestParams';
import { AssertionParams } from './params/AssertionParams';
import { ExtractParams } from './params/ExtractParams';
import { DatabaseParams } from './params/DatabaseParams';
import { CustomKeywordParams } from './params/CustomKeywordParams';

const KEYWORD_TYPE_LABELS: Record<string, string> = {
    request: '发送请求',
    assertion: '断言',
    extraction: '提取变量',
    database: '数据库',
    custom: '自定义',
};

const KEYWORD_TYPE_COLORS: Record<string, string> = {
    request: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    assertion: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    extraction: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    database: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    custom: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

interface StepCardProps {
    step: ScenarioStep;
    index: number;
    projectId: string;
}

export function StepCard({ step, index, projectId }: StepCardProps) {
    const [expanded, setExpanded] = useState(false);
    const { updateStep, removeStep } = useScenarioEditor();

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const typeLabel = KEYWORD_TYPE_LABELS[step.keywordType] || step.keywordType;
    const typeColor = KEYWORD_TYPE_COLORS[step.keywordType] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'bg-slate-800/50 border border-slate-700 rounded-xl transition-all duration-200',
                isDragging && 'opacity-50 shadow-2xl shadow-cyan-500/10 scale-[1.02]',
                expanded && 'border-slate-600',
            )}
        >
            {/* Collapsed header — always visible */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Drag handle */}
                <button
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors touch-none"
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </button>

                {/* Step number */}
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center">
                    {index + 1}
                </span>

                {/* Description */}
                <span className="flex-1 text-sm text-slate-200 truncate">
                    {step.description || `步骤 ${index + 1}`}
                </span>

                {/* Keyword badge */}
                {step.keywordType && (
                    <Badge
                        className={cn('text-[10px] px-2 py-0.5 border font-normal', typeColor)}
                    >
                        {typeLabel}
                        {step.keywordName && ` · ${step.keywordName}`}
                    </Badge>
                )}

                {/* Expand / collapse */}
                <span className="text-slate-500">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>

                {/* Delete */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        removeStep(index);
                    }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-700/50">
                    {/* Description input */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-medium">步骤描述</label>
                        <Input
                            value={step.description}
                            onChange={(e) => updateStep(index, { description: e.target.value })}
                            placeholder="输入步骤描述..."
                            className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:ring-cyan-500/30"
                        />
                    </div>

                    {/* Keyword cascade */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-medium">关键字选择</label>
                        <KeywordCascade
                            value={{
                                keywordType: step.keywordType,
                                keywordName: step.keywordName,
                                resourceId: step.resourceId,
                            }}
                            onChange={(val) => updateStep(index, val)}
                            projectId={projectId}
                        />
                    </div>

                    {/* Type-specific parameter panel */}
                    {step.keywordType === 'request' && (
                        <ApiRequestParams
                            step={step}
                            onUpdate={(updates) => updateStep(index, updates)}
                            projectId={projectId}
                        />
                    )}
                    {step.keywordType === 'database' && (
                        <DatabaseParams
                            step={step}
                            onUpdate={(updates) => updateStep(index, updates)}
                            projectId={projectId}
                        />
                    )}
                    {step.keywordType === 'custom' && (
                        <CustomKeywordParams
                            step={step}
                            onUpdate={(updates) => updateStep(index, updates)}
                        />
                    )}

                    {/* Assertions — available for all step types */}
                    <AssertionParams
                        assertions={step.assertions}
                        onUpdate={(assertions) => updateStep(index, { assertions })}
                    />

                    {/* Extractions — available for all step types */}
                    <ExtractParams
                        extractions={step.extractions}
                        onUpdate={(extractions) => updateStep(index, { extractions })}
                    />
                </div>
            )}
        </div>
    );
}
