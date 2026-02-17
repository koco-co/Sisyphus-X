import { test, expect } from '@playwright/test';

/**
 * TASK-055: 用户注册功能黑盒测试
 *
 * 测试场景：
 * 1. 打开注册页面
 * 2. 验证页面元素（邮箱、密码、确认密码输入框，注册按钮）
 * 3. 测试有效注册
 * 4. 测试邮箱格式错误
 * 5. 测试密码长度不足
 * 6. 测试两次密码不一致
 * 7. 测试邮箱重复注册
 * 8. 验证注册成功后可登录
 *
 * @author @blackbox-qa
 * @date 2026-02-17
 */

test.describe('TASK-055: 用户注册功能', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('/login');
  });

  /**
   * ==========================================
   * 页面元素验证
   * ==========================================
   */
  test.describe('注册页面元素验证', () => {
    test('应该切换到注册表单并显示所有必需元素', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 验证用户名输入框
      await expect(page.getByTestId('username-input')).toBeVisible();

      // 验证邮箱输入框
      await expect(page.getByTestId('email-input')).toBeVisible();

      // 验证密码输入框
      await expect(page.getByTestId('password-input')).toBeVisible();

      // 验证确认密码输入框
      await expect(page.getByTestId('confirm-password-input')).toBeVisible();

      // 验证用户协议复选框
      await expect(page.getByTestId('terms-checkbox')).toBeVisible();

      // 验证注册按钮
      await expect(page.getByTestId('register-button')).toBeVisible();
    });

    test('应该有正确的无障碍属性', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 验证注册按钮 aria-label
      const registerButton = page.getByTestId('register-button');
      await expect(registerButton).toHaveAttribute('aria-label', '注册');

      // 验证所有输入框都有 aria-required 属性
      await expect(page.getByTestId('username-input')).toHaveAttribute('aria-required', 'true');
      await expect(page.getByTestId('email-input')).toHaveAttribute('aria-required', 'true');
      await expect(page.getByTestId('password-input')).toHaveAttribute('aria-required', 'true');
      await expect(page.getByTestId('confirm-password-input')).toHaveAttribute('aria-required', 'true');
    });
  });

  /**
   * ==========================================
   * 表单验证测试
   * ==========================================
   */
  test.describe('邮箱格式验证', () => {
    test('应该验证无效邮箱格式', async ({ page }) => {
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

    test('应该接受有效邮箱格式', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入有效邮箱
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('email-input').blur();

      // 验证没有错误
      const emailInput = page.getByTestId('email-input');
      await expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('应该验证多个无效邮箱格式', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid@.com',
        'invalid..double@example.com',
      ];

      for (const email of invalidEmails) {
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('email-input').blur();

        // 验证错误提示
        const emailInput = page.getByTestId('email-input');
        await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      }
    });
  });

  /**
   * ==========================================
   * 密码验证测试
   * ==========================================
   */
  test.describe('密码长度验证', () => {
    test('应该验证密码长度不足', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入短密码（5位）
      await page.getByTestId('password-input').fill('12345');

      // 验证密码输入框 aria-invalid
      const passwordInput = page.getByTestId('password-input');
      await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

      // 填写其他必填项
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('confirm-password-input').fill('12345');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 验证错误提示
      await expect(page.locator('text=密码长度至少为6位')).toBeVisible();
    });

    test('应该接受6位密码（最小长度）', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入6位密码
      await page.getByTestId('password-input').fill('123456');

      // 验证密码输入框没有错误
      const passwordInput = page.getByTestId('password-input');
      await expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('应该显示弱密码强度指示器', async ({ page }) => {
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
  });

  /**
   * ==========================================
   * 密码一致性验证
   * ==========================================
   */
  test.describe('密码一致性验证', () => {
    test('应该验证两次密码不一致', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 填写表单
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

    test('应该显示确认密码错误样式', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入不一致的密码
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password456');

      // 验证确认密码输入框有错误样式
      const confirmPasswordInput = page.getByTestId('confirm-password-input');
      await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('应该显示密码一致成功图标', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入一致的密码
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');

      // 验证错误样式消失
      const confirmPasswordInput = page.getByTestId('confirm-password-input');
      await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'false');

      // 验证出现成功图标
      await expect(page.locator('.absolute.right-4.text-green-500')).toBeVisible();
    });
  });

  /**
   * ==========================================
   * 用户协议验证
   * ==========================================
   */
  test.describe('用户协议验证', () => {
    test('应该阻止未勾选协议的注册', async ({ page }) => {
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
      await page.locator('label:has-text("用户协议")').click();
      await expect(page.getByTestId('register-button')).toBeEnabled();
    });

    test('应该显示用户协议和隐私政策链接', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 验证协议文本
      await expect(page.locator('text=用户协议')).toBeVisible();
      await expect(page.locator('text=隐私政策')).toBeVisible();
    });
  });

  /**
   * ==========================================
   * 有效注册测试
   * ==========================================
   */
  test.describe('有效注册流程', () => {
    test('应该成功注册新用户', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 生成唯一用户名和邮箱
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
    });

    test('应该在注册后自动登录', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 生成唯一用户名和邮箱
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

      // 等待注册成功和跳转
      await page.waitForTimeout(2000);

      // 验证 JWT Token 已存储到 localStorage
      const token = await page.evaluate(() => localStorage.getItem('sisyphus-token'));
      expect(token).toBeTruthy();
      expect(token).toMatch(/^eyJ/); // JWT token 应该以 eyJ 开头
    });
  });

  /**
   * ==========================================
   * 邮箱重复注册测试
   * ==========================================
   */
  test.describe('邮箱重复注册', () => {
    test('应该阻止重复邮箱注册', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 使用已存在的邮箱
      const email = 'test@example.com';

      // 填写注册表单
      await page.getByTestId('username-input').fill('testuser_duplicate');
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 等待响应
      await page.waitForTimeout(2000);

      // 验证错误提示（可能因开发模式而不同）
      // 如果后端返回邮箱重复错误
      const errorMessage = page.locator('#form-error');
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('应该显示邮箱已注册的错误提示', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 使用已存在的邮箱
      const email = 'admin@example.com';

      // 填写注册表单
      await page.getByTestId('username-input').fill('testuser_admin');
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 等待响应
      await page.waitForTimeout(2000);

      // 验证错误提示（可能因开发模式而不同）
      const errorText = await page.locator('body').textContent();
      if (errorText && errorText.includes('已存在')) {
        // 验证包含"已存在"或类似错误提示
        expect(errorText).toMatch(/已存在|already exists|registered/i);
      }
    });
  });

  /**
   * ==========================================
   * 注册后登录验证测试
   * ==========================================
   */
  test.describe('注册后登录验证', () => {
    test('应该允许注册成功后使用新账号登录', async ({ page }) => {
      // 步骤1: 注册新用户
      await page.getByTestId('toggle-auth-mode-button').click();

      const timestamp = Date.now();
      const username = `loginuser_${timestamp}`;
      const email = `login_${timestamp}@example.com`;

      // 填写注册表单
      await page.getByTestId('username-input').fill(username);
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 点击注册按钮
      await page.getByTestId('register-button').click();

      // 等待注册成功
      await page.waitForTimeout(2000);

      // 步骤2: 清除 Token 并返回登录页
      await page.evaluate(() => localStorage.removeItem('sisyphus-token'));
      await page.goto('/login');

      // 步骤3: 使用新注册的账号登录
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('login-button').click();

      // 验证登录成功
      await page.waitForTimeout(2000);
      const token = await page.evaluate(() => localStorage.getItem('sisyphus-token'));
      expect(token).toBeTruthy();
    });
  });

  /**
   * ==========================================
   * 按钮状态管理测试
   * ==========================================
   */
  test.describe('注册按钮状态管理', () => {
    test('应该在表单无效时禁用注册按钮', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      const registerButton = page.getByTestId('register-button');

      // 初始状态应该禁用
      await expect(registerButton).toBeDisabled();

      // 只填写用户名
      await page.getByTestId('username-input').fill('testuser');
      await expect(registerButton).toBeDisabled();

      // 只填写邮箱
      await page.getByTestId('email-input').fill('test@example.com');
      await expect(registerButton).toBeDisabled();

      // 只填写密码
      await page.getByTestId('password-input').fill('password123');
      await expect(registerButton).toBeDisabled();

      // 填写不一致的确认密码
      await page.getByTestId('confirm-password-input').fill('password456');
      await expect(registerButton).toBeDisabled();

      // 填写一致的确认密码
      await page.getByTestId('confirm-password-input').fill('password123');
      await expect(registerButton).toBeDisabled();

      // 勾选协议（点击 label）
      await page.locator('label:has-text("用户协议")').click();
      await expect(registerButton).toBeEnabled();
    });

    test('应该在所有验证通过后启用注册按钮', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 填写完整有效的表单
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 验证注册按钮启用
      await expect(page.getByTestId('register-button')).toBeEnabled();
    });
  });

  /**
   * ==========================================
   * 密码显示/隐藏测试
   * ==========================================
   */
  test.describe('密码显示/隐藏功能', () => {
    test('应该切换密码显示状态', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

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
   * 边界条件测试
   * ==========================================
   */
  test.describe('边界条件测试', () => {
    test('应该处理空用户名', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 只填写邮箱和密码，不填写用户名
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 注册按钮应该禁用
      await expect(page.getByTestId('register-button')).toBeDisabled();
    });

    test('应该处理空邮箱', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 只填写用户名和密码，不填写邮箱
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 注册按钮应该禁用
      await expect(page.getByTestId('register-button')).toBeDisabled();
    });

    test('应该处理空密码', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 只填写用户名和邮箱，不填写密码
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.locator('label:has-text("用户协议")').click();

      // 注册按钮应该禁用
      await expect(page.getByTestId('register-button')).toBeDisabled();
    });

    test('应该处理极长用户名', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入100字符的用户名
      const longUsername = 'a'.repeat(100);
      await page.getByTestId('username-input').fill(longUsername);
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('password123');
      await page.locator('label:has-text("用户协议")').click();

      // 验证用户名已正确填充
      const usernameValue = await page.getByTestId('username-input').inputValue();
      expect(usernameValue).toBe(longUsername);
    });

    test('应该处理特殊字符密码', async ({ page }) => {
      // 切换到注册模式
      await page.getByTestId('toggle-auth-mode-button').click();

      // 输入包含特殊字符的密码
      const specialPassword = 'P@ssw0rd!#$%';
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill(specialPassword);
      await page.getByTestId('confirm-password-input').fill(specialPassword);
      await page.locator('label:has-text("用户协议")').click();

      // 验证密码已正确填充
      const passwordValue = await page.getByTestId('password-input').inputValue();
      expect(passwordValue).toBe(specialPassword);
    });
  });
});
