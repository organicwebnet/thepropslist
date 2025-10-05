#!/usr/bin/env node

/**
 * Test Database Maintenance Functions
 * 
 * This script tests the database maintenance functions to ensure they work correctly.
 * It creates test data, runs the functions, and verifies the results.
 * 
 * Usage:
 *   node scripts/test-database-maintenance.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFunctions, httpsCallable } = require('firebase-admin/functions');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const functions = getFunctions();
const db = require('firebase-admin').firestore();

async function createTestData() {
  console.log('🧪 Creating test data...');
  
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Create test emails
  const testEmails = [
    {
      id: 'test-email-old-processed',
      processed: true,
      processingAt: new Date(thirtyDaysAgo - 1000),
      delivery: { state: 'sent' }
    },
    {
      id: 'test-email-old-failed',
      processed: true,
      processingAt: new Date(sevenDaysAgo - 1000),
      delivery: { 
        state: 'failed', 
        failedAt: new Date(sevenDaysAgo - 1000) 
      }
    },
    {
      id: 'test-email-recent',
      processed: true,
      processingAt: new Date(oneHourAgo),
      delivery: { state: 'sent' }
    }
  ];
  
  // Create test pending signup codes
  const testSignupCodes = [
    {
      id: 'test-signup-expired',
      expiresAt: now - 1000, // Expired
      codeHash: 'expired-hash'
    },
    {
      id: 'test-signup-valid',
      expiresAt: now + (10 * 60 * 1000), // Valid for 10 minutes
      codeHash: 'valid-hash'
    }
  ];
  
  // Create test password reset codes
  const testResetCodes = [
    {
      id: 'test-reset-expired',
      expiresAt: now - 1000, // Expired
      codeHash: 'expired-reset-hash'
    },
    {
      id: 'test-reset-valid',
      expiresAt: now + (10 * 60 * 1000), // Valid for 10 minutes
      codeHash: 'valid-reset-hash'
    }
  ];
  
  // Write test data to Firestore
  const batch = db.batch();
  
  // Add emails
  testEmails.forEach(email => {
    const docRef = db.collection('emails').doc(email.id);
    batch.set(docRef, email);
  });
  
  // Add signup codes
  testSignupCodes.forEach(code => {
    const docRef = db.collection('pending_signups').doc(code.id);
    batch.set(docRef, code);
  });
  
  // Add reset codes
  testResetCodes.forEach(code => {
    const docRef = db.collection('pending_password_resets').doc(code.id);
    batch.set(docRef, code);
  });
  
  await batch.commit();
  console.log('✅ Test data created successfully');
}

async function runHealthCheck() {
  console.log('\n🔍 Running database health check...');
  
  try {
    const healthCheck = httpsCallable(functions, 'databaseHealthCheck');
    const result = await healthCheck();
    
    if (result.data.success) {
      const report = result.data.healthReport;
      console.log('📊 Health Check Results:');
      console.log(`   Emails: ${report.collections.emails?.total || 0} total, ${report.collections.emails?.cleanupOpportunity || 0} cleanup opportunity`);
      console.log(`   Signup codes: ${report.collections.pending_signups?.total || 0} total, ${report.collections.pending_signups?.cleanupOpportunity || 0} cleanup opportunity`);
      console.log(`   Reset codes: ${report.collections.pending_password_resets?.total || 0} total, ${report.collections.pending_password_resets?.cleanupOpportunity || 0} cleanup opportunity`);
      console.log(`   Total cleanup opportunity: ${report.summary?.totalCleanupOpportunity || 0}`);
      
      if (report.summary?.recommendations?.length > 0) {
        console.log('💡 Recommendations:');
        report.summary.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      return report;
    } else {
      console.error('❌ Health check failed:', result.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error running health check:', error.message);
    return null;
  }
}

async function testManualCleanup() {
  console.log('\n🧹 Testing manual cleanup (dry run)...');
  
  try {
    const manualCleanup = httpsCallable(functions, 'manualCleanup');
    
    // Test emails cleanup (dry run)
    const result = await manualCleanup({
      collection: 'emails',
      daysOld: 30,
      dryRun: true
    });
    
    if (result.data.success) {
      console.log('✅ Manual cleanup dry run successful:');
      console.log(`   ${result.data.message}`);
      if (result.data.wouldDeleteCount > 0) {
        console.log(`   Would delete: ${result.data.wouldDeleteCount} documents`);
      }
    } else {
      console.error('❌ Manual cleanup dry run failed:', result.data);
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error testing manual cleanup:', error.message);
    return null;
  }
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying cleanup results...');
  
  try {
    // Check emails collection
    const emailsSnapshot = await db.collection('emails').get();
    const emails = emailsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Check pending signups
    const signupSnapshot = await db.collection('pending_signups').get();
    const signups = signupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Check pending resets
    const resetSnapshot = await db.collection('pending_password_resets').get();
    const resets = resetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('📊 Current state:');
    console.log(`   Emails: ${emails.length} documents`);
    console.log(`   Signup codes: ${signups.length} documents`);
    console.log(`   Reset codes: ${resets.length} documents`);
    
    // Check for test data
    const testEmails = emails.filter(email => email.id.startsWith('test-email-'));
    const testSignups = signups.filter(signup => signup.id.startsWith('test-signup-'));
    const testResets = resets.filter(reset => reset.id.startsWith('test-reset-'));
    
    console.log('🧪 Test data remaining:');
    console.log(`   Test emails: ${testEmails.length}`);
    console.log(`   Test signup codes: ${testSignups.length}`);
    console.log(`   Test reset codes: ${testResets.length}`);
    
    return {
      emails: emails.length,
      signups: signups.length,
      resets: resets.length,
      testEmails: testEmails.length,
      testSignups: testSignups.length,
      testResets: testResets.length
    };
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error.message);
    return null;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const batch = db.batch();
    
    // Delete test emails
    const emailsSnapshot = await db.collection('emails').get();
    emailsSnapshot.docs.forEach(doc => {
      if (doc.id.startsWith('test-email-')) {
        batch.delete(doc.ref);
      }
    });
    
    // Delete test signup codes
    const signupSnapshot = await db.collection('pending_signups').get();
    signupSnapshot.docs.forEach(doc => {
      if (doc.id.startsWith('test-signup-')) {
        batch.delete(doc.ref);
      }
    });
    
    // Delete test reset codes
    const resetSnapshot = await db.collection('pending_password_resets').get();
    resetSnapshot.docs.forEach(doc => {
      if (doc.id.startsWith('test-reset-')) {
        batch.delete(doc.ref);
      }
    });
    
    await batch.commit();
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Database Maintenance Function Tests\n');
  
  try {
    // Step 1: Create test data
    await createTestData();
    
    // Step 2: Run health check
    const healthReport = await runHealthCheck();
    
    // Step 3: Test manual cleanup
    const cleanupResult = await testManualCleanup();
    
    // Step 4: Verify current state
    const verification = await verifyCleanup();
    
    // Step 5: Clean up test data
    await cleanupTestData();
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('================');
    
    if (healthReport) {
      console.log('✅ Health check: PASSED');
    } else {
      console.log('❌ Health check: FAILED');
    }
    
    if (cleanupResult && cleanupResult.success) {
      console.log('✅ Manual cleanup: PASSED');
    } else {
      console.log('❌ Manual cleanup: FAILED');
    }
    
    if (verification) {
      console.log('✅ Data verification: PASSED');
      console.log(`   Found ${verification.testEmails} test emails, ${verification.testSignups} test signup codes, ${verification.testResets} test reset codes`);
    } else {
      console.log('❌ Data verification: FAILED');
    }
    
    console.log('\n🎉 Database maintenance function tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
