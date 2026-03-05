export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';

export interface StepAssertion {
    type: string;
    expression: string;
    expected?: string;
    message?: string;
}

export interface StepExtraction {
    name: string;
    source: string;
    expression: string;
}

export interface ScenarioStep {
    id: string;
    description: string;
    keywordType: string;
    keywordName: string;
    resourceId?: string;
    config: Record<string, unknown>;
    assertions: StepAssertion[];
    extractions: StepExtraction[];
    sortOrder: number;
    executionStatus?: ExecutionStatus;
}

export interface ScenarioData {
    name: string;
    description: string;
    projectId: string;
    priority: string;
    tags: string[];
    variables: Record<string, string>;
    preSql: string;
    postSql: string;
}

export interface Dataset {
    id: number;
    name: string;
    csv_data?: string;
    created_at?: string;
    updated_at?: string;
}
