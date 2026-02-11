import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ChevronDown,
    ChevronRight,
    Clock3,
    Database,
    FilePlus2,
    FolderOpen,
    FolderPlus,
    Loader2,
    Plus,
    Save,
    Search,
    Send,
    Sparkles,
} from 'lucide-react'
import { interfacesApi, projectsApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { FormDataEditor } from '@/pages/interface/components/FormDataEditor'
import type { KeyValueTypePair } from '@/pages/interface/components/FormDataEditor'

interface ProjectOption {
    id: number
    name: string
}

interface InterfaceFolder {
    id: number
    project_id: number
    name: string
    parent_id?: number | null
}

interface InterfaceItem {
    id: number
    project_id: number
    folder_id?: number | null
    name: string
    method: string
    url: string
    status?: string
    description?: string | null
    params?: Record<string, unknown>
    headers?: Record<string, unknown>
    cookies?: Record<string, unknown>
    body?: unknown
    body_type?: string
}

interface Environment {
    id: number
    name: string
    domain?: string
    variables?: Record<string, string>
    headers?: Record<string, string>
}

interface PageResponse<T> {
    items: T[]
    pages: number
}

interface KeyValuePair {
    key: string
    value: string
    enabled: boolean
}

interface InterfaceDraft {
    project_id: number
    folder_id: number | null
    name: string
    url: string
    method: string
    description: string
    status: string
    params: KeyValuePair[]
    headers: KeyValuePair[]
    cookies: KeyValuePair[]
    body_type: string
    body_text: string
    form_data_pairs: KeyValueTypePair[]
}

interface DebugResponse {
    status_code: number
    headers: Record<string, string>
    body: unknown
    elapsed: number
}

interface FolderTreeNode {
    folder: InterfaceFolder
    children: FolderTreeNode[]
    interfaces: InterfaceItem[]
}

const REQUEST_TABS = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'cookies', label: 'Cookies' },
] as const

const RESPONSE_TABS = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
] as const

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    DELETE: 'bg-red-500/15 text-red-300 border-red-500/30',
    PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
}

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const TEMPLATE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g

function createEmptyDraft(projectId: number, folderId: number | null = null): InterfaceDraft {
    return {
        project_id: projectId,
        folder_id: folderId,
        name: '',
        url: '',
        method: 'GET',
        description: '',
        status: 'draft',
        params: [],
        headers: [],
        cookies: [],
        body_type: 'json',
        body_text: '{\n  \n}',
        form_data_pairs: [],
    }
}

function objectToPairs(input: Record<string, unknown> | undefined): KeyValuePair[] {
    if (!input) return []
    return Object.entries(input).map(([key, value]) => ({
        key,
        value: value === null || value === undefined ? '' : String(value),
        enabled: true,
    }))
}

function pairsToRecord(pairs: KeyValuePair[]): Record<string, string> {
    return pairs
        .filter((pair) => pair.enabled && pair.key.trim())
        .reduce<Record<string, string>>((acc, pair) => {
            acc[pair.key.trim()] = pair.value
            return acc
        }, {})
}

function bodyToText(body: unknown): string {
    if (typeof body === 'string') return body
    if (body === null || body === undefined) return ''
    try {
        return JSON.stringify(body, null, 2)
    } catch {
        return String(body)
    }
}

function normalizeFormDataPairs(body: unknown): KeyValueTypePair[] {
    if (Array.isArray(body)) {
        return body
            .map((item) => {
                if (!item || typeof item !== 'object') return null
                const raw = item as Partial<KeyValueTypePair>
                if (!raw.key) return null
                return {
                    key: raw.key,
                    value: raw.value ?? '',
                    type: raw.type === 'file' ? 'file' : 'text',
                    enabled: raw.enabled ?? true,
                } as KeyValueTypePair
            })
            .filter((item): item is KeyValueTypePair => item !== null)
    }

    if (body && typeof body === 'object') {
        return Object.entries(body as Record<string, unknown>).map(([key, value]) => ({
            key,
            value: value === null || value === undefined ? '' : String(value),
            type: 'text',
            enabled: true,
        }))
    }

    return []
}

