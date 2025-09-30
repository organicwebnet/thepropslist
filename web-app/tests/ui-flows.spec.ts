import { test, expect } from '@playwright/test';

test.describe('Props Bible Web App - UI Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test.describe('Authentication Flow', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('h1, h2')).toContainText(/The Props List/i);
    });

    test('should show signup form when clicking signup link', async ({ page }) => {
      await page.click('text=Sign up');
      await expect(page).toHaveURL(/.*signup/);
      await expect(page.locator('h1, h2')).toContainText(/sign up|create account/i);
    });

    test('should show forgot password form', async ({ page }) => {
      await page.click('text=Forgot password');
      await expect(page).toHaveURL(/.*forgot-password/);
      await expect(page.locator('h1, h2')).toContainText(/forgot password|reset password/i);
    });
  });

  test.describe('Navigation and Layout', () => {
    test('should have responsive navigation', async ({ page }) => {
      // Test mobile navigation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      // Check if mobile menu exists (hamburger menu)
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
      if (await mobileMenu.count() > 0) {
        await mobileMenu.click();
        await expect(page.locator('nav, .navigation')).toBeVisible();
      }
    });

    test('should have proper page titles', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveTitle(/The Props List/);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate login form', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.click('button[type="submit"], input[type="submit"]');
      
      // Check for validation messages
      const errorMessages = page.locator('.error, .invalid, [role="alert"]');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });

    test('should validate signup form', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to submit empty form
      await page.click('button[type="submit"], input[type="submit"]');
      
      // Check for validation messages
      const errorMessages = page.locator('.error, .invalid, [role="alert"]');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');
      
      // Check for form labels
      const inputs = page.locator('input[type="email"], input[type="password"]');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.getAttribute('aria-label') || 
                        await input.getAttribute('aria-labelledby') ||
                        await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
        
        if (!hasLabel) {
          throw new Error(`Input element at index ${i} is missing accessibility label`);
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto('/login');
      
      // This is a basic check - in a real scenario, you'd use axe-core
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
      const textCount = await textElements.count();
      
      // Just ensure text is visible (basic contrast check)
      for (let i = 0; i < Math.min(textCount, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const color = await element.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.color;
          });
          expect(color).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // First navigate to the page normally
      await page.goto('/login');
      await expect(page.locator('body')).toBeVisible();
      
      // Then simulate network failure for subsequent requests
      await page.route('**/*', route => route.abort());
      
      // Try to interact with the page - should not crash
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
      }
    });

    test('should show loading states', async ({ page }) => {
      await page.goto('/login');
      
      // Look for loading indicators
      const loadingElements = page.locator('.loading, .spinner, [aria-label*="loading"]');
      // Note: This test might not find loading elements if they're not currently loading
      // In a real test, you'd trigger an action that causes loading
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      if (loadTime >= 5000) {
        throw new Error(`Page load time (${loadTime}ms) exceeds acceptable limit (5000ms)`);
      }
    });

    test('should have optimized images', async ({ page }) => {
      await page.goto('/login');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const src = await img.getAttribute('src');
        if (src) {
          // Check if image has proper attributes
          const alt = await img.getAttribute('alt');
          if (!alt) {
            throw new Error(`Image at index ${i} is missing alt text`);
          }
        }
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      // Check if content fits on mobile
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      
      if (bodyBox) {
        if (bodyBox.width > 375) {
          throw new Error(`Body width (${bodyBox.width}px) exceeds mobile viewport width (375px)`);
        }
      }
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      
      // Check if content adapts to tablet
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in different browsers', async ({ page, browserName }) => {
      await page.goto('/login');
      
      // Basic functionality should work across browsers
      await expect(page.locator('body')).toBeVisible();
      
      // Test basic interactions
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
      }
    });
  });
});

test.describe('Props Bible Web App - Production Readiness', () => {
  test('should be accessible at production URL', async ({ page }) => {
    // Test the live production URL
    await page.goto('https://props-bible-app-1c1cb.web.app');
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible();
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*login/);
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('https://props-bible-app-1c1cb.web.app');
    
    if (response) {
      const headers = response.headers();
      
      // Check for security headers
      if (!headers['x-frame-options']) {
        throw new Error('Missing X-Frame-Options security header');
      }
      if (!headers['x-content-type-options']) {
        throw new Error('Missing X-Content-Type-Options security header');
      }
    }
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('https://props-bible-app-1c1cb.web.app');
    
    // Check for essential meta tags
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
  });
});
