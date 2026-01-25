import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
    page: number;
    size: number;
    total: number;
    pages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    page,
    pages,
    onPageChange,
    className
}: PaginationProps) {
    if (pages <= 1) return null;

    return (
        <div className={cn("flex items-center justify-center gap-2", className)}>
            <button
                onClick={() => onPageChange(1)}
                disabled={page === 1}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    let pageNum: number;
                    if (pages <= 5) {
                        pageNum = i + 1;
                    } else if (page <= 3) {
                        pageNum = i + 1;
                    } else if (page >= pages - 2) {
                        pageNum = pages - 4 + i;
                    } else {
                        pageNum = page - 2 + i;
                    }

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={cn(
                                "w-10 h-10 rounded-xl border transition-all font-medium text-sm",
                                page === pageNum
                                    ? "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                            )}
                        >
                            {pageNum}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === pages}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
            <button
                onClick={() => onPageChange(pages)}
                disabled={page === pages}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <ChevronsRight className="w-4 h-4" />
            </button>
        </div>
    );
}
