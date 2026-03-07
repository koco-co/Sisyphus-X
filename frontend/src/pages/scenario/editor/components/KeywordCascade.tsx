import { useQuery } from '@tanstack/react-query';
import { keywordsApi, interfacesApi } from '@/api/client';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { shouldShowInterfaceSelector } from './keywordCascadeUtils';

const KEYWORD_TYPES = [
    { value: 'request', label: '发送请求' },
    { value: 'assertion', label: '断言类型' },
    { value: 'extraction', label: '提取变量' },
    { value: 'database', label: '数据库操作' },
    { value: 'custom', label: '自定义关键字' },
];

interface KeywordCascadeValue {
    keywordType: string;
    keywordName: string;
    resourceId?: string;
}

interface KeywordCascadeProps {
    value: KeywordCascadeValue;
    onChange: (value: Partial<KeywordCascadeValue>) => void;
    projectId: string;
}

interface KeywordItem {
    id: string;
    name: string;
    class_name: string;
    method_name: string;
}

interface InterfaceItem {
    id: string | number;
    name: string;
    folder_id?: string | number | null;
}

interface FolderItem {
    id: string | number;
    name: string;
}

export function KeywordCascade({ value, onChange, projectId }: KeywordCascadeProps) {
    const { keywordType, keywordName, resourceId } = value;

    // L2: fetch keywords by type
    const { data: keywordsData } = useQuery({
        queryKey: ['keywords', 'cascade', keywordType],
        queryFn: () => keywordsApi.list({ type: keywordType, is_enabled: true, size: 100 }),
        enabled: !!keywordType,
    });

    const keywords: KeywordItem[] = (keywordsData?.data?.data?.items ?? keywordsData?.data?.items ?? []) as KeywordItem[];

    const keywordOptions = keywords.map((kw) => ({
        value: kw.name,
        label: kw.name,
    }));

    // L3: fetch interfaces for the project — only when type=request AND name=HTTP请求
    const showInterfaceSelector = shouldShowInterfaceSelector(keywordType, keywordName);

    const { data: interfacesData } = useQuery({
        queryKey: ['interfaces', 'cascade', projectId],
        queryFn: () => interfacesApi.list({ project_id: projectId, size: 200 }),
        enabled: showInterfaceSelector && !!projectId,
    });

    const { data: foldersData } = useQuery({
        queryKey: ['interface-folders', 'cascade', projectId],
        queryFn: () => interfacesApi.listFolders({ project_id: projectId }),
        enabled: showInterfaceSelector && !!projectId,
    });

    const interfaces: InterfaceItem[] = (interfacesData?.data?.data?.items ?? interfacesData?.data?.items ?? interfacesData?.data?.data ?? interfacesData?.data ?? []) as InterfaceItem[];
    const folders: FolderItem[] = (foldersData?.data?.data?.items ?? foldersData?.data?.items ?? foldersData?.data?.data ?? foldersData?.data ?? []) as FolderItem[];

    const folderMap = new Map<string | number, string>();
    for (const f of folders) {
        folderMap.set(f.id, f.name);
    }

    const interfaceOptions = interfaces.map((iface) => {
        const folderName = iface.folder_id ? folderMap.get(iface.folder_id) : undefined;
        return {
            value: String(iface.id),
            label: folderName ? `${folderName}/${iface.name}` : iface.name,
        };
    });

    const handleTypeChange = (newType: unknown) => {
        onChange({
            keywordType: String(newType),
            keywordName: '',
            resourceId: undefined,
        });
    };

    const handleNameChange = (newName: unknown) => {
        onChange({
            keywordName: String(newName),
            resourceId: undefined,
        });
    };

    const handleResourceChange = (newResourceId: unknown) => {
        onChange({ resourceId: String(newResourceId) });
    };

    return (
        <div className="flex flex-col gap-2">
            {/* L1: Keyword type */}
            <CustomSelect
                value={keywordType}
                onChange={handleTypeChange}
                options={KEYWORD_TYPES}
                placeholder="选择关键字类型"
                size="sm"
            />

            {/* L2: Keyword name */}
            {keywordType && (
                <CustomSelect
                    value={keywordName}
                    onChange={handleNameChange}
                    options={keywordOptions}
                    placeholder="选择关键字"
                    size="sm"
                />
            )}

            {/* L3: Interface selector (request + HTTP请求 only) */}
            {showInterfaceSelector && (
                <CustomSelect
                    value={resourceId ?? ''}
                    onChange={handleResourceChange}
                    options={interfaceOptions}
                    placeholder="选择接口 (可选)"
                    size="sm"
                />
            )}
        </div>
    );
}
