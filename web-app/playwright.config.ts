import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: 'line',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:5173' },
  webServer: process.env.BASE_URL ? undefined : { command: 'npm run dev', port: 5173, reuseExistingServer: !process.env.CI },
});
