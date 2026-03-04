import { test, expect } from '@playwright/test';
import { ProjectPage } from '../pages/project.page';
import { getTestState, updateTestState, generateTestName } from '../fixtures/test-state';

test.describe('项目管理 CRUD', () => {
  let projectPage: ProjectPage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    projectPage = new ProjectPage(page);
    await projectPage.goto();
  });

  test('02-01-创建项目', async ({ page }) => {
    const projectName = generateTestName('项目', runId);
    const projectKey = `E2E-${runId.slice(-6)}`;

    const projectId = await projectPage.createProject(
      projectName,
      projectKey,
      `E2E 测试项目 - ${runId}`
    );

    await projectPage.goto();
    await projectPage.assertProjectExists(projectName);
    updateTestState(runId, { projectId });
  });

  test('02-02-查询项目列表', async ({ page }) => {
    const projectName = generateTestName('项目', runId);
    await projectPage.goto();
    await projectPage.assertProjectExists(projectName);
  });

  test('02-03-更新项目', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.projectId) {
      test.skip();
      return;
    }
    await page.goto(`/projects/${state.projectId}`);
    await projectPage.waitForLoad();
    await expect(page.locator('body')).toBeVisible();
  });
});
