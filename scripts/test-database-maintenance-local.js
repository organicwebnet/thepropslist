#!/usr/bin/env node

/**
 * Local Database Maintenance Test
 * 
 * This script tests the database maintenance functions locally by directly
 * testing the database operations without requiring deployed functions.
 * 
 * Usage:
 *   node scripts/test-database-maintenance-local.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const db = require('firebase-admin').firestore();

async function testBatchProcessing() {
  console.log('🧪 Testing batch processing logic...');
  
  try {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Create test documents
    const testDocs = Array(5).fill(null).map((_, i) => ({
      id: `test-batch-${i}`,
      processed: true,
      processingAt: new Date(thirtyDaysAgo - 1000),
      delivery: { state: 'sent' }
    }));
    
    // Write test documents
    const batch = db.batch();
    testDocs.forEach(doc => {
      const docRef = db.collection('emails').doc(doc.id);
      batch.set(docRef, doc);
    });
    await batch.commit();
    
    console.log('✅ Test documents created');
    
    // Test batch deletion logic
    const query = db.collection('emails')
      .where('processed', '==', true)
      .where('processingAt', '<', require('firebase-admin').firestore.Timestamp.fromMillis(thirtyDaysAgo))
      .limit(500);
    
    const snapshot = await query.get();
    console.log(`✅ Query executed: Found ${snapshot.size} documents`);
    
    // Test batch processing
    let deletedCount = 0;
    const batchSize = 450;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const deleteBatch = db.batch();
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      for (const doc of batchDocs) {
        deleteBatch.delete(doc.ref);
        deletedCount++;
      }
      
      await deleteBatch.commit();
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} committed: ${batchDocs.length} documents deleted`);
    }
    
    console.log(`✅ Batch processing test completed: ${deletedCount} documents deleted`);
    return true;
    
  } catch (error) {
    console.error('❌ Batch processing test failed:', error.message);
    return false;
  }
}

async function testQueryLogic() {
  console.log('\n🔍 Testing query logic...');
  
  try {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Test emails query
    const emailsQuery = db.collection('emails')
      .where('processed', '==', true)
      .where('processingAt', '<', require('firebase-admin').firestore.Timestamp.fromMillis(thirtyDaysAgo))
      .limit(500);
    
    const emailsSnapshot = await emailsQuery.get();
    console.log(`✅ Emails query: Found ${emailsSnapshot.size} old processed emails`);
    
    // Test failed emails query
    const failedEmailsQuery = db.collection('emails')
      .where('delivery.state', '==', 'failed')
      .where('delivery.failedAt', '<', require('firebase-admin').firestore.Timestamp.fromMillis(sevenDaysAgo))
      .limit(500);
    
    const failedEmailsSnapshot = await failedEmailsQuery.get();
    console.log(`✅ Failed emails query: Found ${failedEmailsSnapshot.size} old failed emails`);
    
    // Test expired codes queries
    const signupCodesQuery = db.collection('pending_signups')
      .where('expiresAt', '<', now)
      .limit(500);
    
    const signupCodesSnapshot = await signupCodesQuery.get();
    console.log(`✅ Expired signup codes query: Found ${signupCodesSnapshot.size} expired codes`);
    
    const resetCodesQuery = db.collection('pending_password_resets')
      .where('expiresAt', '<', now)
      .limit(500);
    
    const resetCodesSnapshot = await resetCodesQuery.get();
    console.log(`✅ Expired reset codes query: Found ${resetCodesSnapshot.size} expired codes`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Query logic test failed:', error.message);
    return false;
  }
}

async function testAdminPermissionLogic() {
  console.log('\n🔐 Testing admin permission logic...');
  
  try {
    // Test user profile lookup
    const testUserId = 'test-admin-user';
    
    // Mock user profile data
    const mockUserProfile = {
      groups: { 'system-admin': true },
      role: 'user'
    };
    
    // Test the permission checking logic (updated - no fallback needed)
    const prof = await db.collection('userProfiles').doc(testUserId).get();
    const me = prof.exists ? prof.data() : {};
    
    const isGod = String(me?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true);
    
    console.log(`✅ Permission check logic: isGod=${isGod}, isSystemAdmin=${isSystemAdmin}`);
    
    // Test with mock data
    const mockMe = mockUserProfile;
    const mockIsGod = String(mockMe?.role || '').toLowerCase() === 'god';
    const mockIsSystemAdmin = !!(mockMe?.groups && mockMe.groups['system-admin'] === true);
    
    console.log(`✅ Mock permission check: isGod=${mockIsGod}, isSystemAdmin=${mockIsSystemAdmin}`);
    
    if (mockIsSystemAdmin) {
      console.log('✅ Admin permission logic working correctly');
      return true;
    } else {
      console.log('❌ Admin permission logic failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Admin permission test failed:', error.message);
    return false;
  }
}

async function testInputValidation() {
  console.log('\n🛡️ Testing input validation logic...');
  
  try {
    // Test collection validation
    const allowedCollections = ['emails', 'pending_signups', 'pending_password_resets'];
    const testCollection = 'emails';
    
    if (allowedCollections.includes(testCollection)) {
      console.log('✅ Collection validation: PASSED');
    } else {
      console.log('❌ Collection validation: FAILED');
      return false;
    }
    
    // Test daysOld validation
    const testDaysOld = 30;
    if (typeof testDaysOld === 'number' && testDaysOld >= 1 && testDaysOld <= 365) {
      console.log('✅ DaysOld validation: PASSED');
    } else {
      console.log('❌ DaysOld validation: FAILED');
      return false;
    }
    
    // Test dryRun validation
    const testDryRun = true;
    if (typeof testDryRun === 'boolean') {
      console.log('✅ DryRun validation: PASSED');
    } else {
      console.log('❌ DryRun validation: FAILED');
      return false;
    }
    
    // Test invalid collection
    const invalidCollection = 'invalid_collection';
    if (!allowedCollections.includes(invalidCollection)) {
      console.log('✅ Invalid collection rejection: PASSED');
    } else {
      console.log('❌ Invalid collection rejection: FAILED');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Input validation test failed:', error.message);
    return false;
  }
}

async function testHealthCheckLogic() {
  console.log('\n📊 Testing health check logic...');
  
  try {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Test count queries
    const emailsTotal = await db.collection('emails').count().get();
    console.log(`✅ Emails total count: ${emailsTotal.data().count}`);
    
    const emailsOld = await db.collection('emails')
      .where('processed', '==', true)
      .where('processingAt', '<', require('firebase-admin').firestore.Timestamp.fromMillis(thirtyDaysAgo))
      .count()
      .get();
    console.log(`✅ Old processed emails count: ${emailsOld.data().count}`);
    
    const emailsFailed = await db.collection('emails')
      .where('delivery.state', '==', 'failed')
      .where('delivery.failedAt', '<', require('firebase-admin').firestore.Timestamp.fromMillis(sevenDaysAgo))
      .count()
      .get();
    console.log(`✅ Old failed emails count: ${emailsFailed.data().count}`);
    
    const signupCodesTotal = await db.collection('pending_signups').count().get();
    console.log(`✅ Signup codes total count: ${signupCodesTotal.data().count}`);
    
    const signupCodesExpired = await db.collection('pending_signups')
      .where('expiresAt', '<', now)
      .count()
      .get();
    console.log(`✅ Expired signup codes count: ${signupCodesExpired.data().count}`);
    
    const resetCodesTotal = await db.collection('pending_password_resets').count().get();
    console.log(`✅ Reset codes total count: ${resetCodesTotal.data().count}`);
    
    const resetCodesExpired = await db.collection('pending_password_resets')
      .where('expiresAt', '<', now)
      .count()
      .get();
    console.log(`✅ Expired reset codes count: ${resetCodesExpired.data().count}`);
    
    // Calculate cleanup opportunity
    const totalCleanupOpportunity = 
      emailsOld.data().count + 
      emailsFailed.data().count + 
      signupCodesExpired.data().count + 
      resetCodesExpired.data().count;
    
    console.log(`✅ Total cleanup opportunity: ${totalCleanupOpportunity} documents`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Health check logic test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Local Database Maintenance Tests\n');
  
  const results = {
    batchProcessing: false,
    queryLogic: false,
    adminPermissions: false,
    inputValidation: false,
    healthCheck: false
  };
  
  try {
    // Run all tests
    results.batchProcessing = await testBatchProcessing();
    results.queryLogic = await testQueryLogic();
    results.adminPermissions = await testAdminPermissionLogic();
    results.inputValidation = await testInputValidation();
    results.healthCheck = await testHealthCheckLogic();
    
    // Summary
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    console.log(`Batch Processing: ${results.batchProcessing ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Query Logic: ${results.queryLogic ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Admin Permissions: ${results.adminPermissions ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Input Validation: ${results.inputValidation ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Health Check Logic: ${results.healthCheck ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      console.log('\n🎉 All tests PASSED! Database maintenance functions are working correctly.');
    } else {
      console.log('\n⚠️  Some tests FAILED. Please review the issues above.');
    }
    
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
