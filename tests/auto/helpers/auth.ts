import { Page } from '@playwright/test';

/**
 * 导航到关键字配置页面
 * 自动处理登录（如果需要）
 */
export async function navigateToKeywordsPage(page: Page): Promise<void> {
  await page.goto('/keywords');
  await page.waitForLoadState('networkidle');

  // 检查是否需要登录
  const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
  if (hasLoginForm) {
    // 测试环境使用默认凭据
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/keywords/, { timeout: 10000 });
  }
}

/**
 * 导航到指定页面
 * 自动处理登录（如果需要）
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  // 检查是否需要登录
  const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
  if (hasLoginForm) {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(path.replace('/', '\\/')), { timeout: 10000 });
  }
}

/**
 * 等待页面加载完成
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
