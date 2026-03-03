// tests/e2e/specs/validation.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('异常数据校验', () => {

  test.describe('表单验证', () => {
    test('必填字段为空应显示错误', async ({ page }) => {
      await page.goto('/api-automation/projects');
      await page.locator('[data-testid="create-project-btn"]').click();
      await page.waitForTimeout(300);

      // Try to save without filling required fields
      await page.locator('[data-testid="save-btn"]').click();

      // Should show validation error
      const errorMsg = page.locator('[data-testid="form-error"]');
      await expect(errorMsg).toBeVisible();
    });
  });

  test.describe('业务规则验证', () => {
    test('数据库配置必须测试连接', async ({ page, testProjectId }) => {
      await page.goto(`/api-automation/projects/${testProjectId}/databases`);
      await page.locator('[data-testid="create-db-btn"]').click();
      await page.waitForTimeout(300);

      // Fill form but don't test connection
      await page.locator('[data-testid="connection-name"]').fill('Test DB');
      await page.locator('[data-testid="db-type"]').click();
      await page.locator('[data-value="postgresql"]').click();
      await page.locator('[data-testid="host"]').fill('localhost');
      await page.locator('[data-testid="port"]').fill('5432');
      await page.locator('[data-testid="database"]').fill('test');
      await page.locator('[data-testid="username"]').fill('user');
      await page.locator('[data-testid="password"]').fill('pass');

      // Save button should be disabled until test connection succeeds
      const saveBtn = page.locator('[data-testid="save-btn"]');
      const isDisabled = await saveBtn.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('引擎错误处理', () => {
    test('断言失败应显示差异', async ({ page, apiClient, testProjectId }) => {
      // Create scenario with failing assertion
      const scenarioRes = await apiClient.createScenario({
        project_id: testProjectId,
        name: `FailingScenario_${Date.now()}`,
        description: 'Test',
      });
      const scenario = await scenarioRes.json();

      await apiClient.createScenarioStep(scenario.id, {
        name: 'Failing Assertion',
        keyword_type: 'request',
        keyword_name: 'http_request',
        config: {
          method: 'GET',
          url: 'https://httpbin.org/status/404',
        },
        validate: [{
          target: 'status_code',
          comparator: 'eq',
          expected: 200,
        }],
        order: 0,
      });

      // Debug scenario
      const debugRes = await apiClient.debugScenario(scenario.id);
      const result = await debugRes.json();

      // Should have failed status
      expect(result.status).toBe('failed');
      expect(result.summary.failed_assertions).toBeGreaterThan(0);
    });
  });
});
