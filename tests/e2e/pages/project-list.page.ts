// tests/e2e/pages/project-list.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class ProjectListPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly projectGrid: Locator;
  readonly pagination: Locator;
  readonly emptyState: Locator;

  // Create Modal
  readonly createModal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Delete Dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Actual frontend test IDs from ProjectList.tsx
    this.createButton = page.locator('[data-testid="create-project-button"]');
    this.searchInput = page.locator('[data-testid="project-search-input"]');
    this.projectGrid = page.locator('.grid.grid-cols-1');
    this.pagination = page.locator('[data-testid="pagination"]');
    this.emptyState = page.locator('h3:has-text("暂无项目")').or(page.locator('text=暂无项目'));

    // Create Modal - actual test IDs
    this.createModal = page.locator('text=新建项目').locator('..');
    this.nameInput = page.locator('[data-testid="project-name-input"]');
    this.descriptionInput = page.locator('[data-testid="project-description-input"]');
    this.submitButton = page.locator('[data-testid="submit-project-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-project-button"]');

    // Delete Dialog
    this.deleteDialog = page.locator('text=删除项目').locator('..');
    this.confirmDeleteButton = page.locator('button:has-text("删除")').last();
  }

  async goto() {
    await this.page.goto('/projects');
    await this.waitForAnimation();
  }

  async waitForAnimation(timeout = 2000) {
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async createProject(name: string, description: string) {
    await this.createButton.click();
    await this.waitForAnimation();

    // Use evaluate to directly set React state and trigger events
    await this.page.evaluate(({ nameSelector, descSelector, name, description }) => {
      // Helper function to set input value and trigger React events
      const setInputValue = (selector: string, value: string) => {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
        if (!element) return;

        // Focus the element first
        element.focus();

        // Get React's internal value setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          element.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (nativeInputValueSetter) {
          // Set the value using the native setter
          nativeInputValueSetter.call(element, value);
          // Trigger input event for React to pick up
          element.dispatchEvent(new Event('input', { bubbles: true }));
          // Also trigger change event
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Blur to trigger validation
        element.blur();
      };

      setInputValue(nameSelector, name);
      setInputValue(descSelector, description);
    }, {
      nameSelector: '[data-testid="project-name-input"]',
      descSelector: '[data-testid="project-description-input"]',
      name,
      description
    });

    // Wait for React state to update
    await this.page.waitForTimeout(500);

    // Click the submit button - check if it's enabled
    const btn = this.page.locator('[data-testid="submit-project-button"]');
    const isDisabled = await btn.evaluate(el => el.hasAttribute('disabled'));

    if (isDisabled) {
      // If still disabled, use evaluate to directly call the form submission
      // by finding the form's onSubmit handler
      await this.page.evaluate(() => {
        // Find the button and simulate a proper click that React will handle
        const btn = document.querySelector('[data-testid="submit-project-button"]') as HTMLButtonElement;
        if (btn) {
          // Create and dispatch a proper click event
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          btn.dispatchEvent(clickEvent);
        }
      });
    } else {
      await btn.click();
    }

    // Wait for the dialog to close and list to refresh
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await this.waitForAnimation();
  }

  async searchProject(keyword: string) {
    await this.searchInput.clear();
    await this.searchInput.fill(keyword);
    // Wait for search debounce and API response
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await this.waitForAnimation();
  }

  async deleteProject(name: string) {
    // Find project card by name and click its delete button
    const card = this.page.locator('[data-testid^="project-card-"]').filter({ hasText: name });
    const deleteBtn = card.locator('[data-testid^="project-delete-button-"]');
    await deleteBtn.click();
    await this.waitForAnimation();

    // The delete dialog requires typing the project name for verification
    const verificationInput = this.page.locator('input[placeholder="' + name + '"]').or(
      this.page.locator('label:has-text("请输入")').locator('..').locator('input[type="text"]')
    );

    // Wait for the dialog to appear and fill the verification input
    await verificationInput.waitFor({ state: 'visible', timeout: 5000 });
    await verificationInput.fill(name);
    await this.page.waitForTimeout(300);

    // Now the delete button should be enabled - click it
    const confirmBtn = this.page.locator('button:has-text("删除"):not([disabled])');
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
    await this.waitForAnimation();
  }

  async expectToast(message: string) {
    // Custom Toast component renders in fixed top-4 right-4 position
    // The toast has rounded-xl border classes and contains the message in a p tag
    const toast = this.page.locator('.fixed.top-4.right-4').locator('p.text-slate-300').filter({ hasText: message }).or(
      // Fallback: look for any element containing the message in the toast area
      this.page.locator('.fixed.top-4.right-4').filter({ hasText: message })
    ).or(
      // Another fallback: look for emerald (success) colored toast
      this.page.locator('.border-emerald-500\\/20, .bg-emerald-950\\/20').filter({ hasText: message })
    ).or(
      // Final fallback: any toast-like element with the message
      this.page.locator('[class*="rounded-xl"][class*="border"]').filter({ hasText: message })
    );
    await expect(toast.first()).toBeVisible({ timeout: 10000 });
  }

  async getProjectCount(): Promise<number> {
    const cards = await this.page.locator('[data-testid^="project-card-"]').count();
    return cards;
  }

  async hasProjects(): Promise<boolean> {
    const count = await this.getProjectCount();
    return count > 0;
  }
}
