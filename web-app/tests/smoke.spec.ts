import { test, expect } from '@playwright/test';

// Login page loads and shows form elements
test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Check for email input (more flexible selector)
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
  
  // Check for password input
  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible();
  
  // Check for sign in button (more flexible selector)
  const signInButton = page.locator('button[type="submit"]');
  await expect(signInButton).toBeVisible();
  
  // Verify the page title
  await expect(page).toHaveTitle(/The Props List/);
});

// Protected route redirects to /login when unauthenticated
test('protected route redirects to login', async ({ page }) => {
  await page.goto('/props');
  await expect(page).toHaveURL(/\/login/i);
});
