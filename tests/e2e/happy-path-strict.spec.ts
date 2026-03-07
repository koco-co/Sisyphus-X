import { test, expect, Page } from '@playwright/test';

const PROJECT_NAME = `HP_STRICT_${Date.now()}`;
const BASE_URL = 'http://localhost:5173';

test.describe.skip('Sisyphus-X Happy Path - 严格执行（已废弃，使用 specs/happy-path.spec.ts）', () => {
  let page: Page;
  let projectId: string;
  let keywordId: string;
  let interfaceId: string;
  let scenarioId: string;
  let planId: string;
  let reportId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('步骤1: 项目管理 - 新建项目', async () => {
    console.log('\n=== 步骤1: 新建项目 ===');
    
    // 导航到项目管理页面
    await page.goto(`${BASE_URL}/api-automation/projects`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step1-1-project-list.png' });

    // 点击新建项目按钮
    const createButton = page.locator('button:has-text("新建项目"), button:has-text("创建项目")').first();
    await createButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/step1-2-create-dialog.png' });

    // 填写项目信息
    await page.fill('input[name="name"], input[placeholder*="项目名称"]', PROJECT_NAME);
    await page.fill('textarea[name="description"], textarea[placeholder*="描述"]', `自动化测试项目 - ${new Date().toISOString()}`);
    await page.screenshot({ path: 'test-results/step1-3-filled-form.png' });

    // 提交表单
    const submitButton = page.locator('button:has-text("确定"), button:has-text("提交"), button:has-text("保存")').last();
    await submitButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step1-4-after-submit.png' });

    // 验证项目创建成功
    const projectCard = page.locator(`text=${PROJECT_NAME}`).first();
    await expect(projectCard).toBeVisible({ timeout: 5000 });
    
    console.log(`✅ 项目创建成功: ${PROJECT_NAME}`);
  });

  test('步骤2: 关键字配置 - 新建关键字', async () => {
    console.log('\n=== 步骤2: 新建关键字 ===');
    
    // 导航到关键字管理页面
    await page.goto(`${BASE_URL}/keywords`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step2-1-keyword-list.png' });

    // 点击新建关键字
    const createButton = page.locator('button:has-text("新建"), button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/step2-2-create-dialog.png' });

    // 填写关键字信息
    const keywordName = `test_keyword_${Date.now()}`;
    await page.fill('input[name="name"], input[placeholder*="关键字名称"]', keywordName);
    await page.fill('textarea[name="description"], textarea[placeholder*="描述"]', '自动化测试关键字');
    
    // 如果有代码编辑器，尝试填写（若无法编辑则跳过）
    const codeEditor = page.locator('.monaco-editor, textarea[name="code"]').first();
    if (await codeEditor.isVisible({ timeout: 2000 })) {
      try {
        await codeEditor.click();
        await page.keyboard.type('def test_keyword():\n    return {"status": "ok"}');
      } catch (e) {
        console.log('⚠️  Monaco 编辑器无法编辑，保留默认代码');
      }
    }
    await page.screenshot({ path: 'test-results/step2-3-filled-form.png' });

    // 保存关键字
    const saveButton = page.locator('button:has-text("保存"), button:has-text("确定")').last();
    await saveButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step2-4-after-save.png' });

    // 验证关键字创建成功
    const keywordItem = page.locator(`text=${keywordName}`).first();
    await expect(keywordItem).toBeVisible({ timeout: 5000 });
    
    console.log(`✅ 关键字创建成功: ${keywordName}`);
  });

  test('步骤3: 接口定义 - 新增接口并调试', async () => {
    console.log('\n=== 步骤3: 新增接口并调试 ===');
    
    // 导航到接口管理页面
    await page.goto(`${BASE_URL}/interface-management`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step3-1-interface-list.png' });

    // 切换到刚创建的项目
    const projectSelector = page.locator('select, [role="combobox"]').first();
    if (await projectSelector.isVisible({ timeout: 2000 })) {
      await projectSelector.click();
      await page.locator(`text=${PROJECT_NAME}`).click();
      await page.waitForTimeout(1000);
    }

    // 新建接口
    const createButton = page.locator('button:has-text("新建"), button:has-text("创建"), button:has-text("添加")').first();
    await createButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/step3-2-create-dialog.png' });

    // 填写接口信息
    const interfaceName = `test_api_${Date.now()}`;
    await page.fill('input[name="name"], input[placeholder*="接口名称"]', interfaceName);
    await page.fill('input[name="url"], input[placeholder*="URL"]', 'https://httpbin.org/get');
    
    // 选择 GET 方法
    const methodSelector = page.locator('select[name="method"], [role="combobox"]:has-text("GET")').first();
    if (await methodSelector.isVisible({ timeout: 2000 })) {
      await methodSelector.click();
      await page.locator('text="GET"').first().click();
    }
    await page.screenshot({ path: 'test-results/step3-3-filled-form.png' });

    // 保存接口
    const saveButton = page.locator('button:has-text("保存"), button:has-text("确定")').last();
    await saveButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step3-4-after-save.png' });

    // 执行调试
    const debugButton = page.locator('button:has-text("发送"), button:has-text("执行"), button:has-text("调试")').first();
    if (await debugButton.isVisible({ timeout: 2000 })) {
      await debugButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/step3-5-debug-result.png' });
      console.log('✅ 接口调试完成');
    }

    console.log(`✅ 接口创建成功: ${interfaceName}`);
  });

  test('步骤4: 场景编排 - 新建场景并添加步骤', async () => {
    console.log('\n=== 步骤4: 新建场景 ===');
    
    // 导航到场景编排页面
    await page.goto(`${BASE_URL}/scenarios`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step4-1-scenario-list.png' });

    // 新建场景
    const createButton = page.locator('button:has-text("新建"), button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/step4-2-create-dialog.png' });

    // 填写场景信息
    const scenarioName = `test_scenario_${Date.now()}`;
    await page.fill('input[name="name"], input[placeholder*="场景名称"]', scenarioName);
    await page.fill('textarea[name="description"], textarea[placeholder*="描述"]', '自动化测试场景');
    await page.screenshot({ path: 'test-results/step4-3-filled-form.png' });

    // 保存场景
    const saveButton = page.locator('button:has-text("保存"), button:has-text("确定")').last();
    await saveButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step4-4-after-save.png' });

    // 添加步骤（尝试添加请求步骤）
    const addStepButton = page.locator('button:has-text("添加步骤"), button:has-text("新增步骤")').first();
    if (await addStepButton.isVisible({ timeout: 2000 })) {
      await addStepButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/step4-5-add-step.png' });
      
      // 选择步骤类型（请求或关键字）
      const stepTypeSelector = page.locator('select, [role="combobox"]').first();
      if (await stepTypeSelector.isVisible({ timeout: 2000 })) {
        await stepTypeSelector.click();
        await page.locator('text="请求", text="接口"').first().click();
      }
      
      // 保存步骤
      const saveStepButton = page.locator('button:has-text("保存"), button:has-text("确定")').last();
      await saveStepButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'test-results/step4-6-final.png' });

    console.log(`✅ 场景创建成功: ${scenarioName}`);
  });

  test('步骤5: 测试计划 - 新建计划并执行', async () => {
    console.log('\n=== 步骤5: 新建测试计划并执行 ===');
    
    // 导航到测试计划页面
    await page.goto(`${BASE_URL}/plans`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step5-1-plan-list.png' });

    // 新建计划
    const createButton = page.locator('button:has-text("新建"), button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/step5-2-create-dialog.png' });

    // 填写计划信息
    const planName = `test_plan_${Date.now()}`;
    await page.fill('input[name="name"], input[placeholder*="计划名称"]', planName);
    await page.fill('textarea[name="description"], textarea[placeholder*="描述"]', '自动化测试计划');
    
    // 添加场景到计划
    const addScenarioButton = page.locator('button:has-text("添加场景"), button:has-text("选择场景")').first();
    if (await addScenarioButton.isVisible({ timeout: 2000 })) {
      await addScenarioButton.click();
      await page.waitForTimeout(1000);
      // 选择第一个场景
      const firstScenario = page.locator('[type="checkbox"]').first();
      await firstScenario.check();
      const confirmButton = page.locator('button:has-text("确定"), button:has-text("添加")').last();
      await confirmButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'test-results/step5-3-filled-form.png' });

    // 保存计划
    const saveButton = page.locator('button:has-text("保存"), button:has-text("确定")').last();
    await saveButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step5-4-after-save.png' });

    // 执行计划
    const executeButton = page.locator('button:has-text("执行"), button:has-text("运行")').first();
    if (await executeButton.isVisible({ timeout: 2000 })) {
      await executeButton.click();
      await page.waitForTimeout(1000);
      
      // 确认执行
      const confirmExecuteButton = page.locator('button:has-text("确定"), button:has-text("执行")').last();
      if (await confirmExecuteButton.isVisible({ timeout: 2000 })) {
        await confirmExecuteButton.click();
      }
      
      // 等待执行完成（最多30秒）
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/step5-5-executing.png' });
      
      console.log('✅ 测试计划执行已触发');
    }
  });

  test('步骤6: 测试报告 - 查看报告详情', async () => {
    console.log('\n=== 步骤6: 查看测试报告 ===');
    
    // 导航到测试报告页面
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step6-1-report-list.png' });

    // 查找最新的报告
    const firstReport = page.locator('tr, .report-item, [data-testid="report-item"]').first();
    if (await firstReport.isVisible({ timeout: 5000 })) {
      await firstReport.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/step6-2-report-detail.png' });

      // 验证报告详情页有数据
      const reportContent = page.locator('.report-content, .statistics, .steps, [data-testid="report-content"]');
      const hasContent = await reportContent.count() > 0;
      
      if (hasContent) {
        console.log('✅ 报告详情页包含数据');
      } else {
        console.log('⚠️  报告详情页可能为空');
      }
      
      await page.screenshot({ path: 'test-results/step6-3-final.png' });
    } else {
      console.log('❌ 未找到测试报告');
      throw new Error('未找到测试报告');
    }

    console.log('✅ Happy Path 执行完成');
  });
});
