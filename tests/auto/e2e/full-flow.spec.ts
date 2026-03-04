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

    // 填写表单
    await waitForElement(page, '[data-testid="project-name-input"], #project-name', 5000);
    await fillInput(page, '[data-testid="project-name-input"], #project-name', projectName);
    await fillInput(page, '[data-testid="project-description-input"], #project-description', `E2E 测试项目 - ${runId}`);

    // 提交
    await clickElement(page, '[data-testid="submit-project-button"], button:has-text("创建")');

    // 等待创建完成
    await page.waitForTimeout(2000);

    // 验证项目存在
    await navigateTo(page, '/projects');
    const projectCard = page.locator(`text=${projectName}`).first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });

    state = updateTestState(runId, { projectName });
    console.log(`Created project: ${projectName}`);
  });

  test('02 - 场景管理 - 创建场景', async ({ page }) => {
    await navigateTo(page, '/scenarios');

    const scenarioName = generateTestName('场景', runId);

    // 点击创建按钮
    await clickElement(page, 'button:has-text("新建场景"), button:has-text("New Scenario")');

    // 填写表单
    await waitForElement(page, 'input[name="name"], input[placeholder*="场景"]', 5000);
    await fillInput(page, 'input[name="name"], input[placeholder*="场景"]', scenarioName);

    // 提交
    await clickElement(page, 'button[type="submit"], button:has-text("创建")');

    // 等待跳转到编辑器
    await page.waitForURL(/\/scenarios\/editor/, { timeout: 15000 });

    const currentUrl = page.url();
    const match = currentUrl.match(/\/scenarios\/editor\/([a-f0-9-]+)/);
    const scenarioId = match ? match[1] : '';

    state = updateTestState(runId, { scenarioId, scenarioName });
    console.log(`Created scenario: ${scenarioId}`);
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
