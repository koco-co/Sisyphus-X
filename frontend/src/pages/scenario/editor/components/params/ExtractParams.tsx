import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Trash2 } from 'lucide-react';
import type { StepExtraction } from '../../types/index';

const EXTRACT_SOURCES = [
    { value: 'response_json', label: 'Response JSON' },
    { value: 'response_header', label: 'Response Header' },
    { value: 'status_code', label: 'Status Code' },
];

const VARIABLE_TYPES = [
    { value: 'global', label: '全局变量' },
    { value: 'environment', label: '环境变量' },
];

interface ExtractParamsProps {
    extractions: StepExtraction[];
    onUpdate: (extractions: StepExtraction[]) => void;
}

export function ExtractParams({ extractions, onUpdate }: ExtractParamsProps) {
    const updateRow = (index: number, field: keyof StepExtraction, value: string) => {
        const next = [...extractions];
        next[index] = { ...next[index], [field]: value };
        onUpdate(next);
    };

    const addRow = () => {
        onUpdate([...extractions, { name: '', source: 'response_json', expression: '' }]);
    };

    const removeRow = (index: number) => {
        onUpdate(extractions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">变量提取</label>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-slate-500 hover:text-cyan-400"
                    onClick={addRow}
                >
                    <Plus className="w-3 h-3" />
                </Button>
            </div>

            {extractions.length === 0 && (
                <p className="text-[11px] text-slate-600 italic">暂无变量提取，点击 + 添加</p>
            )}

            {extractions.map((e, i) => (
                <div key={i} className="flex gap-1.5 items-start flex-wrap">
                    <Input
                        value={e.name}
                        onChange={(ev) => updateRow(i, 'name', ev.target.value)}
                        placeholder="变量名"
                        className="w-[100px] bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                    />
                    <div className="w-[100px]">
                        <CustomSelect
                            value={(e as Record<string, string>).variableType || 'global'}
                            onChange={(v) => {
                                const next = [...extractions];
                                (next[i] as Record<string, string>).variableType = String(v);
                                onUpdate(next);
                            }}
                            options={VARIABLE_TYPES}
                            placeholder="类型"
                            size="sm"
                        />
                    </div>
                    <div className="w-[130px]">
                        <CustomSelect
                            value={e.source}
                            onChange={(v) => updateRow(i, 'source', String(v))}
                            options={EXTRACT_SOURCES}
                            placeholder="来源"
                            size="sm"
                        />
                    </div>
                    <Input
                        value={e.expression}
                        onChange={(ev) => updateRow(i, 'expression', ev.target.value)}
                        placeholder="$.data.token"
                        className="flex-1 min-w-[100px] bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-red-400 flex-shrink-0"
                        onClick={() => removeRow(i)}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            ))}
        </div>
    );
}
