import { defineConfig, devices } from '@playwright/test';

/**
 * SisyphusX E2E测试配置
 *
 * 配置说明:
 * - 使用有头模式 (headed: true) 以便观察测试执行
 * - 基础URL: http://localhost:5173 (开发服务器)
 * - 超时时间: 30秒
 * - 失败时自动截图和录制视频
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    /* 基础URL */
    baseURL: 'http://localhost:5173',

    /* 收集追踪信息 (调试用) */
    trace: 'on-first-retry',

    /* 失败时截图 */
    screenshot: 'only-on-failure',

    /* 失败时录制视频 */
    video: 'retain-on-failure',

    /* 浏览器视口大小 */
    viewport: { width: 1280, height: 720 },

    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,

    /* 环境变量 */
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* 默认使用有头模式,方便观察测试执行 */
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },

    /* 可以添加其他浏览器配置 */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 开发服务器配置 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
