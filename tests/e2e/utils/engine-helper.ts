// tests/e2e/utils/engine-helper.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface EngineResult {
  execution_id: string;
  scenario_id: string;
  scenario_name: string;
  project_id: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  start_time: string;
  end_time: string;
  duration: number;
  summary: {
    total_steps: number;
    passed_steps: number;
    failed_steps: number;
    total_assertions: number;
    passed_assertions: number;
    failed_assertions: number;
    pass_rate: number;
  };
  steps: any[];
  error: { code: string; message: string } | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class EngineHelper {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'e2e-engine-test');
  }

  executeEngine(yamlPath: string): EngineResult {
    try {
      const output = execSync(
        `sisyphus --case ${yamlPath} -O json`,
        { encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      return JSON.parse(output) as EngineResult;
    } catch (error: any) {
      // If command fails, try to parse stderr for JSON output
      const stderr = error.stderr || '';
      const stdout = error.stdout || '';
      try {
        return JSON.parse(stdout || stderr) as EngineResult;
      } catch {
        return {
          execution_id: '',
          scenario_id: '',
          scenario_name: '',
          project_id: '',
          status: 'error',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration: 0,
          summary: { total_steps: 0, passed_steps: 0, failed_steps: 0, total_assertions: 0, passed_assertions: 0, failed_assertions: 0, pass_rate: 0 },
          steps: [],
          error: { code: 'ENGINE_EXECUTION_ERROR', message: error.message }
        };
      }
    }
  }

  validateJsonResult(result: EngineResult): ValidationResult {
    const errors: string[] = [];

    const requiredFields = [
      'execution_id', 'scenario_id', 'scenario_name', 'project_id',
      'status', 'start_time', 'end_time', 'duration', 'summary', 'steps', 'error'
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (result.summary) {
      const summaryFields = ['total_steps', 'passed_steps', 'failed_steps', 'total_assertions', 'pass_rate'];
      for (const field of summaryFields) {
        if (!(field in result.summary)) {
          errors.push(`Missing summary field: ${field}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
}
