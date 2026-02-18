import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi } from '@/api/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Database, Trash2, Edit2, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { DatasetDialog } from './DatasetDialog';
import type { Dataset } from '../types';

interface DatasetSidebarProps {
    scenarioId: number;
    onDatasetSelect?: (dataset: Dataset) => void;
}

export function DatasetSidebar({ scenarioId, onDatasetSelect }: DatasetSidebarProps) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

    // 获取数据集列表
    const { data: datasetsData, isLoading } = useQuery({
        queryKey: ['scenarios', scenarioId, 'datasets'],
        queryFn: async () => {
            const response = await scenariosApi.listDatasets(scenarioId);
            return response.data.data || [];
        },
        enabled: !!scenarioId
    });

    const datasets = datasetsData || [];

    // 删除数据集
    const deleteMutation = useMutation({
        mutationFn: async (datasetId: number) => {
            return await scenariosApi.deleteDataset(scenarioId, datasetId);
        },
        onSuccess: () => {
            toast.success('数据集删除成功');
            queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'datasets'] });
        },
        onError: (error: { message?: string }) => {
            toast.error(`删除失败: ${error.message || 'Unknown error'}`);
        }
    });

    // 导出数据集
    const exportMutation = useMutation({
        mutationFn: async (datasetId: number) => {
            const response = await scenariosApi.exportDataset(scenarioId, datasetId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dataset_${datasetId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        onSuccess: () => {
            toast.success('数据集导出成功');
        },
        onError: (error: { message?: string }) => {
            toast.error(`导出失败: ${error.message || 'Unknown error'}`);
        }
    });

    // 导入数据集
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await scenariosApi.importDataset(scenarioId, formData);
            toast.success('数据集导入成功');
            queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId, 'datasets'] });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`导入失败: ${errorMessage}`);
        }

        // Reset input
        event.target.value = '';
    };

    const handleEdit = (dataset: Dataset) => {
        setEditingDataset(dataset);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingDataset(null);
        setIsDialogOpen(true);
    };

    return (
        <>
            <div className="flex flex-col h-full" data-testid="dataset-sidebar">
                {/* 头部 */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-cyan-400" />
                            <span className="font-semibold text-white" data-testid="dataset-sidebar-title">数据集</span>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
                            data-testid="create-dataset-button"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 导入按钮 */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImport}
                            className="hidden"
                            id="csv-upload"
                            data-testid="csv-upload-input"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-all text-sm"
                        >
                            <Upload className="w-4 h-4" />
                            导入 CSV
                        </label>
                    </div>
                </div>

                {/* 数据集列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : datasets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500" data-testid="dataset-empty-state">
                            <Database className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">暂无数据集</p>
                        </div>
                    ) : (
                        datasets.map((dataset: Dataset) => (
                            <motion.div
                                key={dataset.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="group bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 rounded-xl p-3 transition-all cursor-pointer"
                                onClick={() => onDatasetSelect?.(dataset)}
                                data-testid={`dataset-item-${dataset.id}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-medium text-sm truncate">
                                            {dataset.name}
                                        </h4>
                                        <p className="text-slate-500 text-xs mt-1">
                                            {dataset.csv_data ? `${dataset.csv_data.split('\n').length} 行` : '0 行'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(dataset);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                            data-testid={`edit-dataset-${dataset.id}`}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('确定要删除这个数据集吗？')) {
                                                    deleteMutation.mutate(dataset.id);
                                                }
                                            }}
                                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                            data-testid={`delete-dataset-${dataset.id}`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                exportMutation.mutate(dataset.id);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                            data-testid={`export-dataset-${dataset.id}`}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* 底部统计 */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>共 {datasets.length} 个数据集</span>
                        <span>CSV 格式</span>
                    </div>
                </div>
            </div>

            {/* 创建/编辑对话框 */}
            <DatasetDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                scenarioId={scenarioId}
                dataset={editingDataset}
            />
        </>
    );
}
