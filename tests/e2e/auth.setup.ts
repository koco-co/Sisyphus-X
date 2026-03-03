// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Development mode skips login automatically via VITE_DEV_MODE_SKIP_LOGIN
  await page.goto('/');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Verify we're logged in (check for main app content)
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10000 });

  // Save storage state for reuse
  await page.context().storageState({ path: './auth/storage-state.json' });
});
