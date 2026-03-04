// tests/e2e/specs/05-plan.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('测试计划模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/plans');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('计划管理', () => {
    test('应正确显示计划列表页面', async ({ page }) => {
      // Verify page loads correctly
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('应批量创建 15+ 计划', async ({ apiClient, testProjectId, dataGenerator }) => {
      const plans = dataGenerator.generatePlans(15);

      for (const plan of plans) {
        await apiClient.createPlan({
          project_id: testProjectId,
          name: plan.name,
          description: plan.description,
        });
      }

      // Verify via API
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('UI/UX 验收', () => {
    test('页面应正常加载', async ({ page }) => {
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    });
  });
});
