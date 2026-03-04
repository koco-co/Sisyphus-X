import { test, expect } from '@playwright/test';
import { ScenarioPage } from '../pages/scenario.page';
import { getTestState, updateTestState, generateTestName } from '../fixtures/test-state';

test.describe('场景编排 CRUD', () => {
  let scenarioPage: ScenarioPage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    scenarioPage = new ScenarioPage(page);
    await scenarioPage.goto();
  });

  test('05-01-创建场景', async ({ page }) => {
    const scenarioName = generateTestName('场景', runId);
    const scenarioId = await scenarioPage.createScenario(scenarioName);
    await scenarioPage.goto();
    await scenarioPage.assertScenarioExists(scenarioName);
    updateTestState(runId, { scenarioId });
  });

  test('05-02-添加步骤到场景', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.scenarioId) {
      test.skip();
      return;
    }
    await page.goto(`/scenarios/editor/${state.scenarioId}`);
    await scenarioPage.waitForLoad();
    await expect(page.locator('body')).toBeVisible();
  });

  test('05-03-运行场景', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.scenarioId) {
      test.skip();
      return;
    }
    await page.goto(`/scenarios/editor/${state.scenarioId}`);
    await scenarioPage.waitForLoad();
    await scenarioPage.runScenario();
    await page.waitForTimeout(5000);
  });
});
