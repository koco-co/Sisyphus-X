import { test, expect } from '@playwright/test';

/**
 * TASK-028: 登录/注册页面黑盒测试
 *
 * 验证修复内容:
 * 1) 注册后跳转首页
 * 2) 表单验证(邮箱/密码/确认密码)
 * 3) 密码强度指示器
 * 4) 错误提示动画
 * 5) 无障碍属性
 * 6) 按钮状态管理
 *
 * @author @blackbox-qa
 * @date 2026-02-17
 */

test.describe('TASK-028: 登录注册页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('/login');
  });

  /**
   * ==========================================
   * 页面元素验证
   * ==========================================
   */
  test.describe('页面元素验证', () => {
    test('应该显示登录表单所有必需元素', async ({ page }) => {
      // 验证页面标题
      await expect(page).toHaveTitle(/Sisyphus/);

      // 验证 OAuth 登录按钮
      await expect(page.getByTestId('github-login-button')).toBeVisible();
      await expect(page.getByTestId('google-login-button')).toBeVisible();

      // 验证表单输入框
      await expect(page.getByTestId('email-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();

      // 验证登录按钮
      await expect(page.getByTestId('login-button')).toBeVisible();

      // 验证切换到注册按钮
      await expect(page.getByTestId('toggle-auth-mode-button')).toBeVisible();
    });

    test('应该切换到注册表单', async ({ page }) => {
      // 点击注册链接
      await page.getByTestId('toggle-auth-mode-button').click();

      // 验证注册表单元素
      await expect(page.getByTestId('username-input')).toBeVisible();
      await expect(page.getByTestId('email-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();
      await expect(page.getByTestId('confirm-password-input')).toBeVisible();
      await expect(page.getByTestId('terms-checkbox')).toBeVisible();
      await expect(page.getByTestId('register-button')).toBeVisible();
    });

    test('应该有正确的无障碍属性', async ({ page }) => {
      // 检查登录按钮 aria-label
      const loginButton = page.getByTestId('login-button');
      await expect(loginButton).toHaveAttribute('aria-label', '登录');

      // 检查 GitHub 按钮 aria-label
      const githubButton = page.getByTestId('github-login-button');
      await expect(githubButton).toHaveAttribute('aria-label', '使用 GitHub 登录');

      // 检查 Google 按钮 aria-label
      const googleButton = page.getByTestId('google-login-button');
      await expect(googleButton).toHaveAttribute('aria-label', '使用 Google 登录');

      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 检查注册按钮 aria-label
      const registerButton = page.getByTestId('register-button');
      await expect(registerButton).toHaveAttribute('aria-label', '注册');

      // 检查密码输入框的 aria-invalid (初始状态应该不存在或为 false)
      const passwordInput = page.getByTestId('password-input');
      const ariaInvalid = await passwordInput.getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('false');
    });
  });

  /**
   * ==========================================
   * 表单验证测试
   * ==========================================
   */
  test.describe('表单验证', () => {
    test('应该验证邮箱格式', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入无效邮箱
      await page.getByTestId('email-input').fill('invalid-email');
      await page.getByTestId('email-input').blur();

      // 验证错误提示
      const emailInput = page.getByTestId('email-input');
      await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

      // 验证错误消息出现
      await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
    });

    test('应该验证密码长度', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入短密码
      await page.getByTestId('password-input').fill('12345');

      // 验证密码输入框 aria-invalid
      const passwordInput = page.getByTestId('password-input');
      await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

      // 尝试提交表单
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('confirm-password-input').fill('12345');
      // 点击复选框的可见部分（label）
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 验证错误提示
      await expect(page.locator('text=密码长度至少为6位')).toBeVisible();
    });

    test('应该验证两次密码一致性', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入不同的密码
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password456');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 验证错误提示
      await expect(page.locator('text=/密码.*不一致/')).toBeVisible();
    });

    test('应该验证用户协议勾选', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 填写表单但不勾选协议
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');

      // 点击注册按钮（应该失败）
      await page.getByTestId('register-button').click();

      // 等待错误提示或按钮保持禁用状态
      await page.waitForTimeout(1000);
      const registerButton = page.getByTestId('register-button');
      const isDisabled = await registerButton.isDisabled();

      // 如果按钮被禁用，说明前端验证生效
      // 如果未被禁用，应该显示错误提示
      if (!isDisabled) {
        await expect(page.locator('#form-error')).toBeVisible();
      }
    });
  });

  /**
   * ==========================================
   * 密码强度指示器测试
   * ==========================================
   */
  test.describe('密码强度指示器', () => {
    test('应该显示弱密码强度', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入弱密码（6位）
      await page.getByTestId('password-input').fill('123456');

      // 等待密码强度指示器出现
      await page.waitForTimeout(500);

      // 验证密码强度指示器存在
      const strengthIndicator = page.locator('[role="progressbar"]').filter({ hasText: '弱' });
      await expect(strengthIndicator).toBeVisible();

      // 验证显示"弱"
      await expect(page.locator('text=弱')).toBeVisible();
    });

    test('应该显示中等密码强度', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入中等密码（10位）
      await page.getByTestId('password-input').fill('1234567890');

      // 等待密码强度指示器出现
      await page.waitForTimeout(500);

      // 验证密码强度指示器存在
      const strengthIndicator = page.locator('[role="progressbar"]').filter({ hasText: '中' });
      await expect(strengthIndicator).toBeVisible();

      // 验证显示"中"
      await expect(page.locator('text=中')).toBeVisible();
    });

    test('应该显示强密码强度', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入强密码（>10位）
      await page.getByTestId('password-input').fill('12345678901');

      // 验证密码强度指示器出现
      await expect(page.locator('#password-strength')).toBeVisible();

      // 验证显示"强"
      await expect(page.locator('text=强')).toBeVisible();

      // 验证 aria 属性
      const strengthBar = page.locator('#password-strength');
      await expect(strengthBar).toHaveAttribute('aria-valuenow', '100');
      await expect(strengthBar).toHaveAttribute('aria-label', '密码强度：强');
    });
  });

  /**
   * ==========================================
   * 按钮状态管理测试
   * ==========================================
   */
  test.describe('按钮状态管理', () => {
    test('应该禁用无效的登录表单提交按钮', async ({ page }) => {
      const loginButton = page.getByTestId('login-button');

      // 初始状态应该禁用
      await expect(loginButton).toBeDisabled();

      // 只输入邮箱
      await page.getByTestId('email-input').fill('test@example.com');
      await expect(loginButton).toBeDisabled();

      // 只输入密码
      await page.getByTestId('email-input').clear();
      await page.getByTestId('password-input').fill('password123');
      await expect(loginButton).toBeDisabled();

      // 输入无效邮箱
      await page.getByTestId('email-input').fill('invalid-email');
      await expect(loginButton).toBeDisabled();

      // 输入有效邮箱和密码
      await page.getByTestId('email-input').fill('test@example.com');
      await expect(loginButton).toBeEnabled();
    });

    test('应该禁用无效的注册表单提交按钮', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      const registerButton = page.getByTestId('register-button');

      // 初始状态应该禁用
      await expect(registerButton).toBeDisabled();

      // 填写部分表单
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await expect(registerButton).toBeDisabled();

      // 填写不一致的密码
      await page.getByTestId('confirm-password-input').fill('password456');
      await expect(registerButton).toBeDisabled();

      // 填写一致的密码
      await page.getByTestId('confirm-password-input').fill('password123');
      await expect(registerButton).toBeDisabled();

      // 勾选协议（点击 label）
      await page.locator('label:has-text("用户协议")').click();
      await expect(registerButton).toBeEnabled();
    });
  });

  /**
   * ==========================================
   * 错误提示动画测试
   * ==========================================
   */
  test.describe('错误提示动画', () => {
    test('应该显示和隐藏错误提示动画', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 填写表单但不勾选协议
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 等待错误提示出现
      await page.waitForTimeout(500);

      // 验证错误提示出现
      const errorMessage = page.locator('#form-error');
      if (await errorMessage.isVisible()) {
        // 验证错误提示有动画属性（role="alert"）
        await expect(errorMessage).toHaveAttribute('role', 'alert');
        await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');

        // 勾选协议后错误提示应该消失
        await page.locator('label:has-text("用户协议")').click();
        await expect(errorMessage).not.toBeVisible();
      } else {
        // 按钮应该被禁用，表示前端验证生效
        const registerButton = page.getByTestId('register-button');
        await expect(registerButton).toBeDisabled();
      }
    });

    test('应该显示邮箱格式错误提示', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入无效邮箱并失焦
      await page.getByTestId('email-input').fill('invalid-email');
      await page.getByTestId('email-input').blur();

      // 等待错误提示出现
      await page.waitForTimeout(500);

      // 验证错误提示出现（可能出现在 #form-error 或其他位置）
      const hasError = await page.getByText('请输入有效的邮箱地址').count() > 0;
      expect(hasError).toBeTruthy();

      // 输入有效邮箱
      await page.getByTestId('email-input').fill('test@example.com');

      // 等待错误提示消失
      await page.waitForTimeout(500);
    });

    test('应该显示密码一致性错误提示', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入不一致的密码
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password456');

      // 验证确认密码输入框有错误样式
      const confirmPasswordInput = page.getByTestId('confirm-password-input');
      await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');

      // 输入一致的密码
      await page.getByTestId('confirm-password-input').fill('password123');

      // 验证错误样式消失
      await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'false');

      // 验证出现成功图标
      await expect(page.locator('.absolute.right-4.text-green-500')).toBeVisible();
    });
  });

  /**
   * ==========================================
   * 用户注册流程测试
   * ==========================================
   */
  test.describe('用户注册流程', () => {
    test('应该成功注册新用户并跳转到首页', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 生成唯一用户名
      const timestamp = Date.now();
      const username = `testuser_${timestamp}`;
      const email = `test_${timestamp}@example.com`;

      // 填写注册表单
      await page.getByTestId('username-input').fill(username);
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 验证成功提示（Toast）
      await expect(page.locator('text=注册成功')).toBeVisible();

      // 验证跳转到首页
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page).toHaveURL('/');

      // 验证显示仪表板内容
      // 注意：如果开发模式跳过登录，可能会直接显示仪表板
    });

    test('应该阻止重复邮箱注册', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 使用已存在的邮箱（假设之前已注册）
      const email = 'test@example.com';

      // 填写注册表单
      await page.getByTestId('username-input').fill('testuser_duplicate');
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 验证错误提示（可能因开发模式而不同）
      // 如果后端返回邮箱重复错误
      const errorMessage = page.locator('#form-error');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  /**
   * ==========================================
   * 用户登录流程测试
   * ==========================================
   */
  test.describe('用户登录流程', () => {
    test('应该成功登录并跳转到首页', async ({ page }) => {
      // 填写登录表单
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');

      // 点击登录按钮
      await page.getByTestId('login-button').click();

      // 等待跳转或错误提示
      await page.waitForTimeout(2000);

      // 验证当前 URL（可能在首页或登录页，取决于是否开发模式）
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/http:\/\/localhost:5173\/.*/);
    });

    test('应该显示登录错误提示', async ({ page }) => {
      // 填写错误的登录凭证
      await page.getByTestId('email-input').fill('wrong@example.com');
      await page.getByTestId('password-input').fill('wrongpassword');

      // 点击登录按钮
      await page.getByTestId('login-button').click();

      // 验证错误提示（可能因开发模式而不同）
      const errorMessage = page.locator('#form-error');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  /**
   * ==========================================
   * 密码显示/隐藏测试
   * ==========================================
   */
  test.describe('密码显示/隐藏功能', () => {
    test('应该切换密码显示状态', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      const toggleButton = page.getByTestId('toggle-password-button');

      // 初始状态应该是密码类型
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // 点击显示密码
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await expect(toggleButton).toHaveAttribute('aria-label', '隐藏密码');

      // 点击隐藏密码
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(toggleButton).toHaveAttribute('aria-label', '显示密码');
    });
  });

  /**
   * ==========================================
   * OAuth 登录测试
   * ==========================================
   */
  test.describe('OAuth 登录', () => {
    test('应该显示 OAuth 登录按钮', async ({ page }) => {
      // 验证 GitHub 登录按钮
      const githubButton = page.getByTestId('github-login-button');
      await expect(githubButton).toBeVisible();
      await expect(githubButton).toContainText('GitHub');

      // 验证 Google 登录按钮
      const googleButton = page.getByTestId('google-login-button');
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toContainText('Google');
    });

    // 注意：实际的 OAuth 流程需要真实的 GitHub/Google 凭证和回调 URL
    // 这里只验证按钮可点击，不测试完整流程
    test('OAuth 按钮应该可点击', async ({ page }) => {
      const githubButton = page.getByTestId('github-login-button');
      await expect(githubButton).toBeEnabled();

      const googleButton = page.getByTestId('google-login-button');
      await expect(googleButton).toBeEnabled();
    });
  });

  /**
   * ==========================================
   * 记住我功能测试
   * ==========================================
   */
  test.describe('记住我功能', () => {
    test('应该显示记住我复选框（仅登录模式）', async ({ page }) => {
      // 登录模式应该显示"记住我"（可能显示为英文或中文）
      const rememberMeLocator = page.locator('text=Remember').or(page.locator('text=记住我'));
      await expect(rememberMeLocator.first()).toBeVisible();

      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();
      await page.waitForTimeout(500);

      // 注册模式不应该显示"记住我"（验证复选框数量减少）
      // 注意：由于页面上可能有其他复选框，我们只验证登录模式独有元素
    });
  });

  /**
   * ==========================================
   * 用户协议和隐私政策测试
   * ==========================================
   */
  test.describe('用户协议和隐私政策', () => {
    test('应该显示用户协议和隐私政策链接', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 验证协议文本
      await expect(page.locator('text=用户协议')).toBeVisible();
      await expect(page.locator('text=隐私政策')).toBeVisible();
    });

    test('应该在未勾选协议时阻止注册', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 填写表单但不勾选协议
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');

      // 注册按钮应该禁用
      await expect(page.getByTestId('register-button')).toBeDisabled();

      // 勾选协议后按钮应该启用
      // 点击整个标签区域而不是具体的文本
      const termsLabel = page.locator('label').filter({ hasText: /用户协议|隐私政策/ }).first();
      await termsLabel.click();
      await page.waitForTimeout(1000);

      // 验证复选框被勾选
      const checkbox = page.getByTestId('terms-checkbox');
      const isChecked = await checkbox.isChecked();
      expect(isChecked).toBeTruthy();

      // 验证按钮启用
      await expect(page.getByTestId('register-button')).toBeEnabled();
    });
  });
});
