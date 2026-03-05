import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { reportsApi } from '@/api/client';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ReportDetail {
    id: number | string;
    name?: string;
    scenario_name?: string;
    status: string;
    /** 后端返回字符串如 "1.5s"，需解析为秒数 */
    duration?: string;
    total?: number;
    success?: number;
    failed?: number;
    start_time?: string;
    end_time?: string;
    created_at?: string;
    allure_report_path?: string;
    execution_id?: string;
    details?: Array<{ id: number; status: string; [key: string]: unknown }>;
}

/** 解析后端 duration 字符串（如 "1.5s"、"2m 30s"）为秒数 */
function parseDurationToSeconds(durationStr?: string): number | undefined {
    if (!durationStr) return undefined;
    const sMatch = durationStr.match(/(\d+\.?\d*)\s*s/);
    const mMatch = durationStr.match(/(\d+)\s*m/);
    const seconds = parseFloat(sMatch?.[1] ?? '0') + (parseInt(mMatch?.[1] ?? '0', 10) * 60);
    return seconds || undefined;
}

export default function ReportDetailPage() {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
                toast.success('Allure 报告暂未生成');
            }
        } catch {
            toast.error('获取 Allure 报告失败');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN');
    };

    const formatDuration = (seconds?: number) => {
        if (seconds == null) return '-';
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    const durationSeconds = parseDurationToSeconds(report?.duration);
    const passRate = (report?.total ?? 0) > 0
        ? Math.round(((report?.success ?? 0) / (report?.total ?? 1)) * 100)
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
        <div className="p-8 max-w-[1000px] mx-auto space-y-6">
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
                    {report.name || report.scenario_name || `报告 #${report.id}`}
                </span>
            </motion.div>

            <motion.header
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <FileBarChart2 className="w-8 h-8 text-cyan-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {report.name || report.scenario_name || `报告 #${report.id}`}
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            运行时间: {formatDate(report.start_time || report.created_at)}
                            {durationSeconds != null && ` · 耗时 ${formatDuration(durationSeconds)}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAllure}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Allure 报告
                    </button>
                    <button
                        onClick={() => toast.success('导出功能开发中')}
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

            {/* 通过率进度环 */}
            {(report.total ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-8 p-6 rounded-2xl bg-slate-800/50 border border-white/5"
                >
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                            <path
                                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="text-slate-700"
                            />
                            <path
                                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${passRate} 100`}
                                strokeLinecap="round"
                                className={passRate >= 80 ? 'text-emerald-500' : passRate >= 50 ? 'text-yellow-500' : 'text-red-500'}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                            {passRate}%
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <div className="text-slate-400 text-sm">通过</div>
                            <div className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {report.success ?? 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-400 text-sm">失败</div>
                            <div className="text-red-400 font-semibold flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> {report.failed ?? 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-400 text-sm">总计</div>
                            <div className="text-white font-semibold">{report.total ?? 0}</div>
                        </div>
                    </div>
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
