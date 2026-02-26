/**
 * 测试辅助函数
 */

import { Page, Locator } from '@playwright/test'

/**
 * 等待 API 响应
 * @param page Playwright Page 对象
 * @param url API URL (支持正则或字符串)
 */
export async function waitForApiResponse(page: Page, url: string | RegExp) {
  return await page.waitForResponse(
    (response) =>
      response.url().includes(url.toString()) || response.status() === 200
  )
}

/**
 * 等待 Toast 消息出现
 * @param page Playwright Page 对象
 * @param message Toast 消息内容
 */
export async function waitForToast(page: Page, message: string) {
  await page.waitForSelector(`[data-testid="toast-message"]:has-text("${message}")`)
}

/**
 * 等待加载完成
 * @param page Playwright Page 对象
 */
export async function waitForLoading(page: Page) {
  await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' })
}

/**
 * 填写表单
 * @param page Playwright Page 对象
 * @param formData 表单数据对象
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(`[data-testid="${field}"]`, value)
  }
}

/**
 * 登录系统
 * @param page Playwright Page 对象
 * @param email 邮箱
 * @param password 密码
 */
export async function login(
  page: Page,
  email: string = 'test@example.com',
  password: string = 'password123'
) {
  // 开发模式：跳过登录，直接设置Token
  // 检查环境变量或默认使用开发模式
  const isDevMode = process.env.VITE_AUTH_DISABLED === 'true' ||
                     process.env.AUTH_DISABLED === 'true' ||
                     !process.env.VITE_AUTH_DISABLED; // 默认开发模式

  if (isDevMode) {
    await page.goto('/')
    // 设置开发模式的Token
    await page.evaluate(() => {
      localStorage.setItem('sisyphus-token', 'dev-mode-test-token')
    })
    return
  }

  // 生产模式：正常登录流程
  await page.goto('/login')

  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')

  // 等待跳转到首页
  await page.waitForURL('/', { timeout: 5000 })
}

/**
 * 注册新用户
 * @param page Playwright Page 对象
 * @param email 邮箱
 * @param password 密码
 */
export async function register(
  page: Page,
  email: string,
  password: string
) {
  await page.goto('/register')

  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.fill('[data-testid="confirm-password-input"]', password)
  await page.click('[data-testid="register-button"]')

  // 等待注册成功
  await page.waitForURL('/', { timeout: 5000 })
}

/**
 * 生成随机邮箱
 * @param prefix 邮箱前缀
 */
export function generateRandomEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `${prefix}-${timestamp}-${random}@example.com`
}

/**
 * 生成随机字符串
 * @param length 字符串长度
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 截图 (失败时自动调用)
 * @param page Playwright Page 对象
 * @param name 截图名称
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `reports/screenshots/${name}.png`,
    fullPage: true
  })
}

/**
 * 检查元素是否存在
 * @param page Playwright Page 对象
 * @param selector 选择器
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first()
  const count = await element.count()
  return count > 0
}

/**
 * 滚动到元素
 * @param element Playwright Locator 对象
 */
export async function scrollToElement(element: Locator) {
  await element.scrollIntoViewIfNeeded()
}

/**
 * 等待元素可点击
 * @param element Playwright Locator 对象
 */
export async function waitForClickable(element: Locator) {
  await element.waitFor({ state: 'visible' })
  await element.waitForElementState('stable')
}
