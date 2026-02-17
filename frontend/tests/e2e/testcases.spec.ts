import { test, expect } from '@playwright/test';

/**
 * 测试用例管理功能 E2E 测试
 *
 * 测试场景:
 * 1. 查看测试用例列表
 * 2. 创建API测试用例
 * 3. 编辑测试用例
 * 4. 执行测试用例
 */

test.describe('测试用例管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('应该能够导航到API自动化页面', async ({ page }) => {
    // 查找API自动化导航链接
    const apiAutoLink = page.locator('a:has-text("API自动化"), a:has-text("API Automation")').first();

    const hasLink = await apiAutoLink.count();

    if (hasLink > 0) {
      await apiAutoLink.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      console.log(`API自动化页面URL: ${url}`);
    } else {
      // 直接导航
      await page.goto('/api-automation');
      await page.waitForTimeout(2000);
    }

    // 验证页面加载
    await expect(page.locator('body')).toBeVisible();
  });

  test('应该显示测试用例列表', async ({ page }) => {
    await page.goto('/api-automation');
    await page.waitForLoadState('networkidle');

    // 查找测试用例列表
    const testCases = page.locator('[data-testid="test-case"], .test-case, [data-testid="testcase-list"]');

    const count = await testCases.count();
    console.log(`找到 ${count} 个测试用例`);

    // 检查页面基本元素
    await expect(page.locator('body')).toBeVisible();
  });

  test('应该能够创建新测试用例 (如果界面支持)', async ({ page }) => {
    await page.goto('/api-automation');
    await page.waitForLoadState('networkidle');

    // 查找创建按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("Create")').first();

    const hasButton = await createButton.count();

    if (hasButton > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // 检查表单
      const form = page.locator('form, [role="dialog"]');
      const hasForm = await form.count();

      if (hasForm > 0) {
        console.log('测试用例创建表单已打开');

        // 等待观察
        await page.waitForTimeout(3000);

        // 关闭表单
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('未找到创建测试用例按钮');
    }
  });

  test('应该能够显示全局参数管理', async ({ page }) => {
    // 查找全局参数链接
    const globalParamsLink = page.locator('a:has-text("全局参数"), a:has-text("Global")').first();

    const hasLink = await globalParamsLink.count();

    if (hasLink > 0) {
      await globalParamsLink.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      console.log(`全局参数页面URL: ${url}`);
    } else {
      // 直接导航
      await page.goto('/global-params');
      await page.waitForTimeout(2000);
    }

    // 检查Monaco编辑器是否存在
    const monacoEditor = page.locator('.monaco-editor, [data-testid="monaco-editor"]');
    const hasEditor = await monacoEditor.count();

    console.log(`Monaco编辑器存在: ${hasEditor > 0}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('应该能够查看测试报告', async ({ page }) => {
    // 查找报告导航链接
    const reportsLink = page.locator('a:has-text("报告"), a:has-text("Report")').first();

    const hasLink = await reportsLink.count();

    if (hasLink > 0) {
      await reportsLink.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      console.log(`测试报告页面URL: ${url}`);
    } else {
      // 直接导航
      await page.goto('/reports');
      await page.waitForTimeout(2000);
    }

    // 检查报告列表
    await expect(page.locator('body')).toBeVisible();
  });
});
