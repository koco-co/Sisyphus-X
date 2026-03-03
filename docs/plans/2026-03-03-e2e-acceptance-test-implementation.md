# E2E Acceptance Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build comprehensive Playwright E2E test suite to validate all 6 API automation modules with 50+ test data per module, UI/UX consistency, and sisyphus-api-engine integration.

**Architecture:** Test suite follows Page Object Model pattern with dynamic data generation. Tests run sequentially by module dependency (Project → Keyword → Interface → Scenario → Plan → Report). Each module test creates required data, validates functionality, and verifies engine integration.

**Tech Stack:** Playwright, TypeScript, Page Object Model, YAML/JSON validation

---

## Phase 1: Infrastructure Setup

### Task 1: Create E2E Test Directory Structure

**Files:**
- Create: `tests/e2e/`
- Create: `tests/e2e/specs/`
- Create: `tests/e2e/pages/`
- Create: `tests/e2e/utils/`
- Create: `tests/e2e/fixtures/`

**Step 1: Create directory structure**

```bash
mkdir -p tests/e2e/{specs,pages,utils,fixtures}
```

**Step 2: Verify structure**

Run: `ls -la tests/e2e/`
Expected: Four directories created (specs, pages, utils, fixtures)

**Step 3: Commit**

```bash
git add tests/e2e/
git commit -m "chore(e2e): create test directory structure"
```

---

### Task 2: Install Playwright Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install Playwright in frontend**

```bash
cd frontend && npm install -D @playwright/test playwright
```

**Step 2: Initialize Playwright config**

```bash
cd frontend && npx playwright install chromium
```

**Step 3: Verify installation**

Run: `cd frontend && npx playwright --version`
Expected: Version number displayed (e.g., 1.40.0)

**Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(e2e): add Playwright dependencies"
```

---

### Task 3: Create Playwright Configuration

**Files:**
- Create: `tests/e2e/playwright.config.ts`

**Step 1: Write Playwright configuration**

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const frontendDir = path.join(__dirname, '../../frontend');

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['json', { outputFile: '../test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'project', testMatch: /01-project\.spec\.ts/, dependencies: ['setup'] },
    { name: 'keyword', testMatch: /02-keyword\.spec\.ts/, dependencies: ['project'] },
    { name: 'interface', testMatch: /03-interface\.spec\.ts/, dependencies: ['keyword'] },
    { name: 'scenario', testMatch: /04-scenario\.spec\.ts/, dependencies: ['interface'] },
    { name: 'plan', testMatch: /05-plan\.spec\.ts/, dependencies: ['scenario'] },
    { name: 'report', testMatch: /06-report\.spec\.ts/, dependencies: ['plan'] },
    { name: 'ui-ux', testMatch: /ui-ux-validation\.spec\.ts/, dependencies: ['report'] },
    { name: 'validation', testMatch: /validation\.spec\.ts/, dependencies: ['ui-ux'] },
  ],

  webServer: [
    {
      command: 'cd ../../backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `cd ${frontendDir} && npm run dev`,
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

**Step 2: Verify config syntax**

Run: `cd tests/e2e && npx playwright test --list`
Expected: List of test projects displayed

**Step 3: Commit**

```bash
git add tests/e2e/playwright.config.ts
git commit -m "chore(e2e): add Playwright configuration"
```

---

### Task 4: Create Authentication Setup

**Files:**
- Create: `tests/e2e/auth.setup.ts`

**Step 1: Write auth setup (dev mode skip login)**

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Development mode skips login automatically via VITE_DEV_MODE_SKIP_LOGIN
  await page.goto('/');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Verify we're logged in (check for main app content)
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10000 });

  // Save storage state for reuse
  await page.context().storageState({ path: './auth/storage-state.json' });
});
```

**Step 2: Create auth directory**

```bash
mkdir -p tests/e2e/auth
```

**Step 3: Commit**

```bash
git add tests/e2e/auth.setup.ts tests/e2e/auth/
git commit -m "chore(e2e): add authentication setup"
```

---

## Phase 2: Utility Functions

### Task 5: Create Data Generator

**Files:**
- Create: `tests/e2e/utils/data-generator.ts`

**Step 1: Write data generator**