function makeDraftFromInterface(item: InterfaceItem): InterfaceDraft {
    return {
        project_id: item.project_id,
        folder_id: item.folder_id ?? null,
        name: item.name ?? '',
        url: item.url ?? '',
        method: item.method ?? 'GET',
        description: item.description ?? '',
        status: item.status ?? 'draft',
        params: objectToPairs(item.params),
        headers: objectToPairs(item.headers),
        cookies: objectToPairs(item.cookies),
        body_type: item.body_type ?? 'json',
        body_text: bodyToText(item.body),
        form_data_pairs: normalizeFormDataPairs(item.body),
    }
}

function toMethodColor(method: string): string {
    return METHOD_COLORS[method.toUpperCase()] ?? 'bg-slate-600/20 text-slate-300 border-slate-500/30'
}

function toStatusTone(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'bg-emerald-500/15 text-emerald-300'
    if (statusCode >= 400) return 'bg-red-500/15 text-red-300'
    return 'bg-amber-500/15 text-amber-300'
}

function interpolateTemplate(input: string, variables: Record<string, string>): string {
    return input.replace(TEMPLATE_PATTERN, (_match, keyRaw: string) => {
        const key = keyRaw.trim()
        if (!Object.prototype.hasOwnProperty.call(variables, key)) {
            return `{{${key}}}`
        }
        const value = variables[key]
        return value === undefined || value === null ? '' : String(value)
    })
}

function interpolateUnknown(value: unknown, variables: Record<string, string>): unknown {
    if (typeof value === 'string') {
        return interpolateTemplate(value, variables)
    }
    if (Array.isArray(value)) {
        return value.map((item) => interpolateUnknown(item, variables))
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
            (acc, [key, child]) => {
                acc[key] = interpolateUnknown(child, variables)
                return acc
            },
            {}
        )
    }
    return value
}

function joinBaseAndPath(baseUrl: string, url: string): string {
    const resolvedUrl = url.trim()
    if (/^https?:\/\//i.test(resolvedUrl)) return resolvedUrl

    const resolvedBase = baseUrl.trim()
    if (!resolvedBase) return resolvedUrl

    return `${resolvedBase.replace(/\/$/, '')}/${resolvedUrl.replace(/^\//, '')}`
}

function responseBodySize(body: unknown): string {
    if (body === null || body === undefined) return '0 B'

    let text = ''
    if (typeof body === 'string') {
        text = body
    } else {
        try {
            text = JSON.stringify(body)
        } catch {
            text = String(body)
        }
    }

    const bytes = new TextEncoder().encode(text).length
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function flattenFolders(nodes: FolderTreeNode[]): InterfaceFolder[] {
    return nodes.reduce<InterfaceFolder[]>((acc, node) => {
        acc.push(node.folder, ...flattenFolders(node.children))
        return acc
    }, [])
}

async function fetchAllInterfaces(projectId: number): Promise<InterfaceItem[]> {
    let page = 1
    let totalPages = 1
    const collected: InterfaceItem[] = []

    do {
        const response = await interfacesApi.list({ page, size: 100, project_id: projectId })
        const data = response.data as PageResponse<InterfaceItem> | InterfaceItem[]

        if (Array.isArray(data)) {
            collected.push(...data)
            break
        }

        collected.push(...(data.items ?? []))
        totalPages = data.pages || 1
        page += 1
    } while (page <= totalPages)

    return collected
}

function parseErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') {
        return '请求失败'
    }

    const maybeResponse = error as { response?: { data?: { detail?: string | { message?: string } } } }
    const detail = maybeResponse.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message

    const maybeMessage = error as { message?: string }
    return maybeMessage.message ?? '请求失败'
}

function buildTree(folders: InterfaceFolder[], interfaces: InterfaceItem[]): FolderTreeNode[] {
    const folderChildrenMap = new Map<number | null, InterfaceFolder[]>()
    const interfacesMap = new Map<number | null, InterfaceItem[]>()

    for (const folder of folders) {
        const parentId = folder.parent_id ?? null
        const children = folderChildrenMap.get(parentId) ?? []
        children.push(folder)
        folderChildrenMap.set(parentId, children)
    }

    for (const api of interfaces) {
        const folderId = api.folder_id ?? null
        const items = interfacesMap.get(folderId) ?? []
        items.push(api)
        interfacesMap.set(folderId, items)
    }

    const makeNodes = (parentId: number | null): FolderTreeNode[] => {
        const childFolders = [...(folderChildrenMap.get(parentId) ?? [])].sort((a, b) =>
            a.name.localeCompare(b.name, 'zh-Hans-CN')
        )

        return childFolders.map((folder) => ({
            folder,
            children: makeNodes(folder.id),
            interfaces: [...(interfacesMap.get(folder.id) ?? [])].sort((a, b) =>
                a.name.localeCompare(b.name, 'zh-Hans-CN')
            ),
        }))
    }

    return makeNodes(null)
}

