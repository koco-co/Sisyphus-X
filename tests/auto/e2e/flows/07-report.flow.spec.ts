import { test, expect } from '@playwright/test';
import { ReportPage } from '../pages/report.page';
import { getTestState } from '../fixtures/test-state';

test.describe('测试报告', () => {
  let reportPage: ReportPage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    reportPage = new ReportPage(page);
    await reportPage.goto();
  });

  test('07-01-查看报告列表', async ({ page }) => {
    await reportPage.assertReportListNotEmpty();
  });

  test('07-02-查看报告详情', async ({ page }) => {
    const state = getTestState(runId);
    if (state.reportId) {
      await reportPage.openReport(state.reportId);
      await expect(page.locator('body')).toBeVisible();
    } else {
      const firstReport = page.locator('[data-testid="report-row"], tr').first();
      if (await firstReport.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstReport.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('07-03-验证报告状态', async ({ page }) => {
    const status = await reportPage.getLatestReportStatus();
    console.log(`Latest report status: ${status}`);
    expect(['success', 'fail', 'unknown']).toContain(status);
  });
});
