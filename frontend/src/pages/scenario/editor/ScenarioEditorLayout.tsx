import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useScenarioEditor } from './ScenarioEditorContext';
import { NodeSidebar } from './components/NodeSidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { FlowToolbar } from './components/FlowToolbar';
import { ApiNode } from './components/nodes/ApiNode';
import { ConditionNode } from './components/nodes/ConditionNode';
import { WaitNode } from './components/nodes/WaitNode';

const nodeTypes = {
    api: ApiNode,
    condition: ConditionNode,
    wait: WaitNode,
};

export default function ScenarioEditor() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNode,
        setNodes
    } = useScenarioEditor();

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
                    type: type as any,
                    executionStatus: 'idle'
                },
            };

            setNodes((nds) => nds.concat(newNode as any));
        },
        [setNodes]
    );

    const onNodeClick = (_: React.MouseEvent, node: any) => {
        setSelectedNode(node);
    };

    const onPaneClick = () => {
        setSelectedNode(null);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-950">
            {/* 组件库 */}
            <div className="w-64 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl">
                <NodeSidebar />
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
