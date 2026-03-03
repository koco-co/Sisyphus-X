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
