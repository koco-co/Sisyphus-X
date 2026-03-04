import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class InterfacePage extends BasePage {
  readonly createButton = 'button[title="新建接口"], button:has-text("新建接口")';
  readonly interfaceNameInput = 'input[name="name"], input[placeholder*="接口"], input[placeholder*="Interface"]';
  readonly methodSelect = 'select[name="method"], select';
  readonly urlInput = 'input[name="url"], input[name="path"], input[placeholder*="url"], input[placeholder*="路径"]';
  readonly submitButton = 'button[type="submit"], button:has-text("保存"), button:has-text("创建")';
  readonly sendButton = 'button:has-text("发送"), button:has-text("Send")';
  readonly responseViewer = '[class*="response"], [class*="Response"]';
  readonly interfaceList = 'table tbody tr';

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
