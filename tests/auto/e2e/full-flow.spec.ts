import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { ProjectPage } from './pages/project.page';
import { EnvironmentPage } from './pages/environment.page';
import { InterfacePage } from './pages/interface.page';
import { ScenarioPage } from './pages/scenario.page';
import { PlanPage } from './pages/plan.page';
import { ReportPage } from './pages/report.page';
import { initTestState, generateRunId, generateTestName, updateTestState, getTestState } from './fixtures/test-state';

test.describe('完整流程集成测试', () => {
  const runId = generateRunId();
  let state = initTestState(runId);

  test('完整流程 - 登录到报告', async ({ page }) => {
    console.log(`Test Run ID: ${runId}`);

    // 1. 登录
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    if (!(await loginPage.isLoggedIn())) {
      await loginPage.login('test@example.com', 'password123');
      await loginPage.expectLoginSuccess();
    }

    // 2. 创建项目
    const projectPage = new ProjectPage(page);
    await projectPage.goto();
    const projectName = generateTestName('项目', runId);
    const projectId = await projectPage.createProject(projectName, `E2E-${runId.slice(-6)}`);
    state = updateTestState(runId, { projectId });
    console.log(`Created project: ${projectId}`);

    // 3. 创建环境
    const envPage = new EnvironmentPage(page);
    await envPage.goto(projectId);
    const envName = generateTestName('环境', runId);
    const envId = await envPage.createEnvironment(envName, 'http://localhost:8000/api/v1');
    state = updateTestState(runId, { environmentId: envId });
    console.log(`Created environment: ${envId}`);

    // 4. 创建接口
    const interfacePage = new InterfacePage(page);
    await interfacePage.goto();
    const interfaceName = generateTestName('接口', runId);
    const interfaceId = await interfacePage.createInterface(interfaceName, 'GET', '/api/v1/projects');
    state = updateTestState(runId, { interfaceId });
    console.log(`Created interface: ${interfaceId}`);

    // 5. 创建场景
    const scenarioPage = new ScenarioPage(page);
    await scenarioPage.goto();
    const scenarioName = generateTestName('场景', runId);
    const scenarioId = await scenarioPage.createScenario(scenarioName);
    state = updateTestState(runId, { scenarioId });
    console.log(`Created scenario: ${scenarioId}`);

    // 6. 创建并执行计划
    const planPage = new PlanPage(page);
    await planPage.goto();
    const planName = generateTestName('计划', runId);
    const planId = await planPage.createPlan(planName, scenarioId);
    state = updateTestState(runId, { planId });
    console.log(`Created plan: ${planId}`);

    // 7. 查看报告
    const reportPage = new ReportPage(page);
    await reportPage.goto();
    await reportPage.assertReportListNotEmpty();
    console.log('Reports verified');

    console.log('Full flow completed successfully!');
  });
});
