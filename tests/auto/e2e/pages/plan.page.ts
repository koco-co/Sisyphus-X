import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class PlanPage extends BasePage {
  readonly createButton = '[data-testid="create-plan-btn"], button:has-text("新建计划")';
  readonly planNameInput = '[data-testid="plan-name-input"], input[name="name"]';
  readonly scenarioSelect = '[data-testid="scenario-select"], select[name="scenario_id"]';
  readonly submitButton = '[data-testid="submit-btn"], button[type="submit"]';
  readonly runButton = '[data-testid="run-plan-btn"], button:has-text("执行")';
  readonly planList = '[data-testid="plan-list"]';
  readonly deleteButton = '[data-testid="delete-btn"], button:has-text("删除")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/plans');
  }

  async createPlan(name: string, scenarioId: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.planNameInput, 5000);
    await this.fillInput(this.planNameInput, name);
    if (await this.isVisible(this.scenarioSelect, 2000)) {
      await this.page.selectOption(this.scenarioSelect, scenarioId);
    }
    await this.clickElement(this.submitButton);
    await this.page.waitForTimeout(1000);
    return '';
  }

  async runPlan(): Promise<string> {
    await this.clickElement(this.runButton);
    await this.page.waitForTimeout(3000);
    const currentUrl = this.page.url();
    const match = currentUrl.match(/\/executions\/([a-f0-9-]+)/);
    return match ? match[1] : '';
  }

  async assertPlanExists(name: string): Promise<void> {
    const planRow = this.page.locator(`text=${name}`).first();
    await expect(planRow).toBeVisible({ timeout: 10000 });
  }
}