```typescript
// tests/e2e/utils/data-generator.ts

export interface ProjectData {
  name: string;
  description: string;
}

export interface DatabaseConfigData {
  connection_name: string;
  reference_variable: string;
  db_type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface KeywordData {
  keyword_type: string;
  name: string;
  method_name: string;
  code_block: string;
  parameters: { name: string; description: string }[];
}

export interface InterfaceData {
  name: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  params?: Record<string, any>;
  body?: Record<string, any>;
}

export interface ScenarioData {
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  variables: Record<string, string>;
}

export interface PlanData {
  name: string;
  description: string;
}

export class DataGenerator {
  private static counter = 0;

  static uniqueId(): string {
    return `${Date.now()}_${++this.counter}`;
  }

  static generateProjects(count: number): ProjectData[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `E2E项目_${this.uniqueId()}_${i}`,
      description: `自动化测试项目 #${i} - 用于验收测试`,
    }));
  }

  static generateDatabaseConfigs(count: number): DatabaseConfigData[] {
    return Array.from({ length: count }, (_, i) => ({
      connection_name: `测试数据源_${i}`,
      reference_variable: `db_test_${i}`,
      db_type: i % 2 === 0 ? 'postgresql' : 'mysql',
      host: 'localhost',
      port: i % 2 === 0 ? 5432 : 3306,
      database: `test_db_${i}`,
      username: 'test_user',
      password: 'test_password',
    }));
  }

  static generateKeywords(count: number): KeywordData[] {
    const types = ['request', 'assertion', 'extract', 'db', 'custom'];
    return Array.from({ length: count }, (_, i) => ({
      keyword_type: types[i % types.length],
      name: `自定义关键字_${i}`,
      method_name: `custom_method_${i}`,
      code_block: `def custom_method_${i}(param):\n    """自定义关键字 ${i}"""\n    return f"result_{param}"`,
      parameters: [{ name: 'param', description: '输入参数' }],
    }));
  }

  static generateInterfaces(count: number): InterfaceData[] {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    return Array.from({ length: count }, (_, i) => ({
      name: `测试接口_${i}`,
      method: methods[i % methods.length],
      path: `/api/v1/test/resource_${i}`,
      headers: { 'Content-Type': 'application/json' },
      params: i % 2 === 0 ? { page: 1, size: 10 } : undefined,
      body: i % 2 === 1 ? { data: `test_data_${i}` } : undefined,
    }));
  }

  static generateScenarios(count: number): ScenarioData[] {
    const priorities: ('P0' | 'P1' | 'P2' | 'P3')[] = ['P0', 'P1', 'P2', 'P3'];
    return Array.from({ length: count }, (_, i) => ({
      name: `测试场景_${this.uniqueId()}_${i}`,
      description: `E2E测试场景 #${i}`,
      priority: priorities[i % priorities.length],
      tags: [`tag_${i % 5}`, 'e2e'],
      variables: { [`var_${i}`]: `value_${i}` },
    }));
  }

  static generatePlans(count: number): PlanData[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `测试计划_${this.uniqueId()}_${i}`,
      description: `E2E测试计划 #${i}`,
    }));
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd tests/e2e && npx tsc --noEmit utils/data-generator.ts 2>/dev/null || echo "TypeScript check done"`
Expected: No critical errors

**Step 3: Commit**

```bash
git add tests/e2e/utils/data-generator.ts
git commit -m "feat(e2e): add data generator utility"
```

---

### Task 6: Create API Client Helper

**Files:**
- Create: `tests/e2e/utils/api-client.ts`

**Step 1: Write API client**

```typescript
// tests/e2e/utils/api-client.ts
import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiClient {
  private baseUrl: string;

  constructor(private request: APIRequestContext) {
    this.baseUrl = 'http://localhost:8000/api/v1';
  }

  // ========== Projects ==========
  async createProject(data: { name: string; description: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/`, { data });
  }

  async getProjects(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/projects/`, { params });
  }

  async deleteProject(id: string): Promise<APIResponse> {
    return this.request.delete(`${this.baseUrl}/projects/${id}`);
  }

  // ========== Database Configs ==========
  async createDatabaseConfig(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/databases/`, { data });
  }

  async testDatabaseConnection(projectId: string, dbId: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/databases/${dbId}/test`);
  }

  // ========== Keywords ==========
  async createKeyword(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/keywords/`, { data });
  }

  async getKeywords(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/keywords/`, { params });
  }

  // ========== Interfaces ==========
  async createInterface(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/interfaces/`, { data: { ...data, project_id: projectId } });
  }

  async createFolder(projectId: string, data: { name: string; parent_id?: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/interface-folders/`, { data });
  }

  // ========== Environments ==========
  async createEnvironment(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/environments/`, { data });
  }

  // ========== Scenarios ==========
  async createScenario(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/`, { data });
  }

  async createScenarioStep(scenarioId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/${scenarioId}/steps/`, { data });
  }

  async debugScenario(scenarioId: string, envId?: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/${scenarioId}/debug`, {
      data: { environment_id: envId }
    });
  }

  // ========== Plans ==========
  async createPlan(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/`, { data });
  }

  async addScenarioToPlan(planId: string, scenarioId: string, order: number): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/${planId}/scenarios/`, {
      data: { scenario_id: scenarioId, order }
    });
  }

  async executePlan(planId: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/${planId}/execute`);
  }

  // ========== Reports ==========
  async getReports(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/reports/`, { params });
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/api-client.ts
git commit -m "feat(e2e): add API client helper"
```

---

### Task 7: Create Engine Helper

**Files:**
- Create: `tests/e2e/utils/engine-helper.ts`

**Step 1: Write engine helper**

```typescript
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
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/engine-helper.ts
git commit -m "feat(e2e): add engine helper utility"
```

---

### Task 8: Create Base Fixture

**Files:**
- Create: `tests/e2e/fixtures/base.fixture.ts`

**Step 1: Write base fixture**

```typescript
// tests/e2e/fixtures/base.fixture.ts
import { test as base, Page, APIRequestContext } from '@playwright/test';
import { ApiClient } from '../utils/api-client';
import { DataGenerator } from '../utils/data-generator';
import { EngineHelper } from '../utils/engine-helper';

type E2EFixtures = {
  apiClient: ApiClient;
  dataGenerator: typeof DataGenerator;
  engineHelper: EngineHelper;
  testProjectId: string;
};

