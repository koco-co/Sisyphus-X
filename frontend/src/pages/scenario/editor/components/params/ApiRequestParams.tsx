import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { interfacesApi } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Plus, Trash2 } from 'lucide-react';
import type { ScenarioStep } from '../../types/index';

const HTTP_METHODS = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'HEAD', label: 'HEAD' },
    { value: 'OPTIONS', label: 'OPTIONS' },
];

interface KVPair {
    key: string;
    value: string;
}

interface ApiRequestParamsProps {
    step: ScenarioStep;
    onUpdate: (updates: Partial<ScenarioStep>) => void;
    projectId: string;
}

export function ApiRequestParams({ step, onUpdate, projectId: _projectId }: ApiRequestParamsProps) {
    const config = step.config as Record<string, unknown>;
    const method = (config.method as string) || 'GET';
    const url = (config.url as string) || '';
    const headers = (config.headers as KVPair[]) || [];
    const body = (config.body as string) || '';

    const prevResourceIdRef = useRef(step.resourceId);

    const { data: interfaceData } = useQuery({
        queryKey: ['interface-detail', step.resourceId],
        queryFn: () => interfacesApi.get(step.resourceId!),
        enabled: !!step.resourceId,
    });

    useEffect(() => {
        if (!interfaceData?.data || step.resourceId === prevResourceIdRef.current) return;
        prevResourceIdRef.current = step.resourceId;

        const iface = interfaceData.data.data ?? interfaceData.data;
        const ifaceHeaders = iface.headers as Record<string, string> | undefined;
        const headerPairs: KVPair[] = ifaceHeaders
            ? Object.entries(ifaceHeaders).map(([k, v]) => ({ key: k, value: v }))
            : [];

        onUpdate({
            config: {
                ...config,
                method: iface.method || 'GET',
                url: iface.url || '',
                headers: headerPairs,
                body: iface.body ? JSON.stringify(iface.body, null, 2) : '',
            },
        });
    }, [interfaceData, step.resourceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateConfig = (key: string, value: unknown) => {
        onUpdate({ config: { ...config, [key]: value } });
    };

    const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
        const next = [...headers];
        next[index] = { ...next[index], [field]: val };
        updateConfig('headers', next);
    };

    const addHeader = () => {
        updateConfig('headers', [...headers, { key: '', value: '' }]);
    };

    const removeHeader = (index: number) => {
        updateConfig('headers', headers.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <label className="text-xs text-slate-400 font-medium">请求参数</label>

            <div className="flex gap-2">
                <div className="w-28">
                    <CustomSelect
                        value={method}
                        onChange={(v) => updateConfig('method', v)}
                        options={HTTP_METHODS}
                        placeholder="Method"
                        size="sm"
                    />
                </div>
                <Input
                    value={url}
                    onChange={(e) => updateConfig('url', e.target.value)}
                    placeholder="请求 URL，如 /api/v1/users"
                    className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:ring-cyan-500/30 h-8 text-xs"
                />
            </div>

            {/* Headers */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Headers</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-slate-500 hover:text-cyan-400"
                        onClick={addHeader}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                </div>
                {headers.map((h, i) => (
                    <div key={i} className="flex gap-1.5 items-center">
                        <Input
                            value={h.key}
                            onChange={(e) => updateHeader(i, 'key', e.target.value)}
                            placeholder="Key"
                            className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-7 text-xs"
                        />
                        <Input
                            value={h.value}
                            onChange={(e) => updateHeader(i, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-7 text-xs"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-red-400"
                            onClick={() => removeHeader(i)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Body (JSON)</span>
                <Textarea
                    value={body}
                    onChange={(e) => updateConfig('body', e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={4}
                    className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 font-mono text-xs resize-y focus-visible:ring-cyan-500/30"
                />
            </div>
        </div>
    );
}
