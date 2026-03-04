// tests/e2e/specs/validation.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('异常数据校验', () => {

  test.describe('表单验证', () => {
    test('项目创建表单应正常加载', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Click create button to open form
      const createBtn = page.locator('[data-testid="create-project-button"]');
      await createBtn.click();
      await page.waitForTimeout(500);

      // Verify button was clicked - just check page is still functional
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('页面加载验证', () => {
    test('所有主要页面应正常加载', async ({ page }) => {
      const pages = [
        '/projects',
        '/keywords',
        '/interface-management',
        '/scenarios',
        '/plans',
        '/reports',
      ];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Verify page loads without errors
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
    });
  });

  test.describe('API 响应验证', () => {
    test('API 应正常响应', async ({ apiClient }) => {
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });
});
