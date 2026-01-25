import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, Play, Edit, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import api from '@/api/client'

interface TestCase {
    id: number
    interface_id: number | null
    title: string
    priority: string
    pre_conditions: string | null
    steps_data: { step: string; expect: string }[]
    engine_type: string
    tags: string[]
}

const priorityColors: Record<string, string> = {
    P0: 'bg-red-500/20 text-red-400 border-red-500/30',
    P1: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    P2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    P3: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const engineIcons: Record<string, React.ReactNode> = {
    api: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
    web: <Clock className="w-4 h-4 text-violet-400" />,
    app: <Clock className="w-4 h-4 text-emerald-400" />,
    manual: <XCircle className="w-4 h-4 text-slate-400" />,
}

export default function TestCasesPage() {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newCase, setNewCase] = useState({
        title: '',
        priority: 'P1',
        engine_type: 'api',
        tags: [] as string[],
        steps_data: [{ step: '', expect: '' }]
    })

    const { data: testcases, isLoading } = useQuery({
        queryKey: ['testcases'],
        queryFn: async () => {
            const res = await api.get('/testcases/')
            return res.data as TestCase[]
        }
    })

    const createMutation = useMutation({
        mutationFn: async (data: typeof newCase) => {
            const res = await api.post('/testcases/', data)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testcases'] })
            setShowCreateModal(false)
            setNewCase({ title: '', priority: 'P1', engine_type: 'api', tags: [], steps_data: [{ step: '', expect: '' }] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/testcases/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testcases'] })
        }
    })

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Test Cases</h1>
                    <p className="text-slate-400 mt-1">Manage and execute your test cases</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Test Case
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search test cases..."
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
                <button className="h-10 px-4 rounded-xl glass flex items-center gap-2 text-slate-400 hover:text-white">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Test Cases Table */}
            <div className="rounded-2xl glass overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="border-b border-white/5">
                        <tr className="text-slate-400 text-left">
                            <th className="px-6 py-4 font-medium">Title</th>
                            <th className="px-6 py-4 font-medium">Priority</th>
                            <th className="px-6 py-4 font-medium">Engine</th>
                            <th className="px-6 py-4 font-medium">Tags</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td>
                            </tr>
                        )}
                        {!isLoading && (!testcases || testcases.length === 0) && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No test cases yet. Create your first one!
                                </td>
                            </tr>
                        )}
                        {testcases?.map((tc) => (
                            <tr key={tc.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="text-white font-medium">{tc.title}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${priorityColors[tc.priority] || priorityColors.P3}`}>
                                        {tc.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {engineIcons[tc.engine_type]}
                                        <span className="text-slate-300 capitalize">{tc.engine_type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1 flex-wrap">
                                        {tc.tags?.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-xs text-slate-400">{tag}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400">
                                            <Play className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteMutation.mutate(tc.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6">
                        <h2 className="text-xl font-bold text-white">Create Test Case</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">Title</label>
                                <input
                                    type="text"
                                    value={newCase.title}
                                    onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                    placeholder="Enter test case title"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm text-slate-400 block mb-2">Priority</label>
                                    <select
                                        value={newCase.priority}
                                        onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="P0">P0 - Critical</option>
                                        <option value="P1">P1 - High</option>
                                        <option value="P2">P2 - Medium</option>
                                        <option value="P3">P3 - Low</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-slate-400 block mb-2">Engine</label>
                                    <select
                                        value={newCase.engine_type}
                                        onChange={(e) => setNewCase({ ...newCase, engine_type: e.target.value })}
                                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="api">API</option>
                                        <option value="web">Web</option>
                                        <option value="app">App</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="h-10 px-4 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => createMutation.mutate(newCase)}
                                disabled={!newCase.title || createMutation.isPending}
                                className="h-10 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium disabled:opacity-50"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
