import { useState, useEffect, useRef, useReducer, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Square,
    Play,
    Clock,
    Pause,
    RotateCcw,
    FileDown,
    ExternalLink,
    Activity,
    Timer,
    Zap,
} from 'lucide-react';
import { plansApi } from '@/api/client';
import { toast } from 'sonner';
import config from '@/config';

// ─── Types ───────────────────────────────────────────────────

interface ExecutionData {
    id: string;
    test_plan_id: string;
    status: string;
    started_at?: string | null;
    completed_at?: string | null;
    total_scenarios: number;
    passed_scenarios: number;
    failed_scenarios: number;
    skipped_scenarios: number;
}

interface ExecutionStep {
    id: string;
    scenario_id: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string | null;
}

interface ApiRequest {
    name?: string;
    method: string;
    url: string;
    status_code?: number;
    duration_ms?: number;
    status: string;
    request?: { url?: string; method?: string; headers?: Record<string, string>; body?: unknown };
    response?: { status_code?: number; headers?: Record<string, string>; body?: unknown };
}

interface ScenarioStepState extends ExecutionStep {
    scenario_name?: string;
    api_requests?: ApiRequest[];
}

interface ExecState {
    execution: ExecutionData | null;
    steps: ScenarioStepState[];
    currentStatus: string;
}

type ExecAction =
    | { type: 'SET_DATA'; execution: ExecutionData; steps: ScenarioStepState[]; currentStatus: string }
    | { type: 'STEP_STARTED'; scenario_id: string; index: number }
    | { type: 'STEP_COMPLETED'; scenario_id: string; index: number; status: string; passed: number; failed: number }
    | { type: 'PROGRESS'; total: number; current: number }
    | { type: 'COMPLETED'; passed: number; failed: number; total: number; status: string }
    | { type: 'ERROR'; message: string };

function execReducer(state: ExecState, action: ExecAction): ExecState {
    switch (action.type) {
        case 'SET_DATA':
            return {
                execution: action.execution,
                steps: action.steps,
                currentStatus: action.currentStatus,
            };
        case 'STEP_STARTED': {
            const steps = [...state.steps];
            if (steps[action.index]) {
                steps[action.index] = { ...steps[action.index], status: 'running' };
            }
            return {
                ...state,
                steps,
                currentStatus: 'running',
                execution: state.execution ? { ...state.execution, status: 'running' } : null,
            };
        }
        case 'STEP_COMPLETED': {
            const steps = [...state.steps];
            if (steps[action.index]) {
                steps[action.index] = { ...steps[action.index], status: action.status };
            }
            return {
                ...state,
                steps,
                execution: state.execution ? {
                    ...state.execution,
                    passed_scenarios: action.passed,
                    failed_scenarios: action.failed,
                } : null,
            };
        }
        case 'PROGRESS':
            return {
                ...state,
                execution: state.execution ? {
                    ...state.execution,
                    total_scenarios: action.total,
                } : null,
                currentStatus: 'running',
            };
        case 'COMPLETED':
            return {
                ...state,
                currentStatus: action.status,
                execution: state.execution ? {
                    ...state.execution,
                    status: action.status,
                    passed_scenarios: action.passed,
                    failed_scenarios: action.failed,
                    total_scenarios: action.total,
                } : null,
            };
        case 'ERROR':
            return { ...state, currentStatus: 'failed' };
        default:
            return state;
    }
}

// ─── Helpers ─────────────────────────────────────────────────

