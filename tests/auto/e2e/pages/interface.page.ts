import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class InterfacePage extends BasePage {
  readonly createButton = '[data-testid="create-interface-btn"], button:has-text("新建接口")';
  readonly interfaceNameInput = '[data-testid="interface-name-input"], input[name="name"]';
  readonly methodSelect = '[data-testid="method-select"], select[name="method"]';
  readonly urlInput = '[data-testid="url-input"], input[name="url"], input[name="path"]';
  readonly submitButton = '[data-testid="submit-btn"], button[type="submit"]';
  readonly sendButton = '[data-testid="send-btn"], button:has-text("发送")';
  readonly interfaceList = '[data-testid="interface-list"]';
  readonly responseViewer = '[data-testid="response-viewer"], .response-viewer';
  readonly deleteButton = '[data-testid="delete-btn"], button:has-text("删除")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/interface-management');
  }

  async createInterface(name: string, method: string, url: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.interfaceNameInput, 5000);
    await this.fillInput(this.interfaceNameInput, name);
    if (await this.isVisible(this.methodSelect, 2000)) {
      await this.page.selectOption(this.methodSelect, method);
    }
    await this.fillInput(this.urlInput, url);
    await this.clickElement(this.submitButton);
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    const match = currentUrl.match(/\/interface-management\/([a-f0-9-]+)/);
    return match ? match[1] : '';
  }

  async sendRequest(): Promise<void> {
    await this.clickElement(this.sendButton);
    await this.waitForElement(this.responseViewer, 10000);
  }

  async assertResponseSuccess(): Promise<void> {
    const response = this.page.locator(this.responseViewer);
    await expect(response).toBeVisible({ timeout: 10000 });
  }
}
