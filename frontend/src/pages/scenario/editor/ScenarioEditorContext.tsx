import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ScenarioStep, ScenarioData } from './types/index';

interface ScenarioEditorState {
    steps: ScenarioStep[];
    selectedStepIndex: number | null;
    scenarioId: string | null;
    scenarioData: ScenarioData;
    environmentId: string | null;
    datasetId: string | null;
}

interface ScenarioEditorActions {
    addStep: (step: Omit<ScenarioStep, 'sortOrder'>) => void;
    updateStep: (index: number, updates: Partial<ScenarioStep>) => void;
    removeStep: (index: number) => void;
    reorderSteps: (fromIndex: number, toIndex: number) => void;
    setSelectedStepIndex: (index: number | null) => void;
    setSteps: (steps: ScenarioStep[]) => void;
    setScenarioId: (id: string | null) => void;
    setScenarioData: (data: Partial<ScenarioData>) => void;
    setEnvironmentId: (id: string | null) => void;
    setDatasetId: (id: string | null) => void;
}

type ScenarioEditorContextType = ScenarioEditorState & ScenarioEditorActions;

const defaultScenarioData: ScenarioData = {
    name: '',
    description: '',
    projectId: '',
    priority: 'P2',
    tags: [],
    variables: {},
    preSql: '',
    postSql: '',
};

const ScenarioEditorContext = createContext<ScenarioEditorContextType | null>(null);

export const ScenarioEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [steps, setSteps] = useState<ScenarioStep[]>([]);
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
    const [scenarioId, setScenarioId] = useState<string | null>(null);
    const [scenarioData, setScenarioDataState] = useState<ScenarioData>(defaultScenarioData);
    const [environmentId, setEnvironmentId] = useState<string | null>(null);
    const [datasetId, setDatasetId] = useState<string | null>(null);

    const addStep = useCallback((step: Omit<ScenarioStep, 'sortOrder'>) => {
        setSteps((prev) => [
            ...prev,
            { ...step, sortOrder: prev.length },
        ]);
    }, []);

    const updateStep = useCallback((index: number, updates: Partial<ScenarioStep>) => {
        setSteps((prev) =>
            prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
        );
    }, []);

    const removeStep = useCallback((index: number) => {
        setSteps((prev) =>
            prev
                .filter((_, i) => i !== index)
                .map((s, i) => ({ ...s, sortOrder: i }))
        );
        setSelectedStepIndex((prev) => {
            if (prev === null) return null;
            if (prev === index) return null;
            if (prev > index) return prev - 1;
            return prev;
        });
    }, []);

    const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
        setSteps((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next.map((s, i) => ({ ...s, sortOrder: i }));
        });
    }, []);

    const setScenarioData = useCallback((data: Partial<ScenarioData>) => {
        setScenarioDataState((prev) => ({ ...prev, ...data }));
    }, []);

    return (
        <ScenarioEditorContext.Provider value={{
            steps,
            selectedStepIndex,
            scenarioId,
            scenarioData,
            environmentId,
            datasetId,
            addStep,
            updateStep,
            removeStep,
            reorderSteps,
            setSelectedStepIndex,
            setSteps,
            setScenarioId,
            setScenarioData,
            setEnvironmentId,
            setDatasetId,
        }}>
            {children}
        </ScenarioEditorContext.Provider>
    );
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const useScenarioEditor = () => {
    const context = useContext(ScenarioEditorContext);
    if (!context) {
        throw new Error('useScenarioEditor must be used within a ScenarioEditorProvider');
    }
    return context;
};
