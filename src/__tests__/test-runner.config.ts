import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Test patterns
    include: [
      'src/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
      ],
      exclude: [
        'src/__tests__/**',
        'src/**/*.d.ts',
        'src/**/*.stories.{js,ts,jsx,tsx}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    
    // Output configuration
    outputFile: {
      json: './test-results.json',
    },
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './src/__tests__'),
    },
  },
});

