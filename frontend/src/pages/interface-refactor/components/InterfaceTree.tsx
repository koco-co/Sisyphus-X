import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  Loader2,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { interfacesApi } from '@/api/client'
import { useNavigate } from 'react-router-dom'

interface InterfaceItem {
  id: number
  name: string
  method: string
  url: string
  folder_id?: number | null
  order?: number
}

interface FolderItem {
  id: number
  name: string
  project_id: number
  parent_id?: number | null
  order: number
}

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'interface'
  method?: string
  children?: TreeNode[]
  folderId?: number
  interfaceId?: number
  order?: number
}

interface ContextMenu {
  show: boolean
  x: number
  y: number
  target: { type: 'folder' | 'interface'; id: number; name: string } | null
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400',
  POST: 'bg-amber-500/20 text-amber-400',
  PUT: 'bg-cyan-500/20 text-cyan-400',
  DELETE: 'bg-red-500/20 text-red-400',
  PATCH: 'bg-violet-500/20 text-violet-400',
}

interface InterfaceTreeProps {
  projectId: number
  onSelectInterface: (id: number) => void
  selectedInterfaceId?: number
}

// 可拖拽的文件夹项组件
function SortableFolder({ children, id, ...props }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

// 拖拽手柄组件
function DragHandle({ isDragging }: { isDragging: boolean }) {
  return (
    <button
      className={cn(
        "p-1 rounded hover:bg-white/10 text-slate-600 hover:text-slate-400 transition-colors cursor-grab",
        isDragging && "cursor-grabbing text-cyan-400"
      )}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  )
}

export function InterfaceTree({ projectId, onSelectInterface, selectedInterfaceId }: InterfaceTreeProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    show: false,
    x: 0,
    y: 0,
    target: null
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 加载文件夹列表
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['interface-folders', projectId],
    queryFn: async () => {
      const res = await interfacesApi.listFolders({ project_id: projectId })
      return (res.data?.items ?? res.data ?? []) as FolderItem[]
    },
    enabled: !!projectId
  })

  // 加载接口列表
  const { data: interfacesData, isLoading: interfacesLoading } = useQuery({
    queryKey: ['interfaces', projectId],
    queryFn: async () => {
      const res = await interfacesApi.list({ project_id: projectId })
      return (res.data?.items ?? res.data ?? []) as InterfaceItem[]
    },
    enabled: !!projectId
  })

  // 移动接口到文件夹
  const moveMutation = useMutation({
    mutationFn: ({ interfaceId, targetFolderId }: { interfaceId: number; targetFolderId: number | null }) => {
      // TODO: 调用后端移动接口 API
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] })
    }
  })

  // 批量更新排序
  const reorderMutation = useMutation({
    mutationFn: ({ orders }: { orders: Array<{ id: number; order: number }> }) => {
      // TODO: 调用后端批量排序 API
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] })
      queryClient.invalidateQueries({ queryKey: ['interface-folders', projectId] })
    }
  })

  const folders = foldersData ?? []
  const interfaces = interfacesData ?? []
  const isLoading = foldersLoading || interfacesLoading

  // 从 localStorage 加载展开状态
  useEffect(() => {
    const saved = localStorage.getItem(`interface-tree-expanded-${projectId}`)
    if (saved) {
      try {
        setExpanded(JSON.parse(saved))
      } catch {}
    }
  }, [projectId])

  // 保存展开状态
  const saveExpanded = (newExpanded: Record<string, boolean>) => {
    setExpanded(newExpanded)
    localStorage.setItem(`interface-tree-expanded-${projectId}`, JSON.stringify(newExpanded))
  }

  // 构建树形结构
  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = []

    // 按排序排列文件夹
    const sortedFolders = [...folders].sort((a, b) => (a.order || 0) - (b.order || 0))

    // 创建文件夹节点
    sortedFolders.forEach((folder) => {
      const folderNode: TreeNode = {
        id: `folder-${folder.id}`,
        name: folder.name,
        type: 'folder',
        folderId: folder.id,
        order: folder.order,
        children: []
      }

      // 将属于此文件夹的接口添加为子节点，并按排序排列
      interfaces
        .filter((api) => api.folder_id === folder.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((api) => {
          folderNode.children?.push({
            id: `interface-${api.id}`,
            name: api.name,
            type: 'interface',
            method: api.method,
            interfaceId: api.id,
            order: api.order
          })
        })

      tree.push(folderNode)
    })

    // 添加未分类的接口
    const unassignedInterfaces = interfaces
      .filter(api => !api.folder_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    if (unassignedInterfaces.length > 0) {
      const unassignedFolder: TreeNode = {
        id: 'folder-unassigned',
        name: '未分类',
        type: 'folder',
        children: unassignedInterfaces.map((api) => ({
          id: `interface-${api.id}`,
          name: api.name,
          type: 'interface',
          method: api.method,
          interfaceId: api.id,
          order: api.order
        }))
      }
      tree.push(unassignedFolder)
    }

    return tree
  }

  const tree = buildTree()
  const folderIds = tree.map(node => node.id)

  // 过滤树
  const filterTree = (nodes: TreeNode[]): TreeNode[] => {
    if (!searchTerm) return nodes

    const filtered: TreeNode[] = []

    nodes.forEach((node) => {
      if (node.type === 'folder' && node.children) {
        const filteredChildren = node.children.filter((child) =>
          child.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (filteredChildren.length > 0) {
          filtered.push({ ...node, children: filteredChildren })
        }
      }
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered.push(node)
      }
    })

    return filtered
  }

  const filteredTree = filterTree(tree)

  const toggle = (id: string) => {
    saveExpanded({
      ...expanded,
      [id]: !expanded[id]
    })
  }

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setIsDragging(true)
    // 关闭右键菜单
    if (contextMenu.show) {
      setContextMenu(prev => ({ ...prev, show: false }))
    }
  }

  // 拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setIsDragging(false)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // 检查是否移动到不同位置
    if (activeId === overId) return

    // 解析拖拽项信息
    const [activeType, activeIdNum] = activeId.split('-')
    const [overType, overIdNum] = overId.split('-')

    // 处理接口拖拽到文件夹
    if (activeType === 'interface' && overType === 'folder') {
      const targetFolderId = overIdNum === 'unassigned' ? null : parseInt(overIdNum)
      const interfaceId = parseInt(activeIdNum)

      // 调用移动接口 API
      await moveMutation.mutateAsync({ interfaceId, targetFolderId })
      return
    }

    // 处理同类型排序（文件夹排序文件夹，接口排序接口）
    if (activeType === overType) {
      // 计算新排序
      const allIds = activeType === 'folder' ? folderIds : []
      // TODO: 实现排序逻辑
    }
  }

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, target: ContextMenu['target']) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      target
    })
  }

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, show: false }))
  }

  // 菜单操作
  const handleMenuAction = async (action: string) => {
    if (!contextMenu.target) return

    const { type, id, name } = contextMenu.target

    switch (action) {
      case 'rename':
        // TODO: 打开重命名弹窗
        break
      case 'delete':
        if (type === 'folder') {
          // TODO: 删除文件夹
        } else {
          await interfacesApi.delete(id)
          queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] })
        }
        break
      case 'copy':
        if (type === 'interface') {
          // TODO: 复制接口
        }
        break
    }

    closeContextMenu()
  }

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    if (contextMenu.show) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu.show])

  return (
    <div className="w-80 h-full border-r border-white/5 flex flex-col bg-slate-900/30">
      {/* Header */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">接口列表</h2>
          <div className="flex gap-1">
            <button
              onClick={() => navigate(`/api/interfaces/new?projectId=${projectId}`)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="新建接口"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="更多操作"
            >
              <MoreHorizontal className="w-4 h-4" />
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
            className="w-full h-9 bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Tree View with Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-2" onClick={closeContextMenu}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {searchTerm ? '未找到匹配的接口' : '暂无接口'}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
              {filteredTree.map(node => (
                <SortableFolder key={node.id} id={node.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white group transition-all",
                      isDragging && activeId === node.id && "opacity-50"
                    )}
                  >
                    <DragHandle isDragging={activeId === node.id} />
                    <div onClick={() => toggle(node.id)} className="flex items-center gap-2 flex-1">
                      {node.children && node.children.length > 0 ? (
                        expanded[node.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                      ) : <div className="w-4" />}
                      {expanded[node.id] ? (
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Folder className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
                      {node.children && (
                        <span className="text-xs text-slate-600">{node.children.length}</span>
                      )}
                    </div>
                  </div>

                  {expanded[node.id] && node.children && (
                    <div className="pl-4 mt-1 space-y-0.5 border-l border-white/5 ml-3.5">
                      {node.children.map(child => (
                        <div
                          key={child.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group transition-all",
                            selectedInterfaceId === child.interfaceId && "bg-cyan-500/10",
                            isDragging && activeId === child.id && "opacity-50"
                          )}
                          onClick={() => child.interfaceId && onSelectInterface(child.interfaceId)}
                          onContextMenu={(e) => handleContextMenu(e, {
                            type: 'interface',
                            id: child.interfaceId!,
                            name: child.name
                          })}
                        >
                          <DragHandle isDragging={activeId === child.id} />
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            METHOD_COLORS[child.method || 'GET']
                          )}>
                            {child.method?.toUpperCase()}
                          </span>
                          <span className={cn(
                            "text-sm truncate",
                            selectedInterfaceId === child.interfaceId
                              ? "text-cyan-400"
                              : "text-slate-300 group-hover:text-white"
                          )}>
                            {child.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SortableFolder>
              ))}
            </SortableContext>

            {/* 拖拽时的预览 */}
            <DragOverlay>
              {activeId ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                  <GripVertical className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-white">拖拽中...</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && contextMenu.target && (
        <div
          className="fixed z-50 min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleMenuAction('rename')}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            重命名
          </button>
          {contextMenu.target.type === 'interface' && (
            <button
              onClick={() => handleMenuAction('copy')}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制
            </button>
          )}
          <button
            onClick={() => handleMenuAction('delete')}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      )}
    </div>
  )
}
        </div>
      )}
    </div>
  )
}
