import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    Plus,
    Search,
    MoreHorizontal,
    Loader2,
    FileJson,
    Trash2,
    Edit3,
    Download,
    GripVertical
} from 'lucide-react'
import type { DragEndEvent } from '@dnd-kit/core'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
    sort_order?: number
}

interface TreeNode {
    id: string
    name: string
    type: 'folder' | 'api'
    method?: string
    originalId?: number
    children?: TreeNode[]
}

// 可排序项组件
function SortableItem({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className={className}>
            {children}
        </div>
    )
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

// 右键菜单组件
function ContextMenu({ x, y, onClose, onEdit, onDelete, onCreate, type }: { x: number; y: number; onClose: () => void; onEdit?: () => void; onDelete?: () => void; onCreate?: () => void; type: 'folder' | 'api' | 'root' }) {
    return (
        <div
            className="fixed z-50 bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            {type === 'root' && onCreate && (
                <button
                    onClick={() => { onCreate(); onClose(); }}
                    data-testid="context-create-folder-button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    新建文件夹
                </button>
            )}
            {type === 'folder' && (
                <>
                    {onCreate && (
                        <button
                            onClick={() => { onCreate(); onClose(); }}
                            data-testid="context-create-interface-button"
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                        >
                            <FileJson className="w-4 h-4" />
                            新建接口
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={() => { onEdit(); onClose(); }}
                            data-testid="context-rename-folder-button"
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                        >
                            <Edit3 className="w-4 h-4" />
                            重命名
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => { onDelete(); onClose(); }}
                            data-testid="context-delete-folder-button"
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            删除
                        </button>
                    )}
                </>
            )}
            {type === 'api' && (
                <>
                    {onDelete && (
                        <button
                            onClick={() => { onDelete(); onClose(); }}
                            data-testid="context-delete-interface-button"
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            删除
                        </button>
                    )}
                </>
            )}
        </div>
    )
}

export function InterfaceList() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode | null; type: 'folder' | 'api' | 'root' } | null>(null)
    const [treeData, setTreeData] = useState<TreeNode[]>([])

    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

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

    // 创建文件夹
    const createFolderMutation = useMutation({
        mutationFn: (name: string) => interfacesApi.createFolder({ project_id: 1, name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interface-folders'] })
        }
    })

    // 删除文件夹
    const deleteFolderMutation = useMutation({
        mutationFn: (id: number) => interfacesApi.deleteFolder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interface-folders', 'interfaces'] })
        }
    })

    // 删除接口
    const deleteInterfaceMutation = useMutation({
        mutationFn: (id: number) => interfacesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interfaces'] })
        }
    })

    const isLoading = foldersLoading || interfacesLoading
    const folders = foldersData ?? []
    const interfaces = interfacesData ?? []

    // 构建树形结构
    const buildTree = (): TreeNode[] => {
        const tree: TreeNode[] = []

        // 按排序排列文件夹
        const sortedFolders = [...folders].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        sortedFolders.forEach(folder => {
            const folderNode: TreeNode = {
                id: `folder-${folder.id}`,
                name: folder.name,
                type: 'folder',
                originalId: folder.id,
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
                        method: api.method,
                        originalId: api.id
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
                    method: api.method,
                    originalId: api.id
                }))
            }
            tree.push(unassignedFolder)
        }

        return tree
    }

    // 更新树数据
    if (JSON.stringify(treeData) !== JSON.stringify(buildTree())) {
        setTreeData(buildTree())
    }

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

    const filteredTree = filterTree(treeData)

    // 拖拽结束处理
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setTreeData((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // 右键菜单处理
    const handleContextMenu = (e: React.MouseEvent, node: TreeNode, type: 'folder' | 'api' | 'root') => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY, node, type })
    }

    // 点击接口加载到编辑器
    const handleInterfaceClick = (interfaceId: number) => {
        navigate(`/api/interfaces/${interfaceId}`)
    }

    return (
        <div className="w-80 h-full border-r border-white/5 flex flex-col glass">
            {/* Header */}
            <div
                className="p-4 border-b border-white/5 space-y-3"
                onContextMenu={(e) => handleContextMenu(e, null as any, 'root')}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">接口列表</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => navigate('/api/interfaces/new')}
                            data-testid="create-interface-button"
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="新建接口"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="搜索接口..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="interface-search-input"
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredTree.map(n => n.id)} strategy={verticalListSortingStrategy}>
                            {filteredTree.map(node => (
                                <SortableItem key={node.id} id={node.id}>
                                    <div>
                                        <div
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white group"
                                            onClick={() => toggle(node.id)}
                                            onContextMenu={(e) => handleContextMenu(e, node, node.type === 'folder' && node.id !== 'folder-unassigned' ? 'folder' : 'root')}
                                            data-testid={`folder-node-${node.id}`}
                                        >
                                            {node.children && node.children.length > 0 ? (
                                                expanded[node.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                            ) : <div className="w-4" />}
                                            <GripVertical className="w-3 h-3 text-slate-600 cursor-grab" />
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
                                                        onClick={() => child.originalId && handleInterfaceClick(child.originalId)}
                                                        onContextMenu={(e) => handleContextMenu(e, child, 'api')}
                                                        data-testid={`interface-node-${child.id}`}
                                                    >
                                                        <MethodBadge method={child.method || 'GET'} />
                                                        <span className="text-sm text-slate-300 group-hover:text-white truncate flex-1">{child.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* 右键菜单 */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    type={contextMenu.type}
                    onClose={() => setContextMenu(null)}
                    onCreate={contextMenu.type === 'root' || contextMenu.type === 'folder' ? () => {
                        const name = prompt('请输入文件夹名称:', '新文件夹')
                        if (name) {
                            createFolderMutation.mutate(name)
                        }
                    } : undefined}
                    onEdit={contextMenu.type === 'folder' ? () => {
                        const newName = prompt('请输入新的文件夹名称:', contextMenu.node?.name || '')
                        if (newName && contextMenu.node?.originalId) {
                            // TODO: 实现重命名 API
                            alert('重命名功能待实现')
                        }
                    } : undefined}
                    onDelete={contextMenu.type === 'folder' && contextMenu.node?.originalId ? () => {
                        if (contextMenu.node && confirm(`确定要删除文件夹 "${contextMenu.node.name}" 及其所有接口吗？`)) {
                            deleteFolderMutation.mutate(contextMenu.node.originalId!)
                        }
                    } : contextMenu.type === 'api' && contextMenu.node?.originalId ? () => {
                        if (contextMenu.node && confirm(`确定要删除接口 "${contextMenu.node.name}" 吗？`)) {
                            deleteInterfaceMutation.mutate(contextMenu.node.originalId!)
                        }
                    } : undefined}
                />
            )}
        </div>
    )
}
