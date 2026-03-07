import { defineConfig, devices } from '@playwright/test';

/**
 * Sisyphus-X 验收测试配置
 *
 * 用于全流程验收测试与视频录制：
 * - video: 'on' 始终录制视频
 * - 匹配 e2e/acceptance*.spec.ts
 * - 深色模式 + 简体中文通过 addInitScript 注入
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/acceptance*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 300000,

  reporter: [
    ['html', { outputFolder: 'test-results/acceptance-report' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },
  ],

  outputDir: 'test-results/acceptance',

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
