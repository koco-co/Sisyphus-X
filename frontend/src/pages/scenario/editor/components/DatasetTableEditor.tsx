import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface DatasetTableEditorProps {
    value: string;
    onChange: (value: string) => void;
    'data-testid'?: string;
}

export function DatasetTableEditor({ value, onChange, 'data-testid': testId }: DatasetTableEditorProps) {
    const [viewMode, setViewMode] = useState<'table' | 'text'>('table');

    // Parse CSV data to table format
    const { headers, rows } = useMemo(() => {
        if (!value.trim()) {
            return { headers: [], rows: [] };
        }

        const lines = value.trim().split('\n');
        if (lines.length === 0) {
            return { headers: [], rows: [] };
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            // Handle quoted values with commas
            const values: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            // Fill missing columns
            while (values.length < headers.length) {
                values.push('');
            }

            return values.slice(0, headers.length);
        });

        return { headers, rows };
    }, [value]);

    // Convert table back to CSV
    const toCsv = (headers: string[], rows: string[][]): string => {
        const lines = [headers.join(',')];
        rows.forEach(row => {
            // Quote values that contain commas
            const quotedRow = row.map(v => {
                if (v.includes(',') || v.includes('"') || v.includes('\n')) {
                    return `"${v.replace(/"/g, '""')}"`;
                }
                return v;
            });
            lines.push(quotedRow.join(','));
        });
        return lines.join('\n');
    };

    // Add new row
    const addRow = () => {
        const newRow = headers.map(() => '');
        const newRows = [...rows, newRow];
        onChange(toCsv(headers, newRows));
    };

    // Delete row
    const deleteRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        onChange(toCsv(headers, newRows));
    };

    // Update cell
    const updateCell = (rowIndex: number, colIndex: number, newValue: string) => {
        const newRows = rows.map((row, i) =>
            i === rowIndex
                ? row.map((cell, j) => (j === colIndex ? newValue : cell))
                : row
        );
        onChange(toCsv(headers, newRows));
    };

    // Add column
    const addColumn = () => {
        const newHeaders = [...headers, `Column ${headers.length + 1}`];
        const newRows = rows.map(row => [...row, '']);
        onChange(toCsv(newHeaders, newRows));
    };

    // Update header
    const updateHeader = (index: number, newHeader: string) => {
        const newHeaders = headers.map((h, i) => (i === index ? newHeader : h));
        onChange(toCsv(newHeaders, rows));
    };

    // Text view change handler
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    // Show empty state
    if (headers.length === 0 && rows.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'table' ? 'text' : 'table')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all"
                        data-testid={`${testId}-toggle-view`}
                    >
                        {viewMode === 'table' ? '文本编辑' : '表格编辑'}
                    </button>
                </div>

                {viewMode === 'table' ? (
                    <div className="border border-dashed border-white/20 rounded-xl p-8 text-center">
                        <p className="text-slate-500 mb-4">还没有数据，请添加表头开始</p>
                        <button
                            onClick={() => onChange('name,value\n')}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all text-sm"
                            data-testid={`${testId}-add-initial-header`}
                        >
                            添加表头
                        </button>
                    </div>
                ) : (
                    <textarea
                        value={value}
                        onChange={handleTextChange}
                        placeholder="name,value&#10;Alice,30&#10;Bob,25"
                        className="w-full h-64 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                        data-testid={`${testId}-textarea`}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* View toggle and actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'table' ? 'text' : 'table')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all"
                        data-testid={`${testId}-toggle-view`}
                    >
                        {viewMode === 'table' ? '文本编辑' : '表格编辑'}
                    </button>
                    <span className="text-xs text-slate-500">
                        {rows.length} 行 × {headers.length} 列
                    </span>
                </div>

                {viewMode === 'table' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={addColumn}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all flex items-center gap-1"
                            data-testid={`${testId}-add-column`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            添加列
                        </button>
                        <button
                            onClick={addRow}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm transition-all flex items-center gap-1"
                            data-testid={`${testId}-add-row`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            添加行
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'table' ? (
                /* Table View */
                <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full" data-testid={`${testId}-table`}>
                            <thead className="bg-slate-800">
                                <tr>
                                    {headers.map((header, colIndex) => (
                                        <th
                                            key={colIndex}
                                            className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-white/10"
                                        >
                                            <input
                                                type="text"
                                                value={header}
                                                onChange={(e) => updateHeader(colIndex, e.target.value)}
                                                className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded px-1 py-0.5 w-full"
                                                data-testid={`${testId}-header-${colIndex}`}
                                            />
                                        </th>
                                    ))}
                                    <th className="w-12 px-4 py-3 border-b border-white/10" />
                                </tr>
                            </thead>
                            <tbody className="bg-slate-900/50 divide-y divide-white/5">
                                {rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-slate-800/50 transition-colors">
                                        {row.map((cell, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="px-4 py-3 border-b border-white/5 last:border-b-0"
                                            >
                                                <input
                                                    type="text"
                                                    value={cell}
                                                    onChange={(e) =>
                                                        updateCell(rowIndex, colIndex, e.target.value)
                                                    }
                                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded px-1 py-1 text-sm text-white placeholder:text-slate-600"
                                                    placeholder="输入值..."
                                                    data-testid={`${testId}-cell-${rowIndex}-${colIndex}`}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 border-b border-white/5 last:border-b-0">
                                            <button
                                                onClick={() => deleteRow(rowIndex)}
                                                className="p-1 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                                                data-testid={`${testId}-delete-row-${rowIndex}`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Text View */
                <textarea
                    value={value}
                    onChange={handleTextChange}
                    placeholder="name,value&#10;Alice,30&#10;Bob,25"
                    className="w-full h-64 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                    data-testid={`${testId}-textarea`}
                />
            )}
        </div>
    );
}
