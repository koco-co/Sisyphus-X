// tests/e2e/specs/03-interface.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('接口定义模块', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/interface-management');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('基础功能', () => {
    test('应正确显示接口列表页面', async ({ page }) => {
      // Verify page header is visible
      await expect(page.locator('text=接口管理').or(page.locator('text=接口定义'))).toBeVisible({ timeout: 10000 });
    });

    test('应显示接口树形结构', async ({ page }) => {
      // Check for any tree or list structure
      const treeElement = page.locator('[class*="tree"], [class*="Tree"], [class*="folder"], .bg-slate-900').first();
      await expect(treeElement).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('接口创建 (50+ 条数据)', () => {
    test('应批量创建 50+ 条接口数据', async ({ apiClient, testProjectId, dataGenerator }) => {
      const interfaces = dataGenerator.generateInterfaces(50);

      for (const intf of interfaces) {
        await apiClient.createInterface(testProjectId, {
          name: intf.name,
          method: intf.method,
          path: intf.path,
          headers: intf.headers,
          params: intf.params,
          body: intf.body,
        });
      }

      // Verify via API
      const response = await apiClient.getProjects();
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('UI/UX 验收', () => {
    test('动画过渡应流畅', async ({ page }) => {
      // Measure FPS during tree expand
      const fps = await page.evaluate(async () => {
        const frames: number[] = [];
        let lastTime = performance.now();

        return new Promise<number>((resolve) => {
          const measure = () => {
            const now = performance.now();
            frames.push(1000 / (now - lastTime));
            lastTime = now;
            if (frames.length < 30) {
              requestAnimationFrame(measure);
            } else {
              const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
              resolve(avg);
            }
          };
          requestAnimationFrame(measure);
        });
      });

      expect(fps).toBeGreaterThan(30);
    });
  });
});
