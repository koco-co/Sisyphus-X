import { useState, useRef } from 'react'
import { Trash2, Plus, Upload, X, Loader2 } from 'lucide-react'
import { filesApi } from '@/api/client'

export interface KeyValueTypePair {
    key: string
    value: string
    type: 'text' | 'file'
    enabled: boolean
}

interface FormDataEditorProps {
    pairs: KeyValueTypePair[]
    onChange: (pairs: KeyValueTypePair[]) => void
}

export function FormDataEditor({ pairs, onChange }: FormDataEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

    const addPair = () => {
        onChange([...pairs, { key: '', value: '', type: 'text', enabled: true }])
    }

    const removePair = (index: number) => {
        onChange(pairs.filter((_, i) => i !== index))
    }

    const updatePair = (index: number, field: keyof KeyValueTypePair, value: any) => {
        const newPairs = [...pairs]
        newPairs[index] = { ...newPairs[index], [field]: value }

        // Reset value when switching type
        if (field === 'type') {
            newPairs[index].value = ''
        }

        onChange(newPairs)
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploadingIndex(index)

        try {
            const response = await filesApi.upload(file)

            // Store the object_name in value
            updatePair(index, 'value', response.data.object_name)

        } catch (error) {
            console.error('Upload error:', error)
            alert('Upload failed')
        } finally {
            setUploadingIndex(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="space-y-2">
            {pairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={pair.enabled}
                        onChange={(e) => updatePair(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                    />

                    <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => updatePair(index, 'key', e.target.value)}
                        placeholder="Key"
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />

                    <select
                        value={pair.type}
                        onChange={(e) => updatePair(index, 'type', e.target.value)}
                        className="w-24 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                        <option value="text">Text</option>
                        <option value="file">File</option>
                    </select>

                    {pair.type === 'text' ? (
                        <input
                            type="text"
                            value={pair.value}
                            onChange={(e) => updatePair(index, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        />
                    ) : (
                        <div className="flex-1 flex gap-2">
                            {pair.value ? (
                                <div className="flex-1 flex items-center gap-2 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2">
                                    <span className="text-sm text-cyan-400 truncate flex-1" title={pair.value}>
                                        {pair.value.split('/').pop()}
                                    </span>
                                    <button
                                        onClick={() => updatePair(index, 'value', '')}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={(e) => handleFileUpload(e, index)}
                                    />
                                    <button
                                        onClick={() => {
                                            // Trigger file input programmatically
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.onchange = (e) => handleFileUpload(e as any, index)
                                            input.click()
                                        }}
                                        disabled={uploadingIndex === index}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-slate-300 text-sm transition-colors"
                                    >
                                        {uploadingIndex === index ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        Select File
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => removePair(index)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addPair}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add Item
            </button>
        </div>
    )
}
