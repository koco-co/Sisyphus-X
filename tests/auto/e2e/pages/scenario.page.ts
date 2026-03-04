import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ScenarioPage extends BasePage {
  // 选择器 - 使用更灵活的匹配
  readonly createButton = 'button:has-text("新建场景"), button:has-text("New Scenario")';
  readonly scenarioNameInput = 'input[name="name"], input[placeholder*="场景"], input[placeholder*="Scenario"]';
  readonly submitButton = 'button[type="submit"], button:has-text("创建"), button:has-text("确定")';
  readonly runButton = 'button:has-text("运行"), button:has-text("执行"), button:has-text("Run")';
  readonly scenarioRow = 'table tbody tr, [data-testid^="scenario-"]';

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

    // 等待跳转到编辑器页面
    await this.page.waitForURL(/\/scenarios\/editor/, { timeout: 15000 });

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