function getWsUrl(executionId: string): string {
    const base = config.apiBaseURL || '';
    const url = new URL(base, window.location.origin);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/api/v1/ws/executions/${executionId}`;
}

function calcDurationMs(start?: string | null, end?: string | null): number {
    if (!start) return 0;
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    return Math.max(0, e - s);
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PUT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    PATCH: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
    pending: { label: '等待中', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    running: { label: '运行中', icon: Loader2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    completed: { label: '已完成', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    passed: { label: '通过', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    failed: { label: '失败', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    cancelled: { label: '已终止', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    skipped: { label: '跳过', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

// ─── Components ──────────────────────────────────────────────

function PulsingStatus({ status }: { status: string }) {
    const isRunning = status === 'running' || status === 'pending';
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;

    return (
        <div className="flex items-center gap-3">
            <div className="relative">
                {isRunning && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-cyan-400/30"
                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}
                <div className={`relative w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${cfg.color} ${isRunning ? 'animate-spin' : ''}`} />
                </div>
            </div>
            <div>
                <div className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</div>
                <div className="text-xs text-slate-500">{isRunning ? '执行进行中...' : '执行已结束'}</div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, children }: { icon: typeof Activity; label: string; children: React.ReactNode }) {
    return (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <div className="text-sm">{children}</div>
        </div>
    );
}

function JsonBlock({ data }: { data: unknown }) {
    if (data === null || data === undefined) return <span className="text-slate-500 italic">empty</span>;
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return (
        <pre className="text-xs text-slate-300 bg-slate-950/50 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all font-mono">
            {text}
        </pre>
    );
}

// ─── Main Component ──────────────────────────────────────────

export default function PlanExecutionPage() {
    const { planId, executionId } = useParams<{ planId: string; executionId: string }>();
    const navigate = useNavigate();
    const wsRef = useRef<WebSocket | null>(null);

    const [expandedScenarios, setExpandedScenarios] = useState<Set<number>>(new Set());
    const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
    const [isPaused, setIsPaused] = useState(false);

    const [state, dispatch] = useReducer(execReducer, {
        execution: null,
        steps: [],
        currentStatus: 'pending',
    });

    // Fetch plan info (for name)
    const { data: planData } = useQuery({
        queryKey: ['plan', planId],
        queryFn: () => plansApi.get(planId!),
        enabled: !!planId,
        select: (res) => res.data?.data ?? res.data,
    });

    // Fetch scenario names for this plan
    const { data: planScenariosData } = useQuery({
        queryKey: ['plan-scenarios', planId],
        queryFn: async () => {
            const res = await plansApi.listScenarios(planId!);
            return (res.data?.items ?? res.data) as Array<{ scenario_id: string; scenario_name?: string }>;
        },
        enabled: !!planId,
    });

    const scenarioNameMap = useMemo(() => {
        const map = new Map<string, string>();
        if (planScenariosData) {
            for (const ps of planScenariosData) {
                if (ps.scenario_name) map.set(ps.scenario_id, ps.scenario_name);
            }
        }
        return map;
    }, [planScenariosData]);

    // Fetch execution data
    const { refetch: refetchExecution } = useQuery({
        queryKey: ['plan-execution', planId, executionId],
        queryFn: async () => {
            const res = await plansApi.getExecution(Number(planId), executionId!);
            const data = res.data as { execution?: ExecutionData; steps?: ExecutionStep[]; current_status?: string };
            if (data.execution) {
                const enrichedSteps: ScenarioStepState[] = (data.steps ?? []).map(s => ({
                    ...s,
                    scenario_name: scenarioNameMap.get(s.scenario_id),
                }));
                dispatch({
                    type: 'SET_DATA',
                    execution: data.execution,
                    steps: enrichedSteps,
                    currentStatus: data.current_status ?? data.execution.status ?? 'pending',
                });
            }
            return data;
        },
        enabled: !!planId && !!executionId,
        refetchInterval: () => {
            const s = state.currentStatus;
            return (s === 'running' || s === 'pending') ? 3000 : false;
        },
    });

    // WebSocket connection
    useEffect(() => {
        if (!executionId) return;
        const token = localStorage.getItem(config.storageKeys?.token ?? 'sisyphus-token');
        const wsUrl = getWsUrl(executionId);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (token) ws.send(JSON.stringify({ type: 'auth', token }));
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const data = msg.data || {};

                switch (msg.type) {
                    case 'progress':
                        dispatch({ type: 'PROGRESS', total: data.total ?? 0, current: data.current ?? 0 });
                        break;
                    case 'step_started':
                        dispatch({ type: 'STEP_STARTED', scenario_id: data.scenario_id, index: data.index ?? 0 });
                        setExpandedScenarios(prev => new Set(prev).add(data.index ?? 0));
                        break;
                    case 'step_completed':
                        dispatch({
                            type: 'STEP_COMPLETED',
                            scenario_id: data.scenario_id,
                            index: data.index ?? 0,
                            status: data.status ?? 'passed',
                            passed: data.passed ?? 0,
                            failed: data.failed ?? 0,
                        });
                        refetchExecution();
                        break;
                    case 'completed':
                        dispatch({
                            type: 'COMPLETED',
                            status: data.status ?? 'completed',
                            passed: data.passed ?? 0,
                            failed: data.failed ?? 0,
                            total: data.total ?? 0,
                        });
                        refetchExecution();
                        break;
                    case 'error':
                        dispatch({ type: 'ERROR', message: data.message ?? '' });
                        refetchExecution();
                        break;
                }
            } catch {
                // ignore parse errors
            }
        };

        ws.onerror = () => {};
        ws.onclose = () => {};

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [executionId, refetchExecution]);

    // ─── Actions ─────────────────────────────────────────

    const handleTerminate = async () => {
        if (!planId) return;
        try {
            await plansApi.terminate(Number(planId));
            toast.success('已发送终止请求');
            refetchExecution();
        } catch {
            toast.error('终止失败');
        }
    };

    const handlePause = async () => {
        if (!planId) return;
        try {
            await plansApi.pause(Number(planId));
            setIsPaused(true);
            toast.success('已暂停执行');
        } catch {
            toast.error('暂停失败');
        }
    };

    const handleResume = async () => {
        if (!planId) return;
        try {
            await plansApi.resume(Number(planId));
            setIsPaused(false);
            toast.success('已恢复执行');
        } catch {
            toast.error('恢复失败');
        }
    };

    const handleRunAgain = async () => {
        if (!planId) return;
        try {
            const res = await plansApi.execute(planId);
            const newExecId = (res.data as { execution_id?: string })?.execution_id;
            if (newExecId) {
                toast.success('已开始新的执行');
                navigate(`/plans/${planId}/executions/${newExecId}`);
            } else {
                toast.error('执行失败：未返回执行 ID');
            }
        } catch {
            toast.error('执行失败');
        }
    };

    const toggleScenario = useCallback((index: number) => {
        setExpandedScenarios(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }, []);

    const toggleRequest = useCallback((key: string) => {
        setExpandedRequests(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    // ─── Derived data ────────────────────────────────────

    const { execution, steps, currentStatus } = state;
    const planName = (planData as { name?: string })?.name ?? '执行计划';
    const isRunning = currentStatus === 'running' || currentStatus === 'pending';
    const isDone = ['completed', 'failed', 'cancelled'].includes(currentStatus);

    const totalScenarios = execution?.total_scenarios ?? steps.length;
    const passedScenarios = execution?.passed_scenarios ?? steps.filter(s => s.status === 'passed').length;
    const failedScenarios = execution?.failed_scenarios ?? steps.filter(s => s.status === 'failed').length;

    const durations = steps
        .filter(s => s.started_at)
        .map(s => calcDurationMs(s.started_at, s.completed_at));
    const totalDurationMs = calcDurationMs(execution?.started_at, execution?.completed_at);
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const maxDurationMs = durations.length > 0 ? Math.max(...durations) : 0;

    const statusCfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.icon;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6 pb-28">
            {/* Breadcrumb */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-slate-400"
            >
                <Link to="/plans" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> 测试计划
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-white font-medium truncate max-w-[300px]">{planName}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400 truncate max-w-[200px]">执行 {executionId?.slice(0, 8)}...</span>
            </motion.div>

            {/* Header */}
            <motion.header
                className="flex flex-wrap items-center justify-between gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {isRunning && (
                            <motion.div
                                className="absolute inset-0 rounded-full bg-cyan-400/20"
                                animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        )}
                        <div className={`relative w-12 h-12 rounded-full ${statusCfg.bg} flex items-center justify-center`}>
                            <StatusIcon className={`w-6 h-6 ${statusCfg.color} ${currentStatus === 'running' ? 'animate-spin' : ''}`} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{planName}</h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {statusCfg.label}
                            {execution?.started_at && (
                                <span className="ml-3 text-slate-500">
                                    开始于 {new Date(execution.started_at).toLocaleString('zh-CN')}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isRunning && !isPaused && (
                        <>
                            <button
                                onClick={handlePause}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors text-sm"
                            >
                                <Pause className="w-4 h-4" /> 暂停
                            </button>
                            <button
                                onClick={handleTerminate}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm"
                            >
                                <Square className="w-4 h-4" /> 终止
                            </button>
                        </>
                    )}
                    {isRunning && isPaused && (
                        <>
                            <button
                                onClick={handleResume}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors text-sm"
                            >
                                <Play className="w-4 h-4" /> 恢复
                            </button>
                            <button
                                onClick={handleTerminate}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm"
                            >
                                <Square className="w-4 h-4" /> 终止
                            </button>
                        </>
                    )}
                </div>
            </motion.header>

            {/* Statistics area */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                    <PulsingStatus status={currentStatus} />
                </div>

                <StatCard icon={Activity} label="场景统计">
                    <div className="flex items-center gap-3">
                        <span className="text-white">总 <span className="font-bold">{totalScenarios}</span></span>
                        <span className="text-emerald-400">通过 <span className="font-bold">{passedScenarios}</span></span>
                        <span className="text-red-400">失败 <span className="font-bold">{failedScenarios}</span></span>
                    </div>
                    {totalScenarios > 0 && (
                        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${((passedScenarios + failedScenarios) / totalScenarios) * 100}%`,
                                    background: failedScenarios > 0
                                        ? `linear-gradient(to right, #34d399 ${(passedScenarios / (passedScenarios + failedScenarios)) * 100}%, #f87171 0%)`
                                        : '#34d399',
                                }}
                            />
                        </div>
                    )}
                </StatCard>

                <StatCard icon={Zap} label="接口统计">
                    <span className="text-slate-500 text-xs italic">场景级数据暂无接口级明细</span>
                </StatCard>

                <StatCard icon={Timer} label="性能指标">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">平均耗时</span>
                            <span className="text-white font-medium">{formatDuration(Math.round(avgDurationMs))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">最慢场景</span>
                            <span className="text-amber-400 font-medium">{formatDuration(Math.round(maxDurationMs))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">总耗时</span>
                            <span className="text-cyan-400 font-medium">{formatDuration(Math.round(totalDurationMs))}</span>
                        </div>
                    </div>
                </StatCard>
            </motion.div>

            {/* Three-layer execution list */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <span className="font-medium text-white">场景执行列表</span>
                    <span className="text-xs text-slate-500">
                        {steps.filter(s => ['passed', 'failed', 'skipped'].includes(s.status)).length} / {steps.length} 已完成
                    </span>
                </div>

                <div className="divide-y divide-white/5">
                    {steps.length === 0 && (
                        <div className="px-6 py-12 text-center text-slate-500 text-sm">
                            {isRunning ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                    <span>正在准备执行...</span>
                                </div>
                            ) : (
                                '暂无步骤数据'
                            )}
                        </div>
                    )}

                    {steps.map((step, scenarioIdx) => {
                        const isExpanded = expandedScenarios.has(scenarioIdx);
                        const stepCfg = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
                        const StepIcon = stepCfg.icon;
                        const durationMs = calcDurationMs(step.started_at, step.completed_at);
                        const scenarioName = step.scenario_name || scenarioNameMap.get(step.scenario_id) || `场景 #${scenarioIdx + 1}`;
                        const apiRequests = step.api_requests || [];

                        const completedSteps = apiRequests.filter(r => r.status === 'passed' || r.status === 'failed').length;
                        const progressPct = apiRequests.length > 0
                            ? (completedSteps / apiRequests.length) * 100
                            : step.status === 'passed' ? 100
                            : step.status === 'failed' ? 100
                            : step.status === 'running' ? 50
                            : 0;

                        return (
                            <div key={step.id || scenarioIdx} className="bg-slate-800/20">
                                {/* Layer 1: Scenario row */}
                                <button
                                    type="button"
                                    onClick={() => toggleScenario(scenarioIdx)}
                                    className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex-shrink-0 text-slate-500">
                                        {isExpanded
                                            ? <ChevronDown className="w-4 h-4" />
                                            : <ChevronRight className="w-4 h-4" />
                                        }
                                    </div>

                                    <div className="flex-shrink-0">
                                        <StepIcon className={`w-5 h-5 ${stepCfg.color} ${step.status === 'running' ? 'animate-spin' : ''}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium text-sm truncate block">
                                            {scenarioName}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-32 flex-shrink-0 hidden sm:block">
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${step.status === 'failed' ? 'bg-red-400' : 'bg-cyan-400'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPct}%` }}
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 text-right min-w-[80px]">
                                        <span className={`text-xs font-medium ${stepCfg.color}`}>
                                            {stepCfg.label}
                                        </span>
                                    </div>

                                    {durationMs > 0 && (
                                        <span className="text-xs text-slate-500 flex-shrink-0 w-16 text-right">
                                            {formatDuration(durationMs)}
                                        </span>
                                    )}
                                </button>

                                {/* Layer 2: API requests */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-14 pr-6 pb-4 space-y-1">
                                                {apiRequests.length > 0 ? (
                                                    apiRequests.map((req, reqIdx) => {
                                                        const reqKey = `${scenarioIdx}-${reqIdx}`;
                                                        const isReqExpanded = expandedRequests.has(reqKey);
                                                        const reqCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                                                        const ReqIcon = reqCfg.icon;
                                                        const isLast = reqIdx === apiRequests.length - 1;

                                                        return (
                                                            <div key={reqIdx}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRequest(reqKey)}
                                                                    className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                                                                >
                                                                    <span className="text-slate-600 text-xs flex-shrink-0">
                                                                        {isLast ? '└─' : '├─'}
                                                                    </span>
                                                                    <ReqIcon className={`w-3.5 h-3.5 flex-shrink-0 ${reqCfg.color} ${req.status === 'running' ? 'animate-spin' : ''}`} />
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${METHOD_COLORS[req.method?.toUpperCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                                        {req.method?.toUpperCase()}
                                                                    </span>
                                                                    <span className="text-sm text-slate-300 truncate flex-1 font-mono">
                                                                        {req.url}
                                                                    </span>
                                                                    {req.status_code != null && (
                                                                        <span className={`text-xs font-mono flex-shrink-0 ${req.status_code >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                            {req.status_code}
                                                                        </span>
                                                                    )}
                                                                    {req.duration_ms != null && (
                                                                        <span className="text-xs text-slate-500 flex-shrink-0">
                                                                            {formatDuration(req.duration_ms)}
                                                                        </span>
                                                                    )}
                                                                    {req.status === 'pending' && (
                                                                        <span className="text-xs text-slate-600 flex-shrink-0 italic">等待中</span>
                                                                    )}
                                                                </button>

                                                                {/* Layer 3: Request detail */}
                                                                <AnimatePresence>
                                                                    {isReqExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden ml-10 mb-2"
                                                                        >
                                                                            <div className="bg-slate-900/80 border border-white/5 rounded-xl p-4 space-y-3">
                                                                                {req.request && (
                                                                                    <div>
                                                                                        <div className="text-xs text-cyan-400 font-medium mb-1.5">Request</div>
                                                                                        <div className="text-xs text-slate-400 mb-1">
                                                                                            {req.request.method?.toUpperCase()} {req.request.url}
                                                                                        </div>
                                                                                        {req.request.headers && Object.keys(req.request.headers).length > 0 && (
                                                                                            <div className="mb-1">
                                                                                                <span className="text-xs text-slate-500">Headers:</span>
                                                                                                <JsonBlock data={req.request.headers} />
                                                                                            </div>
                                                                                        )}
                                                                                        {req.request.body != null && (
                                                                                            <div>
                                                                                                <span className="text-xs text-slate-500">Body:</span>
                                                                                                <JsonBlock data={req.request.body} />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                {req.response && (
                                                                                    <div>
                                                                                        <div className="text-xs text-emerald-400 font-medium mb-1.5">Response</div>
                                                                                        {req.response.status_code != null && (
                                                                                            <div className="text-xs text-slate-400 mb-1">
                                                                                                Status: <span className={req.response.status_code >= 400 ? 'text-red-400' : 'text-emerald-400'}>{req.response.status_code}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {req.response.body != null && (
                                                                                            <div>
                                                                                                <span className="text-xs text-slate-500">Body:</span>
                                                                                                <JsonBlock data={req.response.body} />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                {!req.request && !req.response && (
                                                                                    <span className="text-xs text-slate-500 italic">暂无请求/响应详情</span>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="py-3 text-slate-500 text-xs space-y-2">
                                                        {step.started_at && (
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-3 h-3" />
                                                                开始: {new Date(step.started_at).toLocaleString('zh-CN')}
                                                            </div>
                                                        )}
                                                        {step.completed_at && (
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                结束: {new Date(step.completed_at).toLocaleString('zh-CN')}
                                                                <span className="text-slate-600">({formatDuration(durationMs)})</span>
                                                            </div>
                                                        )}
                                                        {step.error_message && (
                                                            <div className="mt-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                                                <div className="text-xs text-red-400 font-medium mb-1">错误信息</div>
                                                                <pre className="text-xs text-red-300/80 whitespace-pre-wrap break-all font-mono">
                                                                    {step.error_message}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {!step.error_message && step.status === 'passed' && (
                                                            <div className="text-emerald-400/60 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> 场景执行通过
                                                            </div>
                                                        )}
                                                        {step.status === 'running' && (
                                                            <div className="text-cyan-400/60 flex items-center gap-1">
                                                                <Loader2 className="w-3 h-3 animate-spin" /> 正在执行中...
                                                            </div>
                                                        )}
                                                        {step.status === 'pending' && (
                                                            <div className="text-slate-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> 等待执行
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-white/5 px-8 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : isDone ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {statusCfg.label}
                        {totalScenarios > 0 && (
                            <span className="text-slate-500 ml-2">
                                {passedScenarios + failedScenarios} / {totalScenarios} 场景
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isRunning && !isPaused && (
                            <button
                                onClick={handlePause}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors text-sm"
                            >
                                <Pause className="w-4 h-4" /> 暂停
                            </button>
                        )}
                        {isRunning && isPaused && (
                            <button
                                onClick={handleResume}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors text-sm"
                            >
                                <Play className="w-4 h-4" /> 恢复
                            </button>
                        )}
                        <button
                            onClick={handleRunAgain}
                            disabled={isRunning}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RotateCcw className="w-4 h-4" /> 再次运行
                        </button>
                        <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-white/5 text-sm opacity-50 cursor-not-allowed"
                        >
                            <FileDown className="w-4 h-4" /> 导出报告
                        </button>
                        <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-white/5 text-sm opacity-50 cursor-not-allowed"
                        >
                            <ExternalLink className="w-4 h-4" /> Allure 报告
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
