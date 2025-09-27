import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Screenshot Generator for Help Documentation', () => {
  test('capture screenshots for help documentation', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    const screenshotsDir = path.join(__dirname, '../screenshots/help-docs');
    
    // Login first (you'll need to adjust this based on your auth setup)
    await page.goto('/login');
    // Add login logic here if needed
    
    // 1. Dashboard/Home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard.png'),
      fullPage: true 
    });
    
    // 2. Props List page
    await page.goto('/props');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'props-list.png'),
      fullPage: true 
    });
    
    // 3. Add Prop page
    await page.goto('/props/add');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'add-prop.png'),
      fullPage: true 
    });
    
    // 4. Shows Management
    await page.goto('/shows');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'shows-management.png'),
      fullPage: true 
    });
    
    // 5. Task Boards
    await page.goto('/boards');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'task-boards.png'),
      fullPage: true 
    });
    
    // 6. Packing Lists
    await page.goto('/packing-lists');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'packing-lists.png'),
      fullPage: true 
    });
    
    // 7. PDF Export
    await page.goto('/props/pdf-export');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'pdf-export.png'),
      fullPage: true 
    });
    
    // 8. Team Management
    await page.goto('/shows/1/team'); // Adjust show ID as needed
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'team-management.png'),
      fullPage: true 
    });
  });
  
  test('capture mobile screenshots', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const screenshotsDir = path.join(__dirname, '../screenshots/help-docs/mobile');
    
    // Mobile screenshots of key pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard-mobile.png'),
      fullPage: true 
    });
    
    await page.goto('/props');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'props-list-mobile.png'),
      fullPage: true 
    });
  });
});
