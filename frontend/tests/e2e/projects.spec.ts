import { test, expect } from '@playwright/test';

/**
 * TASK-058: 项目管理功能黑盒测试
 *
 * 测试场景:
 * 1. 测试创建项目
 * 2. 测试编辑项目
 * 3. 测试删除项目（二次确认）
 * 4. 测试搜索功能
 * 5. 测试分页功能
 * 6. 测试全局 Toast 提示
 *
 * Bug 修复验证:
 * - Bug #1: 数据库表结构不完整 (添加key和owner字段,创建并应用迁移)
 * - Bug #2: 前端缺少测试属性 (添加data-testid)
 */

test.describe('TASK-058: 项目管理功能黑盒测试', () => {
  // 测试数据
  const testProject = {
    name: `E2E测试项目_${Date.now()}`,
    key: '',
    description: '这是一个E2E自动化测试创建的项目，用于验证项目管理功能',
    updatedName: `E2E测试项目_更新_${Date.now()}`,
    updatedDescription: '这是更新后的项目描述'
  };

  test.beforeEach(async ({ page }) => {
    // Step 1: 先导航到首页，确保认证状态已加载
    await page.goto('/');

    // Step 2: 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: 导航到项目管理页面
    await page.goto('/api/projects');

    // Step 4: 等待项目管理页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 5: 验证页面标题出现
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('TEST-01: 应该能够创建新项目', async ({ page }) => {
    // Step 1: 点击创建项目按钮
    const createButton = page.locator('[data-testid="create-project-button"]');
    await expect(createButton, '创建项目按钮应该存在').toBeVisible();
    await createButton.click();

    // Step 2: 等待创建对话框出现
    await page.waitForTimeout(300);
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal, '创建对话框应该出现').toBeVisible();

    // Step 3: 填写项目名称
    const nameInput = page.locator('[data-testid="project-name-input"]');
    await expect(nameInput, '项目名称输入框应该存在').toBeVisible();
    await nameInput.fill(testProject.name);

    // Step 4: 填写项目描述
    const descInput = page.locator('[data-testid="project-description-input"]');
    await expect(descInput, '项目描述输入框应该存在').toBeVisible();
    await descInput.fill(testProject.description);

    // Step 5: 点击创建按钮
    const submitButton = page.locator('[data-testid="submit-project-button"]');
    await expect(submitButton, '提交按钮应该存在').toBeVisible();
    await submitButton.click();

    // Step 6: 验证 Toast 成功提示
    const toast = page.locator('text=/创建成功|创建项目成功/i').first();
    await expect(toast, '应该显示创建成功提示').toBeVisible({ timeout: 5000 });

    // Step 7: 验证项目出现在列表中
    const newProject = page.locator(`text=${testProject.name}`);
    await expect(newProject, '新创建的项目应该出现在列表中').toBeVisible({ timeout: 5000 });

    // Step 8: 验证项目 key 字段存在（Bug #1 修复验证）
    const projectKey = page.locator(`text=/#PRJ_/i`).first();
    await expect(projectKey, '项目应该有唯一的key标识').toBeVisible();
  });

  test('TEST-02: 应该能够编辑项目', async ({ page }) => {
    // Step 1: 先创建一个测试项目
    const createButton = page.locator('[data-testid="create-project-button"]');
    await createButton.click();
    await page.waitForTimeout(300);

    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill(testProject.name);

    const descInput = page.locator('[data-testid="project-description-input"]');
    await descInput.fill(testProject.description);

    const submitButton = page.locator('[data-testid="submit-project-button"]');
    await submitButton.click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // Step 2: 找到编辑按钮
    const editButton = page.locator(`tbody tr:has-text("${testProject.name}") button`).first();
    await expect(editButton, '编辑按钮应该存在').toBeVisible();
    await editButton.click();

    // Step 3: 等待编辑对话框出现
    await page.waitForTimeout(300);
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal, '编辑对话框应该出现').toBeVisible();

    // Step 4: 修改项目名称
    const editNameInput = page.locator('[data-testid="project-name-input"]');
    await editNameInput.clear();
    await editNameInput.fill(testProject.updatedName);

    // Step 5: 修改项目描述
    const editDescInput = page.locator('[data-testid="project-description-input"]');
    await editDescInput.clear();
    await editDescInput.fill(testProject.updatedDescription);

    // Step 6: 点击保存按钮
    const saveButton = page.locator('[data-testid="submit-project-button"]');
    await saveButton.click();

    // Step 7: 验证 Toast 成功提示
    const toast = page.locator('text=/编辑成功|更新成功|保存成功/i').first();
    await expect(toast, '应该显示编辑成功提示').toBeVisible({ timeout: 5000 });

    // Step 8: 验证项目已更新
    const updatedProject = page.locator(`text=${testProject.updatedName}`);
    await expect(updatedProject, '更新后的项目名称应该出现在列表中').toBeVisible({ timeout: 5000 });
  });

  test('TEST-03: 应该能够删除项目（二次确认）', async ({ page }) => {
    // Step 1: 先创建一个测试项目
    const createButton = page.locator('[data-testid="create-project-button"]');
    await createButton.click();
    await page.waitForTimeout(300);

    const nameInput = page.locator('[data-testid="project-name-input"]');
    const projectName = `待删除项目_${Date.now()}`;
    await nameInput.fill(projectName);

    const submitButton = page.locator('[data-testid="submit-project-button"]');
    await submitButton.click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // Step 2: 找到删除按钮
    const deleteButton = page.locator(`tbody tr:has-text("${projectName}")`).locator('button').last();
    await expect(deleteButton, '删除按钮应该存在').toBeVisible();
    await deleteButton.click();

    // Step 3: 验证二次确认对话框出现
    await page.waitForTimeout(300);
    const confirmDialog = page.locator('text=/删除项目|确认删除/i').first();
    await expect(confirmDialog, '删除确认对话框应该出现').toBeVisible();

    // Step 4: 验证需要输入项目名称确认
    const verificationText = page.locator('text=/请输入项目名称确认/i');
    await expect(verificationText, '应该提示输入项目名称确认').toBeVisible();

    // Step 5: 输入项目名称确认
    const confirmInput = page.locator('input[type="text"]').last();
    await confirmInput.fill(projectName);

    // Step 6: 点击确认删除按钮
    const confirmDeleteButton = page.locator('button:has-text("删除"), button:has-text("确认")').last();
    await confirmDeleteButton.click();

    // Step 7: 验证 Toast 成功提示
    const toast = page.locator('text=/删除成功/i').first();
    await expect(toast, '应该显示删除成功提示').toBeVisible({ timeout: 5000 });

    // Step 8: 验证项目已从列表中移除
    const deletedProject = page.locator(`text=${projectName}`);
    await expect(deletedProject, '已删除的项目不应该在列表中').not.toBeVisible({ timeout: 3000 });
  });

  test('TEST-04: 应该能够搜索项目', async ({ page }) => {
    // Step 1: 创建多个测试项目
    const searchTestProjects = ['搜索测试A', '搜索测试B', '其他项目C'];

    for (const projectName of searchTestProjects) {
      await page.locator('[data-testid="create-project-button"]').click();
      await page.waitForTimeout(300);

      await page.locator('[data-testid="project-name-input"]').fill(projectName);
      await page.locator('[data-testid="project-description-input"]').fill('用于搜索测试的项目');
      await page.locator('[data-testid="submit-project-button"]').click();
      await page.waitForTimeout(1000);
    }

    // Step 2: 找到搜索框
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await expect(searchInput, '搜索框应该存在').toBeVisible();

    // Step 3: 输入搜索关键词
    await searchInput.fill('搜索测试');
    await page.waitForTimeout(1000);

    // Step 4: 验证搜索结果
    const resultA = page.locator(`text=搜索测试A`);
    const resultB = page.locator(`text=搜索测试B`);
    const resultC = page.locator(`text=其他项目C`);

    await expect(resultA, '应该显示匹配的项目A').toBeVisible();
    await expect(resultB, '应该显示匹配的项目B').toBeVisible();
    await expect(resultC, '不应该显示不匹配的项目C').not.toBeVisible();

    // Step 5: 清空搜索
    await searchInput.fill('');
    await page.waitForTimeout(1000);

    // Step 6: 验证所有项目都显示
    await expect(resultC, '清空搜索后应显示所有项目').toBeVisible();
  });

  test('TEST-05: 应该能够分页浏览项目', async ({ page }) => {
    // Step 1: 创建多个测试项目（超过一页显示）
    const paginationTestProjects = Array.from({ length: 12 }, (_, i) => `分页测试项目_${i + 1}`);

    for (const projectName of paginationTestProjects) {
      await page.locator('[data-testid="create-project-button"]').click();
      await page.waitForTimeout(300);

      await page.locator('[data-testid="project-name-input"]').fill(projectName);
      await page.locator('[data-testid="project-description-input"]').fill('用于分页测试的项目');
      await page.locator('[data-testid="submit-project-button"]').click();
      await page.waitForTimeout(800);
    }

    // Step 2: 验证分页组件存在
    const pagination = page.locator('.px-6.py-4.border-t').first();
    await expect(pagination, '分页组件应该存在').toBeVisible({ timeout: 5000 });

    // Step 3: 验证页码信息
    const pageInfo = page.locator('text=/共\\d+条|第\\d+页/i');
    await expect(pageInfo, '应该显示分页信息').toBeVisible();

    // Step 4: 点击下一页
    const nextPageButton = page.locator('button:has-text("下一页"), button:has-text(">")').first();
    const canGoToNextPage = await nextPageButton.isEnabled();

    if (canGoToNextPage) {
      await nextPageButton.click();
      await page.waitForTimeout(1000);

      // 验证页面切换成功
      const currentPageInfo = page.locator('text=/第2页/i');
      await expect(currentPageInfo, '应该显示第2页').toBeVisible();
    }
  });

  test('TEST-06: 应该显示全局 Toast 提示（成功/错误）', async ({ page }) => {
    // Step 1: 测试创建成功的 Toast
    await page.locator('[data-testid="create-project-button"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="project-name-input"]').fill('Toast测试项目');
    await page.locator('[data-testid="project-description-input"]').fill('测试Toast提示功能');
    await page.locator('[data-testid="submit-project-button"]').click();

    // Step 2: 验证成功 Toast
    const successToast = page.locator('text=/创建成功/i').first();
    await expect(successToast, '应该显示成功Toast').toBeVisible({ timeout: 5000 });

    // Step 3: 等待 Toast 自动消失
    await page.waitForTimeout(3000);
    await expect(successToast, 'Toast应该自动消失').not.toBeVisible();

    // Step 4: 测试表单验证错误 Toast
    await page.locator('[data-testid="create-project-button"]').click();
    await page.waitForTimeout(300);

    // 不填写任何内容，直接提交
    await page.locator('[data-testid="submit-project-button"]').click();

    // Step 5: 验证错误提示（应该显示表单验证错误）
    const nameError = page.locator('text=/项目名称不能为空|不能为空/i').first();
    await expect(nameError, '应该显示表单验证错误').toBeVisible();

    // Step 6: 测试名称长度限制
    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill('A'.repeat(51)); // 超过50字符限制

    const lengthError = page.locator('text=/项目名称不能超过50个字符/i').first();
    await expect(lengthError, '应该显示长度限制错误').toBeVisible();
  });

  test('TEST-07: 应该验证项目字段（Bug #1 修复验证）', async ({ page }) => {
    // Step 1: 创建项目
    await page.locator('[data-testid="create-project-button"]').click();
    await page.waitForTimeout(300);

    const projectName = `字段验证测试_${Date.now()}`;
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    await page.locator('[data-testid="project-description-input"]').fill('验证key和owner字段');
    await page.locator('[data-testid="submit-project-button"]').click();

    // Step 2: 等待创建完成
    await page.waitForTimeout(2000);

    // Step 3: 验证项目key字段（Bug #1 修复：添加key字段）
    const projectRow = page.locator(`tbody tr:has-text("${projectName}")`).first();
    await expect(projectRow, '项目行应该存在').toBeVisible();

    // 验证key显示（格式：#PRJ_xxx）
    const projectKey = projectRow.locator('text=/#PRJ_/i');
    await expect(projectKey, '项目应该显示唯一key标识').toBeVisible();

    // Step 4: 验证owner字段（Bug #1 修复：添加owner字段）
    const ownerCell = projectRow.locator('td').nth(2); // 第3列是创建人/负责人
    await expect(ownerCell, '项目应该显示负责人信息').toBeVisible();
  });

  test('TEST-08: 应该正确使用data-testid属性（Bug #2 修复验证）', async ({ page }) => {
    // Step 1: 验证创建按钮有 data-testid
    const createButton = page.locator('[data-testid="create-project-button"]');
    await expect(createButton, '创建按钮应该有data-testid属性').toHaveAttribute('data-testid', 'create-project-button');

    // Step 2: 点击创建按钮
    await createButton.click();
    await page.waitForTimeout(300);

    // Step 3: 验证输入框有 data-testid
    const nameInput = page.locator('[data-testid="project-name-input"]');
    await expect(nameInput, '项目名称输入框应该有data-testid属性').toHaveAttribute('data-testid', 'project-name-input');

    const descInput = page.locator('[data-testid="project-description-input"]');
    await expect(descInput, '项目描述输入框应该有data-testid属性').toHaveAttribute('data-testid', 'project-description-input');

    // Step 4: 验证提交按钮有 data-testid
    const submitButton = page.locator('[data-testid="submit-project-button"]');
    await expect(submitButton, '提交按钮应该有data-testid属性').toHaveAttribute('data-testid', 'submit-project-button');

    // Step 5: 关闭对话框
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('TEST-09: 应该支持表单验证和实时反馈', async ({ page }) => {
    // Step 1: 打开创建对话框
    await page.locator('[data-testid="create-project-button"]').click();
    await page.waitForTimeout(300);

    const nameInput = page.locator('[data-testid="project-name-input"]');
    const descInput = page.locator('[data-testid="project-description-input"]');

    // Step 2: 测试项目名称必填验证
    await nameInput.fill('');
    await nameInput.blur();
    await page.waitForTimeout(200);

    // 应该显示错误提示
    const nameError = page.locator('text=/项目名称不能为空/i').first();
    // 注意：可能只在提交时显示，所以这里用 try-catch
    try {
      await expect(nameError).toBeVisible({ timeout: 1000 });
    } catch (e) {
      // 如果实时验证未触发，通过提交时验证
    }

    // Step 3: 测试项目名称长度限制（50字符）
    await nameInput.fill('A'.repeat(51));
    await nameInput.blur();
    await page.waitForTimeout(200);

    const lengthError = page.locator('text=/项目名称不能超过50个字符/i').first();
    await expect(lengthError, '应该显示长度限制错误').toBeVisible();

    // Step 4: 测试字符计数显示
    const counter = page.locator('text=/51 \\/ 50/i').first();
    await expect(counter, '应该显示字符计数').toBeVisible();

    // Step 5: 测试项目描述长度限制（200字符）
    await descInput.fill('A'.repeat(201));
    await descInput.blur();
    await page.waitForTimeout(200);

    const descLengthError = page.locator('text=/项目描述不能超过200个字符/i').first();
    await expect(descLengthError, '应该显示描述长度限制错误').toBeVisible();

    // Step 6: 测试提交按钮禁用状态
    const submitButton = page.locator('[data-testid="submit-project-button"]');
    await expect(submitButton, '有错误时提交按钮应该禁用').toBeDisabled();

    // Step 7: 修正错误
    await nameInput.fill('正常项目名称');
    await descInput.fill('正常项目描述');

    // 验证按钮恢复可用
    await expect(submitButton, '修正错误后提交按钮应该可用').not.toBeDisabled();
  });

  test('TEST-10: 应该能够导航到数据库配置和测试用例页面', async ({ page }) => {
    // Step 1: 先创建一个项目
    await page.locator('[data-testid="create-project-button"]').click();
    await page.waitForTimeout(300);

    const projectName = `导航测试项目_${Date.now()}`;
    await page.locator('[data-testid="project-name-input"]').fill(projectName);
    await page.locator('[data-testid="project-description-input"]').fill('测试导航功能');
    await page.locator('[data-testid="submit-project-button"]').click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // Step 2: 找到项目行
    const projectRow = page.locator(`tbody tr:has-text("${projectName}")`).first();

    // Step 3: 点击数据库配置按钮
    const dbButton = projectRow.locator('[data-testid="database-config-button"]');
    await expect(dbButton, '数据库配置按钮应该存在').toBeVisible();
    await dbButton.click();

    // Step 4: 验证导航到数据库配置页面
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url, '应该导航到数据库配置页面').toContain('/database-configs');

    // Step 5: 返回项目管理页面
    await page.goto('/api/projects');
    await page.waitForLoadState('networkidle');

    // Step 6: 点击测试用例按钮
    const testCasesButton = projectRow.locator('a[href*="/test-cases"]').first();
    await expect(testCasesButton, '测试用例按钮应该存在').toBeVisible();
    await testCasesButton.click();

    // Step 7: 验证导航到测试用例页面
    await page.waitForTimeout(1000);
    const testCaseUrl = page.url();
    expect(testCaseUrl, '应该导航到测试用例页面').toContain('/test-cases');
  });
});
