import { test, expect } from '@playwright/test';

const PROJECT_NAME = `HP_STRICT_${Date.now()}`;

test.describe.skip('Sisyphus-X Happy Path - 简化版（已废弃，使用 specs/happy-path.spec.ts）', () => {
  test.setTimeout(300000);

  test('完整流程', async ({ page }) => {
    console.log('\n========================================');
    console.log('项目名称:', PROJECT_NAME);
    console.log('========================================\n');

    // 从首页开始
    console.log('=== 访问首页 ===');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/simple-00-homepage.png', fullPage: true });

    // 步骤1: 项目管理
    console.log('\n=== 步骤1: 项目管理 ===');
    
    // 点击侧边栏的项目管理
    const projectLink = page.getByText('Project Management').or(page.getByText('项目管理'));
    if (await projectLink.isVisible({ timeout: 5000 })) {
      await projectLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/simple-01-project-page.png', fullPage: true });
      console.log('✅ 成功进入项目管理页面');
    } else {
      console.log('⚠️  未找到项目管理链接，尝试直接导航');
      await page.goto('http://localhost:5173/api/projects');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/simple-01-project-page.png', fullPage: true });
    }

    // 查找并点击新建按钮
    const newProjectBtn = page.getByRole('button').filter({ hasText: /新建|创建|New/i }).first();
    if (await newProjectBtn.isVisible({ timeout: 3000 })) {
      await newProjectBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/simple-01-create-dialog.png', fullPage: true });

      // 填写表单
      await page.locator('input').first().fill(PROJECT_NAME);
      await page.locator('textarea').first().fill('自动化测试');
      await page.screenshot({ path: 'test-results/simple-01-filled.png', fullPage: true });

      // 提交
      await page.getByRole('button').filter({ hasText: /确定|提交|保存/i }).last().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/simple-01-done.png', fullPage: true });
      console.log('✅ 步骤1完成');
    } else {
      console.log('❌ 步骤1失败: 未找到新建按钮');
    }

    // 步骤2: 关键字
    console.log('\n=== 步骤2: 关键字管理 ===');
    const keywordLink = page.getByText('Keyword Management').or(page.getByText('关键字管理'));
    if (await keywordLink.isVisible({ timeout: 3000 })) {
      await keywordLink.click();
    } else {
      await page.goto('http://localhost:5173/keywords');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/simple-02-keyword-page.png', fullPage: true });

    const newKeywordBtn = page.getByRole('button').filter({ hasText: /New Keyword|新建/i }).first();
    if (await newKeywordBtn.isVisible({ timeout: 3000 })) {
      await newKeywordBtn.click();
      await page.waitForTimeout(3000); // 等待 Monaco 加载
      await page.screenshot({ path: 'test-results/simple-02-create-dialog.png', fullPage: true });

      // 填写名称
      await page.locator('input').first().fill(`test_kw_${Date.now()}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/simple-02-filled.png', fullPage: true });

      // 保存
      await page.getByRole('button').filter({ hasText: /保存|Save/i }).last().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/simple-02-done.png', fullPage: true });
      console.log('✅ 步骤2完成');
    } else {
      console.log('❌ 步骤2失败');
    }

    // 步骤3: 接口管理
    console.log('\n=== 步骤3: 接口管理 ===');
    const apiLink = page.getByText('API Management').or(page.getByText('接口管理'));
    if (await apiLink.isVisible({ timeout: 3000 })) {
      await apiLink.click();
    } else {
      await page.goto('http://localhost:5173/interface-management');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/simple-03-api-page.png', fullPage: true });
    console.log('✅ 步骤3: 访问了接口管理页面');

    // 步骤4: 场景编排
    console.log('\n=== 步骤4: 场景编排 ===');
    const scenarioLink = page.getByText('Scenario Orchestration').or(page.getByText('场景编排'));
    if (await scenarioLink.isVisible({ timeout: 3000 })) {
      await scenarioLink.click();
    } else {
      await page.goto('http://localhost:5173/scenarios');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/simple-04-scenario-page.png', fullPage: true });
    console.log('✅ 步骤4: 访问了场景编排页面');

    // 步骤5: 测试计划
    console.log('\n=== 步骤5: 测试计划 ===');
    const planLink = page.getByText('Scheduled Tasks').or(page.getByText('测试计划'));
    if (await planLink.isVisible({ timeout: 3000 })) {
      await planLink.click();
    } else {
      await page.goto('http://localhost:5173/plans');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/simple-05-plan-page.png', fullPage: true });
    console.log('✅ 步骤5: 访问了测试计划页面');

    // 步骤6: 测试报告
    console.log('\n=== 步骤6: 测试报告 ===');
    const reportLink = page.getByText('Test Reports').or(page.getByText('测试报告'));
    if (await reportLink.isVisible({ timeout: 3000 })) {
      await reportLink.click();
    } else {
      await page.goto('http://localhost:5173/reports');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/simple-06-report-page.png', fullPage: true });
    console.log('✅ 步骤6: 访问了测试报告页面');

    console.log('\n========================================');
    console.log('✅ 简化流程完成');
    console.log('========================================\n');
  });
});
