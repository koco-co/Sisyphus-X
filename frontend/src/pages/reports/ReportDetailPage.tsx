import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    FileBarChart2,
    Loader2,
    Download,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Trash2,
    ChevronDown,
    ChevronRight,
    RotateCcw,
    Activity,
    Timer,
    AlertCircle,
} from 'lucide-react';
import { plansApi, reportsApi } from '@/api/client';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ReportDetailItem {
    id: string;
    report_id: string;
    scenario_id?: string | null;
    scenario_name?: string | null;
    node_id: string;
    node_name: string;
    method?: string | null;
    url?: string | null;
    status: string;
    request_data?: Record<string, unknown> | null;
    response_data?: Record<string, unknown> | null;
    error_msg?: string | null;
    elapsed: number;
    created_at: string;
}

interface ReportDetail {
    id: number | string;
    name?: string;
    plan_id?: string;
    plan_name?: string;
    scenario_id?: string;
    scenario_name?: string;
    status: string;
    duration?: string;
    total?: number;
    success?: number;
    failed?: number;
    start_time?: string;
    end_time?: string;
    created_at?: string;
    allure_report_path?: string;
    execution_id?: string;
    details?: ReportDetailItem[];
}

/** 解析后端 duration 字符串（如 "1.5s"、"2m 30s"）为秒数 */
function parseDurationToSeconds(durationStr?: string): number | undefined {
    if (!durationStr) return undefined;
    const msMatch = durationStr.match(/(\d+\.?\d*)\s*ms/i);
    if (msMatch) return parseFloat(msMatch[1]) / 1000;
    const sMatch = durationStr.match(/(\d+\.?\d*)\s*s/i);
    const mMatch = durationStr.match(/(\d+)\s*m/i);
    const seconds = parseFloat(sMatch?.[1] ?? '0') + (parseInt(mMatch?.[1] ?? '0', 10) * 60);
    return seconds || undefined;
}

function ProgressRing({ percentage, size = 80 }: { percentage: number; size?: number }) {
    const strokeWidth = size > 60 ? 4 : 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#eab308' : '#ef4444';

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="currentColor" strokeWidth={strokeWidth}
                    className="text-slate-700"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-bold text-white"
                style={{ fontSize: size > 60 ? '1.125rem' : '0.625rem' }}
            >
                {percentage}%
            </span>
        </div>
    );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    completed: { label: '已完成', color: 'text-emerald-400', icon: CheckCircle2 },
    passed: { label: '通过', color: 'text-emerald-400', icon: CheckCircle2 },
    success: { label: '通过', color: 'text-emerald-400', icon: CheckCircle2 },
    failed: { label: '失败', color: 'text-red-400', icon: XCircle },
    running: { label: '运行中', color: 'text-cyan-400', icon: Loader2 },
    cancelled: { label: '已终止', color: 'text-orange-400', icon: AlertCircle },
    skipped: { label: '跳过', color: 'text-slate-400', icon: AlertCircle },
    pending: { label: '等待中', color: 'text-slate-400', icon: Clock },
};

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PUT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    PATCH: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
};

