module.exports = {
  displayName: 'Google Drive Integration Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/lib/__tests__/setup.ts'],
  testMatch: [
    '<rootDir>/src/lib/__tests__/**/*.test.ts',
    '<rootDir>/src/components/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/lib/googleDrive.ts',
    'src/lib/hybridStorage.ts',
    'src/components/StoragePreferences.tsx',
    '!src/lib/__tests__/**',
    '!src/components/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
};

























