import { test, expect } from '@playwright/test';
import { PlanPage } from '../pages/plan.page';
import { getTestState, updateTestState, generateTestName } from '../fixtures/test-state';

test.describe('测试计划 CRUD', () => {
  let planPage: PlanPage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    planPage = new PlanPage(page);
    await planPage.goto();
  });

  test('06-01-创建计划', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.scenarioId) {
      test.skip();
      return;
    }
    const planName = generateTestName('计划', runId);
    const planId = await planPage.createPlan(planName, state.scenarioId);
    await planPage.goto();
    await planPage.assertPlanExists(planName);
    updateTestState(runId, { planId });
  });

  test('06-02-执行计划', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.planId) {
      test.skip();
      return;
    }
    await planPage.goto();
    const planName = generateTestName('计划', runId);
    const planRow = page.locator(`text=${planName}`).first();
    if (await planRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await planRow.click();
      await page.waitForTimeout(500);
      const reportId = await planPage.runPlan();
      if (reportId) {
        updateTestState(runId, { reportId });
      }
    }
  });
});
