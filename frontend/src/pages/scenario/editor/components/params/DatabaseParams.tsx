import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/client';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { ScenarioStep } from '../../types/index';

interface DatabaseParamsProps {
    step: ScenarioStep;
    onUpdate: (updates: Partial<ScenarioStep>) => void;
    projectId: string;
}

interface DataSourceItem {
    id: number;
    name: string;
    db_type: string;
}

export function DatabaseParams({ step, onUpdate, projectId }: DatabaseParamsProps) {
    const config = step.config as Record<string, unknown>;
    const datasourceId = (config.datasourceId as string) || '';
    const sql = (config.sql as string) || '';

    const { data: dsData } = useQuery({
        queryKey: ['datasources', projectId],
        queryFn: () => projectsApi.listDataSources(projectId),
        enabled: !!projectId,
    });

    const datasources: DataSourceItem[] = (dsData?.data?.data ?? dsData?.data ?? []) as DataSourceItem[];

    const dsOptions = datasources.map((ds) => ({
        value: String(ds.id),
        label: `${ds.name} (${ds.db_type})`,
    }));

    const updateConfig = (key: string, value: unknown) => {
        onUpdate({ config: { ...config, [key]: value } });
    };

    return (
        <div className="space-y-3">
            <label className="text-xs text-slate-400 font-medium">数据库参数</label>

            <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">数据源</span>
                <CustomSelect
                    value={datasourceId}
                    onChange={(v) => updateConfig('datasourceId', String(v))}
                    options={dsOptions}
                    placeholder="选择数据源"
                    size="sm"
                />
            </div>

            <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">SQL 语句</span>
                <Textarea
                    value={sql}
                    onChange={(e) => updateConfig('sql', e.target.value)}
                    placeholder="SELECT * FROM users WHERE id = ${user_id};"
                    rows={5}
                    className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 font-mono text-xs resize-y focus-visible:ring-cyan-500/30"
                />
            </div>
        </div>
    );
}
