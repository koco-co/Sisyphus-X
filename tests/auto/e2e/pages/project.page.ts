// tests/auto/e2e/pages/project.page.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectPage extends BasePage {
  // 选择器
  readonly createButton = '[data-testid="create-project-btn"], button:has-text("新建项目"), button:has-text("创建")';
  readonly projectNameInput = '[data-testid="project-name-input"], input[name="name"], input[placeholder*="项目"]';
  readonly projectKeyInput = '[data-testid="project-key-input"], input[name="key"]';
  readonly projectDescInput = '[data-testid="project-desc-input"], textarea[name="description"], textarea[placeholder*="描述"]';
  readonly submitButton = '[data-testid="submit-btn"], button[type="submit"], button:has-text("确定"), button:has-text("保存")';
  readonly projectList = '[data-testid="project-list"], table, .project-list';
  readonly projectRow = '[data-testid="project-row"], tr';
  readonly deleteButton = '[data-testid="delete-btn"], button:has-text("删除")';
  readonly editButton = '[data-testid="edit-btn"], button:has-text("编辑")';
  readonly confirmDeleteButton = '[data-testid="confirm-delete"], button:has-text("确认"), button:has-text("确定")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/projects');
  }

  async createProject(name: string, key: string, description?: string): Promise<string> {
    await this.clickElement(this.createButton);
    await this.waitForElement(this.projectNameInput, 5000);

    await this.fillInput(this.projectNameInput, name);
    await this.fillInput(this.projectKeyInput, key);

    if (description) {
      await this.fillInput(this.projectDescInput, description);
    }

    await this.clickElement(this.submitButton);

    // 等待创建成功，返回项目列表或详情页
    await this.page.waitForURL(/\/(projects|project)/, { timeout: 10000 });

    // 从 URL 或页面获取项目 ID
    const url = this.page.url();
    const match = url.match(/\/projects\/([a-f0-9-]+)/);
    if (match) {
      return match[1];
    }

    // 如果停留在列表页，尝试从列表中获取
    await this.page.waitForTimeout(1000);
    return '';
  }

  async findProjectByName(name: string): Promise<string | null> {
    const projectRow = this.page.locator(this.projectRow).filter({ hasText: name }).first();
    if (await projectRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 尝试从行中提取项目 ID
      const rowElement = projectRow.locator('[data-project-id]').first();
      if (await rowElement.isVisible().catch(() => false)) {
        return rowElement.getAttribute('data-project-id');
      }
      // 点击进入详情页获取 ID
      await projectRow.click();
      await this.page.waitForTimeout(500);
      const url = this.page.url();
      const match = url.match(/\/projects\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  async assertProjectExists(name: string): Promise<void> {
    const projectRow = this.page.locator(`text=${name}`).first();
    await expect(projectRow).toBeVisible({ timeout: 10000 });
  }

  async deleteProject(projectId: string): Promise<void> {
    // 导航到项目详情或找到项目行
    await this.page.goto(`/projects/${projectId}`);
    await this.waitForLoad();

    // 查找删除按钮
    if (await this.isVisible(this.deleteButton, 3000)) {
      await this.clickElement(this.deleteButton);

      // 确认删除
      if (await this.isVisible(this.confirmDeleteButton, 3000)) {
        await this.clickElement(this.confirmDeleteButton);
      }

      await this.page.waitForURL(/\/projects$/, { timeout: 10000 });
    }
  }
}
