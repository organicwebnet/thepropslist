import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Screenshot Generator for Help Documentation', () => {
  test('capture screenshots for help documentation', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    const screenshotsDir = path.join(__dirname, '../screenshots/help-docs');
    
    // Create screenshots directory if it doesn't exist
    try {
      await page.evaluate(() => {
        // This will be handled by the file system
      });
    } catch (error) {
      console.log('Screenshots directory creation handled by test runner');
    }
    
    // 1. Login page (always accessible)
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'login.png'),
      fullPage: true 
    });
    
    // 2. Signup page
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'signup.png'),
      fullPage: true 
    });
    
    // 3. Forgot password page
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'forgot-password.png'),
      fullPage: true 
    });
    
    // 4. Try to access protected routes (they should redirect to login)
    await page.goto('/props');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'props-redirect.png'),
      fullPage: true 
    });
    
    // 5. Try to access dashboard (should redirect to login)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard-redirect.png'),
      fullPage: true 
    });
  });
  
  test('capture mobile screenshots', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const screenshotsDir = path.join(__dirname, '../screenshots/help-docs/mobile');
    
    // Mobile screenshots of key pages
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'login-mobile.png'),
      fullPage: true 
    });
    
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'signup-mobile.png'),
      fullPage: true 
    });
    
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'forgot-password-mobile.png'),
      fullPage: true 
    });
  });
});
