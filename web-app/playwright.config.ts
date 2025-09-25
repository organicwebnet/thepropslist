import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: 'line',
  use: { 
    baseURL: process.env.BASE_URL || 'https://props-bible-app-1c1cb.web.app',
    // Increase timeout for production testing
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  // Only start dev server if testing locally
  webServer: process.env.BASE_URL === 'http://localhost:5173' ? { 
    command: 'npm run dev', 
    port: 5173, 
    reuseExistingServer: !process.env.CI 
  } : undefined,
  // Global test timeout
  timeout: 60000,
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
});
