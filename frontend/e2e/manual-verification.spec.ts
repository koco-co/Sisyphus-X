import { test, expect } from '@playwright/test';

/**
 * Sisyphus-X 主干流程手动验证
 * 
 * 此脚本会打开浏览器并在每个步骤暂停，等待手动操作
 */

test.describe('Sisyphus-X 主干流程手动验证', () => {
  const timestamp = Date.now();
  const projectName = `HP_${timestamp}`;

  test('完整主干流程验证', async ({ page }) => {
    console.log('\n========== 开始主干流程验证 ==========\n');
    console.log(`项目名称: ${projectName}`);

    // 访问应用
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    console.log('\n✓ 应用已加载');
    console.log('\n请按照以下步骤手动操作：\n');
    
    console.log('========== 步骤 1: 项目管理 ==========');
    console.log(`1. 点击左侧菜单"项目管理"`);
    console.log(`2. 查找"创建项目"按钮（重点验证：按钮是否存在）`);
    console.log(`3. 点击创建项目按钮`);
    console.log(`4. 填写项目名称: ${projectName}`);
    console.log(`5. 填写描述: 自动化测试项目`);
    console.log(`6. 点击保存`);
    console.log(`7. 验证项目创建成功\n`);
    
    // 等待用户完成步骤 1
    await page.pause();
    
    console.log('\n========== 步骤 2: 关键字配置 ==========');
    console.log(`1. 点击左侧菜单"关键字管理"`);
    console.log(`2. 点击"创建关键字"按钮`);
    console.log(`3. 填写关键字名称: TestKeyword_${timestamp}`);
    console.log(`4. 填写描述: 自动化测试关键字`);
    console.log(`5. Monaco 编辑器可能无法输入，使用默认代码即可`);
    console.log(`6. 点击保存`);
    console.log(`7. 验证关键字创建成功（非阻断）\n`);
    
    // 等待用户完成步骤 2
    await page.pause();
    
    console.log('\n========== 步骤 3: 接口定义 ==========');
    console.log(`1. 点击左侧菜单"接口管理"`);
    console.log(`2. 选择项目: ${projectName}`);
    console.log(`3. 点击"新建接口"按钮`);
    console.log(`4. 填写接口名称: TestAPI_${timestamp}`);
    console.log(`5. 选择方法: GET`);
    console.log(`6. 填写 URL: https://httpbin.org/get`);
    console.log(`7. 点击保存`);
    console.log(`8. 点击"发送"或"调试"按钮`);
    console.log(`9. 验证响应状态码为 200\n`);
    
    // 等待用户完成步骤 3
    await page.pause();
    
    console.log('\n========== 步骤 4: 场景编排 ==========');
    console.log(`1. 点击左侧菜单"场景编排"`);
    console.log(`2. 点击"新建场景"按钮`);
    console.log(`3. 填写场景名称: TestScenario_${timestamp}`);
    console.log(`4. 填写描述: 自动化测试场景`);
    console.log(`5. 选择项目: ${projectName}`);
    console.log(`6. 点击"添加步骤"按钮`);
    console.log(`7. 选择刚创建的接口: TestAPI_${timestamp}`);
    console.log(`8. 点击保存`);
    console.log(`9. 验证场景创建成功\n`);
    
    // 等待用户完成步骤 4
    await page.pause();
    
    console.log('\n========== 步骤 5: 测试计划 ==========');
    console.log(`1. 点击左侧菜单"测试计划"`);
    console.log(`2. 点击"新建计划"按钮`);
    console.log(`3. 填写计划名称: TestPlan_${timestamp}`);
    console.log(`4. 填写描述: 自动化测试计划`);
    console.log(`5. 选择项目: ${projectName}`);
    console.log(`6. 点击"添加场景"按钮`);
    console.log(`7. 选择刚创建的场景: TestScenario_${timestamp}`);
    console.log(`8. 点击保存`);
    console.log(`9. 点击"执行"或"运行"按钮`);
    console.log(`10. 观察状态变化（等待执行完成）\n`);
    
    // 等待用户完成步骤 5
    await page.pause();
    
    console.log('\n========== 步骤 6: 测试报告 ==========');
    console.log(`1. 点击左侧菜单"测试报告"`);
    console.log(`2. 找到最新的报告记录`);
    console.log(`3. 点击"查看"或"详情"按钮`);
    console.log(`4. 验证报告详情页面显示统计或步骤信息`);
    console.log(`5. 截图记录报告详情\n`);
    
    // 等待用户完成步骤 6
    await page.pause();
    
    console.log('\n========== ✅ 验证完成 ==========\n');
    console.log('请记录以下信息：');
    console.log('1. 是否找到"创建项目"按钮？');
    console.log('2. 是否成功跑通到报告详情？');
    console.log('3. 遇到的阻断级问题（如有）：');
    console.log('   - 最小复现步骤');
    console.log('   - 实际现象');
    console.log('   - 可能根因\n');
  });
});
