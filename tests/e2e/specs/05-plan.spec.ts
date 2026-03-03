// tests/e2e/specs/05-plan.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('测试计划模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/plans');
    await page.waitForLoadState('networkidle');
  });

  test.describe('计划管理', () => {
    test('应支持创建计划', async ({ page, apiClient, testProjectId, dataGenerator }) => {
      const [plan] = dataGenerator.generatePlans(1);

      await apiClient.createPlan({
        project_id: testProjectId,
        name: plan.name,
        description: plan.description,
      });

      await page.reload();
      await expect(page.locator(`text=${plan.name}`)).toBeVisible();
    });

    test('应批量创建 15+ 计划', async ({ page, apiClient, testProjectId, dataGenerator }) => {
      const plans = dataGenerator.generatePlans(15);

      for (const plan of plans) {
        await apiClient.createPlan({
          project_id: testProjectId,
          name: plan.name,
          description: plan.description,
        });
      }

      await page.reload();
      const rows = await page.locator('[data-testid="plan-table"] tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(15);
    });
  });

  test.describe('场景编排', () => {
    test('应支持添加场景到计划', async ({ page, apiClient, testProjectId }) => {
      // Create scenario
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `PlanScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      // Create plan
      const planRes = await apiClient.createPlan({
        project_id: testProjectId,
        name: `PlanWithScenario_${Date.now()}`,
        description: 'Test',
      });
      const plan = await planRes.json();

      // Add scenario to plan
      await apiClient.addScenarioToPlan(plan.id, scenario.id, 0);

      await page.reload();
      await page.locator(`text=${plan.name}`).click();

      await expect(page.locator(`text=${scenario.name}`)).toBeVisible();
    });
  });

  test.describe('计划执行 (引擎集成)', () => {
    test('应支持执行计划', async ({ page, apiClient, testProjectId }) => {
      // Create scenario
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `ExecScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      // Create plan
      const planRes = await apiClient.createPlan({
        project_id: testProjectId,
        name: `ExecPlan_${Date.now()}`,
        description: 'Test',
      });
      const plan = await planRes.json();

      // Add scenario
      await apiClient.addScenarioToPlan(plan.id, scenario.id, 0);

      // Execute
      const execRes = await apiClient.executePlan(plan.id);
      expect(execRes.ok()).toBeTruthy();
    });
  });
});
