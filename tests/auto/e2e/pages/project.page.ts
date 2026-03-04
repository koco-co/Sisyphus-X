import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectPage extends BasePage {
  // 选择器 - 匹配前端实际元素
  readonly createButton = '[data-testid="create-project-button"], button:has-text("新建项目")';
  readonly projectNameInput = '[data-testid="project-name-input"], input[id="project-name"], input[placeholder*="项目"]';
  readonly projectDescInput = '[data-testid="project-description-input"], textarea[id="project-description"]';
  readonly submitButton = '[data-testid="submit-project-button"], button:has-text("创建")';
  readonly cancelButton = '[data-testid="cancel-project-button"], button:has-text("取消")';
  readonly projectCard = '[data-testid^="project-card-"]';
  readonly searchInput = '[data-testid="project-search-input"], input[placeholder*="搜索"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/projects');
  }

  async createProject(name: string, _key?: string, description?: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.projectNameInput, 5000);

    await this.fillInput(this.projectNameInput, name);

    if (description) {
      await this.fillInput(this.projectDescInput, description);
    }

    await this.clickElement(this.submitButton);

    // 等待对话框关闭（创建成功）
    await this.page.waitForTimeout(2000);

    // 尝试从项目卡片中获取项目 ID
    const projectCard = this.page.locator(`[data-testid^="project-card-"]`).filter({ hasText: name }).first();
    if (await projectCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const testId = await projectCard.getAttribute('data-testid');
      if (testId) {
        const match = testId.match(/project-card-(.+)/);
        if (match) return match[1];
      }
    }

    return '';
  }

  async assertProjectExists(name: string): Promise<void> {
    const projectCard = this.page.locator(`[data-testid^="project-card-"]`).filter({ hasText: name }).first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });
  }

  async deleteProject(projectId: string): Promise<void> {
    // 点击项目卡片上的删除按钮
    const deleteButton = this.page.locator(`[data-testid="project-delete-button-${projectId}"]`);
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();

      // 确认删除对话框
      const confirmButton = this.page.locator('button:has-text("删除")').last();
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await this.page.waitForTimeout(1000);
    }
  }
}
