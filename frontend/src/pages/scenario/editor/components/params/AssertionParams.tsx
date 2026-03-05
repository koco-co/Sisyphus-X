import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Trash2 } from 'lucide-react';
import type { StepAssertion } from '../../types/index';

const ASSERTION_SOURCES = [
    { value: 'response_json', label: 'Response JSON' },
    { value: 'response_header', label: 'Response Header' },
    { value: 'status_code', label: 'Status Code' },
];

const ASSERTION_OPERATORS = [
    { value: 'equals', label: '等于 (==)' },
    { value: 'not_equals', label: '不等于 (!=)' },
    { value: 'contains', label: '包含' },
    { value: 'greater_than', label: '大于 (>)' },
    { value: 'less_than', label: '小于 (<)' },
];

interface AssertionParamsProps {
    assertions: StepAssertion[];
    onUpdate: (assertions: StepAssertion[]) => void;
}

export function AssertionParams({ assertions, onUpdate }: AssertionParamsProps) {
    const updateRow = (index: number, field: keyof StepAssertion, value: string) => {
        const next = [...assertions];
        next[index] = { ...next[index], [field]: value };
        onUpdate(next);
    };

    const addRow = () => {
        onUpdate([...assertions, { type: 'response_json', expression: '', expected: '', message: '' }]);
    };

    const removeRow = (index: number) => {
        onUpdate(assertions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">断言</label>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-slate-500 hover:text-cyan-400"
                    onClick={addRow}
                >
                    <Plus className="w-3 h-3" />
                </Button>
            </div>

            {assertions.length === 0 && (
                <p className="text-[11px] text-slate-600 italic">暂无断言，点击 + 添加</p>
            )}

            {assertions.map((a, i) => (
                <div key={i} className="flex gap-1.5 items-start flex-wrap">
                    <div className="w-[130px]">
                        <CustomSelect
                            value={a.type}
                            onChange={(v) => updateRow(i, 'type', String(v))}
                            options={ASSERTION_SOURCES}
                            placeholder="来源"
                            size="sm"
                        />
                    </div>
                    <Input
                        value={a.expression}
                        onChange={(e) => updateRow(i, 'expression', e.target.value)}
                        placeholder="$.data.id 或 Content-Type"
                        className="flex-1 min-w-[120px] bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                    />
                    <div className="w-[110px]">
                        <CustomSelect
                            value={a.message || 'equals'}
                            onChange={(v) => updateRow(i, 'message', String(v))}
                            options={ASSERTION_OPERATORS}
                            placeholder="操作符"
                            size="sm"
                        />
                    </div>
                    <Input
                        value={a.expected || ''}
                        onChange={(e) => updateRow(i, 'expected', e.target.value)}
                        placeholder="期望值"
                        className="flex-1 min-w-[80px] bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
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
