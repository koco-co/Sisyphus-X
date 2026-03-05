import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { plansApi } from '@/api/client';
import { toast } from 'sonner';
import config from '@/config';

interface ExecutionStep {
    id: string;
    scenario_id: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string | null;
}

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

function getWsUrl(executionId: string): string {
    const base = config.apiBaseURL || '';
    const url = new URL(base, window.location.origin);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/api/v1/ws/executions/${executionId}`;
}

export default function PlanExecutionPage() {
    const { planId, executionId } = useParams<{ planId: string; executionId: string }>();
    const navigate = useNavigate();
    const wsRef = useRef<WebSocket | null>(null);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

    const planIdNum = planId ? Number(planId) : 0;

    const { data: planData } = useQuery({
        queryKey: ['plan', planId],
        queryFn: () => plansApi.get(planId!),
        enabled: !!planId,
        select: (res) => res.data?.data ?? res.data
    });

    const { data: executionData, refetch: refetchExecution } = useQuery({
        queryKey: ['plan-execution', planId, executionId],
        queryFn: async () => {
            const res = await plansApi.getExecution(planIdNum, executionId!);
            return res.data as { execution?: ExecutionData; steps?: ExecutionStep[]; current_status?: string };
        },
        enabled: !!planId && !!executionId,
        refetchInterval: (data) => {
            const status = data?.current_status ?? data?.execution?.status;
            return status === 'running' || status === 'pending' ? 2000 : false;
        }
    });

    // Use API data directly instead of duplicating state
    const execution = executionData?.execution;
    const steps = executionData?.steps ?? [];
    const currentStatus = executionData?.current_status ?? execution?.status ?? 'pending';

    useEffect(() => {
        if (!executionId) return;
        const token = localStorage.getItem(config.storageKeys?.token ?? 'sisyphus-token');
        const wsUrl = getWsUrl(executionId);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'progress' || msg.type === 'step_started' || msg.type === 'step_completed') {
                    refetchExecution();
                }
                if (msg.type === 'completed' || msg.type === 'error') {
                    refetchExecution();
                }
            } catch {
                // ignore
            }
        };

        ws.onopen = () => {
            if (token) {
                ws.send(JSON.stringify({ type: 'auth', token }));
            }
        };

        ws.onerror = () => {};
        ws.onclose = () => {};

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [executionId, refetchExecution]);

    const handleTerminate = async () => {
        if (!planId) return;
        try {
            await plansApi.terminate(planIdNum);
            toast.success('已发送终止请求');
            refetchExecution();
        } catch {
            toast.error('终止失败');
        }
    };

    const handleRunAgain = () => {
        navigate(`/plans/${planId}`);
    };

    const toggleStep = (index: number) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const planName = (planData as { name?: string })?.name ?? '执行计划';
    const isRunning = currentStatus === 'running' || currentStatus === 'pending';
    const isDone = ['completed', 'failed', 'cancelled'].includes(currentStatus);

    const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
        pending: { label: '等待中', icon: Clock, color: 'text-slate-400' },
        running: { label: '运行中', icon: Loader2, color: 'text-cyan-400' },
        completed: { label: '已完成', icon: CheckCircle2, color: 'text-emerald-400' },
        failed: { label: '失败', icon: XCircle, color: 'text-red-400' },
        cancelled: { label: '已终止', icon: AlertCircle, color: 'text-amber-400' },
    };
    const statusInfo = statusConfig[currentStatus] ?? statusConfig.pending;
    const StatusIcon = statusInfo.icon;

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 text-sm text-slate-400"
            >
                <Link to="/plans" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> 测试计划
                </Link>
                <span>/</span>
                <span className="text-white font-medium">执行计划 - {planName}</span>
            </motion.div>

            <motion.header
                className="flex flex-wrap items-center justify-between gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        {isRunning && <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />}
                        {isDone && <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />}
                        执行计划 - {planName}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        执行 ID: {executionId}
                        {execution?.started_at && (
                            <span className="ml-4">
                                开始: {new Date(execution.started_at).toLocaleString('zh-CN')}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isRunning && (
                        <button
                            onClick={handleTerminate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                            <Square className="w-4 h-4" /> 终止
                        </button>
                    )}
                    {isDone && (
                        <>
                            <button
                                onClick={handleRunAgain}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                            >
                                <Play className="w-4 h-4" /> 再次运行
                            </button>
                            <span className="text-slate-500 text-sm">导出 / Allure 报告（占位）</span>
                        </>
                    )}
                </div>
            </motion.header>

            {/* 汇总卡片 */}
            {execution && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="text-slate-400 text-sm">状态</div>
                        <div className={`mt-1 font-medium flex items-center gap-2 ${statusInfo.color}`}>
                            <StatusIcon className={currentStatus === 'running' ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                            {statusInfo.label}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="text-slate-400 text-sm">通过</div>
                        <div className="mt-1 text-emerald-400 font-medium">{execution.passed_scenarios}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="text-slate-400 text-sm">失败</div>
                        <div className="mt-1 text-red-400 font-medium">{execution.failed_scenarios}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="text-slate-400 text-sm">总计</div>
                        <div className="mt-1 text-white font-medium">{execution.total_scenarios}</div>
                    </div>
                </motion.div>
            )}

            {/* 场景/步骤列表（可折叠） */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-white/5 font-medium text-white">
                    场景执行列表
                </div>
                <div className="divide-y divide-white/5">
                    {steps.length === 0 && (
                        <div className="px-6 py-8 text-center text-slate-500 text-sm">
                            {isRunning ? '执行中，请稍候...' : '暂无步骤数据'}
                        </div>
                    )}
                    {steps.map((step, index) => {
                        const expanded = expandedSteps.has(index);
                        const stepStatus = step.status;
                        const stepStatusColor =
                            stepStatus === 'passed' ? 'text-emerald-400' :
                            stepStatus === 'failed' ? 'text-red-400' :
                            stepStatus === 'running' ? 'text-cyan-400' : 'text-slate-400';
                        return (
                            <div key={step.id} className="bg-slate-800/30">
                                <button
                                    type="button"
                                    onClick={() => toggleStep(index)}
                                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {expanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        )}
                                        <span className="text-white font-medium">
                                            场景 #{index + 1} ({step.scenario_id})
                                        </span>
                                        <span className={`text-sm ${stepStatusColor}`}>
                                            {stepStatus === 'running' && <Loader2 className="w-4 h-4 inline animate-spin mr-1" />}
                                            {stepStatus === 'passed' && '通过'}
                                            {stepStatus === 'failed' && '失败'}
                                            {stepStatus === 'pending' && '等待中'}
                                            {stepStatus === 'running' && '运行中'}
                                        </span>
                                    </div>
                                </button>
                                {expanded && (
                                    <div className="px-6 pb-4 pl-14 text-sm text-slate-400">
                                        {step.started_at && (
                                            <div>开始: {new Date(step.started_at).toLocaleString('zh-CN')}</div>
                                        )}
                                        {step.completed_at && (
                                            <div>结束: {new Date(step.completed_at).toLocaleString('zh-CN')}</div>
                                        )}
                                        {step.error_message && (
                                            <div className="mt-2 text-red-400">{step.error_message}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
