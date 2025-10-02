import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: 'line',
  use: { 
    baseURL: process.env.BASE_URL || 'https://props-bible-app-1c1cb.web.app',
    // More conservative timeouts for CI
    actionTimeout: 15000,
    navigationTimeout: 45000,
    // Retry failed actions
    retry: 3,
  },
  // Global test timeout - longer for CI
  timeout: 120000,
  // Retry failed tests more in CI
  retries: process.env.CI ? 3 : 0,
  // Run tests in parallel but with fewer workers in CI
  workers: process.env.CI ? 2 : 5,
  // Only run critical tests in CI
  grep: /ci-smoke/,
  // Expect more failures in CI environment
  expect: {
    // Longer timeout for assertions
    timeout: 10000,
  },
  // Global setup for CI
  globalSetup: process.env.CI ? './tests/ci-setup.ts' : undefined,
});
