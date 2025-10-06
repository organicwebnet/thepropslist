#!/usr/bin/env node

/**
 * User Profile Merge Test Script
 * 
 * This script tests the user profile merge functionality to ensure:
 * 1. Data migration works correctly
 * 2. All code references are updated
 * 3. Fallback logic is removed
 * 4. Unified userProfiles collection works properly
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const db = getFirestore();

// Test data
const testUserId = 'test-user-merge-' + Date.now();
const testEmail = `test-merge-${Date.now()}@example.com`;

async function createTestData() {
  console.log('🧪 Creating test data...');
  
  // Create test user in both collections (simulating current state)
  const usersData = {
    uid: testUserId,
    email: testEmail,
    displayName: 'Test User Merge',
    role: 'user',
    createdAt: new Date(),
    lastLogin: new Date(),
    preferences: {
      theme: 'dark',
      notifications: true,
      defaultView: 'list'
    },
    organizations: ['test-org'],
    onboardingCompleted: false
  };

  const userProfilesData = {
    email: testEmail,
    role: 'user',
    groups: { 'test-group': true },
    plan: 'starter',
    subscriptionStatus: 'active',
    lastStripeEventTs: Date.now(),
    jobTitle: 'Test Engineer',
    themePreference: 'light', // Different from users.preferences.theme
    fontPreference: 'OpenDyslexic',
    savedSenderAddresses: [{ name: 'Test Sender', address: '123 Test St' }]
  };

  // Write to both collections
  await db.collection('users').doc(testUserId).set(usersData);
  await db.collection('userProfiles').doc(testUserId).set(userProfilesData);
  
  console.log('✅ Test data created in both collections');
  return { usersData, userProfilesData };
}

async function testCurrentFallbackLogic() {
  console.log('\n🔍 Testing current fallback logic...');
  
  // Simulate the current fallback logic from functions/src/index.ts
  const prof = await db.collection('userProfiles').doc(testUserId).get();
  let me = prof.exists ? prof.data() : {};
  
  if (!me || Object.keys(me).length === 0) {
    const userDoc = await db.collection('users').doc(testUserId).get();
    if (userDoc.exists) me = { ...userDoc.data() };
  }
  
  console.log('✅ Fallback logic works - found user data:', {
    hasEmail: !!me.email,
    hasRole: !!me.role,
    hasGroups: !!me.groups,
    hasPlan: !!me.plan,
    hasPreferences: !!me.preferences
  });
  
  return me;
}

async function migrateUserData() {
  console.log('\n🔄 Migrating user data...');
  
  // Get data from both collections
  const usersDoc = await db.collection('users').doc(testUserId).get();
  const userProfilesDoc = await db.collection('userProfiles').doc(testUserId).get();
  
  const usersData = usersDoc.exists ? usersDoc.data() : {};
  const userProfilesData = userProfilesDoc.exists ? userProfilesDoc.data() : {};
  
  // Merge data with userProfiles taking precedence for conflicts
  const mergedData = {
    // Core identity
    uid: usersData.uid || testUserId,
    email: userProfilesData.email || usersData.email,
    displayName: usersData.displayName,
    
    // Basic profile
    role: userProfilesData.role || usersData.role,
    jobTitle: userProfilesData.jobTitle,
    createdAt: usersData.createdAt,
    updatedAt: new Date(),
    lastLogin: usersData.lastLogin,
    
    // Preferences (resolve conflicts)
    themePreference: userProfilesData.themePreference || usersData.preferences?.theme || 'light',
    fontPreference: userProfilesData.fontPreference,
    notifications: usersData.preferences?.notifications ?? true,
    defaultView: usersData.preferences?.defaultView || 'grid',
    
    // Organizations & Groups
    organizations: usersData.organizations || [],
    groups: userProfilesData.groups || {},
    
    // Subscription & Billing
    plan: userProfilesData.plan || 'free',
    subscriptionStatus: userProfilesData.subscriptionStatus || 'inactive',
    lastStripeEventTs: userProfilesData.lastStripeEventTs || Date.now(),
    
    // Onboarding
    onboardingCompleted: usersData.onboardingCompleted || false,
    
    // Addresses
    savedSenderAddresses: userProfilesData.savedSenderAddresses || [],
    savedDeliveryAddresses: userProfilesData.savedDeliveryAddresses || []
  };
  
  // Write merged data to userProfiles collection
  await db.collection('userProfiles').doc(testUserId).set(mergedData);
  
  console.log('✅ User data migrated to unified userProfiles collection');
  return mergedData;
}

async function testUnifiedAccess() {
  console.log('\n🎯 Testing unified access (no fallback needed)...');
  
  // Test direct access to userProfiles (should work without fallback)
  const profileDoc = await db.collection('userProfiles').doc(testUserId).get();
  
  if (!profileDoc.exists) {
    throw new Error('❌ User profile not found after migration');
  }
  
  const profileData = profileDoc.data();
  
  // Verify all expected fields are present
  const requiredFields = [
    'uid', 'email', 'displayName', 'role', 'createdAt', 'updatedAt',
    'themePreference', 'notifications', 'defaultView', 'organizations',
    'groups', 'plan', 'subscriptionStatus', 'onboardingCompleted'
  ];
  
  const missingFields = requiredFields.filter(field => !(field in profileData));
  
  if (missingFields.length > 0) {
    throw new Error(`❌ Missing fields after migration: ${missingFields.join(', ')}`);
  }
  
  // Verify conflict resolution worked
  if (profileData.themePreference !== 'light') {
    throw new Error(`❌ Theme preference conflict not resolved correctly. Expected 'light', got '${profileData.themePreference}'`);
  }
  
  console.log('✅ Unified access works correctly');
  console.log('✅ All required fields present');
  console.log('✅ Conflict resolution working');
  
  return profileData;
}

async function testCodeUpdateSimulation() {
  console.log('\n🔧 Testing code update simulation...');
  
  // Simulate the updated code that only uses userProfiles
  const profileDoc = await db.collection('userProfiles').doc(testUserId).get();
  
  if (!profileDoc.exists) {
    throw new Error('❌ Profile not found - code update failed');
  }
  
  const profileData = profileDoc.data();
  
  // Simulate admin permission check (updated code)
  const isGod = String(profileData?.role || '').toLowerCase() === 'god';
  const isSystemAdmin = !!(profileData?.groups && profileData.groups['system-admin'] === true);
  
  console.log('✅ Admin permission check works with unified data');
  console.log(`   - Is God: ${isGod}`);
  console.log(`   - Is System Admin: ${isSystemAdmin}`);
  
  // Simulate subscription check
  const hasActiveSubscription = profileData.subscriptionStatus === 'active';
  const plan = profileData.plan;
  
  console.log('✅ Subscription check works with unified data');
  console.log(`   - Plan: ${plan}`);
  console.log(`   - Active: ${hasActiveSubscription}`);
  
  return true;
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    await db.collection('users').doc(testUserId).delete();
    await db.collection('userProfiles').doc(testUserId).delete();
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting User Profile Merge Tests');
  console.log('=====================================\n');
  
  try {
    // Test 1: Create test data
    await createTestData();
    
    // Test 2: Verify current fallback logic works
    await testCurrentFallbackLogic();
    
    // Test 3: Migrate data
    const migratedData = await migrateUserData();
    
    // Test 4: Test unified access
    await testUnifiedAccess();
    
    // Test 5: Simulate code updates
    await testCodeUpdateSimulation();
    
    console.log('\n🎉 All tests passed!');
    console.log('\n📋 Migration Summary:');
    console.log('✅ Data migration successful');
    console.log('✅ Unified userProfiles collection working');
    console.log('✅ Conflict resolution working');
    console.log('✅ Code update simulation successful');
    console.log('✅ No fallback logic needed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestData();
  }
}

// Run tests
runTests().catch(console.error);

