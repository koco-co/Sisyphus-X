import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ReportPage extends BasePage {
  readonly reportList = '[data-testid="report-list"], table, .report-list';
  readonly reportRow = '[data-testid="report-row"], tr';
  readonly statusBadge = '[data-testid="status-badge"], .status';
  readonly successBadge = '[data-testid="success-badge"], .badge-success, .status-success';
  readonly failBadge = '[data-testid="fail-badge"], .badge-fail, .status-fail';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.navigate('/reports');
  }

  async openReport(reportId: string): Promise<void> {
    await this.page.goto(`/reports/${reportId}`);
    await this.waitForLoad();
  }

  async getLatestReportStatus(): Promise<'success' | 'fail' | 'running' | 'unknown'> {
    const successBadge = this.page.locator(this.successBadge).first();
    const failBadge = this.page.locator(this.failBadge).first();

    if (await successBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      return 'success';
    }
    if (await failBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      return 'fail';
    }
    return 'unknown';
  }

  async assertReportListNotEmpty(): Promise<void> {
    const reportRow = this.page.locator(this.reportRow).first();
    await expect(reportRow).toBeVisible({ timeout: 10000 });
  }

  async assertReportSuccess(): Promise<void> {
    const successBadge = this.page.locator(this.successBadge).first();
    await expect(successBadge).toBeVisible({ timeout: 15000 });
  }
}
