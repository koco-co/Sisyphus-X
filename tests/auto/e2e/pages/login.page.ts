// tests/auto/e2e/pages/login.page.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // 选择器
  readonly emailInput = '[data-testid="email-input"], input[type="email"], input[name="email"]';
  readonly passwordInput = '[data-testid="password-input"], input[type="password"], input[name="password"]';
  readonly submitButton = '[data-testid="login-button"], button[type="submit"]';
  readonly errorMessage = '[data-testid="error-message"], .error-message, [role="alert"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.submitButton);
  }

  async expectLoginSuccess(): Promise<void> {
    // 等待离开登录页，跳转到主页、dashboard 或 projects
    await this.page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 });
  }

  async expectLoginError(): Promise<string | null> {
    await this.waitForElement(this.errorMessage, 5000);
    return this.getText(this.errorMessage);
  }

  async isLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }
}
