// Comprehensive test for Stripe subscription flow and plan access
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';

// Firebase config - using environment variables for security
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDDdMvYxnBpCmlWW-I-S96lxWknJWDaV98",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "props-bible-app-1c1cb.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "props-bible-app-1c1cb",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "props-bible-app-1c1cb.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "162597141271",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:162597141271:web:4a8f66c0880f5106695552",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-L01PPH8D2Z"
};

// Test configuration
const TEST_USER = {
  email: `test-${Date.now()}@thepropslist.com`,
  password: 'TestPassword123!',
  displayName: 'Test User'
};

// Test configuration for Stripe price IDs
const TEST_PRICE_IDS = {
  starter: {
    monthly: process.env.TEST_STARTER_PRICE_ID_MONTHLY || 'price_1S978KIjHqAX3qiCDbwX5iKF',
    yearly: process.env.TEST_STARTER_PRICE_ID_YEARLY || ''
  },
  standard: {
    monthly: process.env.TEST_STANDARD_PRICE_ID_MONTHLY || 'price_1S979NIjHqAX3qiCRmX8KEg1',
    yearly: process.env.TEST_STANDARD_PRICE_ID_YEARLY || ''
  },
  pro: {
    monthly: process.env.TEST_PRO_PRICE_ID_MONTHLY || 'price_1S97CGIjHqAX3qiCWu2S5pfV',
    yearly: process.env.TEST_PRO_PRICE_ID_YEARLY || ''
  }
};

class SubscriptionTester {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.functions = getFunctions(this.app);
    this.auth = getAuth(this.app);
    this.user = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTests() {
    console.log('🧪 Starting Subscription Flow Tests...\n');
    
    const tests = [
      { name: 'User Authentication', fn: () => this.testUserAuthentication() },
      { name: 'Pricing Configuration', fn: () => this.testPricingConfiguration() },
      { name: 'Subscription Access', fn: () => this.testSubscriptionAccess() },
      { name: 'Checkout Session Creation', fn: () => this.testCheckoutSessionCreation() },
      { name: 'Billing Portal Access', fn: () => this.testBillingPortalAccess() }
    ];
    
    for (const test of tests) {
      try {
        await test.fn();
        this.testResults.passed++;
        console.log(`✅ ${test.name} test passed\n`);
      } catch (error) {
        this.testResults.failed++;
        this.testResults.errors.push({ test: test.name, error: error.message });
        console.error(`❌ ${test.name} test failed: ${error.message}\n`);
        
        // Continue with other tests unless it's a critical failure
        if (error.message.includes('No authenticated user') && test.name !== 'User Authentication') {
          console.log('⚠️  Skipping remaining tests due to authentication failure\n');
          break;
        }
        
        // If authentication fails, skip all subsequent tests
        if (test.name === 'User Authentication') {
          console.log('⚠️  Authentication failed - skipping all remaining tests\n');
          break;
        }
      }
    }
    
    await this.cleanup();
    this.printTestSummary();
  }

