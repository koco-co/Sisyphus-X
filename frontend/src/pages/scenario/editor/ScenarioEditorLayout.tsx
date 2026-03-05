import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Save,
    Bug,
    X,
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Settings2,
    Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { cn } from '@/lib/utils';
import { scenariosApi, projectsApi } from '@/api/client';
import { useScenarioEditor } from './ScenarioEditorContext';
import { StepListEditor } from './components/StepListEditor';
import { DatasetDialog } from './components/DatasetDialog';
import type { ScenarioStep } from './types/index';

type TabId = 'steps' | 'variables' | 'preSql' | 'postSql';

const TABS: { id: TabId; label: string }[] = [
    { id: 'steps', label: '测试步骤' },
    { id: 'variables', label: '变量定义' },
    { id: 'preSql', label: '前置SQL' },
    { id: 'postSql', label: '后置SQL' },
];

const PRIORITIES = [
    { value: 'P0', label: 'P0 - 致命' },
    { value: 'P1', label: 'P1 - 严重' },
    { value: 'P2', label: 'P2 - 普通' },
    { value: 'P3', label: 'P3 - 轻微' },
];

interface ProjectItem {
    id: string | number;
    name: string;
}

interface EnvironmentItem {
    id: string | number;
    name: string;
}

interface DatasetItem {
    id: number;
    name: string;
}

