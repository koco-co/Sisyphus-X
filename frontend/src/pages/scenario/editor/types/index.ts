import type { Node, Edge } from 'reactflow';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';

export interface NodeData {
    label: string;
    type: 'api' | 'condition' | 'sql' | 'wait' | 'loop' | 'script';
    resourceId?: string; // 关联的接口 ID 或关键字 ID
    description?: string;
    config?: {
        url?: string;
        method?: string;
        loops?: number;
        retry?: number;
        wait_time?: number;
        condition?: string;
        sql?: string;
        datasource?: string;
        keyword_name?: string;
    };
    extract?: Record<string, string>;
    validate?: any[];
    executionStatus?: ExecutionStatus;
    executionLog?: string;
}

export type ScenarioNode = Node<NodeData>;
export type ScenarioEdge = Edge;

export interface ScenarioGraph {
    nodes: ScenarioNode[];
    edges: ScenarioEdge[];
}

export interface Dataset {
    id: number;
    name: string;
    csv_data?: string;
    created_at?: string;
    updated_at?: string;
}
