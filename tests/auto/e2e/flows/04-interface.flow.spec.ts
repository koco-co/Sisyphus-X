import { test, expect } from '@playwright/test';
import { InterfacePage } from '../pages/interface.page';
import { getTestState, updateTestState, generateTestName } from '../fixtures/test-state';

test.describe('接口管理 CRUD', () => {
  let interfacePage: InterfacePage;
  const runId = process.env.TEST_RUN_ID || '';

  test.beforeEach(async ({ page }) => {
    interfacePage = new InterfacePage(page);
    await interfacePage.goto();
  });

  test('04-01-创建接口-GET项目列表', async ({ page }) => {
    const interfaceName = generateTestName('接口_GET项目', runId);
    const interfaceId = await interfacePage.createInterface(interfaceName, 'GET', '/api/v1/projects');
    updateTestState(runId, { interfaceId });
  });

  test('04-02-发送请求验证响应', async ({ page }) => {
    const state = getTestState(runId);
    if (!state.interfaceId) {
      test.skip();
      return;
    }
    await page.goto(`/interface-management/${state.interfaceId}`);
    await interfacePage.waitForLoad();
    await interfacePage.sendRequest();
    await interfacePage.assertResponseSuccess();
  });

  test('04-03-创建接口-POST创建项目', async ({ page }) => {
    const interfaceName = generateTestName('接口_POST项目', runId);
    await interfacePage.createInterface(interfaceName, 'POST', '/api/v1/projects');
  });
});
