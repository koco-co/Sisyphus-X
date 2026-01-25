import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
    Connection,
    OnNodesChange,
    OnEdgesChange,
} from 'reactflow';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import type { ScenarioNode, ScenarioEdge } from './types/index';

interface ScenarioEditorContextType {
    nodes: ScenarioNode[];
    edges: ScenarioEdge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (params: Connection) => void;
    setNodes: React.Dispatch<React.SetStateAction<ScenarioNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<ScenarioEdge[]>>;
    selectedNode: ScenarioNode | null;
    setSelectedNode: (node: ScenarioNode | null) => void;
}

const ScenarioEditorContext = createContext<ScenarioEditorContextType | null>(null);

export const ScenarioEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [nodes, setNodes] = useState<ScenarioNode[]>([]);
    const [edges, setEdges] = useState<ScenarioEdge[]>([]);
    const [selectedNode, setSelectedNode] = useState<ScenarioNode | null>(null);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as ScenarioNode[]),
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds) as ScenarioEdge[]),
        []
    );

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    return (
        <ScenarioEditorContext.Provider value={{
            nodes,
            edges,
            onNodesChange,
            onEdgesChange,
            onConnect,
            setNodes,
            setEdges,
            selectedNode,
            setSelectedNode
        }}>
            {children}
        </ScenarioEditorContext.Provider>
    );
};

export const useScenarioEditor = () => {
    const context = useContext(ScenarioEditorContext);
    if (!context) {
        throw new Error('useScenarioEditor must be used within a ScenarioEditorProvider');
    }
    return context;
};
