// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Navigate to the app root first to set up localStorage
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');

  // Set a fake user in localStorage to simulate logged-in state
  // This works because the backend has AUTH_DISABLED=true
  await page.evaluate(() => {
    // Set a fake token and user data
    localStorage.setItem('sisyphus-token', 'test-token-for-e2e');
    // Set user data that the AuthContext expects
    const testUser = {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'E2E Test User',
      email: 'e2e-test@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=E2E'
    };
    // Store in a format the app might use
    localStorage.setItem('sisyphus-user', JSON.stringify(testUser));
  });

  // Now navigate to a protected route
  await page.goto('/projects');

  // Wait for React to hydrate
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if we're still on the login page
  const loginHeading = page.locator('text=Login');
  const isLoginPage = await loginHeading.isVisible().catch(() => false);

  if (isLoginPage) {
    // If still on login page, try to manually inject auth state
    // by directly manipulating the React state through localStorage
    console.log('Login page still showing, attempting manual auth bypass');

    // Try to find and click any dev mode bypass button if available
    const devBypass = page.locator('text=Dev Mode');
    if (await devBypass.isVisible().catch(() => false)) {
      await devBypass.click();
    } else {
      // Force reload after setting localStorage
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  }

  // Verify we're on the main app by checking for navigation items
  // The sidebar should be visible with navigation
  const sidebar = page.locator('.h-screen.glass').or(page.locator('text=接口自动化'));

  // Wait for either the sidebar or the project page content
  await expect(sidebar.first()).toBeVisible({ timeout: 30000 }).catch(async () => {
    // If sidebar not found, check if we're at least on the projects page
    const projectHeader = page.locator('text=项目');
    await expect(projectHeader.first()).toBeVisible({ timeout: 10000 });
  });

  // Save storage state for reuse in other tests
  await page.context().storageState({ path: './auth/storage-state.json' });
});
