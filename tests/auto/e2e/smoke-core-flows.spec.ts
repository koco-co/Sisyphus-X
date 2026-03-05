import { test, expect } from '@playwright/test';

/**
 * 核心流程 E2E 冒烟测试（与需求文档 §4–§7 对齐）
 *
 * 覆盖: 登录 -> Dashboard -> 接口自动化(项目/场景/计划/报告) -> 全局参数
 * 不依赖已下线 API（functional-test、testcases、api-test-cases 等）
 */
test.describe('核心流程冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
    if (hasLoginForm) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(800);
  });

  test('Dashboard 可访问且展示统计或主内容', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\//);
    const main = page.locator('main').or(page.locator('[class*="dashboard"]')).first();
    await expect(main).toBeVisible({ timeout: 8000 });
  });

  test('接口自动化-项目管理 可访问', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
  });

  test('接口管理 可访问', async ({ page }) => {
    await page.goto('/interface-management');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/interface-management/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('场景编排 可访问', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/scenarios/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('测试计划 可访问', async ({ page }) => {
    await page.goto('/plans');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/plans/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('测试报告 可访问', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('全局参数 可访问', async ({ page }) => {
    await page.goto('/global-params');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/global-params/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('后续规划占位页 可访问', async ({ page }) => {
    await page.goto('/functional-test/requirements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/functional-test\/requirements/);
    await expect(page.getByText(/功能规划中|规划中/)).toBeVisible({ timeout: 5000 });
  });
});
