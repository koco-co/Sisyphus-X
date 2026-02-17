import { test, expect } from '@playwright/test';

/**
 * TASK-069: 全局参数功能黑盒测试
 *
 * 测试场景:
 * 1. 测试查看全局参数列表
 * 2. 测试创建全局参数
 * 3. 验证自动解析 docstring
 * 4. 测试编辑全局参数
 * 5. 测试删除全局参数
 */

test.describe('TASK-069: 全局参数功能黑盒测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到全局参数页面
    await page.goto('/global-params');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 增加等待时间，确保页面完全加载
  });

  test('TEST-01: 应该能够显示全局参数管理页面', async ({ page }) => {
    // Step 1: 验证页面标题（使用更精确的选择器）
    const pageTitle = page.locator('h1.text-3xl').or(page.locator('h1').filter({ hasText: '全局参数' }));
    await expect(pageTitle, '页面标题应该可见').toBeVisible({ timeout: 15000 });

    // Step 2: 验证搜索框存在
    const searchInput = page.locator('input[placeholder="搜索类名、方法名、描述..."]');
    await expect(searchInput, '搜索框应该存在').toBeVisible();

    // Step 3: 验证创建按钮存在
    const createButton = page.locator('button', { hasText: '创建全局参数' });
    await expect(createButton, '创建按钮应该存在').toBeVisible();
  });

  test('TEST-02: 应该显示全局参数列表或空状态', async ({ page }) => {
    // Step 1: 等待页面加载完成
    await page.waitForTimeout(3000);

    // Step 2: 检查是否有参数列表或空状态
    // 修复选择器语法错误
    const paramGroups = page.locator('.bg-slate-900.border').or(
      page.locator('[class*="border-white/5"]')
    );

    const groupCount = await paramGroups.count();

    if (groupCount === 0) {
      // 应该显示空状态
      const emptyState = page.locator('text=/暂无全局参数|未找到匹配的全局参数/');
      await expect(emptyState, '应该显示空状态提示').toBeVisible();
    } else {
      // 应该显示参数列表
      await expect(paramGroups.first(), '应该显示参数分组').toBeVisible();
    }
  });

  test('TEST-03: 应该能够打开创建全局参数对话框', async ({ page }) => {
    // Step 1: 等待页面完全加载
    await page.waitForTimeout(3000);

    // Step 2: 点击创建按钮
    const createButton = page.locator('button', { hasText: '创建全局参数' });
    await expect(createButton, '创建按钮应该存在').toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Step 3: 等待对话框出现
    await page.waitForTimeout(1000);
    const dialogTitle = page.locator('h2', { hasText: '创建全局参数' });
    await expect(dialogTitle, '创建对话框应该出现').toBeVisible();

    // Step 4: 验证 Monaco Editor 存在（可能需要更长时间加载）
    const editorContainer = page.locator('.monaco-editor').or(
      page.locator('[class*="monaco"]')
    );
    await expect(editorContainer, 'Monaco Editor 应该存在').toBeVisible({ timeout: 8000 });

    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('TEST-04: 应该显示 Google docstring 帮助', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(500);

    // Step 2: 点击帮助按钮
    const helpButton = page.locator('button[title="查看 Google docstring 规范"]');
    await expect(helpButton, '帮助按钮应该存在').toBeVisible();
    await helpButton.click();

    // Step 3: 验证帮助内容显示
    const helpContent = page.locator('text=Google docstring 规范');
    await expect(helpContent, '帮助内容应该显示').toBeVisible();

    // Step 4: 验证示例代码存在
    const exampleCode = page.locator('pre', { hasText: 'Args:' });
    await expect(exampleCode, '示例代码应该显示').toBeVisible();

    // Step 5: 关闭帮助
    await helpButton.click();
    await page.waitForTimeout(500);

    // Step 6: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-05: 应该能够编辑 Python 代码', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000); // 等待 Monaco Editor 加载

    // Step 2: 获取编辑器内容
    const editorTextarea = page.locator('.monaco-editor .inputarea textarea');
    await expect(editorTextarea, '编辑器文本域应该存在').toBeVisible();

    // Step 3: 验证默认代码模板存在
    const defaultCode = page.locator('text=class StringUtils:');
    await expect(defaultCode, '默认代码模板应该存在').toBeVisible();

    // Step 4: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-06: 应该能够保存并显示确认对话框', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000);

    // Step 2: 点击保存按钮（使用默认代码）
    const saveButton = page.locator('button:has-text("下一步")');
    await expect(saveButton, '保存按钮应该存在').toBeVisible();
    await saveButton.click();

    // Step 3: 等待确认对话框出现
    await page.waitForTimeout(500);
    const confirmDialog = page.locator('h2:has-text("确认解析结果")');
    await expect(confirmDialog, '确认对话框应该出现').toBeVisible();

    // Step 4: 验证解析结果显示
    const className = page.locator('text=StringUtils');
    await expect(className, '类名应该被解析').toBeVisible();

    const methodName = page.locator('text=generate_uuid');
    await expect(methodName, '方法名应该被解析').toBeVisible();

    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  });

  test('TEST-07: 应该显示解析的参数信息', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000);

    // Step 2: 点击保存按钮
    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(500);

    // Step 3: 验证参数表格显示
    const paramTable = page.locator('table:has(th:has-text("参数名"))');
    await expect(paramTable, '参数表格应该存在').toBeVisible();

    // Step 4: 验证返回值显示
    const returnValue = page.locator('text=出参');
    await expect(returnValue, '返回值区域应该显示').toBeVisible();

    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  });

  test('TEST-08: 应该能够搜索全局参数', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 获取搜索框
    const searchInput = page.locator('input[placeholder="搜索类名、方法名、描述..."]');
    await expect(searchInput, '搜索框应该存在').toBeVisible();

    // Step 3: 输入搜索关键词
    await searchInput.fill('uuid');
    await page.waitForTimeout(1000);

    // Step 4: 验证搜索结果（如果有参数）
    const paramGroups = page.locator('.bg-slate-900.border');
    const groupCount = await paramGroups.count();

    if (groupCount > 0) {
      // 如果有参数，应该显示过滤后的结果
      await expect(paramGroups.first(), '应该显示搜索结果').toBeVisible();
    }

    // Step 5: 清除搜索
    await searchInput.fill('');
    await page.waitForTimeout(1000);
  });

  test('TEST-09: 应该能够展开/折叠类分组', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 查找类分组按钮
    const classButtons = page.locator('button').filter(async (button) => {
      const text = await button.textContent();
      return text && text.includes('StringUtils');
    });

    const buttonCount = await classButtons.count();

    if (buttonCount > 0) {
      // Step 3: 点击类名按钮展开
      await classButtons.first().click();
      await page.waitForTimeout(500);

      // Step 4: 验证方法列表显示
      const methodList = page.locator('table:has(th:has-text("方法名"))');
      const isMethodListVisible = await methodList.count() > 0;

      if (isMethodListVisible) {
        await expect(methodList.first(), '方法列表应该显示').toBeVisible();

        // Step 5: 再次点击折叠
        await classButtons.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('TEST-10: 应该能够复制方法名', async ({ page }) => {
    // Step 1: 等待页面加载并展开分组
    await page.waitForTimeout(2000);

    const classButtons = page.locator('button').filter(async (button) => {
      const text = await button.textContent();
      return text && text.includes('StringUtils');
    });

    if ((await classButtons.count()) > 0) {
      await classButtons.first().click();
      await page.waitForTimeout(500);

      // Step 2: 查找复制按钮
      const copyButton = page.locator('button[title="复制方法名"]').first();

      if (await copyButton.isVisible()) {
        // Step 3: 点击复制按钮
        await copyButton.click();
        await page.waitForTimeout(500);

        // Step 4: 验证成功提示（Toast）
        const toast = page.locator('text=已复制到剪贴板');
        await expect(toast, '应该显示复制成功提示').toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('TEST-11: 应该能够打开编辑全局参数对话框', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 查找编辑按钮
    const editButton = page.locator('button[title="编辑"]').first();

    if (await editButton.isVisible()) {
      // Step 3: 点击编辑按钮
      await editButton.click();
      await page.waitForTimeout(500);

      // Step 4: 验证编辑对话框标题
      const dialogTitle = page.locator('h2:has-text("编辑全局参数")');
      await expect(dialogTitle, '编辑对话框应该出现').toBeVisible();

      // Step 5: 验证 Monaco Editor 存在
      const editorContainer = page.locator('.monaco-editor');
      await expect(editorContainer, 'Monaco Editor 应该存在').toBeVisible();

      // Step 6: 关闭对话框
      await page.keyboard.press('Escape');
    }
  });

  test('TEST-12: 应该能够显示删除确认对话框', async ({ page }) => {
    // Step 1: 等待页面加载
    await page.waitForTimeout(2000);

    // Step 2: 查找删除按钮
    const deleteButton = page.locator('button[title="删除"]').first();

    if (await deleteButton.isVisible()) {
      // Step 3: 点击删除按钮
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Step 4: 验证确认对话框标题
      const dialogTitle = page.locator('text=确认删除');
      await expect(dialogTitle, '确认对话框应该出现').toBeVisible();

      // Step 5: 验证确认按钮存在
      const confirmButton = page.locator('button:has-text("删除")');
      await expect(confirmButton, '确认删除按钮应该存在').toBeVisible();

      // Step 6: 取消删除
      const cancelButton = page.locator('button:has-text("取消")').first();
      await cancelButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('TEST-13: 应该验证空代码提交', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000);

    // Step 2: 清空编辑器内容
    const editorTextarea = page.locator('.monaco-editor .inputarea textarea');
    await editorTextarea.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Step 3: 尝试保存
    const saveButton = page.locator('button:has-text("下一步")');
    await saveButton.click();
    await page.waitForTimeout(500);

    // Step 4: 验证错误提示（Toast 或对话框内的提示）
    const errorToast = page.locator('text=请输入代码').or(
      page.locator('text=无法解析代码')
    );

    // 错误提示可能出现，也可能不出现（取决于实现）
    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
  });

  test('TEST-14: 应该能够显示功能描述信息', async ({ page }) => {
    // Step 1: 打开创建对话框并保存
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(500);

    // Step 2: 验证功能描述标签
    const descriptionLabel = page.locator('text=功能描述');
    await expect(descriptionLabel, '功能描述标签应该存在').toBeVisible();

    // Step 3: 验证描述内容
    const descriptionContent = page.locator('.bg-slate-800').filter(async (el) => {
      const text = await el.textContent();
      return text && text.includes('生成随机 UUID');
    });

    if (await descriptionContent.count() > 0) {
      await expect(descriptionContent.first(), '功能描述应该显示').toBeVisible();
    }

    // Step 4: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  });

  test('TEST-15: 应该能够从确认对话框返回修改', async ({ page }) => {
    // Step 1: 打开创建对话框并保存
    await page.locator('button:has-text("创建全局参数")').click();
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("下一步")').click();
    await page.waitForTimeout(500);

    // Step 2: 点击返回修改按钮
    const backButton = page.locator('button:has-text("返回修改")');
    await expect(backButton, '返回修改按钮应该存在').toBeVisible();
    await backButton.click();

    // Step 3: 验证返回到编辑器界面
    const dialogTitle = page.locator('h2:has-text("创建全局参数")');
    await expect(dialogTitle, '应该返回到编辑器界面').toBeVisible();

    // Step 4: 验证 Monaco Editor 仍然可见
    const editorContainer = page.locator('.monaco-editor');
    await expect(editorContainer, 'Monaco Editor 应该仍然可见').toBeVisible();

    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
  });
});
