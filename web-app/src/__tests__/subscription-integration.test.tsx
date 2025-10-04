import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { test, expect as playwrightExpect } from '@playwright/test';

/**
 * Integration tests for subscription plans and addon enforcement
 * These tests run in the browser and test the actual UI behavior
 */

test.describe('Subscription Plans and Addon Enforcement - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should show correct limits for FREE plan users', async ({ page }) => {
    // Mock a free plan user
    await page.evaluate(() => {
      // Mock the subscription data
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'free',
        status: 'active',
        limits: {
          shows: 1,
          boards: 2,
          packingBoxes: 20,
          collaboratorsPerShow: 3,
          props: 10,
          archivedShows: 0
        },
        effectiveLimits: {
          shows: 1,
          boards: 2,
          packingBoxes: 20,
          collaboratorsPerShow: 3,
          props: 10,
          archivedShows: 0
        },
        canPurchaseAddOns: false
      }));
    });

    // Navigate to props page
    await page.click('a[href="/props"]');
    await page.waitForLoadState('networkidle');

    // Check that limit warnings are shown
    const limitWarning = page.locator('text=limit reached');
    await playwrightExpect(limitWarning).toBeVisible();

    // Check that addon purchase is not available
    const addonButton = page.locator('text=Upgrade Plan');
    await playwrightExpect(addonButton).toBeVisible();
  });

  test('should enforce show limits for FREE plan', async ({ page }) => {
    // Mock a free plan user with 1 show already created
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'free',
        status: 'active',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        canPurchaseAddOns: false
      }));
      
      // Mock existing shows data
      window.localStorage.setItem('mock-shows', JSON.stringify([
        { id: 'show1', name: 'Existing Show', userId: 'test-user' }
      ]));
    });

    // Navigate to shows page
    await page.click('a[href="/shows"]');
    await page.waitForLoadState('networkidle');

    // Try to create a new show
    await page.click('button:has-text("Add Show")');
    
    // Should show limit warning
    const limitMessage = page.locator('text=reached your plan\'s show limit');
    await playwrightExpect(limitMessage).toBeVisible();
  });

  test('should enforce props limits for FREE plan', async ({ page }) => {
    // Mock a free plan user with 10 props already created
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'free',
        status: 'active',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        canPurchaseAddOns: false
      }));
      
      // Mock existing props data (10 props)
      const props = Array(10).fill(null).map((_, i) => ({
        id: `prop${i}`,
        name: `Prop ${i}`,
        userId: 'test-user',
        showId: 'show1'
      }));
      window.localStorage.setItem('mock-props', JSON.stringify(props));
    });

    // Navigate to props page
    await page.click('a[href="/props"]');
    await page.waitForLoadState('networkidle');

    // Try to add a new prop
    await page.click('button:has-text("Add Prop")');
    
    // Should show limit warning
    const limitMessage = page.locator('text=reached your plan\'s props limit');
    await playwrightExpect(limitMessage).toBeVisible();
  });

  test('should allow addon purchases for STANDARD plan users', async ({ page }) => {
    // Mock a standard plan user
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'active',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        effectiveLimits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        canPurchaseAddOns: true
      }));
    });

    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForLoadState('networkidle');

    // Check that addon marketplace is available
    const addonSection = page.locator('text=Add-ons');
    await playwrightExpect(addonSection).toBeVisible();

    // Check that addon purchase buttons are visible
    const purchaseButton = page.locator('button:has-text("Purchase")').first();
    await playwrightExpect(purchaseButton).toBeVisible();
  });

  test('should show effective limits with addons', async ({ page }) => {
    // Mock a standard plan user with addons
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'active',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        effectiveLimits: {
          shows: 25, // 10 + 15 from addons
          boards: 20,
          packingBoxes: 300, // 200 + 100 from addons
          collaboratorsPerShow: 10,
          props: 1100, // 500 + 600 from addons
          archivedShows: 10 // 5 + 5 from addons
        },
        userAddOns: [
          {
            id: 'addon1',
            addOnId: 'shows_5',
            status: 'active',
            quantity: 1
          },
          {
            id: 'addon2',
            addOnId: 'shows_10',
            status: 'active',
            quantity: 1
          },
          {
            id: 'addon3',
            addOnId: 'props_100',
            status: 'active',
            quantity: 1
          },
          {
            id: 'addon4',
            addOnId: 'props_500',
            status: 'active',
            quantity: 1
          },
          {
            id: 'addon5',
            addOnId: 'packing_100',
            status: 'active',
            quantity: 1
          },
          {
            id: 'addon6',
            addOnId: 'archived_5',
            status: 'active',
            quantity: 1
          }
        ],
        canPurchaseAddOns: true
      }));
    });

    // Navigate to props page
    await page.click('a[href="/props"]');
    await page.waitForLoadState('networkidle');

    // Check that the limit counter shows effective limits
    const limitCounter = page.locator('[data-testid="availability-counter"]');
    await playwrightExpect(limitCounter).toBeVisible();
    
    // The counter should show the effective limit (1100) not the base limit (500)
    const limitText = await limitCounter.textContent();
    expect(limitText).toContain('1100'); // Effective limit with addons
  });

  test('should enforce per-show limits correctly', async ({ page }) => {
    // Mock a standard plan user
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'active',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        perShowLimits: {
          boards: 10,
          packingBoxes: 100,
          collaborators: 10,
          props: 100
        },
        effectiveLimits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        canPurchaseAddOns: true
      }));
      
      // Mock a show with 100 props (at per-show limit)
      const props = Array(100).fill(null).map((_, i) => ({
        id: `prop${i}`,
        name: `Prop ${i}`,
        userId: 'test-user',
        showId: 'show1'
      }));
      window.localStorage.setItem('mock-props', JSON.stringify(props));
      window.localStorage.setItem('current-show-id', 'show1');
    });

    // Navigate to props page
    await page.click('a[href="/props"]');
    await page.waitForLoadState('networkidle');

    // Try to add a new prop
    await page.click('button:has-text("Add Prop")');
    
    // Should show per-show limit warning
    const limitMessage = page.locator('text=This show has reached its props limit');
    await playwrightExpect(limitMessage).toBeVisible();
  });

  test('should show addon marketplace with correct pricing', async ({ page }) => {
    // Mock a standard plan user
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'active',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        effectiveLimits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        canPurchaseAddOns: true
      }));
    });

    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForLoadState('networkidle');

    // Check that addon marketplace shows correct pricing
    const showsAddon = page.locator('text=5 Additional Shows');
    await playwrightExpect(showsAddon).toBeVisible();
    
    const showsPrice = page.locator('text=$12/month');
    await playwrightExpect(showsPrice).toBeVisible();

    const propsAddon = page.locator('text=100 Additional Props');
    await playwrightExpect(propsAddon).toBeVisible();
    
    const propsPrice = page.locator('text=$4/month');
    await playwrightExpect(propsPrice).toBeVisible();
  });

  test('should handle addon purchase flow', async ({ page }) => {
    // Mock a standard plan user
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'active',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        effectiveLimits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        canPurchaseAddOns: true
      }));
    });

    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForLoadState('networkidle');

    // Click on an addon purchase button
    const purchaseButton = page.locator('button:has-text("Purchase")').first();
    await purchaseButton.click();

    // Should show purchase confirmation or redirect to payment
    // This would depend on the actual implementation
    await page.waitForTimeout(1000);
    
    // Check that some purchase flow was initiated
    const currentUrl = page.url();
    expect(currentUrl).toContain('profile'); // Should still be on profile or redirected to payment
  });

  test('should show limit warnings when approaching limits', async ({ page }) => {
    // Mock a free plan user with 9 props (approaching limit of 10)
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'free',
        status: 'active',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        canPurchaseAddOns: false
      }));
      
      // Mock 9 props
      const props = Array(9).fill(null).map((_, i) => ({
        id: `prop${i}`,
        name: `Prop ${i}`,
        userId: 'test-user',
        showId: 'show1'
      }));
      window.localStorage.setItem('mock-props', JSON.stringify(props));
    });

    // Navigate to props page
    await page.click('a[href="/props"]');
    await page.waitForLoadState('networkidle');

    // Check that limit warning is shown
    const limitCounter = page.locator('[data-testid="availability-counter"]');
    await playwrightExpect(limitCounter).toBeVisible();
    
    const limitText = await limitCounter.textContent();
    expect(limitText).toContain('9/10'); // Should show current usage vs limit
  });

  test('should prevent addon purchases for free and starter plans', async ({ page }) => {
    // Mock a free plan user
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'free',
        status: 'active',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        canPurchaseAddOns: false
      }));
    });

    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForLoadState('networkidle');

    // Check that addon marketplace is not available or shows upgrade message
    const upgradeMessage = page.locator('text=Upgrade to Standard or Pro');
    await playwrightExpect(upgradeMessage).toBeVisible();
  });

  test('should handle subscription status changes', async ({ page }) => {
    // Mock a cancelled subscription
    await page.evaluate(() => {
      window.localStorage.setItem('mock-subscription', JSON.stringify({
        plan: 'standard',
        status: 'cancelled',
        limits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        effectiveLimits: {
          shows: 10,
          boards: 20,
          packingBoxes: 200,
          collaboratorsPerShow: 10,
          props: 500,
          archivedShows: 5
        },
        canPurchaseAddOns: false // Should be false for cancelled subscriptions
      }));
    });

    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await page.waitForLoadState('networkidle');

    // Check that subscription status is shown
    const statusMessage = page.locator('text=cancelled');
    await playwrightExpect(statusMessage).toBeVisible();
    
    // Check that addon purchases are disabled
    const addonSection = page.locator('text=Add-ons');
    await playwrightExpect(addonSection).not.toBeVisible();
  });
});
