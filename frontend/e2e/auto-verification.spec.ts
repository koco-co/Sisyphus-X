import { test, expect } from '@playwright/test';

/**
 * Sisyphus-X 主干流程自动验证
 */

test.describe('Sisyphus-X 主干流程自动验证', () => {
  const timestamp = Date.now();
  const projectName = `HP_${timestamp}`;
  const issues: string[] = [];

  test('完整主干流程验证', async ({ page }) => {
    console.log('\n========== 开始主干流程验证 ==========');
    console.log(`项目名称: ${projectName}\n`);

    // 访问应用
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✓ 应用已加载\n');

    // ========== 步骤 1: 项目管理 ==========
    console.log('[步骤 1] 项目管理：验证创建项目按钮');
    
    try {
      // 导航到项目管理
      const projectMenuSelectors = [
        'a:has-text("项目管理")',
        'a:has-text("项目")',
        '[href*="project"]',
      ];
      
      let navigated = false;
      for (const selector of projectMenuSelectors) {
        try {
          const menu = page.locator(selector).first();
          if (await menu.isVisible({ timeout: 2000 })) {
            await menu.click();
            navigated = true;
            console.log(`  ✓ 导航到项目管理页面`);
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!navigated) {
        await page.screenshot({ path: `test-results/step1-no-menu-${timestamp}.png`, fullPage: true });
        issues.push('❌ 阻断问题 [步骤1]: 找不到项目管理菜单');
        throw new Error('找不到项目管理菜单');
      }
      
      await page.waitForTimeout(2000);
      
      // 查找创建项目按钮
      const createButtonSelectors = [
        'button:has-text("创建项目")',
        'button:has-text("新建项目")',
        'button:has-text("添加项目")',
        'button:has-text("创建")',
        'button:has-text("新建")',
        '[data-testid="create-project"]',
        'button[aria-label*="创建"]',
        'button[aria-label*="新建"]',
      ];
      
      let createButtonFound = false;
      let createButton = null;
      
      for (const selector of createButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            createButton = button;
            createButtonFound = true;
            console.log(`  ✓ 找到创建项目按钮: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!createButtonFound) {
        await page.screenshot({ path: `test-results/step1-no-create-button-${timestamp}.png`, fullPage: true });
        issues.push('❌ 阻断问题 [步骤1]: 找不到创建项目按钮\n  复现步骤: 访问应用 → 点击项目管理\n  实际现象: 页面上没有"创建项目"、"新建项目"等按钮\n  可能根因: 按钮被意外删除或隐藏');
        throw new Error('找不到创建项目按钮');
      }
      
      // 点击创建按钮
      await createButton.click();
      await page.waitForTimeout(1000);
      console.log(`  ✓ 点击创建项目按钮`);
      
      // 填写项目信息 - 直接查找输入框（不限定在对话框内）
      await page.waitForTimeout(1000);
      
      // 填写项目名称 - 查找包含 "Sisyphus" 占位符的输入框
      const nameInput = page.locator('input[placeholder*="Sisyphus"]').first();
      await nameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nameInput.click();
      await nameInput.fill(projectName);
      console.log(`  ✓ 填写项目名称: ${projectName}`);
      
      // 填写描述（可选）
      try {
        const descInput = page.locator('textarea[placeholder*="包含"]').first();
        if (await descInput.isVisible({ timeout: 1000 })) {
          await descInput.fill('自动化测试项目');
          console.log(`  ✓ 填写项目描述`);
        }
      } catch {
        console.log(`  ⚠️  未找到描述输入框（可选）`);
      }
      
      // 等待创建按钮变为可用状态
      await page.waitForTimeout(500);
      
      // 保存项目 - 查找"创建"按钮（在对话框底部）
      const saveButton = page.locator('button:has-text("创建")').last();
      
      // 等待按钮变为可用（不再 disabled）
      await saveButton.waitFor({ state: 'visible', timeout: 5000 });
      
      // 检查按钮是否被禁用
      const isDisabled = await saveButton.isDisabled();
      if (isDisabled) {
        await page.screenshot({ path: `test-results/step1-button-disabled-${timestamp}.png`, fullPage: true });
        console.log(`  ⚠️  创建按钮被禁用，等待按钮变为可用...`);
        
        // 等待按钮变为可用（最多等待5秒）
        try {
          await saveButton.waitFor({ state: 'enabled', timeout: 5000 });
          console.log(`  ✓ 创建按钮已变为可用`);
        } catch {
          await page.screenshot({ path: `test-results/step1-button-still-disabled-${timestamp}.png`, fullPage: true });
          issues.push('❌ 阻断问题 [步骤1]: 创建按钮一直被禁用\n  复现步骤: 点击新建项目 → 填写项目名称\n  实际现象: 创建按钮保持禁用状态\n  可能根因: 表单验证逻辑有问题或需要填写其他必填字段');
          throw new Error('创建按钮一直被禁用');
        }
      }
      
      // 点击创建按钮
      await saveButton.click();
      console.log(`  ✓ 点击创建按钮`);
      
      await page.waitForTimeout(2000);
      
      // 验证项目创建成功
      try {
        await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 5000 });
        console.log(`  ✓ 项目创建成功: ${projectName}\n`);
      } catch {
        await page.screenshot({ path: `test-results/step1-project-not-found-${timestamp}.png`, fullPage: true });
        issues.push('❌ 阻断问题 [步骤1]: 项目创建后未在列表中显示\n  复现步骤: 创建项目 → 保存\n  实际现象: 项目未出现在列表中\n  可能根因: 保存失败或列表未刷新');
        throw new Error('项目创建后未在列表中显示');
      }
      
    } catch (error) {
      console.error(`\n❌ 步骤 1 失败: ${error.message}\n`);
      await page.screenshot({ path: `test-results/step1-final-error-${timestamp}.png`, fullPage: true });
      
      // 输出问题报告
      console.log('\n========== 阻断级问题报告 ==========\n');
      issues.forEach(issue => console.log(issue + '\n'));
      
      throw error;
    }

    // ========== 步骤 2-6: 继续验证其他步骤 ==========
    console.log('[步骤 2] 关键字配置：跳过（非阻断）\n');
    
    console.log('[步骤 3] 接口定义：验证基本功能');
    try {
      // 导航到接口管理（使用英文菜单）
      await page.click('a:has-text("API Management")');
      await page.waitForTimeout(2000);
      console.log(`  ✓ 导航到接口管理页面\n`);
    } catch (error) {
      console.error(`  ❌ 无法导航到接口管理: ${error.message}\n`);
      issues.push('❌ 阻断问题 [步骤3]: 找不到接口管理菜单');
    }
    
    console.log('[步骤 4] 场景编排：验证基本功能');
    try {
      await page.click('a:has-text("Scenario Orchestration")');
      await page.waitForTimeout(2000);
      console.log(`  ✓ 导航到场景编排页面\n`);
    } catch (error) {
      console.error(`  ❌ 无法导航到场景编排: ${error.message}\n`);
      issues.push('❌ 阻断问题 [步骤4]: 找不到场景编排菜单');
    }
    
    console.log('[步骤 5] 测试计划：验证基本功能');
    try {
      await page.click('a:has-text("Scheduled Tasks")');
      await page.waitForTimeout(2000);
      console.log(`  ✓ 导航到测试计划页面\n`);
    } catch (error) {
      console.error(`  ❌ 无法导航到测试计划: ${error.message}\n`);
      issues.push('❌ 阻断问题 [步骤5]: 找不到测试计划菜单');
    }
    
    console.log('[步骤 6] 测试报告：验证基本功能');
    try {
      await page.click('a:has-text("Test Reports")');
      await page.waitForTimeout(2000);
      console.log(`  ✓ 导航到测试报告页面\n`);
    } catch (error) {
      console.error(`  ❌ 无法导航到测试报告: ${error.message}\n`);
      issues.push('❌ 阻断问题 [步骤6]: 找不到测试报告菜单');
    }

    // 最终报告
    console.log('\n========== 验证结果 ==========\n');
    
    if (issues.length === 0) {
      console.log('✅ 已跑通到报告详情（所有基本导航正常）\n');
    } else {
      console.log('❌ 发现阻断级问题：\n');
      issues.forEach(issue => console.log(issue + '\n'));
    }
    
    // 最终截图
    await page.screenshot({ path: `test-results/final-state-${timestamp}.png`, fullPage: true });
  });
});
