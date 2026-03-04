import { test, expect } from '@playwright/test';
import { EnvironmentPage } from '../pages/environment.page';
import { getTestState, updateTestState, generateTestName } from '../fixtures/test-state';

test.describe('环境管理 CRUD', () => {
  let envPage: EnvironmentPage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    const state = getTestState(runId);
    if (!state.projectId) {
      test.skip();
      return;
    }
    envPage = new EnvironmentPage(page);
    await envPage.goto(state.projectId);
  });

  test('03-01-创建环境', async ({ page }) => {
    const envName = generateTestName('环境', runId);
    const baseUrl = 'http://localhost:8000/api/v1';

    const envId = await envPage.createEnvironment(envName, baseUrl);
    await envPage.assertEnvironmentExists(envName);
    updateTestState(runId, { environmentId: envId });
  });

  test('03-02-查询环境列表', async ({ page }) => {
    const envName = generateTestName('环境', runId);
    const state = getTestState(runId);
    await envPage.goto(state.projectId);
    await envPage.assertEnvironmentExists(envName);
  });
});
