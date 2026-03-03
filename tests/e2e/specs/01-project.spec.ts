// tests/e2e/specs/01-project.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';
import { ProjectListPage } from '../pages/project-list.page.js';

test.describe('项目管理模块', () => {
  let projectPage: ProjectListPage;

  test.beforeEach(async ({ page }) => {
    projectPage = new ProjectListPage(page);
    await projectPage.goto();
  });

  test.describe('项目列表', () => {
    test('应正确显示项目列表页面', async ({ page }) => {
      await expect(projectPage.projectTable).toBeVisible();
    });

    test('应支持创建项目', async ({ page, dataGenerator }) => {
      const [project] = dataGenerator.generateProjects(1);

      await projectPage.createProject(project.name, project.description);
      await projectPage.expectToast('添加成功');

      // Verify project appears in list
      await projectPage.searchProject(project.name);
      await expect(page.locator('text=' + project.name)).toBeVisible();
    });

    test('应支持搜索项目', async ({ page, apiClient, dataGenerator }) => {
      // Create test project via API
      const [project] = dataGenerator.generateProjects(1);
      await apiClient.createProject(project);

      await projectPage.goto();
      await projectPage.searchProject(project.name);

      const count = await projectPage.getProjectCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('应支持删除项目 (二次确认)', async ({ page, apiClient, dataGenerator }) => {
      const [project] = dataGenerator.generateProjects(1);
      const response = await apiClient.createProject(project);
      const created = await response.json();

      await projectPage.goto();
      await projectPage.deleteProject(project.name);
      await projectPage.expectToast('删除成功');
    });

    test('空状态应显示统一组件', async ({ page, apiClient }) => {
      // Search for non-existent project
      await projectPage.searchProject('nonexistent_project_xyz');
      await expect(projectPage.emptyState).toBeVisible();
    });
  });

  test.describe('批量数据测试', () => {
    test('应批量创建 10+ 项目', async ({ page, apiClient, dataGenerator }) => {
      const projects = dataGenerator.generateProjects(10);

      for (const project of projects) {
        await apiClient.createProject(project);
      }

      await projectPage.goto();
      const count = await projectPage.getProjectCount();
      expect(count).toBeGreaterThanOrEqual(10);
    });
  });
});
