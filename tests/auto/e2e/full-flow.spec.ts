import { test, expect, Page } from '@playwright/test';
import { initTestState, generateRunId, generateTestName, updateTestState } from './fixtures/test-state';

// 辅助函数
async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function clickElement(page: Page, selector: string) {
  await page.click(selector);
}

async function fillInput(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
}

async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
}

test.describe('完整流程集成测试', () => {
  const runId = generateRunId();
  let state = initTestState(runId);

  test.beforeAll(() => {
    console.log(`Test Run ID: ${runId}`);
  });

  test('01 - 项目管理 - 创建项目', async ({ page }) => {
    await navigateTo(page, '/projects');

    const projectName = generateTestName('项目', runId);

    // 点击创建按钮
    await clickElement(page, '[data-testid="create-project-button"], button:has-text("新建项目")');

    // 等待对话框出现
    await waitForElement(page, '[data-testid="project-name-input"], #project-name', 5000);

    // 填写项目名称
    const nameInput = page.locator('[data-testid="project-name-input"], #project-name');
    await nameInput.fill(projectName);

    // 等待字符计数出现，确保 React 状态已更新
    await page.waitForSelector(`text=${projectName.length} / 50`, { timeout: 3000 });

    // 填写项目描述
    const descInput = page.locator('[data-testid="project-description-input"], #project-description');
    await descInput.fill(`E2E 测试项目 - ${runId}`);

    // 等待创建按钮变为可用状态
    const submitButton = page.locator('[data-testid="submit-project-button"], button:has-text("创建"):not([disabled])');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });

    // 点击创建
    await submitButton.click();

    // 等待对话框关闭（创建完成）
    await page.waitForSelector('[data-testid="project-name-input"]', { state: 'hidden', timeout: 10000 });

    // 验证项目存在
    await navigateTo(page, '/projects');
    const projectCard = page.locator(`text=${projectName}`).first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });

    state = updateTestState(runId, { projectName });
    console.log(`Created project: ${projectName}`);
  });

  test('02 - 场景管理 - 验证场景页面', async ({ page }) => {
    await navigateTo(page, '/scenarios');

    // 验证页面标题
    const pageTitle = page.locator('h1').first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    // 验证"新建场景"按钮存在（支持中英文）
    const createButton = page.locator('button:has-text("新建场景"), button:has-text("New Scenario")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });

    // 验证搜索框存在
    const searchInput = page.locator('input[placeholder*="搜索场景"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    console.log('Scenario page verified');
  });

  test('03 - 报告查看 - 查看报告列表', async ({ page }) => {
    await navigateTo(page, '/reports');

    // 等待页面加载
    await page.waitForTimeout(2000);

    // 检查报告列表或空状态
    const hasContent = await page.locator('table tbody tr, .report-card, [class*="report"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasContent) {
      // 如果没有报告，检查是否显示空状态
      const emptyState = page.locator('text=/暂无|没有|empty|no report/i');
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }

    console.log('Reports page verified');
  });

  test('04 - 全局参数管理', async ({ page }) => {
    await navigateTo(page, '/global-params');

    // 验证页面加载
    const pageTitle = page.locator('h1, .page-title').first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    console.log('Global params page verified');
  });

  test('05 - 关键字管理', async ({ page }) => {
    await navigateTo(page, '/keywords');

    // 验证页面加载
    const pageTitle = page.locator('h1, .page-title').first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    console.log('Keywords page verified');
  });
});
