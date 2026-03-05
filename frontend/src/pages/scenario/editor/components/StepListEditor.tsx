import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScenarioEditor } from '../ScenarioEditorContext';
import { StepCard } from './StepCard';

interface StepListEditorProps {
    projectId: string;
}

export function StepListEditor({ projectId }: StepListEditorProps) {
    const { steps, addStep, reorderSteps } = useScenarioEditor();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const fromIndex = steps.findIndex((s) => s.id === active.id);
        const toIndex = steps.findIndex((s) => s.id === over.id);
        if (fromIndex !== -1 && toIndex !== -1) {
            reorderSteps(fromIndex, toIndex);
        }
    };

    const handleAddStep = () => {
        addStep({
            id: crypto.randomUUID(),
            description: '',
            keywordType: '',
            keywordName: '',
            config: {},
            assertions: [],
            extractions: [],
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with add button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-sm font-semibold text-slate-300">
                    步骤列表
                    {steps.length > 0 && (
                        <span className="ml-2 text-xs text-slate-500 font-normal">
                            ({steps.length})
                        </span>
                    )}
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddStep}
                    className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
                >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    添加步骤
                </Button>
            </div>

            {/* Scrollable step list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium mb-1">暂无步骤</p>
                        <p className="text-xs text-slate-600">
                            点击上方「添加步骤」按钮开始编排测试场景
                        </p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={steps.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {steps.map((step, i) => (
                                <StepCard
                                    key={step.id}
                                    step={step}
                                    index={i}
                                    projectId={projectId}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
