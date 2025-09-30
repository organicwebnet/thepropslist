import { test, expect } from '@playwright/test';

// Login page loads and shows form elements
test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

// Protected route redirects to /login when unauthenticated
test('protected route redirects to login', async ({ page }) => {
  await page.goto('/props');
  await expect(page).toHaveURL(/\/login/i);
});
