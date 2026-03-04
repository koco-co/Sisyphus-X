import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class EnvironmentPage extends BasePage {
  readonly createButton = '[data-testid="create-env-btn"], button:has-text("新建环境"), button:has-text("创建")';
  readonly envNameInput = '[data-testid="env-name-input"], input[name="name"]';
  readonly baseUrlInput = '[data-testid="base-url-input"], input[name="base_url"], input[placeholder*="url"]';
  readonly submitButton = '[data-testid="submit-btn"], button[type="submit"]';
  readonly envList = '[data-testid="env-list"], table, .env-list';
  readonly deleteButton = '[data-testid="delete-btn"], button:has-text("删除")';
  readonly confirmDeleteButton = '[data-testid="confirm-delete"], button:has-text("确认")';

  constructor(page: Page) {
    super(page);
  }

  async goto(projectId: string): Promise<void> {
    await this.navigate(`/projects/${projectId}/environments`);
  }

  async createEnvironment(name: string, baseUrl: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.envNameInput, 5000);
    await this.fillInput(this.envNameInput, name);
    await this.fillInput(this.baseUrlInput, baseUrl);
    await this.clickElement(this.submitButton);
    await this.page.waitForTimeout(1000);
    return '';
  }

  async assertEnvironmentExists(name: string): Promise<void> {
    const envRow = this.page.locator(`text=${name}`).first();
    await expect(envRow).toBeVisible({ timeout: 10000 });
  }
}
