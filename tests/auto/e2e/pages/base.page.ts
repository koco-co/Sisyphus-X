// tests/auto/e2e/pages/base.page.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  async getToastMessage(): Promise<string | null> {
    const toast = this.page.locator('[data-testid="toast-message"], [role="alert"]').first();
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      return toast.textContent();
    }
    return null;
  }

  async clickElement(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async fillInput(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string | null> {
    const element = this.page.locator(selector);
    if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
      return element.textContent();
    }
    return null;
  }

  async isVisible(selector: string, timeout = 5000): Promise<boolean> {
    return this.page.locator(selector).isVisible({ timeout }).catch(() => false);
  }

  async waitForElement(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForElementToDisappear(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }
}