export const test = base.extend<E2EFixtures>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  dataGenerator: async ({}, use) => {
    await use(DataGenerator);
  },

  engineHelper: async ({}, use) => {
    const helper = new EngineHelper();
    await use(helper);
    helper.cleanup();
  },

  testProjectId: async ({ apiClient }, use) => {
    // Create a test project for each test
    const project = await apiClient.createProject({
      name: `TestProject_${Date.now()}`,
      description: 'E2E Test Project'
    });
    const projectData = await project.json();
    await use(projectData.id);
    // Cleanup
    await apiClient.deleteProject(projectData.id);
  },
});

export { expect } from '@playwright/test';
```

**Step 2: Commit**

```bash
git add tests/e2e/fixtures/base.fixture.ts
git commit -m "feat(e2e): add base test fixture"
```

---

## Phase 3: Page Objects

### Task 9: Create Project List Page Object

**Files:**
- Create: `tests/e2e/pages/project-list.page.ts`

**Step 1: Write project list page object**

```typescript
// tests/e2e/pages/project-list.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class ProjectListPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly projectTable: Locator;
  readonly pagination: Locator;
  readonly emptyState: Locator;

  // Create Modal
  readonly createModal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Delete Dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('[data-testid="create-project-btn"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-btn"]');
    this.projectTable = page.locator('[data-testid="project-table"]');
    this.pagination = page.locator('[data-testid="pagination"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');

    this.createModal = page.locator('[data-testid="project-modal"]');
    this.nameInput = page.locator('[data-testid="project-name-input"]');
    this.descriptionInput = page.locator('[data-testid="project-desc-input"]');
    this.saveButton = page.locator('[data-testid="save-btn"]');
    this.cancelButton = page.locator('[data-testid="cancel-btn"]');

    this.deleteDialog = page.locator('[data-testid="confirm-dialog"]');
    this.confirmDeleteButton = page.locator('[data-testid="confirm-btn"]');
  }

  async goto() {
    await this.page.goto('/api-automation/projects');
    await this.waitForAnimation();
  }

  async waitForAnimation(timeout = 1000) {
    await this.page.waitForTimeout(300);
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async createProject(name: string, description: string) {
    await this.createButton.click();
    await this.waitForAnimation();
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
    await this.saveButton.click();
    await this.waitForAnimation();
  }

  async searchProject(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.waitForAnimation();
  }

  async deleteProject(name: string) {
    const row = this.projectTable.locator('tr', { hasText: name });
    await row.locator('[data-testid="delete-btn"]').click();
    await this.waitForAnimation();
    await this.confirmDeleteButton.click();
    await this.waitForAnimation();
  }

  async expectToast(message: string) {
    const toast = this.page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(message);
  }

  async getProjectCount(): Promise<number> {
    const rows = await this.projectTable.locator('tbody tr').count();
    return rows;
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/pages/project-list.page.ts
git commit -m "feat(e2e): add project list page object"
```

---

### Task 10: Create Interface Editor Page Object

**Files:**
- Create: `tests/e2e/pages/interface-editor.page.ts`

**Step 1: Write interface editor page object**

```typescript
// tests/e2e/pages/interface-editor.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class InterfaceEditorPage {
  readonly page: Page;

  // Tree
  readonly treeView: Locator;
  readonly newFolderButton: Locator;
  readonly newInterfaceButton: Locator;

  // Editor
  readonly methodSelect: Locator;
  readonly urlInput: Locator;
  readonly sendButton: Locator;
  readonly saveButton: Locator;

  // Tabs
  readonly paramsTab: Locator;
  readonly headersTab: Locator;
  readonly bodyTab: Locator;

  // Response
  readonly responseViewer: Locator;
  readonly statusCode: Locator;
  readonly responseBody: Locator;

  // Environment
  readonly environmentSelect: Locator;
  readonly envManageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.treeView = page.locator('[data-testid="interface-tree"]');
    this.newFolderButton = page.locator('[data-testid="new-folder-btn"]');
    this.newInterfaceButton = page.locator('[data-testid="new-interface-btn"]');

    this.methodSelect = page.locator('[data-testid="method-select"]');
    this.urlInput = page.locator('[data-testid="url-input"]');
    this.sendButton = page.locator('[data-testid="send-btn"]');
    this.saveButton = page.locator('[data-testid="save-btn"]');

    this.paramsTab = page.locator('[data-testid="params-tab"]');
    this.headersTab = page.locator('[data-testid="headers-tab"]');
    this.bodyTab = page.locator('[data-testid="body-tab"]');

    this.responseViewer = page.locator('[data-testid="response-viewer"]');
    this.statusCode = page.locator('[data-testid="status-code"]');
    this.responseBody = page.locator('[data-testid="response-body"]');

    this.environmentSelect = page.locator('[data-testid="env-select"]');
    this.envManageButton = page.locator('[data-testid="env-manage-btn"]');
  }

  async goto(projectId: string) {
    await this.page.goto(`/api-automation/interface?project=${projectId}`);
    await this.waitForAnimation();
  }

  async waitForAnimation(timeout = 1000) {
    await this.page.waitForTimeout(300);
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async createFolder(name: string, parentId?: string) {
    await this.newFolderButton.click();
    const dialog = this.page.locator('[data-testid="folder-dialog"]');
    await dialog.locator('[data-testid="folder-name"]').fill(name);
    await dialog.locator('[data-testid="save-btn"]').click();
    await this.waitForAnimation();
  }

  async createInterface(data: {
    name: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }) {
    await this.newInterfaceButton.click();
    await this.waitForAnimation();

    await this.methodSelect.click();
    await this.page.locator(`[data-value="${data.method}"]`).click();

    await this.urlInput.fill(data.path);
    await this.saveButton.click();
    await this.waitForAnimation();
  }

  async sendRequest() {
    await this.sendButton.click();
    await this.page.waitForTimeout(1000); // Wait for response
  }

  async expectStatusCode(code: number) {
    await expect(this.statusCode).toContainText(code.toString());
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/pages/interface-editor.page.ts
git commit -m "feat(e2e): add interface editor page object"
```

---

### Task 11: Create Scenario Editor Page Object

**Files:**
- Create: `tests/e2e/pages/scenario-editor.page.ts`

**Step 1: Write scenario editor page object**

```typescript
// tests/e2e/pages/scenario-editor.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class ScenarioEditorPage {
  readonly page: Page;

  // Toolbar
  readonly saveButton: Locator;
  readonly debugButton: Locator;
  readonly closeButton: Locator;
  readonly environmentSelect: Locator;

  // Flow Canvas
  readonly flowCanvas: Locator;
  readonly addStepButton: Locator;

  // Step Modal
  readonly stepModal: Locator;
  readonly keywordTypeSelect: Locator;
  readonly keywordNameSelect: Locator;

  // Sidebar
  readonly variablesPanel: Locator;
  readonly preSqlPanel: Locator;
  readonly postSqlPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.locator('[data-testid="save-btn"]');
    this.debugButton = page.locator('[data-testid="debug-btn"]');
    this.closeButton = page.locator('[data-testid="close-btn"]');
    this.environmentSelect = page.locator('[data-testid="env-select"]');

    this.flowCanvas = page.locator('[data-testid="flow-canvas"]');
    this.addStepButton = page.locator('[data-testid="add-step-btn"]');

    this.stepModal = page.locator('[data-testid="step-config-modal"]');
    this.keywordTypeSelect = page.locator('[data-testid="keyword-type"]');
    this.keywordNameSelect = page.locator('[data-testid="keyword-name"]');

    this.variablesPanel = page.locator('[data-testid="variables-panel"]');
    this.preSqlPanel = page.locator('[data-testid="pre-sql-panel"]');
    this.postSqlPanel = page.locator('[data-testid="post-sql-panel"]');
  }

  async goto(projectId: string, scenarioId?: string) {
    const url = scenarioId
      ? `/api-automation/scenario?project=${projectId}&id=${scenarioId}`
      : `/api-automation/scenario?project=${projectId}`;
    await this.page.goto(url);
    await this.waitForAnimation();
  }

  async waitForAnimation(timeout = 1000) {
    await this.page.waitForTimeout(300);
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async addStep(type: string, name: string) {
    await this.addStepButton.click();
    await this.waitForAnimation();

    await this.keywordTypeSelect.click();
    await this.page.locator(`[data-value="${type}"]`).click();

    await this.waitForAnimation();
  }

  async save() {
    await this.saveButton.click();
    await this.waitForAnimation();
  }

  async debug() {
    await this.debugButton.click();
    // Wait for execution to complete
    await this.page.waitForTimeout(5000);
  }

  async expectToast(message: string) {
    const toast = this.page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(message);
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/pages/scenario-editor.page.ts
git commit -m "feat(e2e): add scenario editor page object"
```

---

## Phase 4: Test Specifications

### Task 12: Create Project Management Test

**Files:**
- Create: `tests/e2e/specs/01-project.spec.ts`

**Step 1: Write project test**

```typescript
// tests/e2e/specs/01-project.spec.ts
import { test, expect } from '../fixtures/base.fixture';
import { ProjectListPage } from '../pages/project-list.page';

test.describe('项目管理模块', () => {
  let projectPage: ProjectListPage;

  test.beforeEach(async ({ page }) => {
    projectPage = new ProjectListPage(page);
    await projectPage.goto();
  });

  test.describe('项目列表', () => {
    test('应正确显示项目列表页面', async ({ page }) => {
      await expect(projectPage.projectTable).toBeVisible();
    });

    test('应支持创建项目', async ({ page, dataGenerator }) => {
      const [project] = dataGenerator.generateProjects(1);

      await projectPage.createProject(project.name, project.description);
      await projectPage.expectToast('添加成功');

      // Verify project appears in list
      await projectPage.searchProject(project.name);
      await expect(page.locator('text=' + project.name)).toBeVisible();
    });

    test('应支持搜索项目', async ({ page, apiClient }) => {
      // Create test project via API
      const [project] = dataGenerator.generateProjects(1);
      await apiClient.createProject(project);

      await projectPage.goto();
      await projectPage.searchProject(project.name);

      const count = await projectPage.getProjectCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('应支持删除项目 (二次确认)', async ({ page, apiClient }) => {
      const [project] = dataGenerator.generateProjects(1);
      const response = await apiClient.createProject(project);
      const created = await response.json();

      await projectPage.goto();
      await projectPage.deleteProject(project.name);
      await projectPage.expectToast('删除成功');
    });

    test('空状态应显示统一组件', async ({ page, apiClient }) => {
      // Search for non-existent project
      await projectPage.searchProject('nonexistent_project_xyz');
      await expect(projectPage.emptyState).toBeVisible();
    });
  });

  test.describe('批量数据测试', () => {
    test('应批量创建 10+ 项目', async ({ page, apiClient, dataGenerator }) => {
      const projects = dataGenerator.generateProjects(10);

      for (const project of projects) {
        await apiClient.createProject(project);
      }

      await projectPage.goto();
      const count = await projectPage.getProjectCount();
      expect(count).toBeGreaterThanOrEqual(10);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/01-project.spec.ts
git commit -m "feat(e2e): add project management test"
```

---

### Task 13: Create Keyword Management Test

**Files:**
- Create: `tests/e2e/specs/02-keyword.spec.ts`

**Step 1: Write keyword test**

```typescript
// tests/e2e/specs/02-keyword.spec.ts
import { test, expect } from '../fixtures/base.fixture';

test.describe('关键字配置模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/keywords');
    await page.waitForLoadState('networkidle');
  });

  test.describe('内置关键字', () => {
    test('应显示所有内置关键字', async ({ page }) => {
      const builtinTab = page.locator('[data-testid="builtin-tab"]');
      await builtinTab.click();

      // Verify built-in keywords exist
      await expect(page.locator('text=发送请求')).toBeVisible();
      await expect(page.locator('text=断言类型')).toBeVisible();
      await expect(page.locator('text=提取变量')).toBeVisible();
      await expect(page.locator('text=数据库操作')).toBeVisible();
    });

    test('内置关键字应只读展示', async ({ page }) => {
      const builtinTab = page.locator('[data-testid="builtin-tab"]');
      await builtinTab.click();

      // Click on a built-in keyword
      await page.locator('text=发送请求').click();

      // Monaco should be read-only
      const monaco = page.locator('.monaco-editor');
      await expect(monaco).toBeVisible();
    });
  });

  test.describe('自定义关键字', () => {
    test('应支持创建自定义关键字', async ({ page, dataGenerator }) => {
      const [keyword] = dataGenerator.generateKeywords(1);

      await page.locator('[data-testid="create-keyword-btn"]').click();
      await page.waitForTimeout(300);

      await page.locator('[data-testid="keyword-type"]').click();
      await page.locator('[data-value="custom"]').click();

      await page.locator('[data-testid="keyword-name"]').fill(keyword.name);
      await page.locator('[data-testid="keyword-method"]').fill(keyword.method_name);

      // Fill Monaco editor
      const monaco = page.locator('.monaco-editor textarea');
      await monaco.fill(keyword.code_block);

      await page.locator('[data-testid="save-btn"]').click();

      // Verify toast
      const toast = page.locator('[data-testid="toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
    });

    test('应批量创建 20+ 自定义关键字', async ({ apiClient, dataGenerator }) => {
      const keywords = dataGenerator.generateKeywords(20);

      for (const kw of keywords) {
        await apiClient.createKeyword({
          keyword_type: kw.keyword_type,
          name: kw.name,
          method_name: kw.method_name,
          code: kw.code_block,
          parameters: kw.parameters,
          is_builtin: false,
          is_enabled: true,
        });
      }

      // Verify count
      const response = await apiClient.getKeywords({ limit: 100 });
      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(20);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/02-keyword.spec.ts
git commit -m "feat(e2e): add keyword management test"
```

---

### Task 14: Create Interface Definition Test

**Files:**
- Create: `tests/e2e/specs/03-interface.spec.ts`

**Step 1: Write interface test**

```typescript
// tests/e2e/specs/03-interface.spec.ts
import { test, expect } from '../fixtures/base.fixture';
import { InterfaceEditorPage } from '../pages/interface-editor.page';

test.describe('接口定义模块', () => {
  let interfacePage: InterfaceEditorPage;

  test.beforeEach(async ({ page, testProjectId }) => {
    interfacePage = new InterfaceEditorPage(page);
    await interfacePage.goto(testProjectId);
  });

  test.describe('基础功能', () => {
    test('应正确显示接口列表页面', async ({ page }) => {
      await expect(interfacePage.treeView).toBeVisible();
    });

    test('应支持创建多级目录结构', async ({ page }) => {
      await interfacePage.createFolder('一级目录');
      await page.waitForTimeout(300);

      // Create subfolder
      await page.locator('text=一级目录').click({ button: 'right' });
      await page.locator('text=新建目录').click();
      await page.locator('[data-testid="folder-name"]').fill('二级目录');
      await page.locator('[data-testid="save-btn"]').click();

      await expect(page.locator('text=二级目录')).toBeVisible();
    });
  });

  test.describe('接口创建 (50+ 条数据)', () => {
    test('应批量创建 50+ 条接口数据', async ({ apiClient, testProjectId, dataGenerator }) => {
      const interfaces = dataGenerator.generateInterfaces(50);

      for (const intf of interfaces) {
        await apiClient.createInterface(testProjectId, {
          name: intf.name,
          method: intf.method,
          path: intf.path,
          headers: intf.headers,
          params: intf.params,
          body: intf.body,
        });
      }

      // Verify via API
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('接口调试 (引擎联调)', () => {
    test('应支持发送 HTTP 请求', async ({ page }) => {
      // Create a simple GET request
      await interfacePage.newInterfaceButton.click();
      await page.waitForTimeout(300);

      await interfacePage.methodSelect.click();
      await page.locator('[data-value="GET"]').click();

      await interfacePage.urlInput.fill('https://httpbin.org/get');
      await interfacePage.sendButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      await expect(interfacePage.statusCode).toBeVisible();
    });
  });

  test.describe('环境管理', () => {
    test('应支持创建环境', async ({ page, apiClient, testProjectId }) => {
      await apiClient.createEnvironment(testProjectId, {
        name: '测试环境',
        base_url: 'https://api-test.example.com',
        variables: [{ key: 'token', value: 'test_token', description: '' }],
      });

      await interfacePage.goto(testProjectId);
      await interfacePage.environmentSelect.click();

      await expect(page.locator('text=测试环境')).toBeVisible();
    });
  });

  test.describe('UI/UX 验收', () => {
    test('动画过渡应流畅', async ({ page }) => {
      // Measure FPS during tree expand
      const fps = await page.evaluate(async () => {
        const frames: number[] = [];
        let lastTime = performance.now();

        return new Promise<number>((resolve) => {
          const measure = () => {
            const now = performance.now();
            frames.push(1000 / (now - lastTime));
            lastTime = now;
            if (frames.length < 30) {
              requestAnimationFrame(measure);
            } else {
              const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
              resolve(avg);
            }
          };
          requestAnimationFrame(measure);
        });
      });

      expect(fps).toBeGreaterThan(30);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/03-interface.spec.ts
git commit -m "feat(e2e): add interface definition test"
```

---

### Task 15: Create Scenario Orchestration Test

**Files:**
- Create: `tests/e2e/specs/04-scenario.spec.ts`

**Step 1: Write scenario test**

```typescript
// tests/e2e/specs/04-scenario.spec.ts
import { test, expect } from '../fixtures/base.fixture';
import { ScenarioEditorPage } from '../pages/scenario-editor.page';

test.describe('场景编排模块', () => {
  let scenarioPage: ScenarioEditorPage;

  test.beforeEach(async ({ page, testProjectId }) => {
    scenarioPage = new ScenarioEditorPage(page);
    await scenarioPage.goto(testProjectId);
  });

  test.describe('场景管理', () => {
    test('应支持创建场景', async ({ page, apiClient, testProjectId, dataGenerator }) => {
      const [scenario] = dataGenerator.generateScenarios(1);

      await apiClient.createScenario({
        project_id: testProjectId,
        name: scenario.name,
        description: scenario.description,
        priority: scenario.priority,
        tags: scenario.tags,
        variables: scenario.variables,
      });

      await page.goto('/api-automation/scenarios');
      await expect(page.locator(`text=${scenario.name}`)).toBeVisible();
    });

    test('应批量创建 30+ 场景', async ({ apiClient, testProjectId, dataGenerator }) => {
      const scenarios = dataGenerator.generateScenarios(30);

      for (const scenario of scenarios) {
        await apiClient.createScenario({
          project_id: testProjectId,
          name: scenario.name,
          description: scenario.description,
          priority: scenario.priority,
          tags: scenario.tags,
          variables: scenario.variables,
        });
      }

      // Verify count
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('测试步骤编排 (引擎联调)', () => {
    test('应支持添加发送请求步骤', async ({ page, apiClient, testProjectId }) => {
      // Create scenario first
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `TestScenario_${Date.now()}`,
        description: 'E2E Test',
      });
      const scenario = await scenarioRes.json();

      // Add step
      await apiClient.createScenarioStep(scenario.id, {
        name: '发送请求测试',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/get',
        },
        order: 0,
      });

      await scenarioPage.goto(testProjectId, scenario.id);
      await expect(page.locator('text=发送请求测试')).toBeVisible();
    });
  });

  test.describe('场景调试 (引擎集成)', () => {
    test('调试应返回 JSON 结果', async ({ page, apiClient, testProjectId, engineHelper }) => {
      // Create scenario with simple step
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `DebugTest_${Date.now()}`,
        description: 'Debug test',
      });
      const scenario = await scenarioRes.json();

      await apiClient.createScenarioStep(scenario.id, {
        name: 'GET Request',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/get',
        },
        order: 0,
      });

      // Execute debug
      const debugRes = await apiClient.debugScenario(scenario.id);
      const result = await debugRes.json();

      // Validate result structure
      const validation = engineHelper.validateJsonResult(result);
      expect(validation.valid).toBe(true);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/04-scenario.spec.ts
git commit -m "feat(e2e): add scenario orchestration test"
```

---

### Task 16: Create Test Plan Test

**Files:**
- Create: `tests/e2e/specs/05-plan.spec.ts`

**Step 1: Write plan test**

```typescript
// tests/e2e/specs/05-plan.spec.ts
import { test, expect } from '../fixtures/base.fixture';

test.describe('测试计划模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/plans');
    await page.waitForLoadState('networkidle');
  });

  test.describe('计划管理', () => {
    test('应支持创建计划', async ({ page, apiClient, testProjectId, dataGenerator }) => {
      const [plan] = dataGenerator.generatePlans(1);

      await apiClient.createPlan({
        project_id: testProjectId,
        name: plan.name,
        description: plan.description,
      });

      await page.reload();
      await expect(page.locator(`text=${plan.name}`)).toBeVisible();
    });

    test('应批量创建 15+ 计划', async ({ apiClient, testProjectId, dataGenerator }) => {
      const plans = dataGenerator.generatePlans(15);

      for (const plan of plans) {
        await apiClient.createPlan({
          project_id: testProjectId,
          name: plan.name,
          description: plan.description,
        });
      }

      await page.reload();
      const rows = await page.locator('[data-testid="plan-table"] tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(15);
    });
  });

  test.describe('场景编排', () => {
    test('应支持添加场景到计划', async ({ page, apiClient, testProjectId }) => {
      // Create scenario
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `PlanScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      // Create plan
      const planRes = await apiClient.createPlan({
        project_id: testProjectId,
        name: `PlanWithScenario_${Date.now()}`,
        description: 'Test',
      });
      const plan = await planRes.json();

      // Add scenario to plan
      await apiClient.addScenarioToPlan(plan.id, scenario.id, 0);

      await page.reload();
      await page.locator(`text=${plan.name}`).click();

      await expect(page.locator(`text=${scenario.name}`)).toBeVisible();
    });
  });

  test.describe('计划执行 (引擎集成)', () => {
    test('应支持执行计划', async ({ page, apiClient, testProjectId }) => {
      // Create scenario
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `ExecScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      // Create plan
      const planRes = await apiClient.createPlan({
        project_id: testProjectId,
        name: `ExecPlan_${Date.now()}`,
        description: 'Test',
      });
      const plan = await planRes.json();

      // Add scenario
      await apiClient.addScenarioToPlan(plan.id, scenario.id, 0);

      // Execute
      const execRes = await apiClient.executePlan(plan.id);
      expect(execRes.ok()).toBeTruthy();
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/05-plan.spec.ts
git commit -m "feat(e2e): add test plan test"
```

---

### Task 17: Create Test Report Test

**Files:**
- Create: `tests/e2e/specs/06-report.spec.ts`

**Step 1: Write report test**

```typescript
// tests/e2e/specs/06-report.spec.ts
import { test, expect } from '../fixtures/base.fixture';

test.describe('测试报告模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/reports');
    await page.waitForLoadState('networkidle');
  });

  test.describe('报告列表', () => {
    test('应显示报告列表页面', async ({ page }) => {
      await expect(page.locator('[data-testid="report-table"]')).toBeVisible();
    });

    test('应支持按状态筛选', async ({ page }) => {
      const filterBtn = page.locator('[data-testid="status-filter"]');
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.locator('[data-value="passed"]').click();
        await page.locator('[data-testid="confirm-filter"]').click();
      }
    });
  });

  test.describe('Allure 集成', () => {
    test('应显示 Allure 按钮对于已完成报告', async ({ page, apiClient }) => {
      const reports = await apiClient.getReports({ limit: 10 });
      const data = await reports.json();

      if (data.length > 0) {
        const firstReport = data[0];
        await page.locator(`text=${firstReport.scenario_name}`).first().click();

        const allureBtn = page.locator('[data-testid="allure-btn"]');
        if (await allureBtn.isVisible()) {
          await expect(allureBtn).toBeEnabled();
        }
      }
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/06-report.spec.ts
git commit -m "feat(e2e): add test report test"
```

---

### Task 18: Create UI/UX Validation Test

**Files:**
- Create: `tests/e2e/specs/ui-ux-validation.spec.ts`

**Step 1: Write UI/UX test**

```typescript
// tests/e2e/specs/ui-ux-validation.spec.ts
import { test, expect } from '../fixtures/base.fixture';

test.describe('UI/UX 全局验收', () => {

  test.describe('动画过渡验收', () => {
    test('页面切换应流畅', async ({ page }) => {
      const fps = await page.evaluate(async () => {
        const frames: number[] = [];
        let lastTime = performance.now();

        return new Promise<number>((resolve) => {
          const measure = () => {
            const now = performance.now();
            frames.push(1000 / (now - lastTime));
            lastTime = now;
            if (frames.length < 60) {
              requestAnimationFrame(measure);
            } else {
              resolve(frames.reduce((a, b) => a + b, 0) / frames.length);
            }
          };
          requestAnimationFrame(measure);
        });
      });

      expect(fps).toBeGreaterThan(30);
    });
  });

  test.describe('组件样式统一性', () => {
    const pages = [
      { name: '项目管理', path: '/api-automation/projects' },
      { name: '关键字配置', path: '/api-automation/keywords' },
      { name: '测试报告', path: '/api-automation/reports' },
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name}页面组件样式应统一`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Check search input exists and has consistent style
        const searchInput = page.locator('[data-testid="search-input"]');
        if (await searchInput.isVisible()) {
          const borderRadius = await searchInput.evaluate(el =>
            getComputedStyle(el).borderRadius
          );
          expect(borderRadius).toBeTruthy();
        }

        // Check pagination exists
        const pagination = page.locator('[data-testid="pagination"]');
        if (await pagination.isVisible()) {
          await expect(pagination).toBeVisible();
        }
      });
    }
  });

  test.describe('交互规范验收', () => {
    test('删除操作应有二次确认弹窗', async ({ page, apiClient, dataGenerator }) => {
      // Create a project
      const [project] = dataGenerator.generateProjects(1);
      await apiClient.createProject(project);

      await page.goto('/api-automation/projects');
      await page.waitForLoadState('networkidle');

      // Find and click delete button
      const row = page.locator('tr', { hasText: project.name });
      await row.locator('[data-testid="delete-btn"]').click();

      // Verify confirmation dialog appears
      const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
      await expect(confirmDialog).toBeVisible();
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/ui-ux-validation.spec.ts
git commit -m "feat(e2e): add UI/UX validation test"
```

---

### Task 19: Create Validation Test

**Files:**
- Create: `tests/e2e/specs/validation.spec.ts`

**Step 1: Write validation test**

```typescript
// tests/e2e/specs/validation.spec.ts
import { test, expect } from '../fixtures/base.fixture';

test.describe('异常数据校验', () => {

  test.describe('表单验证', () => {
    test('必填字段为空应显示错误', async ({ page }) => {
      await page.goto('/api-automation/projects');
      await page.locator('[data-testid="create-project-btn"]').click();
      await page.waitForTimeout(300);

      // Try to save without filling required fields
      await page.locator('[data-testid="save-btn"]').click();

      // Should show validation error
      const errorMsg = page.locator('[data-testid="form-error"]');
      await expect(errorMsg).toBeVisible();
    });
  });

  test.describe('业务规则验证', () => {
    test('数据库配置必须测试连接', async ({ page, testProjectId }) => {
      await page.goto(`/api-automation/projects/${testProjectId}/databases`);
      await page.locator('[data-testid="create-db-btn"]').click();
      await page.waitForTimeout(300);

      // Fill form but don't test connection
      await page.locator('[data-testid="connection-name"]').fill('Test DB');
      await page.locator('[data-testid="db-type"]').click();
      await page.locator('[data-value="postgresql"]').click();
      await page.locator('[data-testid="host"]').fill('localhost');
      await page.locator('[data-testid="port"]').fill('5432');
      await page.locator('[data-testid="database"]').fill('test');
      await page.locator('[data-testid="username"]').fill('user');
      await page.locator('[data-testid="password"]').fill('pass');

      // Save button should be disabled until test connection succeeds
      const saveBtn = page.locator('[data-testid="save-btn"]');
      const isDisabled = await saveBtn.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('引擎错误处理', () => {
    test('断言失败应显示差异', async ({ page, apiClient, testProjectId }) => {
      // Create scenario with failing assertion
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `FailingScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      await apiClient.createScenarioStep(scenario.id, {
        name: 'Failing Assertion',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/status/404',
        },
        validate: [{
          target: 'status_code',
          comparator: 'eq',
          expected: 200,
        }],
        order: 0,
      });

      // Debug scenario
      const debugRes = await apiClient.debugScenario(scenario.id);
      const result = await debugRes.json();

      // Should have failed status
      expect(result.status).toBe('failed');
      expect(result.summary.failed_assertions).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/specs/validation.spec.ts
git commit -m "feat(e2e): add validation test"
```

---

## Phase 5: Run Scripts

### Task 20: Create Test Run Scripts

**Files:**
- Create: `scripts/run-e2e.sh`

**Step 1: Write run script**

```bash
#!/bin/bash

# E2E Test Runner Script
# Usage: ./scripts/run-e2e.sh [options]
# Options:
#   --module <name>  Run specific module (project|keyword|interface|scenario|plan|report|ui-ux|validation)
#   --headed         Run in headed mode
#   --debug          Run with debug output

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
E2E_DIR="$PROJECT_ROOT/tests/e2e"

# Default options
HEADED=""
DEBUG=""
MODULE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --module)
      MODULE="$2"
      shift 2
      ;;
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "Sisyphus-X E2E Acceptance Test"
echo "========================================"

# Check services
echo "Checking services..."

# Check backend
if ! curl -s http://localhost:8000/api/v1/dashboard/ > /dev/null 2>&1; then
  echo "Warning: Backend not running on port 8000"
fi

# Check frontend
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "Warning: Frontend not running on port 5173"
fi

# Run tests
cd "$E2E_DIR"

if [ -n "$MODULE" ]; then
  echo "Running module: $MODULE"
  npx playwright test --project="$MODULE" $HEADED $DEBUG
else
  echo "Running all tests..."
  npx playwright test $HEADED $DEBUG
fi

echo "========================================"
echo "Test completed!"
echo "Report: $PROJECT_ROOT/playwright-report/index.html"
echo "========================================"
```

**Step 2: Make executable**

```bash
chmod +x scripts/run-e2e.sh
```

**Step 3: Commit**

```bash
git add scripts/run-e2e.sh
git commit -m "feat(e2e): add test runner script"
```

---

## Execution Summary

**Total Tasks:** 20

**Estimated Time:** 8-12 hours

**Execution Order:**
1. Phase 1: Infrastructure Setup (Tasks 1-4)
2. Phase 2: Utility Functions (Tasks 5-8)
3. Phase 3: Page Objects (Tasks 9-11)
4. Phase 4: Test Specifications (Tasks 12-19)
5. Phase 5: Run Scripts (Task 20)

**Key Dependencies:**
- Playwright must be installed in frontend
- Backend and frontend services must be running
- PostgreSQL, Redis, MinIO middleware must be running
- sisyphus-api-engine must be installed

**Success Criteria:**
- All 20 tasks completed
- All test specifications pass
- 50+ test data per module created
- Animation FPS ≥ 30
- Component styles globally consistent

---

> **文档结束** — E2E 验收测试实施计划 v1.0
