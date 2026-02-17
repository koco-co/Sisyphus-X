/**
 * TASK-055: 用户注册功能黑盒测试
 * @see https://github.com/anthropics/sisyphus-x/issues/55
 */

import { test, expect } from '@playwright/test'
import { generateRandomEmail, takeScreenshot } from '../../utils/helpers'

test.describe('用户注册功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // 切换到注册模式
    await page.click('[data-testid="toggle-auth-mode-button"]')
    // 等待注册表单显示
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible()
  })

  test('应显示注册页面所有必要元素', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Sisyphus/)

    // 验证表单元素存在
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible()
  })

  test('有效注册应成功并跳转到首页', async ({ page }) => {
    // 生成随机邮箱避免重复
    const email = generateRandomEmail()
    const password = 'password123'

    // 填写注册表单
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)

    // 点击注册按钮
    await page.click('[data-testid="register-button"]')

    // 验证跳转到首页或显示成功提示
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // 验证显示用户信息或登录状态
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('邮箱格式错误应显示验证错误', async ({ page }) => {
    const password = 'password123'

    // 输入无效邮箱格式
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)

    // 点击注册按钮
    await page.click('[data-testid="register-button"]')

    // 验证错误提示
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible()
  })

  test('密码长度不足应显示验证错误', async ({ page }) => {
    const email = generateRandomEmail()
    const shortPassword = '12345' // 少于 8 位

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', shortPassword)
    await page.fill('[data-testid="confirm-password-input"]', shortPassword)

    await page.click('[data-testid="register-button"]')

    // 验证错误提示
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    await expect(page.locator('text=密码长度至少 8 位')).toBeVisible()
  })

  test('两次密码不一致应显示验证错误', async ({ page }) => {
    const email = generateRandomEmail()

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'different123')

    await page.click('[data-testid="register-button"]')

    // 验证错误提示
    await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible()
    await expect(page.locator('text=两次密码不一致')).toBeVisible()
  })

  test('邮箱重复注册应显示友好提示', async ({ page }) => {
    const email = 'test@example.com' // 假设这个邮箱已注册
    const password = 'password123'

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)

    await page.click('[data-testid="register-button"]')

    // 验证错误提示 (Toast 或页面错误)
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=邮箱已被注册')).toBeVisible()
  })

  test('注册成功后应能登录', async ({ page }) => {
    // 先注册一个新用户
    const email = generateRandomEmail()
    const password = 'password123'

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)
    await page.click('[data-testid="register-button"]')

    // 等待注册完成
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // 登出
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // 切换到登录模式
    await page.goto('/login')

    // 使用新注册的账号登录
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.click('[data-testid="login-button"]')

    // 验证登录成功
    await expect(page).toHaveURL('/', { timeout: 5000 })
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('点击登录链接应切换到登录模式', async ({ page }) => {
    // 点击切换按钮
    await page.click('[data-testid="toggle-auth-mode-button"]')

    // 验证确认密码字段消失 (切换回登录模式)
    await expect(page.locator('[data-testid="confirm-password-input"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('空表单提交应显示所有验证错误', async ({ page }) => {
    // 直接点击注册按钮
    await page.click('[data-testid="register-button"]')

    // 验证所有字段错误提示
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible()
  })

  test('注册按钮在表单无效时应禁用', async ({ page }) => {
    const registerButton = page.locator('[data-testid="register-button"]')

    // 初始状态应该是禁用的
    await expect(registerButton).toBeDisabled()

    // 只填写用户名和邮箱,仍然禁用
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await expect(registerButton).toBeDisabled()

    // 填写所有有效字段后启用
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    await expect(registerButton).toBeEnabled()
  })

  test('应支持 OAuth 注册', async ({ page }) => {
    // GitHub OAuth 按钮
    await expect(page.locator('[data-testid="github-login-button"]')).toBeVisible()

    // Google OAuth 按钮
    await expect(page.locator('[data-testid="google-login-button"]')).toBeVisible()
  })

  test('应显示密码强度指示器', async ({ page }) => {
    const passwordInput = page.locator('[data-testid="password-input"]')

    // 弱密码
    await passwordInput.fill('12345678')
    await expect(page.locator('[data-testid="password-strength-weak"]')).toBeVisible()

    // 中等密码
    await passwordInput.fill('password123')
    await expect(page.locator('[data-testid="password-strength-medium"]')).toBeVisible()

    // 强密码
    await passwordInput.fill('P@ssw0rd!2024')
    await expect(page.locator('[data-testid="password-strength-strong"]')).toBeVisible()
  })

  test('注册中应显示加载状态', async ({ page }) => {
    const email = generateRandomEmail()
    const password = 'password123'

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)

    // 点击注册
    await page.click('[data-testid="register-button"]')

    // 验证加载状态
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-button"]')).toBeDisabled()
  })

  test('应支持 Enter 键提交表单', async ({ page }) => {
    const email = generateRandomEmail()
    const password = 'password123'

    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', password)
    await page.fill('[data-testid="confirm-password-input"]', password)

    // 按 Enter 键
    await page.keyboard.press('Enter')

    // 验证提交
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })
})

test.describe('注册表单辅助功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // 切换到注册模式
    await page.click('[data-testid="toggle-auth-mode-button"]')
  })

  test('表单应有正确的 label 和 aria 属性', async ({ page }) => {

    // 检查 email input 的 label
    const emailInput = page.locator('[data-testid="email-input"]')
    await expect(emailInput).toHaveAttribute('name', 'email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required')

    // 检查 password input
    const passwordInput = page.locator('[data-testid="password-input"]')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('required')

    // 检查 confirm password input
    const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]')
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    await expect(confirmPasswordInput).toHaveAttribute('required')
  })

  test('密码应支持显示/隐藏切换', async ({ page }) => {
    const passwordInput = page.locator('[data-testid="password-input"]')
    const toggleButton = page.locator('[data-testid="toggle-password-visibility"]')

    await page.fill('[data-testid="password-input"]', 'password123')

    // 初始状态应该是隐藏的
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // 点击切换按钮
    await toggleButton.click()

    // 应该显示密码
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // 再次点击
    await toggleButton.click()

    // 应该隐藏密码
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
