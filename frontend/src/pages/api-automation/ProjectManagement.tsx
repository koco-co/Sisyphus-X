import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    MoreHorizontal,
    FolderKanban,
    ChevronRight,
    Users,
    Trash2,
    Loader2
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { projectsApi } from '@/api/client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Project {
    id: number;
    name: string;
    description: string;
    owner?: string;
    created_at?: string;
    members?: number;
}

export default function ProjectManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const size = 6;

    // Delete state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Create state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', key: '', owner: '', description: '' });

    // Fetch projects
    const { data: projectData, isLoading } = useQuery({
        queryKey: ['projects', page, size],
        queryFn: () => projectsApi.list({ page, size }),
        select: (data) => data.data
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => projectsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsDeleteOpen(false);
            setProjectToDelete(null);
        }
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: { name: string; key: string; owner: string; description?: string }) =>
            projectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsCreateOpen(false);
            setCreateForm({ name: '', key: '', owner: '', description: '' });
        }
    });

    const handleDeleteClick = (project: Project) => {
        setProjectToDelete(project);
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        if (projectToDelete) {
            deleteMutation.mutate(projectToDelete.id);
        }
    };

    const projects = projectData?.items || [];
    const total = projectData?.total || 0;
    const pages = projectData?.pages || 0;

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('nav.projectManagement')}</h1>
                    <p className="text-slate-400">管理您的自动化测试项目、团队成员及权限配置</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    新建项目
                </motion.button>
            </header>

            {/* 过滤器 */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="搜索项目名称、负责人..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all shadow-xl"
                    />
                </div>
            </div>

            {/* 项目列表 */}
            {isLoading ? (
                <div className="text-white text-center py-10">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <AnimatePresence mode="popLayout">
                        {projects.map((project: Project, index: number) => (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-slate-900 border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 transition-all shadow-xl hover:shadow-cyan-500/5 flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                                        <FolderKanban className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
                                            onClick={() => handleDeleteClick(project)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-slate-400 text-sm line-clamp-2 mb-6 flex-1">
                                    {project.description}
                                </p>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {/* Placeholder for members */}
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                                                    U{i}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {project.members || 3}
                                        </span>
                                    </div>

                                    <Link to={`/api/projects/${project.id}/settings`} className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-all group/btn">
                                        进入项目
                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* 分页组件 */}
            {total > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5">
                    <Pagination
                        page={page}
                        size={size}
                        total={total}
                        pages={pages}
                        onPageChange={setPage}
                    />
                </div>
            )}

            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                title="删除项目"
                description={`确定要删除项目 "${projectToDelete?.name}" 吗？此操作无法撤销。`}
                confirmText="删除"
                isDestructive={true}
            />

            {/* 创建项目弹窗 */}
            <AnimatePresence>
                {isCreateOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setIsCreateOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-white mb-6">新建项目</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">项目名称 *</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="如：订单中心"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">项目标识 *</label>
                                    <input
                                        type="text"
                                        value={createForm.key}
                                        onChange={(e) => setCreateForm({ ...createForm, key: e.target.value.toUpperCase() })}
                                        placeholder="如：ORDER_CENTER"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white uppercase focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">负责人 *</label>
                                    <input
                                        type="text"
                                        value={createForm.owner}
                                        onChange={(e) => setCreateForm({ ...createForm, owner: e.target.value })}
                                        placeholder="如：张三"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">描述</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        placeholder="项目描述..."
                                        rows={3}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => createMutation.mutate(createForm)}
                                    disabled={!createForm.name || !createForm.key || !createForm.owner || createMutation.isPending}
                                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    创建
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
