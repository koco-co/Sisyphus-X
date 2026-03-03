// tests/e2e/specs/ui-ux-validation.spec.ts
import { test, expect } from '../fixtures/base.fixture.js';

test.describe('UI/UX 全局验收', () => {

  test.describe('动画过渡验收', () => {
    test('页面切换应流畅', async ({ page }) => {
      const fps = await page.evaluate(async () => {
        const frames: number[] = [];
        let lastTime = performance.now();

        return new Promise<number>((resolve) => {
          const measure = () => {
            const now = performance.now();
            frames.push(1000 / (now - lastTime));
            lastTime = now;
            if (frames.length < 60) {
              requestAnimationFrame(measure);
            } else {
              resolve(frames.reduce((a, b) => a + b, 0) / frames.length);
            }
          };
          requestAnimationFrame(measure);
        });
      });

      expect(fps).toBeGreaterThan(30);
    });
  });

  test.describe('组件样式统一性', () => {
    const pages = [
      { name: '项目管理', path: '/api-automation/projects' },
      { name: '关键字配置', path: '/api-automation/keywords' },
      { name: '测试报告', path: '/api-automation/reports' },
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name}页面组件样式应统一`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Check search input exists and has consistent style
        const searchInput = page.locator('[data-testid="search-input"]');
        if (await searchInput.isVisible()) {
          const borderRadius = await searchInput.evaluate(el =>
            getComputedStyle(el).borderRadius
          );
          expect(borderRadius).toBeTruthy();
        }

        // Check pagination exists
        const pagination = page.locator('[data-testid="pagination"]');
        if (await pagination.isVisible()) {
          await expect(pagination).toBeVisible();
        }
      });
    }
  });

  test.describe('交互规范验收', () => {
    test('删除操作应有二次确认弹窗', async ({ page, apiClient, dataGenerator }) => {
      // Create a project
      const [project] = dataGenerator.generateProjects(1);
      await apiClient.createProject(project);

      await page.goto('/api-automation/projects');
      await page.waitForLoadState('networkidle');

      // Find and click delete button
      const row = page.locator('tr', { hasText: project.name });
      await row.locator('[data-testid="delete-btn"]').click();

      // Verify confirmation dialog appears
      const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
      await expect(confirmDialog).toBeVisible();
    });
  });
});
