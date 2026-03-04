import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { initTestState, generateRunId } from '../fixtures/test-state';

test.describe('认证流程', () => {
  let loginPage: LoginPage;
  const runId = generateRunId();

  test.beforeAll(() => {
    initTestState(runId);
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('01-登录成功', async ({ page }) => {
    // 访问登录页
    await loginPage.goto();

    // 检查是否已经登录（开发模式可能跳过登录）
    if (await loginPage.isLoggedIn()) {
      console.log('Already logged in (dev mode)');
      return;
    }

    // 使用测试账号登录
    await loginPage.login('test@example.com', 'password123');

    // 验证登录成功
    await loginPage.expectLoginSuccess();

    // 保存认证状态
    await page.context().storageState({ path: `.test-state/auth-${runId}.json` });
  });
});