function JsonBlock({ data }: { data: unknown }) {
    if (data === null || data === undefined) return <span className="text-slate-500 italic">empty</span>;
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return (
        <pre className="text-xs text-slate-300 bg-slate-950/50 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all font-mono">
            {text}
        </pre>
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

export default function ReportDetailPage() {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    const id = reportId ? Number(reportId) : 0;

    const { data: report, isLoading } = useQuery({
        queryKey: ['report-detail', reportId],
        queryFn: async () => {
            const res = await reportsApi.getDetails(id);
            return (res.data as ReportDetail) ?? res.data;
        },
        enabled: id > 0,
    });

    const deleteMutation = useMutation({
        mutationFn: () => reportsApi.delete(id),
        onSuccess: () => {
            toast.success('删除成功');
            navigate('/reports');
        },
        onError: () => toast.error('删除失败'),
    });

    const handleAllure = async () => {
        if (report?.allure_report_path) {
            window.open(report.allure_report_path!, '_blank');
            return;
        }
        try {
            const res = await reportsApi.getAllureUrl(id);
            const url = (res.data as { allure_url?: string })?.allure_url;
            if (url) {
                const base = import.meta.env.VITE_API_BASE_URL || '';
                const fullUrl = url.startsWith('http') ? url : `${base.replace(/\/api\/v1$/, '')}${url}`;
                window.open(fullUrl, '_blank');
            } else {
                toast.info('Allure 报告暂未生成');
            }
        } catch {
            toast.error('获取 Allure 报告失败');
        }
    };

    const handleExport = async () => {
        try {
            const res = await reportsApi.export(id);
            const data = res.data as { download_url?: string; note?: string };
            if (data.download_url) {
                toast.success('导出请求已提交');
            } else {
                toast.info('导出功能开发中');
            }
        } catch {
            toast.info('导出功能开发中');
        }
    };

    const handleRunAgain = async () => {
        if (!report?.plan_id) {
            toast.info('无法确定关联测试计划');
            return;
        }
        try {
            const res = await plansApi.execute(report.plan_id);
            const execution = (res.data as { execution_id?: string })?.execution_id;
            if (!execution) {
                toast.error('重新执行失败：未返回执行 ID');
                return;
            }
            toast.success('已开始重新执行测试计划');
            navigate(`/plans/${report.plan_id}/executions/${execution}`);
        } catch {
            toast.error('重新执行失败');
        }
    };

    const toggleStep = (stepId: string) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
            return next;
        });
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN');
    };

    const formatDuration = (seconds?: number) => {
        if (seconds == null) return '-';
        if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
        if (seconds < 60) return `${seconds.toFixed(2).replace(/\.00$/, '')}s`;
        return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
    };

    const formatElapsed = (elapsed: number) => {
        if (elapsed < 1) return `${Math.round(elapsed * 1000)}ms`;
        return `${elapsed.toFixed(2)}s`;
    };

    const durationSeconds = parseDurationToSeconds(report?.duration);
    const passRate = (report?.total ?? 0) > 0
        ? Math.round(((report?.success ?? 0) / (report?.total ?? 1)) * 100)
        : 0;

    const details = useMemo(() => report?.details ?? [], [report?.details]);
    const groupedDetails = useMemo(() => {
        const groups = new Map<string, { key: string; name: string; items: ReportDetailItem[] }>();
        for (const detail of details) {
            const key = detail.scenario_id || detail.scenario_name || 'ungrouped';
            const name = detail.scenario_name || '未标记场景';
            const existing = groups.get(key);
            if (existing) {
                existing.items.push(detail);
            } else {
                groups.set(key, { key, name, items: [detail] });
            }
        }
        return Array.from(groups.values());
    }, [details]);
    const scenarioCount = groupedDetails.length;
    const avgElapsed = details.length > 0
        ? details.reduce((sum, d) => sum + d.elapsed, 0) / details.length
        : 0;
    const maxElapsed = details.length > 0
        ? Math.max(...details.map(d => d.elapsed))
        : 0;

    if (!reportId || id <= 0) {
        return (
            <div className="p-8 text-slate-400">
                <Link to="/reports" className="text-cyan-400 hover:underline">返回报告列表</Link>
                <p className="mt-4">无效的报告 ID</p>
            </div>
        );
    }

    if (isLoading || !report) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
            {/* Breadcrumb */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 text-sm text-slate-400"
            >
                <Link to="/reports" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> 测试报告
                </Link>
                <span>/</span>
                <span className="text-white font-medium truncate">
                    {report.plan_name || report.name || `报告 #${report.id}`}
                </span>
            </motion.div>

            {/* Header with actions */}
            <motion.header
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <FileBarChart2 className="w-8 h-8 text-cyan-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {report.plan_name || report.name || `报告 #${report.id}`}
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            运行时间: {formatDate(report.start_time || report.created_at)}
                            {durationSeconds != null && ` · 耗时 ${formatDuration(durationSeconds)}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRunAgain}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> 再次运行
                    </button>
                    <button
                        onClick={handleAllure}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Allure 报告
                    </button>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors"
                    >
                        <Download className="w-4 h-4" /> 导出
                    </button>
                    <button
                        onClick={() => setIsDeleteOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> 删除
                    </button>
                </div>
            </motion.header>

            {/* Summary statistics */}
            {(report.total ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                    <div className="p-6 rounded-xl bg-slate-800/50 border border-white/5 flex items-center gap-5">
                        <ProgressRing percentage={passRate} size={80} />
                        <div>
                            <div className="text-slate-400 text-xs mb-1">通过率</div>
                            <div className={`text-2xl font-bold ${passRate >= 80 ? 'text-emerald-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {passRate}%
                            </div>
                        </div>
                    </div>

                    <StatCard icon={Activity} label="用例统计">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">接口步骤</span>
                                <span className="text-white font-medium">{report.total ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">场景数</span>
                                <span className="text-white font-medium">{scenarioCount}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">通过</span>
                                <span className="text-emerald-400 font-medium">{report.success ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">失败</span>
                                <span className="text-red-400 font-medium">{report.failed ?? 0}</span>
                            </div>
                        </div>
                        {(report.total ?? 0) > 0 && (
                            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${(((report.success ?? 0) + (report.failed ?? 0)) / (report.total ?? 1)) * 100}%`,
                                        background: (report.failed ?? 0) > 0
                                            ? `linear-gradient(to right, #34d399 ${((report.success ?? 0) / ((report.success ?? 0) + (report.failed ?? 0))) * 100}%, #f87171 0%)`
                                            : '#34d399',
                                    }}
                                />
                            </div>
                        )}
                    </StatCard>

                    <StatCard icon={Timer} label="性能指标">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">总耗时</span>
                                <span className="text-cyan-400 font-medium">{formatDuration(durationSeconds)}</span>
                            </div>
                            {details.length > 0 && (
                                <>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">平均耗时</span>
                                        <span className="text-white font-medium">{formatElapsed(avgElapsed)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">最慢步骤</span>
                                        <span className="text-amber-400 font-medium">{formatElapsed(maxElapsed)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </StatCard>

                    <StatCard icon={Clock} label="时间信息">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">开始时间</span>
                                <span className="text-white font-medium text-[11px]">
                                    {formatDate(report.start_time || report.created_at)}
                                </span>
                            </div>
                            {report.end_time && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">结束时间</span>
                                    <span className="text-white font-medium text-[11px]">{formatDate(report.end_time)}</span>
                                </div>
                            )}
                        </div>
                    </StatCard>
                </motion.div>
            )}

            {/* Step-by-step results */}
            {groupedDetails.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="font-medium text-white">接口执行详情</span>
                        <span className="text-xs text-slate-500">
                            共 {scenarioCount} 个场景，{details.length} 个接口步骤
                        </span>
                    </div>

                    <div className="divide-y divide-white/5">
                        {groupedDetails.map((group, groupIndex) => (
                            <div key={group.key} className="border-b border-white/5 last:border-b-0">
                                <div className="px-6 py-3 bg-slate-950/40 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium text-white">{group.name}</div>
                                        <div className="text-xs text-slate-500">{group.items.length} 个接口步骤</div>
                                    </div>
                                    <span className="text-xs text-slate-500">场景 {groupIndex + 1}</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {group.items.map((step, idx) => {
                                        const isExpanded = expandedSteps.has(step.id);
                                        const cfg = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
                                        const StepIcon = cfg.icon;
                                        return (
                                            <div key={step.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleStep(step.id)}
                                                    className="w-full px-6 py-3.5 flex items-center gap-4 text-left hover:bg-white/[0.03] transition-colors"
                                                >
                                                    <div className="flex-shrink-0 text-slate-600 text-xs w-6 text-right">{idx + 1}</div>
                                                    <div className="flex-shrink-0 text-slate-500">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                    <StepIcon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {step.method && (
                                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${METHOD_COLORS[(step.method || '').toUpperCase()] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                                                                    {step.method}
                                                                </span>
                                                            )}
                                                            <span className="text-sm text-white truncate font-medium">{step.node_name}</span>
                                                        </div>
                                                        {step.url && <div className="text-xs text-slate-500 truncate mt-1">{step.url}</div>}
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${cfg.color} ${
                                                        step.status === 'success' || step.status === 'passed'
                                                            ? 'bg-emerald-500/10'
                                                            : step.status === 'failed'
                                                            ? 'bg-red-500/10'
                                                            : 'bg-slate-500/10'
                                                    }`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-slate-500 flex-shrink-0 w-16 text-right">{formatElapsed(step.elapsed)}</span>
                                                </button>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="mx-6 mb-4 bg-slate-900/80 border border-white/5 rounded-xl p-4 space-y-3">
                                                                {step.error_msg && (
                                                                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                                                        <div className="text-xs text-red-400 font-medium mb-1">错误信息</div>
                                                                        <pre className="text-xs text-red-300/80 whitespace-pre-wrap break-all font-mono">{step.error_msg}</pre>
                                                                    </div>
                                                                )}

                                                                {step.request_data && Object.keys(step.request_data).length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs text-cyan-400 font-medium mb-1.5">Request</div>
                                                                        <JsonBlock data={step.request_data} />
                                                                    </div>
                                                                )}

                                                                {step.response_data && Object.keys(step.response_data).length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs text-emerald-400 font-medium mb-1.5">Response</div>
                                                                        <JsonBlock data={step.response_data} />
                                                                    </div>
                                                                )}

                                                                {!step.error_msg && !step.request_data && !step.response_data && (
                                                                    <span className="text-xs text-slate-500 italic">暂无请求/响应详情</span>
                                                                )}

                                                                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-white/5">
                                                                    <span>节点 ID: {step.node_id}</span>
                                                                    <span>耗时: {formatElapsed(step.elapsed)}</span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Empty steps state */}
            {details.length === 0 && (report.total ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center"
                >
                    <div className="text-slate-500 text-sm">暂无步骤详情数据</div>
                </motion.div>
            )}

            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="删除报告"
                description="确定要删除此报告吗？此操作无法撤销。"
                confirmText="删除"
                isDestructive
            />
        </div>
    );
}
