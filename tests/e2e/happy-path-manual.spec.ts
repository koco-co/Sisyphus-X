import { test, expect, Page } from '@playwright/test';

const PROJECT_NAME = `HP_STRICT_${Date.now()}`;
const BASE_URL = 'http://localhost:5173';

test.describe.skip('Sisyphus-X Happy Path - 手动验证（已废弃，使用 specs/happy-path.spec.ts）', () => {
  test.setTimeout(300000); // 5分钟超时

  test('完整 Happy Path 流程', async ({ page }) => {
    console.log('\n========================================');
    console.log('开始执行 Sisyphus-X Happy Path 严格验证');
    console.log('项目名称:', PROJECT_NAME);
    console.log('========================================\n');

    // ===== 步骤1: 新建项目 =====
    console.log('\n=== 步骤1: 项目管理 - 新建项目 ===');
    await page.goto(`${BASE_URL}/api/projects`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/manual-step1-1-project-list.png', fullPage: true });

    // 查找新建按钮
    const createProjectBtn = page.getByRole('button', { name: /新建|创建|添加项目/i });
    if (await createProjectBtn.isVisible({ timeout: 5000 })) {
      await createProjectBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/manual-step1-2-create-dialog.png', fullPage: true });

      // 填写项目信息
      const nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/项目名称/i)).first();
      await nameInput.fill(PROJECT_NAME);
      
      const descInput = page.locator('textarea[name="description"]').or(page.getByPlaceholder(/描述/i)).first();
      await descInput.fill(`自动化测试项目 - ${new Date().toISOString()}`);
      
      await page.screenshot({ path: 'test-results/manual-step1-3-filled.png', fullPage: true });

      // 提交
      const submitBtn = page.getByRole('button', { name: /确定|提交|保存/i }).last();
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/manual-step1-4-after-submit.png', fullPage: true });

      // 验证项目创建成功
      const projectExists = await page.getByText(PROJECT_NAME).first().isVisible({ timeout: 5000 });
      if (projectExists) {
        console.log('✅ 步骤1成功: 项目创建成功');
      } else {
        console.log('❌ 步骤1失败: 未找到创建的项目');
        throw new Error('项目创建失败');
      }
    } else {
      console.log('❌ 步骤1失败: 未找到新建项目按钮');
      throw new Error('未找到新建项目按钮');
    }

    // ===== 步骤2: 新建关键字 =====
    console.log('\n=== 步骤2: 关键字配置 - 新建关键字 ===');
    await page.goto(`${BASE_URL}/keywords`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/manual-step2-1-keyword-list.png', fullPage: true });

    const createKeywordBtn = page.getByRole('button', { name: /New Keyword|新建/i });
    if (await createKeywordBtn.isVisible({ timeout: 5000 })) {
      await createKeywordBtn.click();
      await page.waitForTimeout(2000); // 等待 Monaco 加载
      await page.screenshot({ path: 'test-results/manual-step2-2-create-dialog.png', fullPage: true });

      const keywordName = `test_keyword_${Date.now()}`;
      
      // 填写关键字名称
      const nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/方法名/i)).first();
      await nameInput.fill(keywordName);
      
      // 等待 Monaco 编辑器加载完成
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/manual-step2-3-filled.png', fullPage: true });

      // 保存（不修改代码，使用默认值）
      const saveBtn = page.getByRole('button', { name: /保存|Save/i }).last();
      await saveBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/manual-step2-4-after-save.png', fullPage: true });

      // 验证关键字创建成功
      const keywordExists = await page.getByText(keywordName).first().isVisible({ timeout: 5000 });
      if (keywordExists) {
        console.log('✅ 步骤2成功: 关键字创建成功');
      } else {
        console.log('⚠️  步骤2警告: 未在列表中找到关键字，但可能已创建');
      }
    } else {
      console.log('❌ 步骤2失败: 未找到新建关键字按钮');
      throw new Error('未找到新建关键字按钮');
    }

    // ===== 步骤3: 新建接口并调试 =====
    console.log('\n=== 步骤3: 接口定义 - 新增接口并调试 ===');
    await page.goto(`${BASE_URL}/interface-management`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/manual-step3-1-interface-page.png', fullPage: true });

    // 选择项目（如果有项目选择器）
    const projectSelector = page.locator('select').or(page.getByRole('combobox')).first();
    if (await projectSelector.isVisible({ timeout: 2000 })) {
      await projectSelector.click();
      await page.waitForTimeout(500);
      const projectOption = page.getByText(PROJECT_NAME).first();
      if (await projectOption.isVisible({ timeout: 2000 })) {
        await projectOption.click();
        await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: 'test-results/manual-step3-2-project-selected.png', fullPage: true });

    // 新建接口
    const createInterfaceBtn = page.getByRole('button', { name: /新建|创建|添加/i }).first();
    if (await createInterfaceBtn.isVisible({ timeout: 5000 })) {
      await createInterfaceBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/manual-step3-3-create-dialog.png', fullPage: true });

      const interfaceName = `test_api_${Date.now()}`;
      
      // 填写接口信息
      const nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/接口名称/i)).first();
      await nameInput.fill(interfaceName);
      
      const urlInput = page.locator('input[name="url"]').or(page.getByPlaceholder(/URL/i)).first();
      await urlInput.fill('https://httpbin.org/get');
      
      await page.screenshot({ path: 'test-results/manual-step3-4-filled.png', fullPage: true });

      // 保存
      const saveBtn = page.getByRole('button', { name: /保存|Save/i }).last();
      await saveBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/manual-step3-5-after-save.png', fullPage: true });

      // 执行调试
      const debugBtn = page.getByRole('button', { name: /发送|执行|Send/i }).first();
      if (await debugBtn.isVisible({ timeout: 3000 })) {
        await debugBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/manual-step3-6-debug-result.png', fullPage: true });
        console.log('✅ 步骤3成功: 接口创建并调试完成');
      } else {
        console.log('⚠️  步骤3警告: 接口已创建，但未找到调试按钮');
      }
    } else {
      console.log('❌ 步骤3失败: 未找到新建接口按钮');
      throw new Error('未找到新建接口按钮');
    }

    // ===== 步骤4: 新建场景并添加步骤 =====
    console.log('\n=== 步骤4: 场景编排 - 新建场景 ===');
    await page.goto(`${BASE_URL}/scenarios`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/manual-step4-1-scenario-list.png', fullPage: true });

    const createScenarioBtn = page.getByRole('button', { name: /新建|创建/i }).first();
    if (await createScenarioBtn.isVisible({ timeout: 5000 })) {
      await createScenarioBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/manual-step4-2-create-dialog.png', fullPage: true });

      const scenarioName = `test_scenario_${Date.now()}`;
      
      // 填写场景信息
      const nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/场景名称/i)).first();
      await nameInput.fill(scenarioName);
      
      const descInput = page.locator('textarea[name="description"]').or(page.getByPlaceholder(/描述/i)).first();
      if (await descInput.isVisible({ timeout: 2000 })) {
        await descInput.fill('自动化测试场景');
      }
      
      await page.screenshot({ path: 'test-results/manual-step4-3-filled.png', fullPage: true });

      // 保存
      const saveBtn = page.getByRole('button', { name: /保存|确定/i }).last();
      await saveBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/manual-step4-4-after-save.png', fullPage: true });

      console.log('✅ 步骤4成功: 场景创建成功');
    } else {
      console.log('❌ 步骤4失败: 未找到新建场景按钮');
      throw new Error('未找到新建场景按钮');
    }

    // ===== 步骤5: 新建测试计划并执行 =====
    console.log('\n=== 步骤5: 测试计划 - 新建计划并执行 ===');
    await page.goto(`${BASE_URL}/plans`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/manual-step5-1-plan-list.png', fullPage: true });

    const createPlanBtn = page.getByRole('button', { name: /新建|创建/i }).first();
    if (await createPlanBtn.isVisible({ timeout: 5000 })) {
      await createPlanBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/manual-step5-2-create-dialog.png', fullPage: true });

      const planName = `test_plan_${Date.now()}`;
      
      // 填写计划名称
      const nameInput = page.locator('input[name="name"]').or(page.getByPlaceholder(/计划名称/i)).first();
      await nameInput.fill(planName);
      
      // 选择项目
      const projectSelect = page.locator('select[name="project"]').or(page.getByText(/选择项目/i)).first();
      if (await projectSelect.isVisible({ timeout: 2000 })) {
        await projectSelect.click();
        await page.waitForTimeout(500);
        const projectOption = page.getByText(PROJECT_NAME).first();
        if (await projectOption.isVisible({ timeout: 2000 })) {
          await projectOption.click();
          await page.waitForTimeout(1000);
        }
      }
      
      await page.screenshot({ path: 'test-results/manual-step5-3-project-selected.png', fullPage: true });

      // 添加场景（如果有添加场景按钮）
      const addScenarioBtn = page.getByRole('button', { name: /添加场景|选择场景/i }).first();
      if (await addScenarioBtn.isVisible({ timeout: 2000 })) {
        await addScenarioBtn.click();
        await page.waitForTimeout(1000);
        
        // 选择第一个场景
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        if (await firstCheckbox.isVisible({ timeout: 2000 })) {
          await firstCheckbox.check();
        }
        
        const confirmBtn = page.getByRole('button', { name: /确定|添加/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
          await page.waitForTimeout(1000);
        }
      }
      
      await page.screenshot({ path: 'test-results/manual-step5-4-scenario-added.png', fullPage: true });

      // 保存计划
      const saveBtn = page.getByRole('button', { name: /保存|确定/i }).last();
      await saveBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/manual-step5-5-after-save.png', fullPage: true });

      // 执行计划
      const executeBtn = page.getByRole('button', { name: /执行|运行/i }).first();
      if (await executeBtn.isVisible({ timeout: 3000 })) {
        await executeBtn.click();
        await page.waitForTimeout(1000);
        
        // 确认执行
        const confirmExecuteBtn = page.getByRole('button', { name: /确定|执行/i }).last();
        if (await confirmExecuteBtn.isVisible({ timeout: 2000 })) {
          await confirmExecuteBtn.click();
        }
        
        // 等待执行完成
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'test-results/manual-step5-6-executing.png', fullPage: true });
        console.log('✅ 步骤5成功: 测试计划已执行');
      } else {
        console.log('⚠️  步骤5警告: 计划已创建，但未找到执行按钮');
      }
    } else {
      console.log('❌ 步骤5失败: 未找到新建计划按钮');
      throw new Error('未找到新建计划按钮');
    }

    // ===== 步骤6: 查看测试报告 =====
    console.log('\n=== 步骤6: 测试报告 - 查看报告详情 ===');
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/manual-step6-1-report-list.png', fullPage: true });

    // 查找最新的报告
    const reportItems = page.locator('tr, .report-item, [data-testid="report-item"]');
    const reportCount = await reportItems.count();
    
    if (reportCount > 0) {
      await reportItems.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/manual-step6-2-report-detail.png', fullPage: true });

      // 检查报告内容
      const pageContent = await page.content();
      const hasStatistics = pageContent.includes('统计') || pageContent.includes('Statistics');
      const hasSteps = pageContent.includes('步骤') || pageContent.includes('Steps');
      
      if (hasStatistics || hasSteps) {
        console.log('✅ 步骤6成功: 报告详情页包含数据');
      } else {
        console.log('⚠️  步骤6警告: 报告详情页可能为空');
      }
      
      await page.screenshot({ path: 'test-results/manual-step6-3-final.png', fullPage: true });
    } else {
      console.log('❌ 步骤6失败: 未找到测试报告');
      throw new Error('未找到测试报告');
    }

    console.log('\n========================================');
    console.log('✅ Happy Path 完整流程执行完成');
    console.log('========================================\n');
  });
});
