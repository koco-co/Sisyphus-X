import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    FileBarChart2,
    Trash2,
    Loader2,
    Download,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    MinusCircle,
    AlertCircle,
    Pause,
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { reportsApi } from '@/api/client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/common/EmptyState';
import { Tooltip } from '@/components/ui/tooltip';

interface ReportItem {
    id: number;
    name: string;
    scenario_id?: number;
    scenario_name?: string;
    duration?: number;
    total_cases?: number;
    passed_cases?: number;
    failed_cases?: number;
    start_time?: string;
    end_time?: string;
    status: string;
    execution_id?: string;
    allure_report_path?: string;
    created_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    completed: { label: '已完成', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    running: { label: '运行中', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Loader2 },
    failed: { label: '失败', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
    cancelled: { label: '已终止', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertCircle },
    paused: { label: '已暂停', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Pause },
    passed: { label: '通过', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    skipped: { label: '跳过', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: MinusCircle },
};

export default function TestReport() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const size = 10;

    // 删除
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<ReportItem | null>(null);

    // 获取报告列表
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['reports', page, size],
        queryFn: () => reportsApi.list({ page, size }),
        select: (data) => data.data
    });

    const reports: ReportItem[] = reportData?.items || [];
    const total = reportData?.total || 0;
    const pages = reportData?.pages || 0;

    // 删除
    const deleteMutation = useMutation({
        mutationFn: (id: number) => reportsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            setIsDeleteOpen(false);
            setReportToDelete(null);
            success('删除成功');
        },
        onError: () => showError('删除失败')
    });

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        if (seconds < 60) return `${seconds}s`;
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}m ${sec}s`;
    };

    const getPassRate = (report: ReportItem) => {
        const total = report.total_cases || 0;
        const passed = report.passed_cases || 0;
        if (total === 0) return 0;
        return Math.round((passed / total) * 100);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <motion.header
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <FileBarChart2 className="w-8 h-8 text-cyan-500" />
                        测试报告
                    </h1>
                    <p className="text-slate-400">查看测试执行结果和历史报告</p>
                </div>
            </motion.header>

            {/* 工具栏 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder="搜索报告名称..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>
            </motion.div>

            {/* 列表 */}
            <motion.div
                className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
                    </div>
                ) : (
                    <table className="w-full text-left table-fixed">
                        <thead className="bg-slate-800/50 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[200px]">报告名称</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[100px]">运行状态</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">测试结果</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[100px]">运行时长</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">运行时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[140px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reports.length > 0 ? (
                                reports.map((report, index) => {
                                    const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.completed;
                                    const StatusIcon = statusConf.icon;
                                    const passRate = getPassRate(report);
                                    return (
                                        <motion.tr
                                            key={report.id}
                                            className="hover:bg-white/5 transition-colors group"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 + index * 0.05 }}
                                        >
                                            <td className="px-6 py-4 w-[200px]">
                                                <Tooltip content={report.name || report.scenario_name || '-'} position="top">
                                                    <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full">
                                                        {report.name || report.scenario_name || '-'}
                                                    </span>
                                                </Tooltip>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConf.color}`}>
                                                    <StatusIcon className={`w-3 h-3 ${report.status === 'running' ? 'animate-spin' : ''}`} />
                                                    {statusConf.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {report.total_cases ? (
                                                    <div className="flex items-center gap-3">
                                                        {/* 通过率条 */}
                                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                                                            <div
                                                                className={`h-full rounded-full ${passRate >= 80 ? 'bg-emerald-500' : passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                style={{ width: `${passRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-slate-400">
                                                            {report.passed_cases}/{report.total_cases}
                                                            <span className={`ml-1 ${passRate >= 80 ? 'text-emerald-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                ({passRate}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDuration(report.duration)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {formatDate(report.created_at || report.start_time)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {report.allure_report_path && (
                                                        <Tooltip content="Allure 报告" position="top">
                                                            <button
                                                                onClick={() => window.open(report.allure_report_path!, '_blank')}
                                                                className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip content="导出报告" position="top">
                                                        <button
                                                            onClick={() => success('功能开发中')}
                                                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="删除" position="top">
                                                        <button
                                                            onClick={() => { setReportToDelete(report); setIsDeleteOpen(true); }}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            title="暂无测试报告"
                                            description="执行测试计划后，报告将显示在此处"
                                            icon={FileBarChart2}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {total > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
                        <Pagination
                            page={page}
                            size={size}
                            total={total}
                            pages={pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </motion.div>

            {/* 删除确认 */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => reportToDelete && deleteMutation.mutate(reportToDelete.id)}
                title="删除测试报告"
                description="确定要删除此报告吗？此操作无法撤销。"
                confirmText="删除"
                isDestructive={true}
            />
        </div>
    );
}
