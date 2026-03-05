import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ScenarioStep } from '../../types/index';

interface KVPair {
    key: string;
    value: string;
}

type EditMode = 'kv' | 'json';

interface CustomKeywordParamsProps {
    step: ScenarioStep;
    onUpdate: (updates: Partial<ScenarioStep>) => void;
}

export function CustomKeywordParams({ step, onUpdate }: CustomKeywordParamsProps) {
    const [mode, setMode] = useState<EditMode>('kv');
    const config = step.config as Record<string, unknown>;
    const customParams = (config.customParams as KVPair[]) || [];

    const updateConfig = (key: string, value: unknown) => {
        onUpdate({ config: { ...config, [key]: value } });
    };

    const updateParam = (index: number, field: 'key' | 'value', val: string) => {
        const next = [...customParams];
        next[index] = { ...next[index], [field]: val };
        updateConfig('customParams', next);
    };

    const addParam = () => {
        updateConfig('customParams', [...customParams, { key: '', value: '' }]);
    };

    const removeParam = (index: number) => {
        updateConfig('customParams', customParams.filter((_, i) => i !== index));
    };

    const kvToJson = (): string => {
        const obj: Record<string, string> = {};
        for (const p of customParams) {
            const k = p.key.trim();
            if (k) obj[k] = p.value;
        }
        return JSON.stringify(obj, null, 2);
    };

    const jsonToKv = (jsonStr: string) => {
        try {
            const obj = JSON.parse(jsonStr) as Record<string, unknown>;
            const pairs: KVPair[] = Object.entries(obj).map(([k, v]) => ({
                key: k,
                value: String(v),
            }));
            updateConfig('customParams', pairs);
        } catch {
            // ignore invalid JSON
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">自定义参数</label>
                <div className="flex gap-1">
                    <button
                        className={`px-2 py-0.5 text-[10px] rounded ${mode === 'kv' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setMode('kv')}
                    >
                        KV
                    </button>
                    <button
                        className={`px-2 py-0.5 text-[10px] rounded ${mode === 'json' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setMode('json')}
                    >
                        JSON
                    </button>
                </div>
            </div>

            {mode === 'kv' ? (
                <div className="space-y-1.5">
                    {customParams.map((p, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                            <Input
                                value={p.key}
                                onChange={(e) => updateParam(i, 'key', e.target.value)}
                                placeholder="参数名"
                                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-7 text-xs"
                            />
                            <Input
                                value={p.value}
                                onChange={(e) => updateParam(i, 'value', e.target.value)}
                                placeholder="参数值"
                                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-7 text-xs"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-red-400"
                                onClick={() => removeParam(i)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-slate-500 hover:text-cyan-400"
                        onClick={addParam}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        添加参数
                    </Button>
                </div>
            ) : (
                <Textarea
                    defaultValue={kvToJson()}
                    onBlur={(e) => jsonToKv(e.target.value)}
                    placeholder='{"param1": "value1"}'
                    rows={5}
                    className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 font-mono text-xs resize-y focus-visible:ring-cyan-500/30"
                />
            )}
        </div>
    );
}
