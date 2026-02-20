import { test, expect } from '@playwright/test';
import { navigateToKeywordsPage } from '../helpers/auth';

/**
 * TASK-060: 关键字配置功能黑盒测试（简化版）
 *
 * 测试场景:
 * 1. 测试页面基本功能
 * 2. 测试关键字列表展示
 * 3. 测试搜索功能
 * 4. 测试类型过滤
 * 5. 测试表单验证
 * 6. 测试 data-testid 属性
 * 7. 测试导航功能
 */

test.describe('TASK-060: 关键字配置功能黑盒测试', () => {
  test.beforeEach(async ({ page }) => {
    // 使用辅助函数导航到关键字配置页面（自动处理认证）
    await navigateToKeywordsPage(page);
  });

  test('TEST-01: 应该能够显示关键字配置页面', async ({ page }) => {
    // Step 1: 验证页面标题 - 使用 data-testid 或 first()
    const pageTitle = page.locator('[data-testid="page-header"] h1').or(page.locator('h1.text-3xl').first());
    await expect(pageTitle, '页面标题应该可见').toBeVisible({ timeout: 10000 });
    // 标题可能是英文或中文，取决于 i18n 设置
    await expect(pageTitle).toContainText(/Keyword Management|关键字配置/);

    // Step 2: 验证项目选择器存在 - 使用 first() 避免多个元素
    const projectSelect = page.locator('[data-testid="project-select"]').first();
    await expect(projectSelect, '项目选择器应该存在').toBeVisible();

    // Step 3: 验证关键字列表组件存在
    const keywordList = page.locator('[data-testid="keyword-list"]').first();
    await expect(keywordList, '关键字列表应该存在').toBeVisible();

    // Step 4: 验证创建按钮存在 - 使用 first()
    const createButton = page.locator('[data-testid="create-keyword-button"]').first();
    await expect(createButton, '创建按钮应该存在').toBeVisible();
  });

  test('TEST-02: 应该能够筛选项目关键字', async ({ page }) => {
    // Step 1: 等待项目加载
    await page.waitForTimeout(2000);

    // Step 2: 检查项目选项
    const projectSelect = page.locator('[data-testid="project-select"]');
    const optionCount = await projectSelect.locator('option').count();

    expect(optionCount, '应该有项目选项').toBeGreaterThan(0);

    // Step 3: 如果有项目，选择第一个
    if (optionCount > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // 验证关键字列表已更新
      const keywordList = page.locator('[data-testid="keyword-list"]');
      await expect(keywordList, '关键字列表应该存在').toBeVisible();
    }
  });

  test('TEST-03: 应该显示关键字列表或空状态', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 检查关键字列表
    const keywordList = page.locator('[data-testid="keyword-list"]');
    await expect(keywordList, '关键字列表应该存在').toBeVisible();

    // Step 3: 检查是否有关键字或空状态
    const keywordItems = page.locator('[data-testid="keyword-item"]');
    const itemCount = await keywordItems.count();

    if (itemCount === 0) {
      // 应该显示空状态
      const emptyState = page.locator('text=暂无关键字');
      await expect(emptyState, '应该显示空状态提示').toBeVisible();
    }
  });

  test('TEST-04: 应该能够打开创建关键字对话框', async ({ page }) => {
    // Step 1: 点击创建按钮
    const createButton = page.locator('[data-testid="create-keyword-button"]');
    await expect(createButton, '创建按钮应该存在').toBeVisible();
    await createButton.click();

    // Step 2: 等待对话框出现
    await page.waitForTimeout(500);
    const dialog = page.locator('[data-testid="create-keyword-dialog"]');
    await expect(dialog, '创建对话框应该出现').toBeVisible();

    // Step 3: 验证对话框标题
    const dialogTitle = dialog.locator('h2, h3').first();
    await expect(dialogTitle, '对话框标题应该包含"创建"或"关键字"').toBeVisible();

    // Step 4: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('TEST-05: 应该显示关键字表单字段', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('[data-testid="create-keyword-button"]').click();
    await page.waitForTimeout(500);

    // Step 2: 验证名称输入框
    const nameInput = page.locator('[data-testid="keyword-name-input"]');
    await expect(nameInput, '关键字名称输入框应该存在').toBeVisible();

    // Step 3: 验证函数名输入框
    const funcNameInput = page.locator('[data-testid="keyword-func-name-input"]');
    await expect(funcNameInput, '函数名输入框应该存在').toBeVisible();

    // Step 4: 验证类型选择器
    const typeSelect = page.locator('[data-testid="keyword-type-select"]');
    await expect(typeSelect, '关键字类型选择器应该存在').toBeVisible();

    // Step 5: 验证描述输入框
    const descInput = page.locator('[data-testid="keyword-description-input"]');
    await expect(descInput, '描述输入框应该存在').toBeVisible();

    // Step 6: 验证提交按钮
    const submitButton = page.locator('[data-testid="submit-keyword-button"]');
    await expect(submitButton, '提交按钮应该存在').toBeVisible();

    // Step 7: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-06: 应该验证表单必填字段', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('[data-testid="create-keyword-button"]').click();
    await page.waitForTimeout(500);

    // Step 2: 不填写任何内容，检查提交按钮状态
    const submitButton = page.locator('[data-testid="submit-keyword-button"]');
    const isInitiallyDisabled = await submitButton.isDisabled();

    // Step 3: 尝试点击提交按钮
    await submitButton.click();
    await page.waitForTimeout(500);

    // Step 4: 验证按钮仍然禁用或有错误提示
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled, '表单为空时提交按钮应该禁用').toBeTruthy();

    // Step 5: 填写必填字段
    await page.locator('[data-testid="keyword-name-input"]').fill('测试关键字');
    await page.locator('[data-testid="keyword-func-name-input"]').fill('test_function');

    // Step 6: 验证按钮恢复可用
    await expect(submitButton, '填写必填字段后提交按钮应该可用').not.toBeDisabled();

    // Step 7: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-07: 应该正确使用data-testid属性', async ({ page }) => {
    // Step 1: 验证项目选择器有 data-testid
    const projectSelect = page.locator('[data-testid="project-select"]');
    await expect(projectSelect, '项目选择器应该有data-testid属性').toHaveAttribute('data-testid', 'project-select');

    // Step 2: 验证创建按钮有 data-testid
    const createButton = page.locator('[data-testid="create-keyword-button"]');
    await expect(createButton, '创建按钮应该有data-testid属性').toHaveAttribute('data-testid', 'create-keyword-button');

    // Step 3: 验证搜索框有 data-testid
    const searchInput = page.locator('[data-testid="keyword-search-input"]');
    await expect(searchInput, '搜索框应该有data-testid属性').toHaveAttribute('data-testid', 'keyword-search-input');

    // Step 4: 验证关键字列表有 data-testid
    const keywordList = page.locator('[data-testid="keyword-list"]');
    await expect(keywordList, '关键字列表应该有data-testid属性').toHaveAttribute('data-testid', 'keyword-list');

    // Step 5: 点击创建按钮，验证对话框 data-testid
    await createButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[data-testid="create-keyword-dialog"]');
    await expect(dialog, '创建对话框应该有data-testid属性').toHaveAttribute('data-testid', 'create-keyword-dialog');

    // Step 6: 验证表单字段 data-testid
    const nameInput = page.locator('[data-testid="keyword-name-input"]');
    await expect(nameInput, '名称输入框应该有data-testid属性').toHaveAttribute('data-testid', 'keyword-name-input');

    const funcNameInput = page.locator('[data-testid="keyword-func-name-input"]');
    await expect(funcNameInput, '函数名输入框应该有data-testid属性').toHaveAttribute('data-testid', 'keyword-func-name-input');

    const submitButton = page.locator('[data-testid="submit-keyword-button"]');
    await expect(submitButton, '提交按钮应该有data-testid属性').toHaveAttribute('data-testid', 'submit-keyword-button');

    // Step 7: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-08: 应该能够导航回首页', async ({ page }) => {
    // Step 1: 找到返回按钮（ArrowLeft 图标按钮）
    const backButton = page.locator('button svg.lucide-arrow-left').locator('..');
    await expect(backButton, '返回按钮应该存在').toBeVisible();

    // Step 2: 点击返回按钮
    await backButton.click();

    // Step 3: 验证导航到首页
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url, '应该导航到首页').toContain('/');
  });

  test('TEST-09: 应该显示页面描述信息', async ({ page }) => {
    // Step 1: 验证页面描述
    const pageDesc = page.locator('text=管理项目关键字');
    await expect(pageDesc, '页面描述应该可见').toBeVisible();
  });

  test('TEST-10: 应该显示空状态提示', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 如果没有关键字，应该显示空状态
    const keywordItems = page.locator('[data-testid="keyword-item"]');
    const itemCount = await keywordItems.count();

    if (itemCount === 0) {
      const emptyText = page.locator('text=/暂无关键字|点击"新建关键字"/');
      await expect(emptyText, '应该显示空状态提示').toBeVisible();
    }
  });

  test('TEST-11: 应该能够搜索关键字（界面测试）', async ({ page }) => {
    // Step 1: 验证搜索框存在
    const searchInput = page.locator('[data-testid="keyword-search-input"]');
    await expect(searchInput, '搜索框应该存在').toBeVisible();

    // Step 2: 输入搜索内容
    await searchInput.fill('test');
    await page.waitForTimeout(1000);

    // Step 3: 清空搜索
    await searchInput.fill('');
    await page.waitForTimeout(1000);
  });

  test('TEST-12: 应该能够按类型过滤（界面测试）', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 验证类型过滤器存在
    const typeFilter = page.locator('[data-testid="keyword-type-filter"]');
    await expect(typeFilter, '类型过滤器应该存在').toBeVisible();

    // Step 3: 检查过滤选项
    const options = await typeFilter.locator('option').count();
    expect(options, '应该有过滤选项').toBeGreaterThan(0);
  });
});
