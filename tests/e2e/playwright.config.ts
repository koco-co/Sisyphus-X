// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const frontendDir = path.join(__dirname, '../../frontend');
const authFile = path.join(__dirname, './auth/storage-state.json');

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['json', { outputFile: '../test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    storageState: authFile,
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'project',
      testMatch: /01-project\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: authFile },
    },
    {
      name: 'keyword',
      testMatch: /02-keyword\.spec\.ts/,
      dependencies: ['project'],
      use: { storageState: authFile },
    },
    {
      name: 'interface',
      testMatch: /03-interface\.spec\.ts/,
      dependencies: ['keyword'],
      use: { storageState: authFile },
    },
    {
      name: 'scenario',
      testMatch: /04-scenario\.spec\.ts/,
      dependencies: ['interface'],
      use: { storageState: authFile },
    },
    {
      name: 'plan',
      testMatch: /05-plan\.spec\.ts/,
      dependencies: ['scenario'],
      use: { storageState: authFile },
    },
    {
      name: 'report',
      testMatch: /06-report\.spec\.ts/,
      dependencies: ['plan'],
      use: { storageState: authFile },
    },
    {
      name: 'ui-ux',
      testMatch: /ui-ux-validation\.spec\.ts/,
      dependencies: ['report'],
      use: { storageState: authFile },
    },
    {
      name: 'validation',
      testMatch: /validation\.spec\.ts/,
      dependencies: ['ui-ux'],
      use: { storageState: authFile },
    },
  ],

  webServer: [
    {
      command: 'cd ../../backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `cd ${frontendDir} && npm run dev`,
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
