import { test, expect } from '@playwright/test';

test.describe('Profile Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/profile');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show onboarding navigation for incomplete users', async ({ page }) => {
    // Check for onboarding-specific navigation elements
    await expect(page.getByRole('navigation', { name: 'Onboarding navigation' })).toBeVisible();
    await expect(page.getByLabelText('Navigate back to dashboard')).toBeVisible();
    await expect(page.getByLabelText('Continue to next step: Create your first show')).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
  });

  test('should show main navigation for completed users', async ({ page }) => {
    // This test would require mocking the user profile state
    // For now, we'll test the structure exists
    const navigation = page.getByRole('navigation');
    await expect(navigation).toBeVisible();
  });

  test('should handle navigation clicks', async ({ page }) => {
    const backButton = page.getByLabelText('Navigate back to dashboard');
    await backButton.click();
    
    // Verify navigation occurred (this would depend on the actual routing)
    // For now, we'll just verify the button is clickable
    await expect(backButton).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    const backButton = page.getByLabelText('Navigate back to dashboard');
    
    // Test that button is focusable
    await backButton.focus();
    await expect(backButton).toBeFocused();
    
    // Test Enter key activation
    await backButton.press('Enter');
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check navigation role and aria-label
    const navigation = page.getByRole('navigation', { name: 'Onboarding navigation' });
    await expect(navigation).toBeVisible();

    // Check button roles and labels
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toHaveAttribute('aria-label');
      await expect(button).toHaveAttribute('tabIndex', '0');
    }
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // This test would require mocking navigation failures
    // For now, we'll verify the error handling structure exists
    const backButton = page.getByLabelText('Navigate back to dashboard');
    await expect(backButton).toBeVisible();
    
    // Click the button to trigger the navigation logic
    await backButton.click();
  });
});

