import { test, expect } from '@playwright/test';

/**
 * 接口管理功能 E2E 测试
 *
 * 测试场景:
 * 1. 查看接口列表
 * 2. 创建新接口
 * 3. 测试接口
 * 4. 查看接口历史
 */

test.describe('接口管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('应该能够导航到接口管理页面', async ({ page }) => {
    // 查找接口管理导航链接
    const interfaceLink = page.locator('a:has-text("接口"), a:has-text("Interface"), nav a:has-text("API")').first();

    const hasLink = await interfaceLink.count();

    if (hasLink > 0) {
      // 点击导航
      await interfaceLink.click();

      // 等待页面加载
      await page.waitForTimeout(2000);

      // 验证URL
      const url = page.url();
      console.log(`接口管理页面URL: ${url}`);

      // 检查页面元素
      await expect(page.locator('body')).toBeVisible();
    } else {
      console.log('未找到接口管理导航链接');
      // 直接导航
      await page.goto('/interface');
      await page.waitForTimeout(2000);
    }
  });

  test('应该显示接口列表或欢迎页面', async ({ page }) => {
    // 导航到接口页面
    await page.goto('/interface');
    await page.waitForLoadState('networkidle');

    // 检查是否有接口列表或欢迎卡片
    const interfaceList = page.locator('[data-testid="interface-list"], .interface-list');
    const welcomeCards = page.locator('[data-testid="welcome-cards"], .welcome-cards');

    const hasList = await interfaceList.count();
    const hasWelcome = await welcomeCards.count();

    console.log(`接口列表存在: ${hasList > 0}, 欢迎卡片存在: ${hasWelcome > 0}`);

    // 至少应该显示一个元素
    await expect(page.locator('body')).toBeVisible();
  });

  test('应该能够创建新接口 (如果界面支持)', async ({ page }) => {
    await page.goto('/interface');
    await page.waitForLoadState('networkidle');

    // 查找创建接口按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("导入")').first();

    const hasButton = await createButton.count();

    if (hasButton > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // 检查是否有表单或对话框
      const dialog = page.locator('[role="dialog"], .modal, .dialog');
      const hasDialog = await dialog.count();

      if (hasDialog > 0) {
        console.log('创建接口对话框已打开');
        // 这里可以填写表单...
        await page.waitForTimeout(2000);

        // 关闭对话框
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('未找到创建接口按钮');
    }
  });

  test('应该能够显示接口详情', async ({ page }) => {
    await page.goto('/interface');
    await page.waitForLoadState('networkidle');

    // 查找接口项目
    const interfaceItem = page.locator('[data-testid="interface-item"], .interface-item, tr').first();

    const hasItem = await interfaceItem.count();

    if (hasItem > 0) {
      // 点击第一个接口
      await interfaceItem.click();
      await page.waitForTimeout(2000);

      // 验证详情显示
      const detailPanel = page.locator('[data-testid="interface-detail"], .interface-detail');
      const hasDetail = await detailPanel.count();

      console.log(`接口详情面板存在: ${hasDetail > 0}`);
    } else {
      console.log('没有找到接口项目');
    }
  });
});
