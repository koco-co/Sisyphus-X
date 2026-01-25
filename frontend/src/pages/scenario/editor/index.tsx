import React from 'react';
import { ScenarioEditorProvider } from './ScenarioEditorContext';
import ScenarioEditorLayout from './ScenarioEditorLayout';

export default function ScenarioEditorPage() {
    return (
        <ScenarioEditorProvider>
            <ScenarioEditorLayout />
        </ScenarioEditorProvider>
    );
}