  async testPricingConfiguration() {
    console.log('📋 Testing Pricing Configuration...');
    
    try {
      // Ensure user is authenticated for this test
      if (!this.user) {
        throw new Error('No authenticated user - authentication test must run first');
      }
      
      // Verify current authentication state
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication state lost - user is not currently authenticated');
      }
      
      console.log(`  🔐 Using authenticated user: ${currentUser.email}`);
      
      const getPricingConfig = httpsCallable(this.functions, 'getPricingConfig');
      const result = await getPricingConfig();
      
      if (!result.data || !result.data.plans) {
        throw new Error('No pricing configuration received');
      }
      
      const config = result.data;
      console.log(`✅ Found ${config.plans.length} pricing plans`);
      
      // Check each plan
      config.plans.forEach(plan => {
        console.log(`  📦 ${plan.name} (${plan.id}):`);
        console.log(`    💰 Price: £${plan.price.monthly}/month, £${plan.price.yearly}/year`);
        console.log(`    🎯 Features: ${plan.features.length} features`);
        console.log(`    📊 Limits: ${plan.limits.shows} shows, ${plan.limits.boards} boards`);
        
        if (plan.id !== 'free') {
          const hasMonthlyPrice = plan.priceId?.monthly && plan.priceId.monthly.length > 0;
          const hasYearlyPrice = plan.priceId?.yearly && plan.priceId.yearly.length > 0;
          
          if (hasMonthlyPrice) {
            console.log(`    ✅ Monthly Price ID: ${plan.priceId.monthly}`);
          } else {
            console.log(`    ⚠️  Monthly Price ID: MISSING`);
          }
          
          if (hasYearlyPrice) {
            console.log(`    ✅ Yearly Price ID: ${plan.priceId.yearly}`);
          } else {
            console.log(`    ⚠️  Yearly Price ID: MISSING`);
          }
        }
      });
      
      // Check if we have at least one paid plan with price IDs
      const paidPlansWithPrices = config.plans.filter(plan => 
        plan.id !== 'free' && 
        (plan.priceId?.monthly || plan.priceId?.yearly)
      );
      
      if (paidPlansWithPrices.length === 0) {
        throw new Error('No paid plans have price IDs configured');
      }
      
      console.log(`✅ ${paidPlansWithPrices.length} paid plans have price IDs configured`);
      
    } catch (error) {
      if (error.code === 'functions/permission-denied') {
        throw new Error('Permission denied: getPricingConfig function may require authentication');
      } else if (error.code === 'functions/not-found') {
        throw new Error('getPricingConfig function not found: ensure functions are deployed');
      } else if (error.code === 'functions/unavailable') {
        throw new Error('Functions service unavailable: check Firebase project status');
      } else {
        throw new Error(`Pricing configuration test failed: ${error.message}`);
      }
    }
  }

  async testUserAuthentication() {
    console.log('\n🔐 Testing User Authentication...');
    
    try {
      // Create test user
      console.log('  Creating test user...');
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        TEST_USER.email, 
        TEST_USER.password
      );
      
      this.user = userCredential.user;
      console.log(`  ✅ User created: ${this.user.email}`);
      
      // Test sign out and sign back in to verify authentication flow
      await signOut(this.auth);
      console.log('  ✅ User signed out');
      
      const signInCredential = await signInWithEmailAndPassword(
        this.auth,
        TEST_USER.email,
        TEST_USER.password
      );
      
      this.user = signInCredential.user;
      console.log(`  ✅ User signed in: ${this.user.email}`);
      
      // Wait a moment for authentication state to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('  ✅ Authentication state propagated');
      
      // Keep user authenticated for subsequent tests
      console.log('  ✅ User will remain authenticated for remaining tests');
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Test email already exists: try running test again');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Test password is too weak: update TEST_USER password');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid test email format: check TEST_USER configuration');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/password authentication not enabled in Firebase console');
      } else {
        throw new Error(`User authentication test failed: ${error.message}`);
      }
    }
  }

  async testSubscriptionAccess() {
    console.log('\n📊 Testing Subscription Access...');
    
    try {
      if (!this.user) {
        throw new Error('No authenticated user');
      }
      
      // Verify current authentication state
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication state lost - user is not currently authenticated');
      }
      
      console.log(`  🔐 Using authenticated user: ${currentUser.email}`);
      
      // Test getting subscription stats (should work for any user)
      const getSubscriptionStats = httpsCallable(this.functions, 'getSubscriptionStats');
      const statsResult = await getSubscriptionStats();
      
      console.log('  ✅ Subscription stats accessible');
      console.log(`  📈 Stats data:`, statsResult.data);
      
    } catch (error) {
      if (error.code === 'functions/permission-denied') {
        throw new Error('Permission denied: getSubscriptionStats may require admin privileges');
      } else if (error.code === 'functions/not-found') {
        throw new Error('getSubscriptionStats function not found: ensure functions are deployed');
      } else {
        throw new Error(`Subscription access test failed: ${error.message}`);
      }
    }
  }

  async testCheckoutSessionCreation() {
    console.log('\n💳 Testing Checkout Session Creation...');
    
    try {
      if (!this.user) {
        throw new Error('No authenticated user');
      }
      
      // Test creating checkout session for starter plan
      const createCheckoutSession = httpsCallable(this.functions, 'createCheckoutSession');
      
      const checkoutData = {
        priceId: TEST_PRICE_IDS.starter.monthly,
        planId: 'starter',
        billingInterval: 'monthly'
      };
      
      console.log('  Creating checkout session for Starter plan...');
      const checkoutResult = await createCheckoutSession(checkoutData);
      
      if (!checkoutResult.data || !checkoutResult.data.url) {
        throw new Error('No checkout URL received');
      }
      
      console.log('  ✅ Checkout session created successfully');
      console.log(`  🔗 Checkout URL: ${checkoutResult.data.url}`);
      
      // Test with discount code
      console.log('  Testing checkout with discount code...');
      const checkoutWithDiscount = await createCheckoutSession({
        ...checkoutData,
        discountCode: 'TEST10'
      });
      
      if (checkoutWithDiscount.data && checkoutWithDiscount.data.url) {
        console.log('  ✅ Checkout with discount code works');
      } else {
        console.log('  ⚠️  Discount code may not be configured');
      }
      
    } catch (error) {
      if (error.code === 'functions/permission-denied') {
        throw new Error('Permission denied: createCheckoutSession requires authentication');
      } else if (error.code === 'functions/invalid-argument') {
        throw new Error('Invalid arguments: check price ID and plan configuration');
      } else if (error.message.includes('Price ID not configured')) {
        throw new Error('Stripe price ID not configured: check Firebase functions config');
      } else if (error.message.includes('Plan not found')) {
        throw new Error('Subscription plan not found: check pricing configuration');
      } else {
        throw new Error(`Checkout session creation test failed: ${error.message}`);
      }
    }
  }

  async testBillingPortalAccess() {
    console.log('\n🏦 Testing Billing Portal Access...');
    
    try {
      if (!this.user) {
        throw new Error('No authenticated user');
      }
      
      const createBillingPortalSession = httpsCallable(this.functions, 'createBillingPortalSession');
      
      console.log('  Creating billing portal session...');
      const portalResult = await createBillingPortalSession({});
      
      if (!portalResult.data || !portalResult.data.url) {
        throw new Error('No billing portal URL received');
      }
      
      console.log('  ✅ Billing portal session created successfully');
      console.log(`  🔗 Portal URL: ${portalResult.data.url}`);
      
    } catch (error) {
      if (error.code === 'functions/permission-denied') {
        throw new Error('Permission denied: createBillingPortalSession requires authentication');
      } else if (error.code === 'functions/not-found') {
        throw new Error('createBillingPortalSession function not found: ensure functions are deployed');
      } else if (error.message.includes('No billing portal URL')) {
        throw new Error('Billing portal configuration issue: check Stripe setup');
      } else {
        throw new Error(`Billing portal access test failed: ${error.message}`);
      }
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test user...');
    
    try {
      if (this.user) {
        // Delete the test user to prevent database pollution
        try {
          await deleteUser(this.user);
          console.log('  ✅ Test user deleted successfully');
        } catch (deleteError) {
          console.log('  ⚠️  Could not delete user (may require recent authentication)');
          console.log('  ℹ️  User will remain in database for manual cleanup');
        }
        
        // Sign out regardless
        await signOut(this.auth);
        console.log('  ✅ User signed out');
      }
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  }

  printTestSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Passed: ${this.testResults.passed}`);
    console.log(`  ❌ Failed: ${this.testResults.failed}`);
    console.log(`  📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(({ test, error }) => {
        console.log(`  • ${test}: ${error}`);
      });
    }
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Subscription flow is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Run the tests
async function runSubscriptionTests() {
  const tester = new SubscriptionTester();
  await tester.runTests();
}

// Execute tests
runSubscriptionTests().catch(console.error);
