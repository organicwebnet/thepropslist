import { test, expect } from '@playwright/test';

// Login page loads and shows form elements
test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder(/@/)).toBeVisible();
  await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
});

// Protected route redirects to /login when unauthenticated
test('protected route redirects to login', async ({ page }) => {
  await page.goto('/props');
  await expect(page).toHaveURL(/\/login/i);
});
