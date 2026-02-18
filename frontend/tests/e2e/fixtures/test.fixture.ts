import { test as base, expect } from '@playwright/test';

/**
 * 基础测试fixture
 * 提供通用的测试配置和辅助函数
 */

export const test = base.extend({});
export { expect };

/**
 * 辅助函数：导航到场景编辑器
 */
export async function navigateToScenarioEditor(page: any, scenarioId?: number) {
  await page.goto('http://localhost:5173/');

  // 等待页面加载
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 如果有scenarioId，导航到特定场景
  if (scenarioId) {
    await page.goto(`http://localhost:5173/scenarios/editor/${scenarioId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }
}

/**
 * 辅助函数：创建测试场景
 */
export async function createTestScenario(page: any, name: string) {
  // 导航到场景页面
  await page.goto('http://localhost:5173/scenarios');
  await page.waitForLoadState('domcontentloaded');

  // 点击创建按钮
  const createButton = page.locator('button:has-text("创建"), button:has-text("New")').first();
  if (await createButton.isVisible()) {
    await createButton.click();
  } else {
    // 尝试其他选择器
    await page.click('a[href*="/scenarios/editor/new"]');
  }

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 输入场景名称
  const nameInput = page.locator('input[placeholder*="名称"], input[name*="name"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);
  }

  // 保存场景
  const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
  if (await saveButton.isVisible()) {
    await saveButton.click();
  }

  await page.waitForTimeout(2000);

  return name;
}

/**
 * 辅助函数：等待Toast消息
 */
export async function waitForToast(page: any, message: string, timeout = 5000) {
  await expect(page.locator(`text=/${message}/`).first()).toBeVisible({ timeout });
  await page.waitForTimeout(1000);
}
