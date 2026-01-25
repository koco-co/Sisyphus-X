import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowUpRight,
    Trash2,
    Loader2
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { reportsApi } from '@/api/client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ReportItem {
    id: number
    name: string
    scenario_id?: number
    scenario_name?: string
    duration?: string
    total_cases?: number
    passed_cases?: number
    failed_cases?: number
    start_time?: string
    end_time?: string
    status: string
}

export default function TestReport() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<ReportItem | null>(null);
    const size = 8;

    // 获取报告列表
    const { data: reportsData, isLoading } = useQuery({
        queryKey: ['reports', page, size],
        queryFn: async () => {
            const res = await reportsApi.list({ page, size });
            return res.data as { items: ReportItem[]; total: number; pages: number };
        }
    });

    // 删除报告
    const deleteMutation = useMutation({
        mutationFn: (id: number) => reportsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            setDeleteTarget(null);
        }
    });

    const reports = reportsData?.items ?? [];
    const total = reportsData?.total ?? 0;
    const pages = reportsData?.pages ?? 1;

    // 前端搜索过滤
    const filteredReports = reports.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPassRate = (report: ReportItem) => {
        const total = report.total_cases ?? 0;
        const passed = report.passed_cases ?? 0;
        if (total === 0) return 0;
        return Math.round((passed / total) * 100);
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('nav.testReports')}</h1>
                <p className="text-slate-400">查看历史测试执行详情、质量看板及错误分析</p>
            </header>

            {/* 报告列表 */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="搜索报告名称..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-64"
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50">
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pl-8">报告名称</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">执行时长</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">通过率</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">开始时间</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right pr-8">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {filteredReports.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">
                                                暂无测试报告
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReports.map((report, index) => (
                                            <motion.tr
                                                key={report.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <td className="p-4 pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-white line-clamp-1">{report.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {report.status === 'passed' || report.status === 'success' ? (
                                                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            PASSED
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                                                            <XCircle className="w-3 h-3" />
                                                            FAILED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                                                        <Clock className="w-3 h-3" />
                                                        {report.duration || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="w-24">
                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                                                            <span>{getPassRate(report)}%</span>
                                                            <span>{report.passed_cases ?? 0}/{report.total_cases ?? 0}</span>
                                                        </div>
                                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-cyan-500 rounded-full"
                                                                style={{ width: `${getPassRate(report)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-500 font-mono italic">
                                                    {report.start_time?.split('T')[0] ?? '-'}
                                                </td>
                                                <td className="p-4 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 rounded-xl text-cyan-400 hover:text-white hover:bg-cyan-500 transition-all border border-cyan-500/20">
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(report)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 分页 */}
                <div className="p-6 border-t border-white/5 bg-slate-900/30">
                    <Pagination
                        page={page}
                        size={size}
                        total={total}
                        pages={pages}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="删除测试报告"
                message={`确定要删除报告「${deleteTarget?.name}」吗？此操作无法撤销。`}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
