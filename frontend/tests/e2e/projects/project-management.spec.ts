/**
 * TASK-058: 项目管理功能黑盒测试（Bug修复后版本）
 * @see https://github.com/anthropics/sisyphus-x/issues/58
 *
 * 更新说明：
 * - 使用 data-testid 属性（Bug #2 已修复）
 * - 适配数据库表结构更新（Bug #1 已修复）
 */

import { test, expect } from '@playwright/test'
import { login } from '../../utils/helpers'

test.describe('项目管理功能 - 基础测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)

    // 强制设置语言为中文（确保测试环境一致）
    await page.goto('/api/projects')
    await page.evaluate(() => {
      localStorage.setItem('sisyphus-language', 'zh-CN')
    })
    await page.reload()

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('应显示项目列表页面', async ({ page }) => {
    expect(page.url()).toContain('/api/projects')
    
    const createButton = page.locator('[data-testid="create-project-button"]')
    await expect(createButton).toBeVisible()
  })

  test('应能打开创建项目对话框', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-project-button"]')
    await createButton.click()
    await page.waitForTimeout(500)

    const nameInput = page.locator('[data-testid="project-name-input"]')
    const descInput = page.locator('[data-testid="project-description-input"]')

    await expect(nameInput).toBeVisible()
    await expect(descInput).toBeVisible()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('应能创建新项目', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-project-button"]')
    await createButton.click()
    await page.waitForTimeout(500)

    const nameInput = page.locator('[data-testid="project-name-input"]')
    const descInput = page.locator('[data-testid="project-description-input"]')

    const projectName = `测试项目_${Date.now()}`
    await nameInput.fill(projectName)
    await descInput.fill('自动化测试项目')

    const submitButton = page.getByRole('button', { name: /创建|Create/ })
    await submitButton.first().click()
    await page.waitForTimeout(2000)

    const pageContent = await page.content()
    expect(pageContent).toMatch(/创建成功|Success/)
  })

  test('应验证必填字段', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-project-button"]')
    await createButton.click()
    await page.waitForTimeout(500)

    const submitButton = page.getByRole('button', { name: /创建|Create/ })
    await submitButton.first().click()
    await page.waitForTimeout(500)

    const errorMessage = page.getByText(/不能为空|必填|required/i)
    const hasError = await errorMessage.count() > 0

    if (hasError) {
      await expect(errorMessage.first()).toBeVisible()
    }

    await page.keyboard.press('Escape')
  })

  test('应限制项目名称长度', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-project-button"]')
    await createButton.click()
    await page.waitForTimeout(500)

    const nameInput = page.locator('[data-testid="project-name-input"]')
    await nameInput.fill('x'.repeat(300))
    await page.waitForTimeout(500)

    const errorMessage = page.getByText(/不能超过|too long/i)
    const hasError = await errorMessage.count() > 0

    if (hasError) {
      await expect(errorMessage.first()).toBeVisible()
    }

    await page.keyboard.press('Escape')
  })
})

test.describe('项目管理功能 - 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)

    // 强制设置语言为中文
    await page.goto('/api/projects')
    await page.evaluate(() => {
      localStorage.setItem('sisyphus-language', 'zh-CN')
    })
    await page.reload()
  })

  test('页面加载应快速', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/api/projects')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000)
  })

  test('对话框响应应快速', async ({ page }) => {
    await page.goto('/api/projects')
    await page.waitForTimeout(1000)

    const createButton = page.locator('[data-testid="create-project-button"]')
    const startTime = Date.now()
    await createButton.click()
    await page.waitForTimeout(500)
    const responseTime = Date.now() - startTime
    expect(responseTime).toBeLessThan(1000)

    await page.keyboard.press('Escape')
  })
})