function filterTree(nodes: FolderTreeNode[], search: string): FolderTreeNode[] {
    const term = search.trim().toLowerCase()
    if (!term) return nodes

    return nodes
        .map((node) => {
            const filteredChildren = filterTree(node.children, search)
            const filteredInterfaces = node.interfaces.filter(
                (api) =>
                    api.name.toLowerCase().includes(term) ||
                    api.url.toLowerCase().includes(term) ||
                    api.method.toLowerCase().includes(term)
            )

            const folderMatched = node.folder.name.toLowerCase().includes(term)
            if (!folderMatched && filteredChildren.length === 0 && filteredInterfaces.length === 0) {
                return null
            }

            if (folderMatched && filteredChildren.length === 0 && filteredInterfaces.length === 0) {
                return { ...node }
            }

            return {
                ...node,
                children: filteredChildren,
                interfaces: filteredInterfaces,
            }
        })
        .filter((node): node is FolderTreeNode => node !== null)
}

function KeyValueEditor({
    pairs,
    onChange,
    keyPlaceholder,
    valuePlaceholder,
}: {
    pairs: KeyValuePair[]
    onChange: (pairs: KeyValuePair[]) => void
    keyPlaceholder: string
    valuePlaceholder: string
}) {
    const handleAdd = () => {
        onChange([...pairs, { key: '', value: '', enabled: true }])
    }

    const handleRemove = (index: number) => {
        onChange(pairs.filter((_, idx) => idx !== index))
    }

    const handleUpdate = (index: number, patch: Partial<KeyValuePair>) => {
        const next = [...pairs]
        next[index] = { ...next[index], ...patch }
        onChange(next)
    }

    return (
        <div className="space-y-2">
            {pairs.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
                    暂无配置项，点击下方按钮添加。
                </div>
            )}

            {pairs.map((pair, index) => (
                <div key={`${pair.key}-${index}`} className="grid grid-cols-[24px_1fr_1fr_36px] gap-2">
                    <label className="flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={pair.enabled}
                            onChange={(event) => handleUpdate(index, { enabled: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                        />
                    </label>
                    <input
                        value={pair.key}
                        onChange={(event) => handleUpdate(index, { key: event.target.value })}
                        placeholder={keyPlaceholder}
                        className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                    />
                    <input
                        value={pair.value}
                        onChange={(event) => handleUpdate(index, { value: event.target.value })}
                        placeholder={valuePlaceholder}
                        className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                    />
                    <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
                    >
                        ×
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/35 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/10"
            >
                <Plus className="h-3.5 w-3.5" />
                添加字段
            </button>
        </div>
    )
}

export default function ApiManagement() {
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useParams<{ id: string }>()
    const queryClient = useQueryClient()

    const selectedInterfaceId = useMemo(() => {
        if (!id) return null
        const parsed = Number(id)
        return Number.isNaN(parsed) ? null : parsed
    }, [id])

    const isCreateMode = location.pathname.endsWith('/new')
    const [selectedProjectId, setSelectedProjectId] = useState(0)
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
    const [searchText, setSearchText] = useState('')
    const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
    const [pendingNewFolderId, setPendingNewFolderId] = useState<number | null>(null)
    const [activeReqTab, setActiveReqTab] = useState<(typeof REQUEST_TABS)[number]['id']>('params')
    const [activeResTab, setActiveResTab] = useState<(typeof RESPONSE_TABS)[number]['id']>('body')
    const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null)
    const [response, setResponse] = useState<DebugResponse | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [folderDraftOpen, setFolderDraftOpen] = useState(false)
    const [draft, setDraft] = useState<InterfaceDraft>(createEmptyDraft(0))

    const { data: projectOptions = [] } = useQuery({
        queryKey: ['api-workbench-projects'],
        queryFn: async () => {
            const response = await projectsApi.list({ page: 1, size: 100 })
            return (response.data?.items ?? []) as ProjectOption[]
        },
    })

    useEffect(() => {
        if (!projectOptions.length || selectedProjectId > 0) return
        setSelectedProjectId(projectOptions[0].id)
    }, [projectOptions, selectedProjectId])

    const { data: folders = [], isLoading: foldersLoading } = useQuery({
        queryKey: ['api-workbench-folders', selectedProjectId],
        queryFn: async () => {
            const response = await interfacesApi.listFolders({ project_id: selectedProjectId })
            return (response.data ?? []) as InterfaceFolder[]
        },
        enabled: selectedProjectId > 0,
    })

    const { data: interfaces = [], isLoading: interfacesLoading } = useQuery({
        queryKey: ['api-workbench-interfaces', selectedProjectId],
        queryFn: () => fetchAllInterfaces(selectedProjectId),
        enabled: selectedProjectId > 0,
    })

    const { data: selectedInterfaceData, isLoading: detailLoading } = useQuery({
        queryKey: ['api-workbench-interface', selectedInterfaceId],
        queryFn: async () => {
            const response = await interfacesApi.get(selectedInterfaceId as number)
            return response.data as InterfaceItem
        },
        enabled: selectedInterfaceId !== null,
    })

    const { data: environments = [] } = useQuery({
        queryKey: ['api-workbench-environments', selectedProjectId],
        queryFn: async () => {
            const response = await projectsApi.listEnvironments(selectedProjectId)
            return (response.data ?? []) as Environment[]
        },
        enabled: selectedProjectId > 0,
    })

    const selectedEnvironment = useMemo(
        () => environments.find((env) => env.id === selectedEnvId) ?? null,
        [environments, selectedEnvId]
    )

    useEffect(() => {
        if (selectedEnvId === null) return
        const exists = environments.some((env) => env.id === selectedEnvId)
        if (!exists) setSelectedEnvId(null)
    }, [environments, selectedEnvId])

    useEffect(() => {
        if (!folders.length) return
        setExpandedFolders((current) => {
            const next = { ...current }
            for (const folder of folders) {
                if (next[folder.id] === undefined) next[folder.id] = true
            }
            return next
        })
    }, [folders])

    useEffect(() => {
        if (!selectedInterfaceData) return
        setSelectedProjectId(selectedInterfaceData.project_id)
        setSelectedFolderId(selectedInterfaceData.folder_id ?? null)
        setDraft(makeDraftFromInterface(selectedInterfaceData))
        setResponse(null)
    }, [selectedInterfaceData])

    useEffect(() => {
        if (!isCreateMode || selectedProjectId <= 0) return
        setDraft(createEmptyDraft(selectedProjectId, pendingNewFolderId))
        setResponse(null)
        setPendingNewFolderId(null)
    }, [isCreateMode, selectedProjectId, pendingNewFolderId])

    const saveMutation = useMutation({
        mutationFn: async () => {
            const bodyPayload =
                draft.body_type === 'form-data'
                    ? draft.form_data_pairs
                    : draft.body_type === 'json'
                        ? (() => {
                            const trimmed = draft.body_text.trim()
                            if (!trimmed) return {}
                            try {
                                return JSON.parse(trimmed)
                            } catch {
                                return trimmed
                            }
                        })()
                        : draft.body_type === 'none'
                            ? {}
                            : draft.body_text

            const payload = {
                name: draft.name.trim(),
                url: draft.url.trim(),
                method: draft.method,
                status: draft.status,
                description: draft.description,
                folder_id: draft.folder_id,
                params: pairsToRecord(draft.params),
                headers: pairsToRecord(draft.headers),
                cookies: pairsToRecord(draft.cookies),
                body: bodyPayload,
                body_type: draft.body_type,
            }

            if (selectedInterfaceId !== null && !isCreateMode) {
                const response = await interfacesApi.update(selectedInterfaceId, payload)
                return response.data as InterfaceItem
            }

            const response = await interfacesApi.create({
                project_id: selectedProjectId,
                ...payload,
            })
            return response.data as InterfaceItem
        },
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: ['api-workbench-interfaces', selectedProjectId] })
            queryClient.invalidateQueries({ queryKey: ['interfaces'] })
            queryClient.invalidateQueries({ queryKey: ['api-workbench-interface', saved.id] })
            if (selectedInterfaceId === null || isCreateMode) {
                navigate(`/api/interfaces/${saved.id}`)
            } else {
                setDraft(makeDraftFromInterface(saved))
            }
        },
    })

    const createFolderMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await interfacesApi.createFolder({
                project_id: selectedProjectId,
                name,
                parent_id: selectedFolderId ?? undefined,
            })
            return response.data as InterfaceFolder
        },
        onSuccess: (created) => {
            setFolderDraftOpen(false)
            setNewFolderName('')
            setSelectedFolderId(created.id)
            setExpandedFolders((current) => ({
                ...current,
                [created.id]: true,
                ...(created.parent_id ? { [created.parent_id]: true } : {}),
            }))
            queryClient.invalidateQueries({ queryKey: ['api-workbench-folders', selectedProjectId] })
        },
    })

    const treeData = useMemo(() => buildTree(folders, interfaces), [folders, interfaces])
    const filteredTree = useMemo(() => filterTree(treeData, searchText), [treeData, searchText])

    const flattenedFolders = useMemo(() => flattenFolders(treeData), [treeData])

    const unassignedInterfaces = useMemo(() => {
        const loose = interfaces.filter((item) => item.folder_id === null || item.folder_id === undefined)
        const term = searchText.trim().toLowerCase()
        if (!term) return loose
        return loose.filter(
            (item) =>
                item.name.toLowerCase().includes(term) ||
                item.url.toLowerCase().includes(term) ||
                item.method.toLowerCase().includes(term)
        )
    }, [interfaces, searchText])

    const environmentVariables = selectedEnvironment?.variables ?? {}
    const resolvedBaseUrl = interpolateTemplate(selectedEnvironment?.domain ?? '', environmentVariables)
    const resolvedRequestUrl = joinBaseAndPath(
        resolvedBaseUrl,
        interpolateTemplate(draft.url || '', environmentVariables)
    )

    const handleSend = async () => {
        if (!draft.url.trim()) return

        setIsSending(true)
        setResponse(null)

        try {
            const requestVariables = selectedEnvironment?.variables ?? {}

            const envHeaders = Object.entries(selectedEnvironment?.headers ?? {}).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                    acc[key] = interpolateTemplate(String(value), requestVariables)
                    return acc
                },
                {}
            )

            const requestHeaders = Object.entries(pairsToRecord(draft.headers)).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                    acc[key] = interpolateTemplate(value, requestVariables)
                    return acc
                },
                {}
            )

            const requestParams = Object.entries(pairsToRecord(draft.params)).reduce<Record<string, string>>(
                (acc, [key, value]) => {
                    acc[key] = interpolateTemplate(value, requestVariables)
                    return acc
                },
                {}
            )

            let body: unknown
            let files: Record<string, string> | undefined

            if (draft.body_type === 'json') {
                const replaced = interpolateTemplate(draft.body_text, requestVariables)
                const trimmed = replaced.trim()
                if (trimmed) {
                    try {
                        body = interpolateUnknown(JSON.parse(trimmed), requestVariables)
                    } catch {
                        body = replaced
                    }
                }
            } else if (draft.body_type === 'form-data') {
                const textData: Record<string, string> = {}
                const fileData: Record<string, string> = {}

                for (const pair of draft.form_data_pairs.filter((item) => item.enabled && item.key.trim())) {
                    if (pair.type === 'file') {
                        fileData[pair.key.trim()] = pair.value
                    } else {
                        textData[pair.key.trim()] = interpolateTemplate(pair.value, requestVariables)
                    }
                }

                body = textData
                files = Object.keys(fileData).length ? fileData : undefined
            } else if (draft.body_type !== 'none' && draft.body_text.trim()) {
                body = interpolateTemplate(draft.body_text, requestVariables)
            }

            const response = await interfacesApi.sendRequest({
                url: resolvedRequestUrl,
                method: draft.method,
                headers: { ...envHeaders, ...requestHeaders },
                params: requestParams,
                body,
                files,
            })

            setResponse(response.data as DebugResponse)
        } catch (error) {
            setResponse({
                status_code: 0,
                headers: {},
                body: { error: parseErrorMessage(error) },
                elapsed: 0,
            })
        } finally {
            setIsSending(false)
        }
    }

    const handleCreateNewInterface = () => {
        if (selectedProjectId <= 0) return
        setPendingNewFolderId(selectedFolderId)
        navigate('/api/interfaces/new')
    }

    const renderInterfaceNode = (item: InterfaceItem, level = 0) => {
        const selected = selectedInterfaceId === item.id && !isCreateMode
        return (
            <button
                key={item.id}
                type="button"
                onClick={() => {
                    setSelectedFolderId(item.folder_id ?? null)
                    navigate(`/api/interfaces/${item.id}`)
                }}
                className={cn(
                    'group flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition',
                    selected
                        ? 'border-cyan-500/35 bg-cyan-500/10'
                        : 'border-transparent hover:border-slate-700 hover:bg-slate-900/60'
                )}
                style={{ marginLeft: `${level * 14}px` }}
            >
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', toMethodColor(item.method))}>
                    {item.method.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-100">{item.name}</span>
            </button>
        )
    }

    const renderFolder = (node: FolderTreeNode, level = 0): JSX.Element => {
        const expanded = expandedFolders[node.folder.id] ?? true
        const isSelectedFolder = selectedFolderId === node.folder.id

        return (
            <div key={node.folder.id} className="space-y-1">
                <button
                    type="button"
                    onClick={() => {
                        setExpandedFolders((current) => ({
                            ...current,
                            [node.folder.id]: !expanded,
                        }))
                        setSelectedFolderId(node.folder.id)
                    }}
                    className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition',
                        isSelectedFolder
                            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                            : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    )}
                    style={{ marginLeft: `${level * 14}px` }}
                >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <FolderOpen className="h-4 w-4 text-sky-300/80" />
                    <span className="truncate">{node.folder.name}</span>
                    <span className="ml-auto text-[11px] text-slate-500">
                        {node.interfaces.length + node.children.length}
                    </span>
                </button>

                {expanded && (
                    <div className="space-y-1">
                        {node.children.map((child) => renderFolder(child, level + 1))}
                        {node.interfaces.map((api) => renderInterfaceNode(api, level + 1))}
                    </div>
                )}
            </div>
        )
    }

    const isLeftLoading = foldersLoading || interfacesLoading
    const rightLoading = detailLoading && selectedInterfaceId !== null
    const showEditor = isCreateMode || selectedInterfaceId !== null

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-100">
            <div className="grid h-full grid-cols-[360px_1fr]">
                <aside className="flex h-full flex-col border-r border-slate-800/70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),_#020617]">
                    <div className="space-y-3 border-b border-slate-800/70 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-cyan-300" />
                                <span className="text-sm font-semibold tracking-wide">接口目录</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={handleCreateNewInterface}
                                    disabled={selectedProjectId <= 0}
                                    className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
                                    title="新建接口"
                                >
                                    <FilePlus2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFolderDraftOpen((open) => !open)}
                                    className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
                                    title="新建目录"
                                >
                                    <FolderPlus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        <select
                            value={selectedProjectId || ''}
                            onChange={(event) => {
                                const nextProjectId = Number(event.target.value)
                                setSelectedProjectId(nextProjectId)
                                setSelectedFolderId(null)
                                setSearchText('')
                                setSelectedEnvId(null)
                                navigate('/api/interfaces')
                            }}
                            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none transition focus:border-cyan-500"
                        >
                            {projectOptions.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>

                        {folderDraftOpen && (
                            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                                <input
                                    value={newFolderName}
                                    onChange={(event) => setNewFolderName(event.target.value)}
                                    placeholder="输入目录名称"
                                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 text-sm outline-none focus:border-cyan-500"
                                />
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFolderDraftOpen(false)
                                            setNewFolderName('')
                                        }}
                                        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                        onClick={() => createFolderMutation.mutate(newFolderName.trim())}
                                        className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 transition disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {createFolderMutation.isPending ? '创建中...' : '创建目录'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="搜索接口名称 / URL / Method"
                                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-3">
                        {isLeftLoading ? (
                            <div className="flex h-full items-center justify-center text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {filteredTree.map((node) => renderFolder(node))}

                                {unassignedInterfaces.length > 0 && (
                                    <div className="space-y-1 pt-2">
                                        <div className="flex items-center gap-2 px-2 text-xs uppercase tracking-wide text-slate-500">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            未归类
                                        </div>
                                        {unassignedInterfaces.map((item) => renderInterfaceNode(item))}
                                    </div>
                                )}

                                {!filteredTree.length && !unassignedInterfaces.length && (
                                    <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
                                        当前项目暂无接口
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.07),_transparent_45%),_#020617]">
                    {!showEditor ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 px-8 py-10 text-center">
                                <h2 className="text-lg font-semibold text-slate-100">选择一个接口开始调试</h2>
                                <p className="mt-2 text-sm text-slate-400">
                                    左侧目录树可快速切换接口，右侧会展示完整调试面板。
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCreateNewInterface}
                                    disabled={selectedProjectId <= 0}
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                                >
                                    <Plus className="h-4 w-4" />
                                    新建接口
                                </button>
                            </div>
                        </div>
                    ) : rightLoading ? (
                        <div className="flex h-full items-center justify-center text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <header className="space-y-3 border-b border-slate-800/70 px-6 py-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        value={draft.name}
                                        onChange={(event) =>
                                            setDraft((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="接口名称"
                                        className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-base font-semibold outline-none transition focus:border-cyan-500"
                                    />

                                    <select
                                        value={draft.folder_id ?? ''}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                folder_id: event.target.value ? Number(event.target.value) : null,
                                            }))
                                        }
                                        className="h-10 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none transition focus:border-cyan-500"
                                    >
                                        <option value="">未归类</option>
                                        {flattenedFolders.map((folder) => (
                                            <option key={folder.id} value={folder.id}>
                                                {folder.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={selectedEnvId ?? ''}
                                        onChange={(event) =>
                                            setSelectedEnvId(event.target.value ? Number(event.target.value) : null)
                                        }
                                        className="h-10 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none transition focus:border-cyan-500"
                                    >
                                        <option value="">无环境</option>
                                        {environments.map((env) => (
                                            <option key={env.id} value={env.id}>
                                                {env.name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        disabled={
                                            saveMutation.isPending ||
                                            selectedProjectId <= 0 ||
                                            !draft.name.trim() ||
                                            !draft.url.trim()
                                        }
                                        onClick={() => saveMutation.mutate()}
                                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saveMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        保存
                                    </button>
                                </div>

                                <div className="rounded-xl border border-slate-800 bg-slate-900/55 px-3 py-2">
                                    <div className="grid grid-cols-[130px_1fr_auto] items-center gap-2">
                                        <select
                                            value={draft.method}
                                            onChange={(event) =>
                                                setDraft((current) => ({ ...current, method: event.target.value }))
                                            }
                                            className={cn(
                                                'h-10 rounded-lg border px-3 text-sm font-semibold outline-none transition',
                                                'border-slate-700 bg-slate-900/85',
                                                toMethodColor(draft.method)
                                            )}
                                        >
                                            {METHOD_OPTIONS.map((method) => (
                                                <option key={method} value={method}>
                                                    {method}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            value={draft.url}
                                            onChange={(event) =>
                                                setDraft((current) => ({ ...current, url: event.target.value }))
                                            }
                                            placeholder="输入接口路径，例如 /api/v1/users/{{userId}}"
                                            className="h-10 rounded-lg border border-slate-700 bg-slate-950/80 px-3 font-mono text-sm outline-none transition focus:border-cyan-500"
                                        />

                                        <button
                                            type="button"
                                            onClick={handleSend}
                                            disabled={isSending || !draft.url.trim()}
                                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            Send
                                        </button>
                                    </div>

                                    <div className="mt-2 grid gap-1 text-xs text-slate-400">
                                        <div>
                                            环境基础域名：
                                            <span className="ml-1 font-mono text-slate-300">
                                                {resolvedBaseUrl || '(未设置)'}
                                            </span>
                                        </div>
                                        <div>
                                            实际请求地址：
                                            <span className="ml-1 font-mono text-cyan-200">{resolvedRequestUrl || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <section className="grid min-h-0 flex-1 grid-cols-[1fr_42%]">
                                <div className="min-h-0 border-r border-slate-800/70">
                                    <div className="flex items-center gap-1 border-b border-slate-800/70 px-4 py-2.5">
                                        {REQUEST_TABS.map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveReqTab(tab.id)}
                                                className={cn(
                                                    'rounded-md px-3 py-1.5 text-xs font-medium transition',
                                                    activeReqTab === tab.id
                                                        ? 'bg-cyan-500/15 text-cyan-200'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                )}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="h-[calc(100%-45px)] overflow-y-auto p-4">
                                        {activeReqTab === 'params' && (
                                            <KeyValueEditor
                                                pairs={draft.params}
                                                onChange={(next) =>
                                                    setDraft((current) => ({ ...current, params: next }))
                                                }
                                                keyPlaceholder="参数名"
                                                valuePlaceholder="参数值（支持 {{变量}}）"
                                            />
                                        )}

                                        {activeReqTab === 'headers' && (
                                            <KeyValueEditor
                                                pairs={draft.headers}
                                                onChange={(next) =>
                                                    setDraft((current) => ({ ...current, headers: next }))
                                                }
                                                keyPlaceholder="Header"
                                                valuePlaceholder="Header 值（支持 {{变量}}）"
                                            />
                                        )}

                                        {activeReqTab === 'cookies' && (
                                            <KeyValueEditor
                                                pairs={draft.cookies}
                                                onChange={(next) =>
                                                    setDraft((current) => ({ ...current, cookies: next }))
                                                }
                                                keyPlaceholder="Cookie 名称"
                                                valuePlaceholder="Cookie 值（支持 {{变量}}）"
                                            />
                                        )}

                                        {activeReqTab === 'body' && (
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'].map(
                                                        (mode) => (
                                                            <label key={mode} className="inline-flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    checked={draft.body_type === mode}
                                                                    onChange={() =>
                                                                        setDraft((current) => ({
                                                                            ...current,
                                                                            body_type: mode,
                                                                        }))
                                                                    }
                                                                    className="h-4 w-4 border-slate-700 bg-slate-900 text-cyan-500"
                                                                />
                                                                <span className="text-xs text-slate-300">{mode}</span>
                                                            </label>
                                                        )
                                                    )}
                                                </div>

                                                {draft.body_type === 'form-data' ? (
                                                    <FormDataEditor
                                                        pairs={draft.form_data_pairs}
                                                        onChange={(next) =>
                                                            setDraft((current) => ({
                                                                ...current,
                                                                form_data_pairs: next,
                                                            }))
                                                        }
                                                    />
                                                ) : draft.body_type !== 'none' ? (
                                                    <textarea
                                                        value={draft.body_text}
                                                        onChange={(event) =>
                                                            setDraft((current) => ({
                                                                ...current,
                                                                body_text: event.target.value,
                                                            }))
                                                        }
                                                        placeholder={
                                                            draft.body_type === 'json'
                                                                ? '{\n  "message": "hello {{user}}"\n}'
                                                                : '输入请求体内容'
                                                        }
                                                        className="h-[380px] w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 font-mono text-sm outline-none transition focus:border-cyan-500"
                                                    />
                                                ) : (
                                                    <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
                                                        当前 Body 模式为 none
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="min-h-0">
                                    <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2.5">
                                        <div className="flex items-center gap-1">
                                            {RESPONSE_TABS.map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setActiveResTab(tab.id)}
                                                    className={cn(
                                                        'rounded-md px-3 py-1.5 text-xs font-medium transition',
                                                        activeResTab === tab.id
                                                            ? 'bg-cyan-500/15 text-cyan-200'
                                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                    )}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        {response && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={cn('rounded-md px-2 py-1 font-semibold', toStatusTone(response.status_code))}>
                                                    {response.status_code || 'ERR'}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-slate-300">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {(response.elapsed * 1000).toFixed(0)}ms
                                                </span>
                                                <span className="text-slate-400">{responseBodySize(response.body)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-[calc(100%-45px)] overflow-y-auto p-4">
                                        {!response ? (
                                            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
                                                <Send className="h-8 w-8 opacity-35" />
                                                <p>点击 Send 查看调试响应</p>
                                            </div>
                                        ) : activeResTab === 'body' ? (
                                            <pre className="whitespace-pre-wrap break-all rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs text-slate-100">
                                                {typeof response.body === 'string'
                                                    ? response.body
                                                    : JSON.stringify(response.body, null, 2)}
                                            </pre>
                                        ) : (
                                            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                                                {Object.entries(response.headers).map(([key, value]) => (
                                                    <div key={key} className="grid grid-cols-[170px_1fr] gap-2 text-xs">
                                                        <span className="break-all text-cyan-300">{key}</span>
                                                        <span className="break-all text-slate-300">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
