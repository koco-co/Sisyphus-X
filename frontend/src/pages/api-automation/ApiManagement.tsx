import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    Plus,
    ChevronRight,
    ChevronDown,
    MoreVertical,
    FolderPlus,
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { cn } from '@/lib/utils';
import { interfacesApi } from '@/api/client';

interface Interface {
    id: number;
    name: string;
    method: string;
    url: string;
    status: string;
    updated_at?: string;
}

interface InterfaceFolder {
    id: number;
    name: string;
    description?: string;
    parent_id?: number | null;
}

export default function ApiManagement() {
    const { t } = useTranslation();
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const size = 10;

    // Fetch folders
    const { data: folders = [] } = useQuery({
        queryKey: ['interfaceFolders'],
        queryFn: () => interfacesApi.listFolders().then(res => res.data)
    });

    // Fetch interfaces
    const { data: interfaceData, isLoading } = useQuery({
        queryKey: ['interfaces', page, size, selectedFolderId],
        queryFn: () => interfacesApi.list({ page, size, folder_id: selectedFolderId ? selectedFolderId : undefined }).then(res => res.data)
    });

    const interfaces = interfaceData?.items || [];
    const total = interfaceData?.total || 0;
    const pages = interfaceData?.pages || 0;

    const toggleGroup = (id: number) => {
        setExpandedGroups(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'POST': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'PUT': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
            case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* 左侧接口树 */}
            <aside className="w-80 border-r border-white/5 bg-slate-900/50 flex flex-col backdrop-blur-xl">
                <div className="p-4 border-b border-white/5 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="搜索接口..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                    <Link to="/api/interfaces/new" className="p-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20">
                        <Plus className="w-4 h-4" />
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <button
                        className={cn(
                            "flex items-center gap-2 w-full p-2 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm group",
                            selectedFolderId === undefined ? "text-cyan-400 bg-white/5" : "text-slate-400"
                        )}
                        onClick={() => setSelectedFolderId(undefined)}
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span>所有接口</span>
                    </button>

                    {folders.map((folder: InterfaceFolder) => (
                        <div key={folder.id} className="space-y-1">
                            <button
                                onClick={() => {
                                    toggleGroup(folder.id);
                                    setSelectedFolderId(folder.id);
                                }}
                                className={cn(
                                    "flex items-center gap-2 w-full p-2 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm",
                                    selectedFolderId === folder.id ? "text-cyan-400 bg-white/5" : "text-slate-300"
                                )}
                            >
                                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", !expandedGroups.includes(folder.id) && "-rotate-90")} />
                                <span className="flex-1 text-left">{folder.name}</span>
                            </button>
                        </div>
                    ))}
                    {/* Add folder creation logic here later */}
                </div>
            </aside>

            {/* 右侧列表区域 */}
            <main className="flex-1 flex flex-col bg-slate-950 p-8 overflow-y-auto">
                <header className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-3 text-slate-500 text-sm mb-2">
                            <span>项目</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>当前项目</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-slate-300">
                                {selectedFolderId ? folders.find((f: InterfaceFolder) => f.id === selectedFolderId)?.name : '所有接口'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">接口列表</h1>
                    </div>
                </header>

                <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50">
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase pl-8">方法</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">状态</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">接口名称/路径</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right pr-8">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {interfaces.map((api: Interface, index: number) => (
                                            <motion.tr
                                                key={api.id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                                onClick={() => window.location.href = `/api/interfaces/${api.id}`}
                                            >
                                                <td className="p-4 pl-8">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-lg text-[10px] font-black border tracking-widest",
                                                        getMethodColor(api.method)
                                                    )}>
                                                        {api.method}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {api.status === 'STABLE' || !api.status ? (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-lg shadow-emerald-500/50" />
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-lg shadow-amber-500/50" />
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{api.name}</span>
                                                        <span className="text-[11px] text-slate-600 font-mono mt-1">{api.url}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right pr-8">
                                                    <button className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {total > 0 && (
                    <Pagination
                        page={page}
                        size={size}
                        total={total}
                        pages={pages}
                        onPageChange={setPage}
                        className="mt-auto"
                    />
                )}
            </main>
        </div>
    );
}
