// tests/auto/e2e/fixtures/test-state.ts
import * as fs from 'fs';
import * as path from 'path';

export interface TestState {
  runId: string;
  projectId: string;
  environmentId: string;
  interfaceId: string;
  scenarioId: string;
  planId: string;
  reportId: string;
}

const STATE_DIR = path.resolve(__dirname, '../../../../.test-state');

function getStateFilePath(runId: string): string {
  return path.join(STATE_DIR, `test-state-${runId}.json`);
}

export function initTestState(runId: string): TestState {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  const state: TestState = {
    runId,
    projectId: '',
    environmentId: '',
    interfaceId: '',
    scenarioId: '',
    planId: '',
    reportId: '',
  };

  fs.writeFileSync(getStateFilePath(runId), JSON.stringify(state, null, 2));
  return state;
}

export function getTestState(runId: string): TestState {
  const filePath = getStateFilePath(runId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test state not found for runId: ${runId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function updateTestState(runId: string, updates: Partial<TestState>): TestState {
  const state = getTestState(runId);
  const newState = { ...state, ...updates };
  fs.writeFileSync(getStateFilePath(runId), JSON.stringify(newState, null, 2));
  return newState;
}

export function generateRunId(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
}

export function generateTestName(baseName: string, runId: string): string {
  return `E2E_${runId}_${baseName}`;
}
