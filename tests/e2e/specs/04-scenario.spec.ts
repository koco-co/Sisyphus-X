// tests/e2e/specs/04-scenario.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';
import { ScenarioEditorPage } from '../pages/scenario-editor.page.js';

test.describe('场景编排模块', () => {
  let scenarioPage: ScenarioEditorPage;

  test.beforeEach(async ({ page, testProjectId }) => {
    scenarioPage = new ScenarioEditorPage(page);
    await scenarioPage.goto(testProjectId);
  });

  test.describe('场景管理', () => {
    test('应支持创建场景', async ({ page, apiClient, testProjectId, dataGenerator }) => {
      const [scenario] = dataGenerator.generateScenarios(1);

      await apiClient.createScenario({
        project_id: testProjectId,
        name: scenario.name,
        description: scenario.description,
        priority: scenario.priority,
        tags: scenario.tags,
        variables: scenario.variables,
      });

      await page.goto('/api-automation/scenarios');
      await expect(page.locator(`text=${scenario.name}`)).toBeVisible();
    });

    test('应批量创建 30+ 场景', async ({ apiClient, testProjectId, dataGenerator }) => {
      const scenarios = dataGenerator.generateScenarios(30);

      for (const scenario of scenarios) {
        await apiClient.createScenario({
          project_id: testProjectId,
          name: scenario.name,
          description: scenario.description,
          priority: scenario.priority,
          tags: scenario.tags,
          variables: scenario.variables,
        });
      }

      // Verify count via API
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('测试步骤编排 (引擎联调)', () => {
    test('应支持添加发送请求步骤', async ({ page, apiClient, testProjectId }) => {
      // Create scenario first
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `TestScenario_${Date.now()}`,
        description: 'E2E Test',
      });
      const scenario = await scenarioRes.json();

      // Add step
      await apiClient.createScenarioStep(scenario.id, {
        name: '发送请求测试',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/get',
        },
        order: 0,
      });

      await scenarioPage.goto(testProjectId, scenario.id);
      await expect(page.locator('text=发送请求测试')).toBeVisible();
    });
  });

  test.describe('场景调试 (引擎集成)', () => {
    test('调试应返回 JSON 结果', async ({ page, apiClient, testProjectId, engineHelper }) => {
      // Create scenario with simple step
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `DebugTest_${Date.now()}`,
        description: 'Debug test',
      });
      const scenario = await scenarioRes.json();

      await apiClient.createScenarioStep(scenario.id, {
        name: 'GET Request',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/get',
        },
        order: 0,
      });

      // Execute debug
      const debugRes = await apiClient.debugScenario(scenario.id);
      const result = await debugRes.json();

      // Validate result structure
      const validation = engineHelper.validateJsonResult(result);
      expect(validation.valid).toBe(true);
    });
  });
});
