import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useScenarioEditor } from './ScenarioEditorContext';
import { NodeSidebar } from './components/NodeSidebar';
import { DatasetSidebar } from './components/DatasetSidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { FlowToolbar } from './components/FlowToolbar';
import { ApiNode } from './components/nodes/ApiNode';
import { ConditionNode } from './components/nodes/ConditionNode';
import { WaitNode } from './components/nodes/WaitNode';
import { SQLNode } from './components/nodes/SQLNode';
import { LoopNode } from './components/nodes/LoopNode';
import { ScriptNode } from './components/nodes/ScriptNode';
import { Workflow, Database } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { scenariosApi } from '@/api/client';
import { stepsToFlowNodes } from './utils/stepsToFlow';

const nodeTypes = {
    api: ApiNode,
    condition: ConditionNode,
    wait: WaitNode,
    sql: SQLNode,
    loop: LoopNode,
    script: ScriptNode,
};

type SidebarMode = 'nodes' | 'datasets';

export default function ScenarioEditor() {
    const { id } = useParams();
    const scenarioId = parseInt(id || '0');
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('nodes');
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNode,
        setNodes,
        setEdges
    } = useScenarioEditor();

    // 加载已有场景的步骤并还原为 Flow
    useEffect(() => {
        if (!id || id === 'new') return;
        const load = async () => {
            try {
                const res = await scenariosApi.get(id);
                const scenario = res?.data?.data ?? res?.data;
                const steps = (scenario?.steps ?? []) as Array<{ id: string; scenario_id?: string; description?: string; keyword_type: string; keyword_name: string; parameters?: Record<string, unknown>; sort_order: number }>;
                if (steps.length > 0) {
                    const { nodes: loadedNodes, edges: loadedEdges } = stepsToFlowNodes(steps);
                    setNodes(loadedNodes);
                    setEdges(loadedEdges);
                }
            } catch {
                // 忽略加载失败，保持空画布
            }
        };
        load();
    }, [id, setNodes, setEdges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = { x: event.clientX - 300, y: event.clientY - 100 };
            const newNode = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: {
                    label: `${type.toUpperCase()} Node`,
                    type: type as unknown,
                    executionStatus: 'idle'
                },
            };

            setNodes((nds) => nds.concat(newNode as unknown));
        },
        [setNodes]
    );

    const onNodeClick = (_: React.MouseEvent, node: unknown) => {
        setSelectedNode(node);
    };

    const onPaneClick = () => {
        setSelectedNode(null);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-950">
            {/* 左侧边栏 */}
            <div className="w-64 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col">
                {/* 切换按钮 */}
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setSidebarMode('nodes')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                            sidebarMode === 'nodes'
                                ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-500'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                        data-testid="sidebar-tab-nodes"
                    >
                        <Workflow className="w-4 h-4" />
                        节点
                    </button>
                    <button
                        onClick={() => setSidebarMode('datasets')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                            sidebarMode === 'datasets'
                                ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-500'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                        data-testid="sidebar-tab-datasets"
                    >
                        <Database className="w-4 h-4" />
                        数据集
                    </button>
                </div>

                {/* 侧边栏内容 */}
                <div className="flex-1 overflow-hidden">
                    {sidebarMode === 'nodes' ? (
                        <NodeSidebar />
                    ) : (
                        <DatasetSidebar
                            scenarioId={scenarioId}
                            onDatasetSelect={(dataset) => {
                                // Handle dataset selection if needed
                                console.log('Selected dataset:', dataset);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* 画布区域 */}
            <div className="flex-1 relative">
                <FlowToolbar />
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#22d3ee', strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: '#22d3ee',
                        },
                    }}
                    fitView
                    className="bg-slate-950"
                >
                    <Background color="#334155" gap={20} />
                    <Controls className="bg-slate-800 border-white/10 !fill-white" />
                    <MiniMap
                        className="bg-slate-900 border-white/10"
                        maskColor="rgba(0,0,0,0.5)"
                        nodeColor="#334155"
                    />
                </ReactFlow>
            </div>

            {/* 配置面板 */}
            <ConfigPanel />
        </div>
    );
}
