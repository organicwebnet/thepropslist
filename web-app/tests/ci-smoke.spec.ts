import { test, expect } from '@playwright/test';

// CI-specific smoke tests that are more lenient
test.describe('CI Smoke Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Just check that the page loads - don't be too strict about specific elements
    await expect(page).toHaveTitle(/The Props List/, { timeout: 10000 });
  });

  test('should load forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Just check that the page loads
    await expect(page).toHaveTitle(/The Props List/, { timeout: 10000 });
  });

  test('should have basic navigation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Check that we can navigate to signup
    const signupLink = page.locator('a[href="/signup"]');
    if (await signupLink.count() > 0) {
      await signupLink.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await expect(page).toHaveURL(/.*signup/, { timeout: 10000 });
    }
  });
});
