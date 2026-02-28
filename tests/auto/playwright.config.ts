// 为了兼容在 monorepo 根目录下运行测试时的模块解析，我们在这里做一次
// 有兜底的动态加载：优先使用正常的 '@playwright/test'，如果在当前工作目录
// 无法解析，则回退到 frontend/node_modules 下的依赖。
// 这样可以保证无论是从 frontend 目录还是仓库根目录执行测试，配置文件都能正常工作。
// eslint-disable-next-line @typescript-eslint/no-var-requires
let playwrightTest: any;

try {
  // 尝试从默认位置加载
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  playwrightTest = require("@playwright/test");
} catch {
  try {
    // 回退到 frontend/node_modules（适配本项目脚本在仓库根目录执行的场景）
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    playwrightTest = require("../../frontend/node_modules/@playwright/test");
  } catch (error) {
    // 最终兜底：直接抛出原始错误，方便排查
    // eslint-disable-next-line no-console
    console.error(
      "Failed to load @playwright/test. Please run `npm install` in frontend/",
      error,
    );
    throw error;
  }
}

const { defineConfig, devices } = playwrightTest;

/**
 * SisyphusX E2E 自动化测试配置
 *
 * 测试文件位于 tests/auto/e2e/ 目录下
 * 通过 frontend/ 的 Node.js 环境运行
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html"],
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      "X-Test-Mode": "true",
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--start-maximized"],
        },
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: "../../frontend",
  },
});
