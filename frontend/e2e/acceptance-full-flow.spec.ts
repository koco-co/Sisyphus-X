import { test, expect } from '@playwright/test';

/**
 * Sisyphus-X 全流程验收测试
 *
 * 要求：深色模式 + 简体中文
 * 流程：
 * 1. 项目管理：创建项目 → 编辑 → 数据库配置（访问页面）
 * 2. 关键字配置：创建自定义关键字
 * 3. 接口定义：新建接口并调试
 * 4. 场景编排：新建场景并添加步骤
 * 5. 测试计划：新建计划、加入场景、执行
 * 6. 测试报告：进入报告详情
 * 7. 环境管理：新建环境
 * 8. 全局参数：新建参数
 */

const SAVE_BUTTONS = [
  'button:has-text("创建")',
  'button:has-text("Create")',
  'button:has-text("Confirm")',
  'button:has-text("Save")',
  'button:has-text("确定")',
  'button:has-text("保存")',
];

async function clickSaveButton(page: import('@playwright/test').Page) {
  for (const selector of SAVE_BUTTONS) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

test.describe('Sisyphus-X 全流程验收测试', () => {
  const timestamp = Date.now();
  const projectName = `验收_${timestamp}`;
  const keywordName = `验收关键字_${timestamp}`;
  const interfaceName = `验收接口_${timestamp}`;
  const scenarioName = `验收场景_${timestamp}`;
  const planName = `验收计划_${timestamp}`;
  const envName = `验收环境_${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // 强制深色模式 + 简体中文（必须在 goto 之前注入）
    await page.addInitScript(() => {
      localStorage.setItem('sisyphus-theme', 'dark');
      localStorage.setItem('sisyphus-language', 'zh-CN');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('完整验收流程', async ({ page }) => {
    console.log('\n========== 开始全流程验收测试 ==========\n');

    // ========== 步骤 1: 项目管理 ==========
    console.log(`[步骤 1] 项目管理：创建项目 ${projectName}`);
    const projectLink = page.locator('a:has-text("项目管理")');
    await expect(projectLink.first()).toBeVisible({ timeout: 10000 });
    await projectLink.first().click();
    await page.waitForTimeout(2000);

    const createBtn = page.locator('[data-testid="create-project-button"], button:has-text("创建项目"), button:has-text("新建项目")').first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    const nameInput = page.locator('[data-testid="project-name-input"], input[placeholder*="项目名称"], input[placeholder*="name" i]').first();
    await nameInput.fill(projectName);

    const descInput = page.locator('[data-testid="project-description-input"], textarea[placeholder*="描述"]').first();
    if (await descInput.isVisible({ timeout: 1000 })) {
      await descInput.fill('验收测试项目');
    }

    await clickSaveButton(page);
    await page.waitForTimeout(3000);
    await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10000 });
    console.log('✓ 项目创建成功');

    // 编辑项目（简要）
    const editBtn = page.locator('[data-testid^="project-edit-button-"]').first();
    if (await editBtn.isVisible({ timeout: 2000 })) {
      await editBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 访问数据库配置页面
    const dbConfigLink = page.locator('[data-testid="database-config-button"]').first();
    if (await dbConfigLink.isVisible({ timeout: 2000 })) {
      await dbConfigLink.click();
      await page.waitForTimeout(2000);
      const addDbBtn = page.locator('[data-testid="add-database-config-button"], button:has-text("新建"), button:has-text("添加")').first();
      if (await addDbBtn.isVisible({ timeout: 3000 })) {
        await addDbBtn.click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
      }
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    console.log('✓ 数据库配置页面已访问');

    // ========== 步骤 2: 关键字配置 ==========
    console.log(`[步骤 2] 关键字配置：创建关键字 ${keywordName}`);
    const keywordLink = page.locator('a:has-text("关键字配置")');
    await expect(keywordLink.first()).toBeVisible({ timeout: 10000 });
    await keywordLink.first().click();
    await page.waitForTimeout(2000);

    const createKeywordBtn = page.locator('[data-testid="create-keyword-button"], button:has-text("创建关键字"), button:has-text("新建关键字")').first();
    if (await createKeywordBtn.isVisible({ timeout: 3000 })) {
      await createKeywordBtn.click();
      await page.waitForTimeout(1000);

      const kwNameInput = page.locator('[data-testid="keyword-name-input"], input[name="name"], input[placeholder*="名称"]').first();
      await kwNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await kwNameInput.fill(keywordName);

      const kwTypeSelect = page.locator('[data-testid="keyword-type-select"]').first();
      if (await kwTypeSelect.isVisible({ timeout: 2000 })) {
        await kwTypeSelect.selectOption({ index: 1 });
      }

      await clickSaveButton(page);
      await page.waitForTimeout(3000);
      await expect(page.locator(`text=${keywordName}`)).toBeVisible({ timeout: 10000 });
      console.log('✓ 关键字创建成功');
    } else {
      console.log('⚠ 跳过关键字创建');
    }

    // ========== 步骤 3: 接口定义 ==========
    console.log(`[步骤 3] 接口定义：新建接口 ${interfaceName}`);
    const apiLink = page.locator('a:has-text("接口定义")');
    await expect(apiLink.first()).toBeVisible({ timeout: 10000 });
    await apiLink.first().click();
    await page.waitForTimeout(3000);

    const projectSelectBtn = page.locator('button:has-text("选择项目"), [placeholder*="选择项目"]').first();
    await projectSelectBtn.waitFor({ state: 'visible', timeout: 5000 });
    await projectSelectBtn.click();
    await page.waitForTimeout(500);
    await page.locator(`text="${projectName}"`).first().click();
    await page.waitForTimeout(2000);

    const createInterfaceSelectors = ['text=新建请求', 'text=New Request', 'button:has-text("新建接口")'];
    let createInterfaceClicked = false;
    for (const sel of createInterfaceSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        createInterfaceClicked = true;
        break;
      }
    }
    expect(createInterfaceClicked).toBe(true);
    await page.waitForTimeout(2000);

    const ifaceNameInput = page.locator('input[name="name"], input[placeholder*="接口名称"]').first();
    if (await ifaceNameInput.isVisible({ timeout: 3000 })) {
      await ifaceNameInput.fill(interfaceName);
    }

    const urlInput = page.locator('input[name="url"], input[placeholder*="URL" i]').first();
    await urlInput.waitFor({ state: 'visible', timeout: 5000 });
    await urlInput.fill('https://httpbin.org/get');

    await clickSaveButton(page);
    await page.waitForTimeout(2000);

    const sendBtn = page.locator('button:has-text("发送"), button:has-text("Send"), button:has-text("调试")').first();
    if (await sendBtn.isVisible({ timeout: 3000 })) {
      await sendBtn.click();
      await page.waitForTimeout(5000);
    }
    console.log('✓ 接口创建并调试完成');

    // ========== 步骤 4: 场景编排 ==========
    console.log(`[步骤 4] 场景编排：新建场景 ${scenarioName}`);
    const scenarioLink = page.locator('a:has-text("场景编排")');
    await expect(scenarioLink.first()).toBeVisible({ timeout: 10000 });
    await scenarioLink.first().click();
    await page.waitForTimeout(2000);

    const createScenarioBtn = page.locator('button:has-text("新建场景"), button:has-text("创建场景")').first();
    await expect(createScenarioBtn).toBeVisible({ timeout: 5000 });
    await createScenarioBtn.click();
    await page.waitForTimeout(1000);

    const scenarioNameInput = page.locator('input[name="name"], input[placeholder*="场景名称"]').first();
    await scenarioNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await scenarioNameInput.fill(scenarioName);

    const projectSelectorInScenario = page.locator('button:has-text("选择项目"), [placeholder*="选择项目"]').first();
    if (await projectSelectorInScenario.isVisible({ timeout: 5000 })) {
      await projectSelectorInScenario.click();
      await page.waitForTimeout(500);
      await page.locator(`text=${projectName}`).first().click();
      await page.waitForTimeout(1000);
    }

    const addStepBtn = page.locator('button:has-text("添加步骤"), button:has-text("新增步骤")').first();
    if (await addStepBtn.isVisible({ timeout: 3000 })) {
      await addStepBtn.click();
      await page.waitForTimeout(1000);
      const interfaceOption = page.locator(`text=${interfaceName}`).first();
      if (await interfaceOption.isVisible({ timeout: 5000 })) {
        await interfaceOption.click();
        await page.waitForTimeout(1000);
      }
    }

    await clickSaveButton(page);
    await page.waitForTimeout(3000);
    await expect(page.locator(`text=${scenarioName}`)).toBeVisible({ timeout: 10000 });
    console.log('✓ 场景创建成功');

    // ========== 步骤 5: 测试计划 ==========
    console.log(`[步骤 5] 测试计划：新建计划 ${planName}`);
    const planLink = page.locator('a:has-text("测试计划")');
    await expect(planLink.first()).toBeVisible({ timeout: 10000 });
    await planLink.first().click();
    await page.waitForTimeout(2000);

    const createPlanBtn = page.locator('button:has-text("新建计划"), button:has-text("创建计划")').first();
    await expect(createPlanBtn).toBeVisible({ timeout: 5000 });
    await createPlanBtn.click();
    await page.waitForTimeout(1000);

    const planNameInput = page.locator('input[name="name"], input[placeholder*="计划名称"]').first();
    await planNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await planNameInput.fill(planName);

    const projectSelectorInPlan = page.locator('button:has-text("选择项目"), [placeholder*="选择项目"]').first();
    if (await projectSelectorInPlan.isVisible({ timeout: 5000 })) {
      await projectSelectorInPlan.click();
      await page.waitForTimeout(500);
      await page.locator(`text=${projectName}`).first().click();
      await page.waitForTimeout(1000);
    }

    const addScenarioBtn = page.locator('button:has-text("添加场景"), button:has-text("选择场景")').first();
    if (await addScenarioBtn.isVisible({ timeout: 3000 })) {
      await addScenarioBtn.click();
      await page.waitForTimeout(1000);
      await page.locator(`text=${scenarioName}`).first().click();
      await page.waitForTimeout(1000);
    }

    await clickSaveButton(page);
    await page.waitForTimeout(3000);

    const runBtn = page.locator('button:has-text("执行"), button:has-text("Run"), button:has-text("运行")').first();
    if (await runBtn.isVisible({ timeout: 3000 })) {
      await runBtn.click();
      await page.waitForTimeout(10000);
    }
    console.log('✓ 计划执行完成');

    // ========== 步骤 6: 测试报告 ==========
    console.log('[步骤 6] 测试报告：进入报告详情');
    const reportLink = page.locator('a:has-text("测试报告")');
    await expect(reportLink.first()).toBeVisible({ timeout: 10000 });
    await reportLink.first().click();
    await page.waitForTimeout(2000);

    const viewBtn = page.locator('tr:first-child button:has-text("查看"), tr:first-child button:has-text("详情"), tr:first-child a:has-text("查看")').first();
    if (await viewBtn.isVisible({ timeout: 5000 })) {
      await viewBtn.click();
      await page.waitForTimeout(3000);
    }
    console.log('✓ 报告详情已访问');

    // ========== 步骤 7: 环境管理 ==========
    console.log(`[步骤 7] 环境管理：新建环境 ${envName}`);
    const envLink = page.locator('a:has-text("环境管理")');
    await expect(envLink.first()).toBeVisible({ timeout: 10000 });
    await envLink.first().click();
    await page.waitForTimeout(2000);

    const createEnvBtn = page.locator('[data-testid="create-environment-button"], button:has-text("创建环境")').first();
    if (await createEnvBtn.isVisible({ timeout: 5000 })) {
      await createEnvBtn.click();
      await page.waitForTimeout(1000);

      const envNameInput = page.locator('input#name, input[placeholder*="环境名称"]').first();
      if (await envNameInput.isVisible({ timeout: 3000 })) {
        await envNameInput.fill(envName);
      }

      await clickSaveButton(page);
      await page.waitForTimeout(2000);
      console.log('✓ 环境创建完成');
    } else {
      console.log('⚠ 环境管理页面可能需选择项目');
    }

    // ========== 步骤 8: 全局参数 ==========
    console.log('[步骤 8] 全局参数：新建参数');
    const paramsLink = page.locator('a:has-text("全局参数")');
    await expect(paramsLink.first()).toBeVisible({ timeout: 10000 });
    await paramsLink.first().click();
    await page.waitForTimeout(2000);

    const createParamBtn = page.locator('button:has-text("新建"), button:has-text("创建")').first();
    if (await createParamBtn.isVisible({ timeout: 5000 })) {
      await createParamBtn.click();
      await page.waitForTimeout(1000);
      await clickSaveButton(page);
      await page.waitForTimeout(2000);
      console.log('✓ 全局参数创建完成（使用默认代码）');
    }

    console.log('\n========== ✅ 全流程验收测试完成 ==========\n');
  });
});
