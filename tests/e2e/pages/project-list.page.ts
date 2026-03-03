// tests/e2e/pages/project-list.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class ProjectListPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly projectTable: Locator;
  readonly pagination: Locator;
  readonly emptyState: Locator;

  // Create Modal
  readonly createModal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Delete Dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('[data-testid="create-project-btn"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-btn"]');
    this.projectTable = page.locator('[data-testid="project-table"]');
    this.pagination = page.locator('[data-testid="pagination"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');

    this.createModal = page.locator('[data-testid="project-modal"]');
    this.nameInput = page.locator('[data-testid="project-name-input"]');
    this.descriptionInput = page.locator('[data-testid="project-desc-input"]');
    this.saveButton = page.locator('[data-testid="save-btn"]');
    this.cancelButton = page.locator('[data-testid="cancel-btn"]');

    this.deleteDialog = page.locator('[data-testid="confirm-dialog"]');
    this.confirmDeleteButton = page.locator('[data-testid="confirm-btn"]');
  }

  async goto() {
    await this.page.goto('/api-automation/projects');
    await this.waitForAnimation();
  }

  async waitForAnimation(timeout = 1000) {
    await this.page.waitForTimeout(300);
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async createProject(name: string, description: string) {
    await this.createButton.click();
    await this.waitForAnimation();
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
    await this.saveButton.click();
    await this.waitForAnimation();
  }

  async searchProject(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.waitForAnimation();
  }

  async deleteProject(name: string) {
    const row = this.projectTable.locator('tr', { hasText: name });
    await row.locator('[data-testid="delete-btn"]').click();
    await this.waitForAnimation();
    await this.confirmDeleteButton.click();
    await this.waitForAnimation();
  }

  async expectToast(message: string) {
    const toast = this.page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(message);
  }

  async getProjectCount(): Promise<number> {
    const rows = await this.projectTable.locator('tbody tr').count();
    return rows;
  }
}
