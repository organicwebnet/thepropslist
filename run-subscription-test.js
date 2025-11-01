#!/usr/bin/env node

/**
 * Test runner for subscription flow test
 * This script sets up the proper environment and runs the subscription test
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Setting up subscription flow test...\n');

try {
  // Check if we're in the web-app directory
  const webAppPackageJson = join(__dirname, 'web-app', 'package.json');
  const testFile = join(__dirname, 'test-subscription-flow.js');
  
  if (!existsSync(webAppPackageJson)) {
    console.error('❌ Error: web-app directory not found. Please run this script from the project root.');
    process.exit(1);
  }
  
  if (!existsSync(testFile)) {
    console.error('❌ Error: test-subscription-flow.js not found.');
    process.exit(1);
  }
  
  console.log('✅ Found web-app directory and test file');
  
  // Copy the test package.json to web-app directory temporarily
  const tempPackageJson = join(__dirname, 'web-app', 'package.json.backup');
  const testPackageJson = join(__dirname, 'test-subscription-flow.package.json');
  
  if (existsSync(testPackageJson)) {
    console.log('📦 Setting up test environment...');
    
    // Backup original package.json
    copyFileSync(webAppPackageJson, tempPackageJson);
    console.log('✅ Backed up original package.json');
    
    // Copy test package.json
    copyFileSync(testPackageJson, webAppPackageJson);
    console.log('✅ Set up test package.json');
  }
  
  // Run the test from web-app directory
  console.log('\n🧪 Running subscription flow test...\n');
  
  const testCommand = `node ${join(__dirname, 'test-subscription-flow.js')}`;
  execSync(testCommand, {
    stdio: 'inherit',
    cwd: join(__dirname, 'web-app')
  });
  
  console.log('\n✅ Test completed successfully!');
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Restore original package.json
  const webAppPackageJson = join(__dirname, 'web-app', 'package.json');
  const tempPackageJson = join(__dirname, 'web-app', 'package.json.backup');
  
  if (existsSync(tempPackageJson)) {
    try {
      copyFileSync(tempPackageJson, webAppPackageJson);
      console.log('✅ Restored original package.json');
    } catch (restoreError) {
      console.warn('⚠️  Could not restore original package.json:', restoreError.message);
    }
  }
}



