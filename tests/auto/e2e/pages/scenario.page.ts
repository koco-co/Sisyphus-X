import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ScenarioPage extends BasePage {
  readonly createButton = '[data-testid="create-scenario-btn"], button:has-text("新建场景")';
  readonly scenarioNameInput = '[data-testid="scenario-name-input"], input[name="name"]';
  readonly submitButton = '[data-testid="submit-btn"], button[type="submit"]';
  readonly runButton = '[data-testid="run-scenario-btn"], button:has-text("运行"), button:has-text("执行")';
  readonly addStepButton = '[data-testid="add-step-btn"], button:has-text("添加步骤")';
  readonly scenarioList = '[data-testid="scenario-list"]';
  readonly deleteButton = '[data-testid="delete-btn"], button:has-text("删除")';
  readonly statusBadge = '[data-testid="status-badge"], .status-badge';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/scenarios');
  }

  async createScenario(name: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.scenarioNameInput, 5000);
    await this.fillInput(this.scenarioNameInput, name);
    await this.clickElement(this.submitButton);
    await this.page.waitForURL(/\/scenarios\/editor/, { timeout: 10000 });
    const currentUrl = this.page.url();
    const match = currentUrl.match(/\/scenarios\/editor\/([a-f0-9-]+)/);
    return match ? match[1] : '';
  }

  async runScenario(): Promise<void> {
    await this.clickElement(this.runButton);
    await this.page.waitForTimeout(2000);
  }

  async assertScenarioExists(name: string): Promise<void> {
    const scenarioRow = this.page.locator(`text=${name}`).first();
    await expect(scenarioRow).toBeVisible({ timeout: 10000 });
  }
}
