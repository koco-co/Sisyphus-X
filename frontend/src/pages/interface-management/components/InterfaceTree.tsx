import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
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
  FolderPlus,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  Loader2,
  GripVertical,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { interfacesApi } from '@/api/client'
import { useNavigate } from 'react-router-dom'

interface InterfaceItem {
  id: string | number
  name: string
  method: string
  url: string
  folder_id?: string | number | null
  order?: number
}

interface FolderItem {
  id: string | number
  name: string
  project_id: string | number
  parent_id?: string | number | null
  order: number
}

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'interface'
  method?: string
  children?: TreeNode[]
  folderId?: string | number
  interfaceId?: string | number
  order?: number
}

interface ContextMenu {
  show: boolean
  x: number
  y: number
  target: { type: 'folder' | 'interface'; id: string | number; name: string } | null
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400',
  POST: 'bg-amber-500/20 text-amber-400',
  PUT: 'bg-cyan-500/20 text-cyan-400',
  DELETE: 'bg-red-500/20 text-red-400',
  PATCH: 'bg-violet-500/20 text-violet-400',
}

interface InterfaceTreeProps {
  projectId: number | string
  onSelectInterface: (id: number | string) => void
  selectedInterfaceId?: number | string
}

function SortableFolder({ children, id }: { children: React.ReactNode; id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
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
    show: false, x: 0, y: 0, target: null,
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [renamingTarget, setRenamingTarget] = useState<{ type: 'folder' | 'interface'; id: string | number } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['interface-folders', projectId],
    queryFn: async () => {
      const res = await interfacesApi.listFolders({ project_id: projectId })
      return (res.data?.items ?? res.data ?? []) as FolderItem[]
    },
    enabled: !!projectId,
  })

  const { data: interfacesData, isLoading: interfacesLoading } = useQuery({
    queryKey: ['interfaces', projectId],
    queryFn: async () => {
      const res = await interfacesApi.list({ project_id: projectId })
      return (res.data?.items ?? res.data ?? []) as InterfaceItem[]
    },
    enabled: !!projectId,
  })

  const moveMutation = useMutation({
    mutationFn: ({ interfaceId, targetFolderId }: { interfaceId: string | number; targetFolderId: string | null }) =>
      interfacesApi.moveInterface(interfaceId, targetFolderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] }),
  })

  const reorderMutation = useMutation({
    mutationFn: ({ type, orders }: { type: 'folder' | 'interface'; orders: Array<{ id: string; sort_order: number }> }) =>
      type === 'folder' ? interfacesApi.reorderFolders(orders) : interfacesApi.reorderInterfaces(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] })
      queryClient.invalidateQueries({ queryKey: ['interface-folders', projectId] })
    },
  })

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string | number; name: string }) =>
      interfacesApi.updateFolder(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interface-folders', projectId] }),
  })

  const renameInterfaceMutation = useMutation({
    mutationFn: ({ id, name }: { id: string | number; name: string }) =>
      interfacesApi.update(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] }),
  })

  const createSubfolderMutation = useMutation({
    mutationFn: ({ parentId, name }: { parentId: string | number; name: string }) =>
      interfacesApi.createFolder({ project_id: projectId, name, parent_id: parentId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interface-folders', projectId] })
      saveExpanded({ ...expanded, [`folder-${variables.parentId}`]: true })
    },
  })

  const copyInterfaceMutation = useMutation({
    mutationFn: (id: string | number) => interfacesApi.copyInterface(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] }),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string | number) => interfacesApi.deleteFolder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interface-folders', projectId] }),
  })

  const folders = foldersData ?? []
  const interfaces = interfacesData ?? []
  const isLoading = foldersLoading || interfacesLoading

  useEffect(() => {
    const saved = localStorage.getItem(`interface-tree-expanded-${projectId}`)
    if (saved) {
      try {
        queueMicrotask(() => setExpanded(JSON.parse(saved)))
      } catch { /* ignore */ }
    }
  }, [projectId])

  const saveExpanded = useCallback((next: Record<string, boolean>) => {
    setExpanded(next)
    localStorage.setItem(`interface-tree-expanded-${projectId}`, JSON.stringify(next))
  }, [projectId])

  /* ───────── Build recursive tree ───────── */
  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = []
    const folderMap = new Map<string, TreeNode>()
    const sortedFolders = [...folders].sort((a, b) => (a.order || 0) - (b.order || 0))

    for (const f of sortedFolders) {
      folderMap.set(String(f.id), {
        id: `folder-${f.id}`,
        name: f.name,
        type: 'folder',
        folderId: f.id,
        order: f.order,
        children: [],
      })
    }

    const unassigned: TreeNode[] = []
    for (const api of [...interfaces].sort((a, b) => (a.order || 0) - (b.order || 0))) {
      const node: TreeNode = {
        id: `interface-${api.id}`,
        name: api.name,
        type: 'interface',
        method: api.method,
        interfaceId: api.id,
        order: api.order,
      }
      if (api.folder_id) {
        const parent = folderMap.get(String(api.folder_id))
        if (parent) { parent.children!.push(node) } else { unassigned.push(node) }
      } else {
        unassigned.push(node)
      }
    }

    for (const f of sortedFolders) {
      const node = folderMap.get(String(f.id))!
      if (f.parent_id) {
        const parent = folderMap.get(String(f.parent_id))
        if (parent) { parent.children!.push(node) } else { tree.push(node) }
      } else {
        tree.push(node)
      }
    }

    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return (a.order || 0) - (b.order || 0)
      })
      for (const n of nodes) if (n.children?.length) sortChildren(n.children)
    }
    sortChildren(tree)

    if (unassigned.length > 0) {
      tree.push({
        id: 'folder-unassigned',
        name: '未分类',
        type: 'folder',
        children: unassigned,
      })
    }
    return tree
  }

  const tree = buildTree()
  const topLevelIds = tree.map(n => n.id)

  /* ───────── Filter tree recursively ───────── */
  const filterTree = (nodes: TreeNode[]): TreeNode[] => {
    if (!searchTerm) return nodes
    const term = searchTerm.toLowerCase()
    return nodes.reduce<TreeNode[]>((acc, node) => {
      const nameMatch = node.name.toLowerCase().includes(term)
      if (node.type === 'interface') {
        if (nameMatch) acc.push(node)
        return acc
      }
      const filteredChildren = node.children ? filterTree(node.children) : []
      if (nameMatch) {
        acc.push(node)
      } else if (filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren })
      }
      return acc
    }, [])
  }

  const filteredTree = filterTree(tree)

  const toggle = (id: string) => saveExpanded({ ...expanded, [id]: !expanded[id] })

  /* ───────── DnD handlers ───────── */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setIsDragging(true)
    if (contextMenu.show) setContextMenu(prev => ({ ...prev, show: false }))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setIsDragging(false)
    if (!over || active.id === over.id) return

    const aid = active.id as string
    const oid = over.id as string
    const aDash = aid.indexOf('-')
    const oDash = oid.indexOf('-')
    const aType = aid.substring(0, aDash)
    const aId = aid.substring(aDash + 1)
    const oType = oid.substring(0, oDash)
    const oId = oid.substring(oDash + 1)

    if (aType === 'interface' && oType === 'folder') {
      await moveMutation.mutateAsync({
        interfaceId: aId,
        targetFolderId: oId === 'unassigned' ? null : oId,
      })
      return
    }

    if (aType === oType && aType === 'folder') {
      const orders = topLevelIds
        .filter(id => id !== 'folder-unassigned')
        .map((id, idx) => ({ id: id.replace('folder-', ''), sort_order: idx }))
      reorderMutation.mutate({ type: 'folder', orders })
    }
  }

  /* ───────── Context menu ───────── */
  const handleContextMenu = (e: React.MouseEvent, target: ContextMenu['target']) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ show: true, x: e.clientX, y: e.clientY, target })
  }

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, show: false }))

  const startRename = (type: 'folder' | 'interface', id: string | number, name: string) => {
    setRenamingTarget({ type, id })
    setRenameValue(name)
  }

  const confirmRename = () => {
    if (!renamingTarget || !renameValue.trim()) { setRenamingTarget(null); return }
    if (renamingTarget.type === 'folder') {
      renameFolderMutation.mutate({ id: renamingTarget.id, name: renameValue.trim() })
    } else {
      renameInterfaceMutation.mutate({ id: renamingTarget.id, name: renameValue.trim() })
    }
    setRenamingTarget(null)
  }

  const handleMenuAction = async (action: string) => {
    if (!contextMenu.target) return
    const { type, id, name } = contextMenu.target

    switch (action) {
      case 'rename':
        startRename(type, id, name)
        break
      case 'delete':
        if (type === 'folder') {
          deleteFolderMutation.mutate(id)
        } else {
          await interfacesApi.delete(id)
          queryClient.invalidateQueries({ queryKey: ['interfaces', projectId] })
        }
        break
      case 'copy':
        if (type === 'interface') copyInterfaceMutation.mutate(id)
        break
      case 'new-subfolder': {
        const folderName = prompt('请输入子文件夹名称：')
        if (folderName?.trim()) {
          createSubfolderMutation.mutate({ parentId: id, name: folderName.trim() })
        }
        break
      }
    }
    closeContextMenu()
  }

  useEffect(() => {
    if (!contextMenu.show) return
    const handler = () => closeContextMenu()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu.show])

  /* ───────── Recursive renderers ───────── */
  const renderInterfaceNode = (node: TreeNode, depth: number) => {
    const isRenaming = renamingTarget?.type === 'interface' && String(renamingTarget.id) === String(node.interfaceId)
    return (
      <div
        key={node.id}
        className={cn(
          'flex items-center gap-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group transition-all',
          selectedInterfaceId !== undefined && String(selectedInterfaceId) === String(node.interfaceId) && 'bg-cyan-500/10',
          isDragging && activeId === node.id && 'opacity-50',
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => !isRenaming && node.interfaceId !== undefined && onSelectInterface(node.interfaceId)}
        onContextMenu={(e) => handleContextMenu(e, { type: 'interface', id: node.interfaceId!, name: node.name })}
      >
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0', METHOD_COLORS[node.method || 'GET'])}>
          {node.method?.toUpperCase()}
        </span>
        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingTarget(null) }}
              className="flex-1 min-w-0 bg-slate-800 border border-cyan-500/50 rounded px-1.5 py-0.5 text-sm text-white outline-none"
            />
            <button onClick={confirmRename} className="p-0.5 text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setRenamingTarget(null)} className="p-0.5 text-slate-400 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span className={cn(
            'text-sm truncate',
            selectedInterfaceId !== undefined && String(selectedInterfaceId) === String(node.interfaceId) ? 'text-cyan-400' : 'text-slate-300 group-hover:text-white',
          )}>
            {node.name}
          </span>
        )}
      </div>
    )
  }

  const renderFolderNode = (node: TreeNode, depth: number) => {
    const isRenaming = renamingTarget?.type === 'folder' && String(renamingTarget.id) === String(node.folderId)
    const isExpanded = expanded[node.id]
    const hasChildren = node.children && node.children.length > 0
    const isVirtual = node.id === 'folder-unassigned'

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white group transition-all',
            isDragging && activeId === node.id && 'opacity-50',
          )}
          style={{ paddingLeft: depth * 16 }}
          onContextMenu={(e) => !isVirtual && node.folderId && handleContextMenu(e, { type: 'folder', id: node.folderId, name: node.name })}
        >
          {depth === 0 && <DragHandle isDragging={activeId === node.id} />}
          <div onClick={() => toggle(node.id)} className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren
              ? (isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />)
              : <div className="w-4 shrink-0" />}
            {isExpanded
              ? <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
              : <Folder className="w-4 h-4 text-slate-500 shrink-0" />}
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingTarget(null) }}
                  className="flex-1 min-w-0 bg-slate-800 border border-cyan-500/50 rounded px-1.5 py-0.5 text-sm text-white outline-none"
                />
                <button onClick={(e) => { e.stopPropagation(); confirmRename() }} className="p-0.5 text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setRenamingTarget(null) }} className="p-0.5 text-slate-400 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
                {node.children && <span className="text-xs text-slate-600">{node.children.length}</span>}
              </>
            )}
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map(child =>
              child.type === 'folder'
                ? renderFolderNode(child, depth + 1)
                : renderInterfaceNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-80 h-full border-r border-white/5 flex flex-col bg-slate-900/30">
      {/* Header */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">接口列表</h2>
          <div className="flex gap-1">
            <button
              onClick={() => navigate(`/interface-management/new${projectId ? `?projectId=${projectId}` : ''}`)}
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

      {/* Tree View */}
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
              {filteredTree.map(node => (
                <SortableFolder key={node.id} id={node.id}>
                  {renderFolderNode(node, 0)}
                </SortableFolder>
              ))}
            </SortableContext>
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

      {/* Context Menu */}
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
          {contextMenu.target.type === 'folder' && (
            <button
              onClick={() => handleMenuAction('new-subfolder')}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              新建子文件夹
            </button>
          )}
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
