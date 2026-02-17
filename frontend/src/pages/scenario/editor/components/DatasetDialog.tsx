import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi } from '@/api/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useState } from 'react';
import { DatasetTableEditor } from './DatasetTableEditor';
import type { Dataset } from './types';

interface DatasetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    scenarioId: number;
    dataset?: Dataset | null;
}

export function DatasetDialog({ isOpen, onClose, scenarioId, dataset }: DatasetDialogProps) {
    const queryClient = useQueryClient();

    // Initialize state from dataset prop
    const [name, setName] = useState(dataset?.name || '');
    const [csvData, setCsvData] = useState(dataset?.csv_data || '');

    const isEditing = !!dataset;

    // 创建或更新数据集
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (isEditing && dataset) {
                return await scenariosApi.updateDataset(scenarioId, dataset.id, { name, csv_data: csvData });
            } else {
                return await scenariosApi.createDataset(scenarioId, { name, csv_data: csvData });
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? '数据集更新成功' : '数据集创建成功');
            queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'datasets'] });
            onClose();
        },
        onError: (error: { message?: string }) => {
            toast.error(`保存失败: ${error.message || 'Unknown error'}`);
        }
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('请输入数据集名称');
            return;
        }
        saveMutation.mutate();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        data-testid="dataset-dialog-backdrop"
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                            data-testid="create-dataset-dialog"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-xl font-bold text-white">
                                    {isEditing ? '编辑数据集' : '创建数据集'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-xl transition-all"
                                    data-testid="close-dataset-dialog"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* 数据集名称 */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">数据集名称</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="输入数据集名称..."
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                                        data-testid="dataset-name-input"
                                    />
                                </div>

                                {/* CSV 数据编辑器 */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">测试数据 (CSV 格式)</label>
                                    <DatasetTableEditor
                                        value={csvData}
                                        onChange={setCsvData}
                                        data-testid="dataset-table-editor"
                                    />
                                    <p className="text-xs text-slate-500">
                                        提示：第一行为表头，使用逗号分隔字段。支持手动输入或导入 CSV 文件。
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all font-medium"
                                    data-testid="cancel-dataset-button"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    data-testid="confirm-create-dataset"
                                >
                                    <Save className="w-4 h-4" />
                                    {saveMutation.isPending ? '保存中...' : '保存'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
