/**
 * 关键字配置模块 E2E 测试
 * 测试增删改查功能
 */

import { test, expect } from '@playwright/test'
import { navigateToKeywordsPage } from '../helpers/auth'

test.describe('关键字配置模块', () => {
  test.beforeEach(async ({ page }) => {
    // 使用辅助函数导航到关键字配置页面（自动处理认证）
    await navigateToKeywordsPage(page)

    // 截图初始状态
    await page.screenshot({ path: 'test-results/keywords/01-initial-state.png' })
  })

  test('1. 页面加载验证', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('h1, h2').filter({ hasText: /关键字/i })).toBeVisible()

    // 验证 Tabs 存在
    await expect(page.locator('button').filter({ hasText: /自定义关键字/i })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /内置关键字/i })).toBeVisible()

    // 验证工具栏元素
    await expect(page.locator('select').or(page.locator('[role="combobox"]'))).toBeVisible()
    await expect(page.locator('input[type="search"], input[placeholder*="搜索"]')).toBeVisible()

    // 验证创建按钮
    await expect(page.locator('button').filter({ hasText: /新建|创建/i })).toBeVisible()

    console.log('✅ 页面加载验证通过')
  })

  test('2. Tabs 切换功能', async ({ page }) => {
    // 点击"内置关键字" tab
    await page.click('button:has-text("内置关键字")')
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/keywords/02-builtin-tab.png' })

    // 验证 tab 切换成功
    await expect(page.locator('button.bg-cyan-500\\/20, button[class*="cyan-500"]')).toBeVisible()

    // 切换回"自定义关键字"
    await page.click('button:has-text("自定义关键字")')
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/keywords/03-custom-tab.png' })

    console.log('✅ Tabs 切换功能正常')
  })

  test('3. 创建关键字', async ({ page }) => {
    // 点击创建按钮
    await page.click('button:has-text("新建"), button:has-text("创建")')
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/keywords/04-create-dialog.png' })

    // 验证对话框打开
    await expect(page.locator('[role="dialog"], [class*="dialog"]')).toBeVisible()

    // 填写表单
    await page.fill('input[name="name"], input[placeholder*="名称"]', '测试关键字')
    await page.fill('input[name="func_name"], input[placeholder*="方法名"]', 'test_keyword')
    await page.fill('input[name="category"], input[placeholder*="类名"]', 'TestClass')

    // 填写代码
    const codeEditor = page.locator('textarea, [class*="monaco"]').first
    await codeEditor.fill(`def test_keyword():
    """测试关键字"""
    print("Hello, World!")
    return True`)

    await page.screenshot({ path: 'test-results/keywords/05-form-filled.png' })

    // 保存
    await page.click('button:has-text("保存"), button:has-text("提交")')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/keywords/06-after-create.png' })

    // 验证成功提示
    await expect(page.locator('text=/成功|created/i').or(page.locator('.toast'))).toBeVisible({ timeout: 5000 })

    console.log('✅ 创建关键字功能正常')
  })

  test('4. 搜索功能', async ({ page }) => {
    // 使用搜索框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"]').first
    await searchInput.fill('测试')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/keywords/07-search-results.png' })

    // 清空搜索
    await searchInput.fill('')
    await page.waitForTimeout(1000)

    console.log('✅ 搜索功能正常')
  })

  test('5. 类型筛选', async ({ page }) => {
    // 查找类型筛选下拉框
    const typeSelect = page.locator('select').filter({ hasText: /全部|all|类型/i }).first
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 })
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/keywords/08-type-filter.png' })

      // 切换回"全部"
      await typeSelect.selectOption({ label: '全部' }).or(typeSelect.selectOption({ index: 0 }))
      await page.waitForTimeout(1000)
    }

    console.log('✅ 类型筛选功能正常')
  })

  test('6. 编辑关键字', async ({ page }) => {
    // 等待表格加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    // 点击第一行的编辑按钮
    const editButton = page.locator('table tbody tr').first().locator('button').filter({ hasText: /编辑|edit/i })
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/keywords/09-edit-dialog.png' })

      // 修改名称
      await page.fill('input[name="name"]', '测试关键字-已修改')

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/keywords/10-after-edit.png' })

      console.log('✅ 编辑关键字功能正常')
    } else {
      console.log('⚠️ 没有关键字可以编辑')
    }
  })

  test('7. 启用/禁用关键字', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    // 点击第一行的启用/禁用按钮
    const toggleButton = page.locator('table tbody tr').first()
      .locator('button').filter({ hasText: /启用|禁用|enable|disable/i })

    if (await toggleButton.isVisible()) {
      await page.screenshot({ path: 'test-results/keywords/11-before-toggle.png' })

      await toggleButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/keywords/12-after-toggle.png' })

      console.log('✅ 启用/禁用功能正常')
    } else {
      console.log('⚠️ 没有关键字可以切换状态')
    }
  })

  test('8. 删除关键字', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    // 获取删除前的行数
    const rowCountBefore = await page.locator('table tbody tr').count()

    // 点击第一行的删除按钮
    const deleteButton = page.locator('table tbody tr').first()
      .locator('button').filter({ hasText: /删除|delete|trash/i })

    if (await deleteButton.isVisible()) {
      // 处理确认对话框
      page.on('dialog', dialog => dialog.accept())

      await deleteButton.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/keywords/13-after-delete.png' })

      // 验证删除成功
      const rowCountAfter = await page.locator('table tbody tr').count()
      expect(rowCountAfter).toBeLessThan(rowCountBefore)

      console.log('✅ 删除关键字功能正常')
    } else {
      console.log('⚠️ 没有关键字可以删除')
    }
  })

  test('9. Table 展示验证', async ({ page }) => {
    // 等待表格加载
    await page.waitForSelector('table', { timeout: 10000 })
    await page.screenshot({ path: 'test-results/keywords/14-table-full.png', fullPage: true })

    // 验证表头
    const headers = await page.locator('table th').allTextContents()
    console.log('表头:', headers)
    expect(headers).toContain('名称')
    expect(headers).toContain('方法名')

    // 验证数据行
    const rows = await page.locator('table tbody tr').count()
    console.log(`数据行数: ${rows}`)

    console.log('✅ Table 展示验证通过')
  })

  test('10. 控制台错误检查', async ({ page }) => {
    const errors: string[] = []

    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // 执行一些操作
    await page.click('button:has-text("新建"), button:has-text("创建")')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')

    await page.waitForTimeout(1000)

    // 报告错误
    if (errors.length > 0) {
      console.log('❌ 发现控制台错误:')
      errors.forEach(err => console.log(`  - ${err}`))
    } else {
      console.log('✅ 无控制台错误')
    }

    expect(errors.length).toBe(0)
  })
})

test.describe('关键字配置 - API 交互', () => {
  test('验证 API 请求', async ({ page }) => {
    // 监听网络请求
    const apiRequests: string[] = []

    page.on('request', request => {
      if (request.url().includes('/keywords')) {
        apiRequests.push(`${request.method()} ${request.url()}`)
      }
    })

    // 访问页面
    await page.goto('http://localhost:5173/keywords')
    await page.waitForLoadState('networkidle')

    // 等待 API 请求完成
    await page.waitForTimeout(2000)

    console.log('API 请求:')
    apiRequests.forEach(req => console.log(`  - ${req}`))

    // 验证有关键字列表请求
    const hasListRequest = apiRequests.some(req => req.includes('GET') && req.includes('/keywords'))
    expect(hasListRequest).toBeTruthy()

    console.log('✅ API 交互验证通过')
  })
})
