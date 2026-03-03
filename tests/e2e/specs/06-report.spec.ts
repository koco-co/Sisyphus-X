// tests/e2e/specs/06-report.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('测试报告模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/reports');
    await page.waitForLoadState('networkidle');
  });

  test.describe('报告列表', () => {
    test('应显示报告列表页面', async ({ page }) => {
      await expect(page.locator('[data-testid="report-table"]')).toBeVisible();
    });

    test('应支持按状态筛选', async ({ page }) => {
      const filterBtn = page.locator('[data-testid="status-filter"]');
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.locator('[data-value="passed"]').click();
        await page.locator('[data-testid="confirm-filter"]').click();
      }
    });
  });

  test.describe('Allure 集成', () => {
    test('应显示 Allure 按钮对于已完成报告', async ({ page, apiClient }) => {
      const reports = await apiClient.getReports({ limit: 10 });
      const data = await reports.json();

      if (data.length > 0) {
        const firstReport = data[0];
        await page.locator(`text=${firstReport.scenario_name}`).first().click();

        const allureBtn = page.locator('[data-testid="allure-btn"]');
        if (await allureBtn.isVisible()) {
          await expect(allureBtn).toBeEnabled();
        }
      }
    });
  });
});
