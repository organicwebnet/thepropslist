#!/usr/bin/env node

/**
 * Script to create a test coupon for Pro version
 * 
 * This creates a 100% discount coupon that test users can use to test the pro version
 * without paying.
 * 
 * Usage:
 *   node scripts/create-test-pro-coupon.js
 * 
 * Requirements:
 *   - Firebase Admin SDK service account JSON file
 *   - Admin/god user access
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, collection, doc, setDoc, query, where, getDocs } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));
} catch (error) {
  console.error('❌ Error: Could not load Firebase Admin service account file.');
  console.error('   Make sure the service account JSON file exists in the project root.');
  console.error('   File should be named: props-bible-app-1c1cb-firebase-adminsdk-*.json');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const db = getFirestore();

// Test coupon configuration
const TEST_COUPON_CONFIG = {
  code: 'TESTPRO100',
  name: 'Test Pro Version - 100% Off',
  description: 'Test coupon for test users to access pro version features. 100% discount for testing purposes.',
  type: 'percentage',
  value: 100, // 100% off
  currency: 'usd',
  maxRedemptions: 1000, // Allow many test redemptions
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 1 year
  active: true,
  appliesTo: 'specific_plans',
  planIds: ['pro'] // Only applies to pro plan
};

async function checkIfCouponExists(code) {
  try {
    const discountCodesRef = collection(db, 'discountCodes');
    const q = query(discountCodesRef, where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if coupon exists:', error);
    return false;
  }
}

async function createDiscountCodeInFirestore(discountData) {
  try {
    const docRef = doc(collection(db, 'discountCodes'));
    const discountCode = {
      id: docRef.id,
      ...discountData,
      timesRedeemed: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'admin-script'
    };
    await setDoc(docRef, discountCode);
    return docRef.id;
  } catch (error) {
    console.error('Error creating discount code in Firestore:', error);
    throw error;
  }
}

async function createTestCoupon() {
  console.log('🎫 Creating Test Pro Coupon');
  console.log('==========================\n');

  try {
    // Check if coupon already exists
    const exists = await checkIfCouponExists(TEST_COUPON_CONFIG.code);
    if (exists) {
      console.log(`⚠️  Coupon code "${TEST_COUPON_CONFIG.code}" already exists!`);
      console.log('   If you want to recreate it, please delete it first from the admin panel.');
      console.log('   Or update the existing coupon if needed.');
      return;
    }

    console.log('📋 Coupon Details:');
    console.log(`   Code: ${TEST_COUPON_CONFIG.code}`);
    console.log(`   Name: ${TEST_COUPON_CONFIG.name}`);
    console.log(`   Discount: ${TEST_COUPON_CONFIG.value}%`);
    console.log(`   Applies to: ${TEST_COUPON_CONFIG.planIds.join(', ')} plan(s)`);
    console.log(`   Max redemptions: ${TEST_COUPON_CONFIG.maxRedemptions}`);
    console.log(`   Valid until: ${new Date(TEST_COUPON_CONFIG.validUntil).toLocaleDateString()}`);
    console.log('');

    console.log('⚠️  IMPORTANT: This script only creates the Firestore record.');
    console.log('   You still need to create the Stripe coupon and promotion code.');
    console.log('   This can be done via:');
    console.log('   1. The Admin Discount Codes page in the web app (recommended)');
    console.log('   2. Or by calling the createStripeCoupon and createStripePromotionCode functions');
    console.log('');

    // Create the discount code record in Firestore
    console.log('📝 Creating discount code record in Firestore...');
    const discountCodeId = await createDiscountCodeInFirestore(TEST_COUPON_CONFIG);
    console.log(`   ✅ Discount code record created with ID: ${discountCodeId}`);
    console.log('');

    console.log('📝 Next Steps:');
    console.log('   1. Log in to the web app as an admin/god user');
    console.log('   2. Navigate to the Admin Discount Codes page');
    console.log('   3. Find the discount code you just created');
    console.log('   4. The system will automatically create the Stripe coupon and promotion code');
    console.log('      when you save/update the discount code');
    console.log('');
    console.log('   OR manually create via Stripe Dashboard:');
    console.log('   - Create a coupon with 100% discount');
    console.log('   - Create a promotion code with code: TESTPRO100');
    console.log('   - Update the Firestore record with the Stripe IDs');
    console.log('');

    console.log('✅ Test users can use coupon code: TESTPRO100');
    console.log('   when subscribing to the Pro plan to get 100% discount for testing.');

  } catch (error) {
    console.error('❌ Error creating test coupon:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  }
}

// Run the script
createTestCoupon()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

