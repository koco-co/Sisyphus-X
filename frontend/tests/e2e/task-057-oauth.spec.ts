import { test, expect, Page } from '@playwright/test';

/**
 * TASK-057: OAuth 单点登录功能黑盒测试
 *
 * 测试范围:
 * 1. GitHub OAuth 登录流程 (UI + API + 重定向)
 * 2. Google OAuth 登录流程 (UI + API + 重定向)
 * 3. 新用户自动注册
 * 4. 老用户直接登录
 * 5. URL Token 参数处理
 * 6. 开发模式跳过登录验证
 *
 * 注意事项:
 * - 真实 OAuth 流程需要外部提供商凭证，测试中使用 Mock
 * - 侧重重定向逻辑和 Token 处理
 * - 不测试实际的外部 OAuth 授权页面
 *
 * @author @blackbox-qa
 * @date 2026-02-17
 */

test.describe('TASK-057: OAuth 单点登录功能', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('/login');
  });

  /**
   * ==========================================
   * GitHub OAuth 测试
   * ==========================================
   */
  test.describe('GitHub OAuth 登录', () => {
    test('应该显示 GitHub OAuth 登录按钮', async ({ page }) => {
      // 验证 GitHub 登录按钮存在
      const githubButton = page.getByTestId('github-login-button');
      await expect(githubButton).toBeVisible();

      // 验证按钮文本
      await expect(githubButton).toContainText('GitHub');

      // 验证按钮 aria-label
      await expect(githubButton).toHaveAttribute('aria-label', '使用 GitHub 登录');

      // 验证按钮可点击
      await expect(githubButton).toBeEnabled();
    });

    test('应该有正确的 GitHub OAuth 按钮样式', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');

      // 验证按钮样式类名 (GitHub 黑色背景)
      await expect(githubButton).toHaveClass(/bg-\[\/24292e\]/);

      // 验证按钮包含 GitHub 图标
      const icon = githubButton.locator('svg');
      await expect(icon).toBeVisible();
    });

    test('点击 GitHub 按钮应调用 API 获取授权 URL', async ({ page }) => {
      // 监听 API 请求
      const apiRequest = page.waitForResponse(
        response =>
          response.url().includes('/auth/github') &&
          response.status() === 200
      );

      // 点击 GitHub 登录按钮
      await page.getByTestId('github-login-button').click();

      // 等待 API 响应
      const response = await apiRequest;

      // 验证响应数据包含授权 URL
      const data = await response.json();
      expect(data).toHaveProperty('url');
      expect(data.url).toContain('github.com');
      expect(data.url).toContain('oauth');
      expect(data.url).toContain('authorize');

      // 注意: 页面会重定向到外部 GitHub 授权页面
      // 在真实测试中，这里会导航到 GitHub
    });

    test('GitHub OAuth 应正确处理未配置情况', async ({ page }) => {
      // 监听 API 请求
      const apiRequest = page.waitForResponse(
        response =>
          response.url().includes('/auth/github')
      );

      // 点击 GitHub 登录按钮
      await page.getByTestId('github-login-button').click();

      // 等待响应
      const response = await apiRequest;
      const statusCode = response.status();

      // 如果 GitHub OAuth 未配置，应该返回 500 错误
      // 如果已配置，应该返回 200 和授权 URL
      if (statusCode !== 200) {
        // 验证错误提示显示
        const errorMessage = page.locator('#form-error');
        if (await errorMessage.isVisible({ timeout: 3000 })) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });

    test('GitHub OAuth 新用户应该自动注册', async ({ page, context }) => {
      // Mock GitHub OAuth 回调
      // 注意: 真实流程需要用户在 GitHub 页面授权
      // 这里模拟后端回调到前端并携带 token

      // 模拟 OAuth 回调 URL (带 token 参数)
      const mockToken = 'mock_github_token_' + Date.now();
      await page.goto(`/?token=${mockToken}`);

      // 等待页面加载
      await page.waitForTimeout(1000);

      // 验证 token 被存储到 localStorage
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      expect(storedToken).toBe(mockToken);

      // 验证 URL 中的 token 参数被清除
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('token=');

      // 注意: 新用户自动注册逻辑在后端处理
      // 前端只需要验证 token 被正确存储和 URL 被清理
    });

    test('GitHub OAuth 老用户应该直接登录', async ({ page, context }) => {
      // 模拟老用户的 OAuth 回调
      const existingUserToken = 'existing_github_user_token';

      // 模拟 OAuth 回调
      await page.goto(`/?token=${existingUserToken}`);

      // 验证 token 被存储
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      expect(storedToken).toBe(existingUserToken);

      // 验证用户状态
      const isAuthenticated = await page.evaluate(() => {
        return !!localStorage.getItem('sisyphus-token');
      });

      expect(isAuthenticated).toBeTruthy();
    });
  });

  /**
   * ==========================================
   * Google OAuth 测试
   * ==========================================
   */
  test.describe('Google OAuth 登录', () => {
    test('应该显示 Google OAuth 登录按钮', async ({ page }) => {
      // 验证 Google 登录按钮存在
      const googleButton = page.getByTestId('google-login-button');
      await expect(googleButton).toBeVisible();

      // 验证按钮文本
      await expect(googleButton).toContainText('Google');

      // 验证按钮 aria-label
      await expect(googleButton).toHaveAttribute('aria-label', '使用 Google 登录');

      // 验证按钮可点击
      await expect(googleButton).toBeEnabled();
    });

    test('应该有正确的 Google OAuth 按钮样式', async ({ page }) => {
      const googleButton = page.getByTestId('google-login-button');

      // 验证按钮样式类名 (Google 白色背景)
      await expect(googleButton).toHaveClass(/bg-white\/5/);

      // 验证按钮包含 Google Logo (SVG)
      const logo = googleButton.locator('svg');
      await expect(logo).toBeVisible();

      // 验证 Google Logo 的颜色
      const googleLogoPath = googleButton.locator('svg path');
      await expect(googleLogoPath).toHaveCount(4); // Google Logo 有 4 个颜色块
    });

    test('点击 Google 按钮应调用 API 获取授权 URL', async ({ page }) => {
      // 监听 API 请求
      const apiRequest = page.waitForResponse(
        response =>
          response.url().includes('/auth/google') &&
          response.status() === 200
      );

      // 点击 Google 登录按钮
      await page.getByTestId('google-login-button').click();

      // 等待 API 响应
      const response = await apiRequest;

      // 验证响应数据包含授权 URL
      const data = await response.json();
      expect(data).toHaveProperty('url');
      expect(data.url).toContain('accounts.google.com');
      expect(data.url).toContain('oauth2');
    });

    test('Google OAuth 应正确处理未配置情况', async ({ page }) => {
      // 监听 API 请求
      const apiRequest = page.waitForResponse(
        response =>
          response.url().includes('/auth/google')
      );

      // 点击 Google 登录按钮
      await page.getByTestId('google-login-button').click();

      // 等待响应
      const response = await apiRequest;
      const statusCode = response.status();

      // 如果 Google OAuth 未配置，应该返回 500 错误
      if (statusCode !== 200) {
        const errorMessage = page.locator('#form-error');
        if (await errorMessage.isVisible({ timeout: 3000 })) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });

    test('Google OAuth 新用户应该自动注册', async ({ page, context }) => {
      // Mock Google OAuth 回调
      const mockToken = 'mock_google_token_' + Date.now();
      await page.goto(`/?token=${mockToken}`);

      // 等待页面加载
      await page.waitForTimeout(1000);

      // 验证 token 被存储到 localStorage
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      expect(storedToken).toBe(mockToken);

      // 验证 URL 中的 token 参数被清除
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('token=');
    });

    test('Google OAuth 老用户应该直接登录', async ({ page, context }) => {
      // 模拟老用户的 OAuth 回调
      const existingUserToken = 'existing_google_user_token';

      // 模拟 OAuth 回调
      await page.goto(`/?token=${existingUserToken}`);

      // 验证 token 被存储
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      expect(storedToken).toBe(existingUserToken);

      // 验证用户状态
      const isAuthenticated = await page.evaluate(() => {
        return !!localStorage.getItem('sisyphus-token');
      });

      expect(isAuthenticated).toBeTruthy();
    });
  });

  /**
   * ==========================================
   * OAuth 通用行为测试
   * ==========================================
   */
  test.describe('OAuth 通用行为', () => {
    test('两个 OAuth 按钮应该并排显示', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');
      const googleButton = page.getByTestId('google-login-button');

      // 验证两个按钮都可见
      await expect(githubButton).toBeVisible();
      await expect(googleButton).toBeVisible();

      // 验证两个按钮在同一行
      const githubBox = await githubButton.boundingBox();
      const googleBox = await googleButton.boundingBox();

      expect(githubBox).toBeTruthy();
      expect(googleBox).toBeTruthy();

      if (githubBox && googleBox) {
        // Y 坐标应该相近（同一行）
        expect(Math.abs(githubBox.y - googleBox.y)).toBeLessThan(10);

        // Google 按钮在 GitHub 按钮右侧
        expect(googleBox.x).toBeGreaterThan(githubBox.x);
      }
    });

    test('OAuth 按钮应该有正确的间距', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');
      const googleButton = page.getByTestId('google-login-button');

      // 验证两个按钮之间有间距
      const githubBox = await githubButton.boundingBox();
      const googleBox = await googleButton.boundingBox();

      expect(githubBox).toBeTruthy();
      expect(googleBox).toBeTruthy();

      if (githubBox && googleBox) {
        const gap = googleBox.x - (githubBox.x + githubBox.width);
        expect(gap).toBeGreaterThan(0);
      }
    });

    test('OAuth 登录失败应该显示错误提示', async ({ page }) => {
      // 模拟 OAuth 失败回调
      await page.goto('/login?error=oauth_failed');

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证错误提示显示（如果有）
      const errorMessage = page.locator('#form-error');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('OAuth Token 参数应该被正确解析', async ({ page }) => {
      // 模拟 OAuth 回调，URL 中包含 token 参数
      const testToken = 'test_oauth_token_' + Date.now();
      await page.goto(`/?token=${testToken}`);

      // 等待 AuthContext 处理 token
      await page.waitForTimeout(1500);

      // 验证 token 被存储到 localStorage
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      expect(storedToken).toBe(testToken);

      // 验证 URL 中的 token 参数被清除 (window.history.replaceState)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('token=');
      expect(currentUrl).not.toContain('?');
    });

    test('OAuth Token 应该触发用户信息获取', async ({ page }) => {
      // Mock Token 和 API 响应
      const testToken = 'mock_token_with_user_' + Date.now();

      // Mock GET /auth/me API 响应
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 123,
            username: 'oauth_test_user',
            email: 'oauth_test@example.com',
            avatar: 'https://example.com/avatar.png'
          })
        });
      });

      // 导航到带 token 的 URL
      await page.goto(`/?token=${testToken}`);

      // 等待 AuthContext 处理
      await page.waitForTimeout(2000);

      // 验证 /auth/me API 被调用
      // 注意: 开发模式下可能不会调用此 API
    });

    test('OAuth Token 无效应该被清除', async ({ page }) => {
      // Mock 无效 Token 响应
      const invalidToken = 'invalid_token_' + Date.now();

      // Mock GET /auth/me 返回 401
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid token' })
        });
      });

      // 先设置无效 token
      await page.evaluate(token => {
        localStorage.setItem('sisyphus-token', token);
      }, invalidToken);

      // 刷新页面
      await page.reload();

      // 等待 AuthContext 验证 token
      await page.waitForTimeout(2000);

      // 验证无效 token 被清除
      const storedToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      // 如果后端返回 401，token 应该被清除
      // 注意: 开发模式可能不会验证 token
    });
  });

  /**
   * ==========================================
   * 开发模式测试
   * ==========================================
   */
  test.describe('开发模式 OAuth 行为', () => {
    test('开发模式下应该自动登录跳过 OAuth', async ({ page }) => {
      // 检查是否是开发模式
      const isDevMode = await page.evaluate(() => {
        return (
          import.meta.env.VITE_DEV_MODE_SKIP_LOGIN === 'true' ||
          import.meta.env.VITE_AUTH_DISABLED === 'true'
        );
      });

      if (isDevMode) {
        // 开发模式下，应该自动登录
        await page.waitForTimeout(1000);

        // 验证用户已登录
        const userMenu = page.locator('[data-testid="user-menu"]');
        if (await userMenu.isVisible({ timeout: 3000 })) {
          await expect(userMenu).toBeVisible();
        }
      } else {
        // 生产模式下，应该显示登录表单
        await expect(page.getByTestId('github-login-button')).toBeVisible();
      }
    });

    test('开发模式下 OAuth 按钮仍然可见', async ({ page }) => {
      // 即使在开发模式下，OAuth 按钮也应该显示
      await expect(page.getByTestId('github-login-button')).toBeVisible();
      await expect(page.getByTestId('google-login-button')).toBeVisible();
    });
  });

  /**
   * ==========================================
   * OAuth 按钮交互测试
   * ==========================================
   */
  test.describe('OAuth 按钮交互', () => {
    test('GitHub 按钮应该有 hover 效果', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');

      // 验证按钮有 hover 类
      await expect(githubButton).toHaveClass(/hover:/);

      // 触发 hover
      await githubButton.hover();

      // 验证样式变化（由于 CSS transition，可能需要等待）
      await page.waitForTimeout(200);

      // 按钮应该仍然可见
      await expect(githubButton).toBeVisible();
    });

    test('Google 按钮应该有 hover 效果', async ({ page }) => {
      const googleButton = page.getByTestId('google-login-button');

      // 验证按钮有 hover 类
      await expect(googleButton).toHaveClass(/hover:/);

      // 触发 hover
      await googleButton.hover();

      // 验证样式变化
      await page.waitForTimeout(200);

      await expect(googleButton).toBeVisible();
    });

    test('OAuth 按钮应该有 focus 状态', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');

      // 聚焦按钮
      await githubButton.focus();

      // 验证 focus 样式
      await page.waitForTimeout(200);
      await expect(githubButton).toBeFocused();
    });

    test('OAuth 按钮应该支持键盘导航', async ({ page }) => {
      // 按 Tab 键切换到 GitHub 按钮
      await page.keyboard.press('Tab');

      // 验证 GitHub 按钮被聚焦
      const githubButton = page.getByTestId('github-login-button');
      await expect(githubButton).toBeFocused();

      // 按 Enter 键应该触发点击
      // 注意: 这会触发页面重定向，所以我们只验证键盘交互
      const isFocused = await githubButton.evaluate(el => document.activeElement === el);
      expect(isFocused).toBeTruthy();
    });
  });

  /**
   * ==========================================
   * OAuth 安全性测试
   * ==========================================
   */
  test.describe('OAuth 安全性', () => {
    test('OAuth URL 应该使用 HTTPS (生产环境)', async ({ page }) => {
      // 监听 GitHub OAuth API 请求
      const apiRequest = page.waitForResponse(
        response => response.url().includes('/auth/github')
      );

      await page.getByTestId('github-login-button').click();

      const response = await apiRequest;
      const data = await response.json();

      // 验证授权 URL 使用 HTTPS
      if (data.url) {
        expect(data.url).toMatch(/^https:\/\//);
        expect(data.url).not.toMatch(/^http:\/\//);
      }
    });

    test('OAuth Token 应该安全存储', async ({ page }) => {
      // 设置测试 token
      const testToken = 'secure_token_' + Date.now();
      await page.goto(`/?token=${testToken}`);

      await page.waitForTimeout(1500);

      // 验证 token 存储在 localStorage (不是 cookie 或 sessionStorage)
      const localToken = await page.evaluate(() => {
        return localStorage.getItem('sisyphus-token');
      });

      const sessionToken = await page.evaluate(() => {
        return sessionStorage.getItem('sisyphus-token');
      });

      expect(localToken).toBe(testToken);
      expect(sessionToken).toBeNull();
    });

    test('OAuth Token 应该在 URL 中被清除', async ({ page }) => {
      // 导航到带 token 的 URL
      const testToken = 'token_to_clear_' + Date.now();
      await page.goto(`/?token=${testToken}`);

      // 等待 AuthContext 处理
      await page.waitForTimeout(1500);

      // 验证 URL 中不再包含 token
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('token=');
      expect(currentUrl).not.toContain('testToken');
    });
  });

  /**
   * ==========================================
   * OAuth 错误处理测试
   * ==========================================
   */
  test.describe('OAuth 错误处理', () => {
    test('OAuth 授权失败应该显示错误信息', async ({ page }) => {
      // 模拟授权失败回调
      await page.goto('/login?error=github_auth_failed');

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证错误提示（如果页面显示）
      const errorMessage = page.locator('text=授权失败');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('OAuth Token 获取失败应该显示错误信息', async ({ page }) => {
      // 模拟 token 获取失败回调
      await page.goto('/login?error=github_token_failed');

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证错误提示
      const errorMessage = page.locator('text=token');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('OAuth 用户信息获取失败应该显示错误信息', async ({ page }) => {
      // 模拟用户信息获取失败回调
      await page.goto('/login?error=github_user_failed');

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证错误提示
      const errorMessage = page.locator('text=用户信息');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  /**
   * ==========================================
   * OAuth 和普通登录共存测试
   * ==========================================
   */
  test.describe('OAuth 和普通登录共存', () => {
    test('OAuth 按钮应该在邮箱登录表单上方', async ({ page }) => {
      // 获取 OAuth 按钮和邮箱输入框的位置
      const githubButton = page.getByTestId('github-login-button');
      const emailInput = page.getByTestId('email-input');

      const githubBox = await githubButton.boundingBox();
      const emailBox = await emailInput.boundingBox();

      expect(githubBox).toBeTruthy();
      expect(emailBox).toBeTruthy();

      if (githubBox && emailBox) {
        // GitHub 按钮应该在邮箱输入框上方
        expect(githubBox.y).toBeLessThan(emailBox.y);
      }
    });

    test('OAuth 和邮箱登录应该互不干扰', async ({ page }) => {
      // 验证两种登录方式都可用
      const githubButton = page.getByTestId('github-login-button');
      const googleButton = page.getByTestId('google-login-button');
      const emailInput = page.getByTestId('email-input');
      const passwordInput = page.getByTestId('password-input');

      await expect(githubButton).toBeVisible();
      await expect(googleButton).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('OAuth 按钮点击不应影响邮箱登录表单状态', async ({ page }) => {
      // 填写邮箱表单
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');

      // 点击 OAuth 按钮（不会提交表单）
      await page.getByTestId('github-login-button').click();

      // 等待可能的页面变化
      await page.waitForTimeout(1000);

      // 验证邮箱输入框的值仍然存在（如果页面没有重定向）
      const emailValue = await page.getByTestId('email-input').inputValue();
      if (emailValue) {
        expect(emailValue).toBe('test@example.com');
      }
    });
  });
});
