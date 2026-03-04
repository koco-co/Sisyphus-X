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

  async goto(projectId?: string) {
    // Interface management page doesn't require project ID in URL
    await this.page.goto('/interface-management');
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