export default function ScenarioEditorLayout() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const {
        steps,
        scenarioId,
        scenarioData,
        environmentId,
        datasetId,
        setSteps,
        setScenarioId,
        setScenarioData,
        setEnvironmentId,
        setDatasetId,
    } = useScenarioEditor();

    const [activeTab, setActiveTab] = useState<TabId>('steps');
    const [infoCollapsed, setInfoCollapsed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [debugging, setDebugging] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [datasetDialogOpen, setDatasetDialogOpen] = useState(false);

    // Load projects
    const { data: projectsData } = useQuery({
        queryKey: ['projects', 'list-all'],
        queryFn: () => projectsApi.list({ size: 200 }),
    });
    const projects: ProjectItem[] = (projectsData?.data?.data?.items ?? projectsData?.data?.items ?? []) as ProjectItem[];
    const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));

    // Load environments for selected project
    const { data: envsData } = useQuery({
        queryKey: ['environments', scenarioData.projectId],
        queryFn: () => projectsApi.listEnvironments(scenarioData.projectId),
        enabled: !!scenarioData.projectId,
    });
    const environments: EnvironmentItem[] = (envsData?.data?.data ?? envsData?.data ?? []) as EnvironmentItem[];
    const envOptions = environments.map((e) => ({ value: String(e.id), label: e.name }));

    // Load datasets for this scenario
    const { data: datasetsData, refetch: refetchDatasets } = useQuery({
        queryKey: ['scenarios', scenarioId, 'datasets'],
        queryFn: () => scenariosApi.listDatasets(scenarioId!),
        enabled: !!scenarioId,
    });
    const datasets: DatasetItem[] = (datasetsData?.data?.data ?? datasetsData?.data ?? []) as DatasetItem[];
    const datasetOptions = datasets.map((d) => ({ value: String(d.id), label: d.name }));

    // Load existing scenario when editing
    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            try {
                const res = await scenariosApi.get(id!);
                const scenario = res?.data?.data ?? res?.data;
                if (!scenario) return;

                setScenarioId(String(scenario.id));
                setScenarioData({
                    name: scenario.name || '',
                    description: scenario.description || '',
                    projectId: String(scenario.project_id || ''),
                    priority: scenario.priority || 'P2',
                    tags: scenario.tags || [],
                    variables: scenario.variables || {},
                    preSql: scenario.pre_sql || '',
                    postSql: scenario.post_sql || '',
                });

                if (scenario.environment_id) setEnvironmentId(String(scenario.environment_id));
                if (scenario.dataset_id) setDatasetId(String(scenario.dataset_id));

                const rawSteps = (scenario.steps ?? []) as Array<{
                    id: string;
                    description?: string;
                    keyword_type: string;
                    keyword_name: string;
                    parameters?: Record<string, unknown>;
                    sort_order: number;
                }>;

                const mappedSteps: ScenarioStep[] = rawSteps.map((s) => ({
                    id: String(s.id),
                    description: s.description || '',
                    keywordType: s.keyword_type || '',
                    keywordName: s.keyword_name || '',
                    resourceId: (s.parameters?.resourceId as string) || undefined,
                    config: (s.parameters?.config as Record<string, unknown>) || {},
                    assertions: (s.parameters?.assertions as ScenarioStep['assertions']) || [],
                    extractions: (s.parameters?.extractions as ScenarioStep['extractions']) || [],
                    sortOrder: s.sort_order,
                }));

                setSteps(mappedSteps);
            } catch {
                toast.error('加载场景失败');
            }
        };
        load();
    }, [id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Save ---
    const handleSave = useCallback(async () => {
        if (!scenarioData.name.trim()) {
            toast.error('请输入场景名称');
            return;
        }
        if (!scenarioData.projectId) {
            toast.error('请选择项目');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                project_id: scenarioData.projectId,
                name: scenarioData.name,
                description: scenarioData.description,
                priority: scenarioData.priority,
                tags: scenarioData.tags,
                variables: scenarioData.variables,
                pre_sql: scenarioData.preSql,
                post_sql: scenarioData.postSql,
            };

            let savedScenarioId = scenarioId;

            if (isNew || !scenarioId) {
                const res = await scenariosApi.create({
                    ...payload,
                    created_by: 'current_user',
                });
                const created = res?.data?.data ?? res?.data;
                savedScenarioId = String(created.id);
                setScenarioId(savedScenarioId);
            } else {
                await scenariosApi.update(scenarioId, payload);
            }

            // Save steps: delete all then recreate for simplicity
            if (savedScenarioId) {
                // Get existing steps from backend so we can delete them
                try {
                    const existRes = await scenariosApi.get(savedScenarioId);
                    const existScenario = existRes?.data?.data ?? existRes?.data;
                    const existSteps = (existScenario?.steps ?? []) as Array<{ id: string }>;
                    for (const es of existSteps) {
                        await scenariosApi.deleteStep(savedScenarioId, es.id);
                    }
                } catch {
                    // first-time save, no existing steps
                }

                for (let i = 0; i < steps.length; i++) {
                    const s = steps[i];
                    await scenariosApi.createStep(savedScenarioId, {
                        description: s.description,
                        keyword_type: s.keywordType,
                        keyword_name: s.keywordName,
                        parameters: {
                            resourceId: s.resourceId,
                            config: s.config,
                            assertions: s.assertions,
                            extractions: s.extractions,
                        },
                        sort_order: i,
                    });
                }
            }

            toast.success('保存成功');
            if (isNew && savedScenarioId) {
                navigate(`/scenarios/editor/${savedScenarioId}`, { replace: true });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '未知错误';
            toast.error(`保存失败: ${msg}`);
        } finally {
            setSaving(false);
        }
    }, [scenarioData, scenarioId, isNew, steps, navigate, setScenarioId]);

    // --- Debug ---
    const handleDebug = useCallback(async () => {
        // Auto-save before debug
        if (!scenarioId && !isNew) {
            toast.error('请先保存场景');
            return;
        }

        setDebugging(true);
        try {
            // Save first
            await handleSave();

            const targetId = scenarioId;
            if (!targetId) {
                toast.error('保存失败，无法调试');
                setDebugging(false);
                return;
            }

            const debugPayload: { environment_id?: string; dataset_id?: string } = {};
            if (environmentId) debugPayload.environment_id = environmentId;
            if (datasetId) debugPayload.dataset_id = datasetId;

            const res = await scenariosApi.debug(targetId, debugPayload);
            const result = res?.data?.data ?? res?.data;

            if (result?.report_id) {
                toast.success('调试完成，正在跳转到报告...');
                navigate(`/reports/${result.report_id}`);
            } else {
                toast.success('调试请求已发送');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '未知错误';
            toast.error(`调试失败: ${msg}`);
        } finally {
            setDebugging(false);
        }
    }, [scenarioId, isNew, environmentId, datasetId, handleSave, navigate]);

    // --- Variables KV editor ---
    const variableEntries = Object.entries(scenarioData.variables);
    const addVariable = () => {
        setScenarioData({ variables: { ...scenarioData.variables, '': '' } });
    };
    const updateVariable = (oldKey: string, newKey: string, newValue: string) => {
        const next = { ...scenarioData.variables };
        if (oldKey !== newKey) delete next[oldKey];
        next[newKey.trim() || oldKey] = newValue;
        setScenarioData({ variables: next });
    };
    const removeVariable = (key: string) => {
        const next = { ...scenarioData.variables };
        delete next[key];
        setScenarioData({ variables: next });
    };

    // --- Tags ---
    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !scenarioData.tags.includes(tag)) {
            setScenarioData({ tags: [...scenarioData.tags, tag] });
        }
        setTagInput('');
    };
    const removeTag = (tag: string) => {
        setScenarioData({ tags: scenarioData.tags.filter((t) => t !== tag) });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => navigate('/scenarios')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="h-5 w-px bg-slate-700" />
                    <span className="text-sm font-semibold text-slate-300">
                        场景编排
                    </span>
                    {scenarioData.name && (
                        <span className="text-sm text-slate-500">— {scenarioData.name}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {saving ? '保存中...' : '保存'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                        onClick={handleDebug}
                        disabled={debugging || saving}
                    >
                        <Bug className="w-3.5 h-3.5 mr-1.5" />
                        {debugging ? '调试中...' : '调试'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => navigate('/scenarios')}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Main area ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Basic info — collapsible */}
                    <div className="border-b border-slate-800 flex-shrink-0">
                        <button
                            className="flex items-center gap-2 w-full px-6 py-3 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                            onClick={() => setInfoCollapsed(!infoCollapsed)}
                        >
                            {infoCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <Settings2 className="w-3.5 h-3.5" />
                            <span className="font-medium">基础信息</span>
                        </button>

                        {!infoCollapsed && (
                            <div className="px-6 pb-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Project */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">项目</label>
                                        <CustomSelect
                                            value={scenarioData.projectId}
                                            onChange={(v) => setScenarioData({ projectId: String(v) })}
                                            options={projectOptions}
                                            placeholder="选择项目"
                                            size="sm"
                                        />
                                    </div>
                                    {/* Name */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">名称</label>
                                        <Input
                                            value={scenarioData.name}
                                            onChange={(e) => setScenarioData({ name: e.target.value })}
                                            placeholder="场景名称"
                                            className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs focus-visible:ring-cyan-500/30"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">描述</label>
                                    <Textarea
                                        value={scenarioData.description}
                                        onChange={(e) => setScenarioData({ description: e.target.value })}
                                        placeholder="场景描述..."
                                        rows={2}
                                        className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 text-xs resize-none focus-visible:ring-cyan-500/30"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Priority */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">优先级</label>
                                        <CustomSelect
                                            value={scenarioData.priority}
                                            onChange={(v) => setScenarioData({ priority: String(v) })}
                                            options={PRIORITIES}
                                            placeholder="优先级"
                                            size="sm"
                                        />
                                    </div>
                                    {/* Tags */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">标签</label>
                                        <div className="flex flex-wrap gap-1 items-center">
                                            {scenarioData.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded-md"
                                                >
                                                    {tag}
                                                    <button
                                                        className="text-slate-500 hover:text-red-400"
                                                        onClick={() => removeTag(tag)}
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </span>
                                            ))}
                                            <Input
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addTag();
                                                    }
                                                }}
                                                placeholder="回车添加标签"
                                                className="w-24 bg-transparent border-none text-slate-300 placeholder:text-slate-600 h-6 text-[10px] p-0 focus-visible:ring-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b border-slate-800 flex-shrink-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={cn(
                                    'px-5 py-2.5 text-xs font-medium transition-all border-b-2',
                                    activeTab === tab.id
                                        ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5'
                                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.02]',
                                )}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'steps' && (
                            <StepListEditor projectId={scenarioData.projectId} />
                        )}

                        {activeTab === 'variables' && (
                            <div className="p-6 space-y-3 overflow-y-auto h-full">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-300">变量定义</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addVariable}
                                        className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 h-7 text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        添加变量
                                    </Button>
                                </div>

                                {variableEntries.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">暂无变量，点击上方按钮添加</p>
                                ) : (
                                    variableEntries.map(([key, value], i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <Input
                                                defaultValue={key}
                                                onBlur={(e) => updateVariable(key, e.target.value, value)}
                                                placeholder="变量名"
                                                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                                            />
                                            <Input
                                                value={value}
                                                onChange={(e) => updateVariable(key, key, e.target.value)}
                                                placeholder="变量值"
                                                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-slate-500 hover:text-red-400"
                                                onClick={() => removeVariable(key)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'preSql' && (
                            <div className="p-6 h-full flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">前置 SQL</h3>
                                <Textarea
                                    value={scenarioData.preSql}
                                    onChange={(e) => setScenarioData({ preSql: e.target.value })}
                                    placeholder="-- 在场景执行前运行的 SQL 语句&#10;INSERT INTO ..."
                                    className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 font-mono text-xs resize-none focus-visible:ring-cyan-500/30"
                                />
                            </div>
                        )}

                        {activeTab === 'postSql' && (
                            <div className="p-6 h-full flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">后置 SQL</h3>
                                <Textarea
                                    value={scenarioData.postSql}
                                    onChange={(e) => setScenarioData({ postSql: e.target.value })}
                                    placeholder="-- 在场景执行后运行的 SQL 语句&#10;DELETE FROM ..."
                                    className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 font-mono text-xs resize-none focus-visible:ring-cyan-500/30"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right sidebar ── */}
                <div className="w-72 border-l border-slate-800 bg-slate-900/40 flex-shrink-0 flex flex-col overflow-y-auto">
                    {/* Environment */}
                    <div className="p-4 border-b border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Settings2 className="w-3.5 h-3.5" />
                            运行环境
                        </div>
                        <CustomSelect
                            value={environmentId || ''}
                            onChange={(v) => setEnvironmentId(String(v))}
                            options={envOptions}
                            placeholder="选择环境"
                            size="sm"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-slate-500 hover:text-slate-300 h-7"
                            onClick={() => {
                                if (scenarioData.projectId) {
                                    window.open(`/projects/${scenarioData.projectId}/environments`, '_blank');
                                } else {
                                    toast.info('请先选择项目');
                                }
                            }}
                        >
                            <Settings2 className="w-3 h-3 mr-1.5" />
                            环境管理
                        </Button>
                    </div>

                    {/* Datasets */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Database className="w-3.5 h-3.5" />
                            测试数据集
                        </div>
                        <CustomSelect
                            value={datasetId || ''}
                            onChange={(v) => setDatasetId(String(v))}
                            options={datasetOptions}
                            placeholder="选择数据集"
                            size="sm"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-slate-500 hover:text-slate-300 h-7"
                            onClick={() => {
                                if (scenarioId) {
                                    setDatasetDialogOpen(true);
                                } else {
                                    toast.info('请先保存场景后再创建数据集');
                                }
                            }}
                        >
                            <Plus className="w-3 h-3 mr-1.5" />
                            新建数据集
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dataset dialog */}
            {scenarioId && (
                <DatasetDialog
                    isOpen={datasetDialogOpen}
                    onClose={() => {
                        setDatasetDialogOpen(false);
                        refetchDatasets();
                    }}
                    scenarioId={Number(scenarioId)}
                />
            )}
        </div>
    );
}
