import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    Plus,
    Search,
    MoreHorizontal,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { interfacesApi } from '@/api/client'

interface InterfaceItem {
    id: number
    name: string
    method: string
    url: string
    status: string
    folder_id?: number
}

interface FolderItem {
    id: number
    name: string
    project_id?: number
}

interface TreeNode {
    id: string
    name: string
    type: 'folder' | 'api'
    method?: string
    children?: TreeNode[]
}

const MethodBadge = ({ method }: { method: string }) => {
    const colors: Record<string, string> = {
        GET: 'text-emerald-400 bg-emerald-400/10',
        POST: 'text-cyan-400 bg-cyan-400/10',
        PUT: 'text-amber-400 bg-amber-400/10',
        DELETE: 'text-pink-400 bg-pink-400/10',
        PATCH: 'text-orange-400 bg-orange-400/10',
    }
    return (
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", colors[method?.toUpperCase()] || 'text-slate-400')}>
            {method?.toUpperCase()}
        </span>
    )
}

export function InterfaceList() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [searchTerm, setSearchTerm] = useState('')

    // 获取文件夹列表
    const { data: foldersData, isLoading: foldersLoading } = useQuery({
        queryKey: ['interface-folders'],
        queryFn: async () => {
            const res = await interfacesApi.listFolders()
            return (res.data?.items ?? res.data ?? []) as FolderItem[]
        }
    })

    // 获取接口列表
    const { data: interfacesData, isLoading: interfacesLoading } = useQuery({
        queryKey: ['interfaces'],
        queryFn: async () => {
            const res = await interfacesApi.list()
            return (res.data?.items ?? res.data ?? []) as InterfaceItem[]
        }
    })

    const isLoading = foldersLoading || interfacesLoading
    const folders = foldersData ?? []
    const interfaces = interfacesData ?? []

    // 构建树形结构
    const buildTree = (): TreeNode[] => {
        const tree: TreeNode[] = []

        // 创建文件夹节点
        folders.forEach(folder => {
            const folderNode: TreeNode = {
                id: `folder-${folder.id}`,
                name: folder.name,
                type: 'folder',
                children: []
            }

            // 将属于此文件夹的接口添加为子节点
            interfaces
                .filter(api => api.folder_id === folder.id)
                .forEach(api => {
                    folderNode.children?.push({
                        id: `api-${api.id}`,
                        name: api.name,
                        type: 'api',
                        method: api.method
                    })
                })

            tree.push(folderNode)
        })

        // 添加未分类的接口
        const unassignedInterfaces = interfaces.filter(api => !api.folder_id)
        if (unassignedInterfaces.length > 0) {
            const unassignedFolder: TreeNode = {
                id: 'folder-unassigned',
                name: '未分类',
                type: 'folder',
                children: unassignedInterfaces.map(api => ({
                    id: `api-${api.id}`,
                    name: api.name,
                    type: 'api',
                    method: api.method
                }))
            }
            tree.push(unassignedFolder)
        }

        return tree
    }

    const tree = buildTree()

    // 过滤树
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
        if (!searchTerm) return nodes

        return nodes.map(node => {
            if (node.type === 'folder' && node.children) {
                const filteredChildren = node.children.filter(child =>
                    child.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                if (filteredChildren.length > 0) {
                    return { ...node, children: filteredChildren }
                }
            }
            if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return node
            }
            return null
        }).filter(Boolean) as TreeNode[]
    }

    const filteredTree = filterTree(tree)

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <div className="w-80 h-full border-r border-white/5 flex flex-col glass">
            {/* Header */}
            <div className="p-4 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Interfaces</h2>
                    <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search interfaces..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                    />
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    </div>
                ) : filteredTree.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        暂无接口数据
                    </div>
                ) : (
                    filteredTree.map(node => (
                        <div key={node.id}>
                            <div
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white group"
                                onClick={() => toggle(node.id)}
                            >
                                {node.children && node.children.length > 0 ? (
                                    expanded[node.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                ) : <div className="w-4" />}
                                <Folder className={cn("w-4 h-4", expanded[node.id] ? "text-cyan-400" : "text-slate-500")} />
                                <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
                                {node.children && (
                                    <span className="text-xs text-slate-600">{node.children.length}</span>
                                )}
                            </div>

                            {expanded[node.id] && node.children && (
                                <div className="pl-4 mt-1 space-y-0.5 border-l border-white/5 ml-3.5">
                                    {node.children.map(child => (
                                        <div
                                            key={child.id}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group"
                                        >
                                            <MethodBadge method={child.method || 'GET'} />
                                            <span className="text-sm text-slate-300 group-hover:text-white truncate">{child.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
