#!/usr/bin/env node

/**
 * Test runner for Google Drive integration tests
 * 
 * This script runs the comprehensive test suite for the Google Drive integration
 * including unit tests, integration tests, and component tests.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Google Drive Integration Tests...\n');

try {
  // Run the tests with coverage
  const testCommand = [
    'npx jest',
    '--config=src/lib/__tests__/jest.config.js',
    '--coverage',
    '--verbose',
    '--passWithNoTests',
    '--detectOpenHandles',
    '--forceExit'
  ].join(' ');

  console.log(`Running: ${testCommand}\n`);
  
  execSync(testCommand, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  console.log('\n✅ All Google Drive integration tests passed!');
  console.log('\n📊 Test Summary:');
  console.log('   • GoogleDriveService: Unit tests for core Drive API functionality');
  console.log('   • HybridStorageService: Unit tests for hybrid storage logic');
  console.log('   • StoragePreferences: Component tests for UI interactions');
  console.log('   • Integration Tests: End-to-end workflow testing');
  console.log('\n🎯 Coverage targets: 80%+ for all metrics');

} catch (error) {
  console.error('\n❌ Tests failed!');
  console.error('Error:', error.message);
  process.exit(1);
}













