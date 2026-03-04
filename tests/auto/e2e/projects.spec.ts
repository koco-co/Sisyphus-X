import { test, expect } from '@playwright/test';

/**
 * TASK-058: 项目管理功能黑盒测试
 *
 * 测试场景:
 * 1. 测试创建项目
 * 2. 测试编辑项目
 * 3. 测试删除项目（二次确认）
 * 4. 测试搜索功能
 *
 * 适配卡片式布局的 ProjectList 组件
 */

test.describe('TASK-058: 项目管理功能黑盒测试', () => {
  // 测试数据
  const timestamp = Date.now();
  const testProject = {
    name: `E2E测试项目_${timestamp}`,
    description: '这是一个E2E自动化测试创建的项目，用于验证项目管理功能',
    updatedName: `E2E测试项目_更新_${timestamp}`,
  };

  test.beforeEach(async ({ page }) => {
    // 导航到项目管理页面
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 验证页面标题出现
    const title = page.locator('h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('TEST-01: 应该能够创建新项目', async ({ page }) => {
    // 点击创建项目按钮
    const createButton = page.locator('[data-testid="create-project-button"]');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // 等待创建对话框出现
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal).toBeVisible();

    // 填写项目名称
    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill(testProject.name);

    // 等待字符计数出现，确保 React 状态已更新
    await page.waitForSelector(`text=${testProject.name.length} / 50`, { timeout: 3000 });

    // 填写项目描述
    const descInput = page.locator('[data-testid="project-description-input"]');
    await descInput.fill(testProject.description);

    // 等待创建按钮变为可用状态并点击
    const submitButton = page.locator('[data-testid="submit-project-button"]:not([disabled])');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 验证 Toast 成功提示
    const toast = page.locator('text=/创建成功/i').first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    // 验证项目出现在列表中
    const newProject = page.locator(`text=${testProject.name}`);
    await expect(newProject).toBeVisible({ timeout: 5000 });

    // 验证项目 key 字段存在（格式: #PROJ-XXXXX）
    const projectKey = page.locator('text=/#PROJ-/').first();
    await expect(projectKey).toBeVisible({ timeout: 5000 });
  });

  test('TEST-02: 应该能够编辑项目', async ({ page }) => {
    // 先创建一个测试项目
    const createButton = page.locator('[data-testid="create-project-button"]');
    await createButton.click();

    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill(testProject.name);
    await page.waitForSelector(`text=${testProject.name.length} / 50`, { timeout: 3000 });

    const descInput = page.locator('[data-testid="project-description-input"]');
    await descInput.fill(testProject.description);

    const submitButton = page.locator('[data-testid="submit-project-button"]:not([disabled])');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // 找到项目卡片上的编辑按钮（卡片布局）
    const projectCard = page.locator(`[data-testid^="project-card-"]`).filter({ hasText: testProject.name }).first();
    await expect(projectCard).toBeVisible({ timeout: 5000 });

    // 点击编辑按钮
    const editButton = projectCard.locator('[data-testid^="project-edit-button-"]').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 等待编辑对话框出现
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal).toBeVisible();

    // 修改项目名称
    const editNameInput = page.locator('[data-testid="edit-project-name-input"], #edit-project-name');
    await editNameInput.clear();
    await editNameInput.fill(testProject.updatedName);

    // 点击保存按钮
    const saveButton = page.locator('[data-testid="submit-edit-project-button"]:not([disabled])');
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });
    await saveButton.click();

    // 验证 Toast 成功提示
    const toast = page.locator('text=/编辑成功|更新成功/i').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('TEST-03: 应该能够搜索项目', async ({ page }) => {
    // 创建一个唯一名称的测试项目
    const uniqueName = `搜索测试项目_${Date.now()}`;

    const createButton = page.locator('[data-testid="create-project-button"]');
    await createButton.click();

    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill(uniqueName);
    await page.waitForSelector(`text=${uniqueName.length} / 50`, { timeout: 3000 });

    const submitButton = page.locator('[data-testid="submit-project-button"]:not([disabled])');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // 使用搜索框搜索项目
    const searchInput = page.locator('[data-testid="project-search-input"], input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(uniqueName);

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索结果包含目标项目
    const searchResult = page.locator(`text=${uniqueName}`);
    await expect(searchResult).toBeVisible({ timeout: 5000 });
  });

  test('TEST-04: 应该能够删除项目', async ({ page }) => {
    // 创建一个待删除的测试项目
    const deleteProjectName = `待删除项目_${Date.now()}`;

    const createButton = page.locator('[data-testid="create-project-button"]');
    await createButton.click();

    const nameInput = page.locator('[data-testid="project-name-input"]');
    await nameInput.fill(deleteProjectName);
    await page.waitForSelector(`text=${deleteProjectName.length} / 50`, { timeout: 3000 });

    const submitButton = page.locator('[data-testid="submit-project-button"]:not([disabled])');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 等待创建完成
    await page.waitForTimeout(2000);

    // 找到项目卡片上的删除按钮
    const projectCard = page.locator(`[data-testid^="project-card-"]`).filter({ hasText: deleteProjectName }).first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });

    // 点击删除按钮（第二个按钮是删除）
    const deleteButton = projectCard.locator('button').nth(1);
    await deleteButton.click({ force: true });

    // 等待确认对话框出现并使用 role 选择器
    await page.waitForTimeout(1000);
    const confirmDialog = page.locator('[role="dialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 10000 });

    // 在对话框中找到输入框并输入项目名称
    const verificationInput = confirmDialog.locator('input[type="text"]').first();
    await verificationInput.fill(deleteProjectName);

    // 点击确认删除按钮
    const confirmButton = confirmDialog.locator('button:has-text("删除")').last();
    await confirmButton.click();

    // 验证 Toast 成功提示
    const toast = page.locator('text=/删除成功/i').first();
    await expect(toast).toBeVisible({ timeout: 10000 });

    // 验证项目已从列表中移除
    await page.waitForTimeout(1000);
    const deletedProject = page.locator(`text=${deleteProjectName}`);
    await expect(deletedProject).not.toBeVisible({ timeout: 5000 });
  });
});
