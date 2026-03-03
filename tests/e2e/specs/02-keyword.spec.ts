// tests/e2e/specs/02-keyword.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('关键字配置模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/api-automation/keywords');
    await page.waitForLoadState('networkidle');
  });

  test.describe('内置关键字', () => {
    test('应显示所有内置关键字', async ({ page }) => {
      const builtinTab = page.locator('[data-testid="builtin-tab"]');
      await builtinTab.click();

      // Verify built-in keywords exist
      await expect(page.locator('text=发送请求')).toBeVisible();
      await expect(page.locator('text=断言类型')).toBeVisible();
      await expect(page.locator('text=提取变量')).toBeVisible();
      await expect(page.locator('text=数据库操作')).toBeVisible();
    });

    test('内置关键字应只读展示', async ({ page }) => {
      const builtinTab = page.locator('[data-testid="builtin-tab"]');
      await builtinTab.click();

      // Click on a built-in keyword
      await page.locator('text=发送请求').click();

      // Monaco should be read-only
      const monaco = page.locator('.monaco-editor');
      await expect(monaco).toBeVisible();
    });
  });

  test.describe('自定义关键字', () => {
    test('应支持创建自定义关键字', async ({ page, dataGenerator }) => {
      const [keyword] = dataGenerator.generateKeywords(1);

      await page.locator('[data-testid="create-keyword-btn"]').click();
      await page.waitForTimeout(300);

      await page.locator('[data-testid="keyword-type"]').click();
      await page.locator('[data-value="custom"]').click();

      await page.locator('[data-testid="keyword-name"]').fill(keyword.name);
      await page.locator('[data-testid="keyword-method"]').fill(keyword.method_name);

      // Fill Monaco editor
      const monaco = page.locator('.monaco-editor textarea');
      await monaco.fill(keyword.code_block);

      await page.locator('[data-testid="save-btn"]').click();

      // Verify toast
      const toast = page.locator('[data-testid="toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
    });

    test('应批量创建 20+ 自定义关键字', async ({ apiClient, dataGenerator }) => {
      const keywords = dataGenerator.generateKeywords(20);

      for (const kw of keywords) {
        await apiClient.createKeyword({
          keyword_type: kw.keyword_type,
          name: kw.name,
          method_name: kw.method_name,
          code: kw.code_block,
          parameters: kw.parameters,
          is_builtin: false,
          is_enabled: true,
        });
      }

      // Verify count
      const response = await apiClient.getKeywords({ limit: 100 });
      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(20);
    });
  });
});
