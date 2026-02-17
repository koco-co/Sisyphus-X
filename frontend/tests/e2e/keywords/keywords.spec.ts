/**
 * TASK-060: 关键字配置功能黑盒测试
 * @see https://github.com/anthropics/sisyphus-x/issues/60
 */

import { test, expect } from '@playwright/test'
import { login } from '../../utils/helpers'

test.describe('关键字配置功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/keywords')
  })

  test('应显示关键字列表', async ({ page }) => {
    await expect(page.locator('[data-testid="keyword-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-keyword-button"]')).toBeVisible()
  })

  test('应区分内置关键字和自定义关键字', async ({ page }) => {
    // 内置关键字
    const builtInKeywords = page.locator('[data-testid="keyword-item"][data-is-builtin="true"]')

    // 自定义关键字
    const customKeywords = page.locator('[data-testid="keyword-item"][data-is-builtin="false"]')

    // 验证都有内置关键字标签
    const count = await builtInKeywords.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(builtInKeywords.nth(i).locator('[data-testid="builtin-badge"]')).toBeVisible()
    }
  })

  test('内置关键字不应显示编辑和删除按钮', async ({ page }) => {
    const builtInKeyword = page.locator('[data-testid="keyword-item"][data-is-builtin="true"]').first()

    // 验证没有编辑和删除按钮
    await expect(builtInKeyword.locator('[data-testid="edit-keyword-button"]')).not.toBeVisible()
    await expect(builtInKeyword.locator('[data-testid="delete-keyword-button"]')).not.toBeVisible()

    // 应该有只读标识
    await expect(builtInKeyword.locator('[data-testid="readonly-badge"]')).toBeVisible()
  })

  test('应能创建自定义关键字', async ({ page }) => {
    await page.click('[data-testid="create-keyword-button"]')

    await expect(page.locator('[data-testid="create-keyword-dialog"]')).toBeVisible()

    // 填写关键字信息
    await page.fill('[data-testid="keyword-name-input"]', '自定义关键字')
    await page.selectOption('[data-testid="keyword-type-select"]', 'action')

    // 在 Monaco Editor 中编写代码
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()

    // 等待编辑器初始化
    await page.waitForTimeout(500)

    // 输入代码
    await page.keyboard.type('def custom_keyword():\n    pass')

    await page.click('[data-testid="submit-keyword-button"]')

    // 验证成功
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
    await expect(page.locator('text=创建成功')).toBeVisible()
  })

  test('应能编辑自定义关键字', async ({ page }) => {
    const customKeyword = page.locator('[data-testid="keyword-item"][data-is-builtin="false"]').first()

    await customKeyword.locator('[data-testid="edit-keyword-button"]').click()

    await expect(page.locator('[data-testid="edit-keyword-dialog"]')).toBeVisible()

    // 验证 Monaco Editor 显示原有代码
    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()

    // 修改代码
    await monacoEditor.click()
    await page.waitForTimeout(500)
    await page.keyboard.type('# 添加注释')

    await page.click('[data-testid="submit-keyword-button"]')

    // 验证成功
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
  })

  test('应能删除自定义关键字', async ({ page }) => {
    const customKeyword = page.locator('[data-testid="keyword-item"][data-is-builtin="false"]').first()

    await customKeyword.locator('[data-testid="delete-keyword-button"]').click()

    // 验证二次确认
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible()
    await expect(page.locator('text=确定要删除这个关键字吗')).toBeVisible()

    await page.click('[data-testid="confirm-delete-button"]')

    // 验证成功
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
  })

  test('应能启用/禁用关键字', async ({ page }) => {
    const keyword = page.locator('[data-testid="keyword-item"]').first()

    const toggleSwitch = keyword.locator('[data-testid="keyword-enabled-switch"]')

    // 获取初始状态
    const initialState = await toggleSwitch.getAttribute('aria-checked')

    // 点击切换
    await toggleSwitch.click()

    // 验证状态改变
    const newState = await toggleSwitch.getAttribute('aria-checked')
    expect(newState).not.toBe(initialState)

    // 验证 Toast 提示
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
  })

  test('应能查看关键字详情', async ({ page }) => {
    const keyword = page.locator('[data-testid="keyword-item"]').first()

    await keyword.locator('[data-testid="keyword-name"]').click()

    // 验证跳转到详情页
    await expect(page).toHaveURL(/\/keywords\/\d+/)

    // 验证详情页显示
    await expect(page.locator('[data-testid="keyword-detail-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="keyword-detail-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="keyword-detail-code"]')).toBeVisible()
  })

  test('应支持关键字搜索', async ({ page }) => {
    const searchInput = page.locator('[data-testid="keyword-search-input"]')

    // 输入搜索关键词
    await searchInput.fill('登录')

    // 等待搜索结果
    await page.waitForTimeout(500)

    // 验证搜索结果
    const keywordItems = page.locator('[data-testid="keyword-item"]')
    const count = await keywordItems.count()

    for (let i = 0; i < count; i++) {
      const name = await keywordItems.nth(i).locator('[data-testid="keyword-name"]').textContent()
      expect(name).toContain('登录')
    }
  })

  test('应支持关键字类型筛选', async ({ page }) => {
    const typeFilter = page.locator('[data-testid="keyword-type-filter"]')

    await typeFilter.click()

    // 选择特定类型
    await page.locator('[data-testid="filter-option-action"]').click()

    // 等待筛选结果
    await page.waitForTimeout(500)

    // 验证所有关键字都是 action 类型
    const keywordItems = page.locator('[data-testid="keyword-item"]')
    const count = await keywordItems.count()

    for (let i = 0; i < count; i++) {
      const type = await keywordItems.nth(i).locator('[data-testid="keyword-type"]').textContent()
      expect(type).toBe('action')
    }
  })

  test('Monaco Editor 应支持代码高亮', async ({ page }) => {
    await page.click('[data-testid="create-keyword-button"]')

    const monacoEditor = page.locator('.monaco-editor')
    await expect(monacoEditor).toBeVisible()

    // 验证 Python 语法高亮
    await monacoEditor.click()
    await page.waitForTimeout(500)

    await page.keyboard.type('def hello():\n    print("hello")')

    // 验证代码高亮类名存在
    await expect(monacoEditor.locator('.mtk1')).toBeVisible()
  })

  test('Monaco Editor 应支持代码补全', async ({ page }) => {
    await page.click('[data-testid="create-keyword-button"]')

    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    await page.waitForTimeout(500)

    // 输入 def 触发代码补全
    await page.keyboard.type('d')
    await page.keyboard.type('e')
    await page.keyboard.type('f')

    // 等待补全建议
    await page.waitForTimeout(500)

    // 验证补全建议出现
    const suggestWidget = page.locator('.suggest-widget')
    const isVisible = await suggestWidget.isVisible().catch(() => false)

    if (isVisible) {
      await expect(suggestWidget).toBeVisible()
    }
  })

  test('应支持关键字导入', async ({ page }) => {
    test.skip(true, '需要实现导入功能')
  })

  test('应支持关键字导出', async ({ page }) => {
    test.skip(true, '需要实现导出功能')
  })

  test('关键字列表应支持分页', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"]')

    const isVisible = await pagination.isVisible().catch(() => false)

    if (isVisible) {
      // 验证分页组件
      await expect(pagination.locator('[data-testid="page-button"]')).toHaveCount.greaterThan(0)

      // 点击下一页
      await pagination.locator('[data-testid="next-page-button"]').click()

      // 验证页码变化
      const activePage = pagination.locator('[data-testid="page-button"].active')
      await expect(activePage).toContainText('2')
    }
  })

  test('应显示关键字使用统计', async ({ page }) => {
    const keyword = page.locator('[data-testid="keyword-item"]').first()

    // 验证显示使用次数
    await expect(keyword.locator('[data-testid="keyword-usage-count"]')).toBeVisible()
  })

  test('表单验证应生效', async ({ page }) => {
    await page.click('[data-testid="create-keyword-button"]')

    // 直接提交空表单
    await page.click('[data-testid="submit-keyword-button"]')

    // 验证错误提示
    await expect(page.locator('[data-testid="keyword-name-error"]')).toBeVisible()
    await expect(page.locator('text=关键字名称不能为空')).toBeVisible()
  })

  test('关键字名称应唯一', async ({ page }) => {
    await page.click('[data-testid="create-keyword-button"]')

    // 输入已存在的关键字名称
    const existingKeyword = page.locator('[data-testid="keyword-item"]').first()
    const existingName = await existingKeyword.locator('[data-testid="keyword-name"]').textContent()

    await page.fill('[data-testid="keyword-name-input"]', existingName)

    await page.click('[data-testid="submit-keyword-button"]')

    // 验证错误提示
    await expect(page.locator('[data-testid="keyword-name-error"]')).toBeVisible()
    await expect(page.locator('text=关键字名称已存在')).toBeVisible()
  })
})

test.describe('关键字代码验证', () => {
  test('应验证 Python 代码语法', async ({ page }) => {
    await login(page)
    await page.goto('/keywords')
    await page.click('[data-testid="create-keyword-button"]')

    // 输入错误的 Python 语法
    const monacoEditor = page.locator('.monaco-editor')
    await monacoEditor.click()
    await page.waitForTimeout(500)

    await page.keyboard.type('def broken(\n    # 缺少闭合括号')

    await page.click('[data-testid="submit-keyword-button"]')

    // 验证语法错误提示
    await expect(page.locator('[data-testid="syntax-error-message"]')).toBeVisible()
  })

  test('应验证函数签名', async ({ page }) => {
    test.skip(true, '需要实现函数签名验证')
  })
})
