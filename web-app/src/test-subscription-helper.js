// Test Subscription Helper
// This script can be injected into the browser console to test subscription features

window.testSubscription = {
  // Mock different subscription plans
  mockFreePlan: () => {
    localStorage.setItem('test-subscription', JSON.stringify({
      plan: 'free',
      status: 'active',
      limits: {
        shows: 1,
        boards: 2,
        packingBoxes: 20,
        collaboratorsPerShow: 3,
        props: 10,
        archivedShows: 0
      },
      effectiveLimits: {
        shows: 1,
        boards: 2,
        packingBoxes: 20,
        collaboratorsPerShow: 3,
        props: 10,
        archivedShows: 0
      },
      canPurchaseAddOns: false
    }));
    console.log('✅ Mocked FREE plan subscription');
  },

  mockStandardPlan: () => {
    localStorage.setItem('test-subscription', JSON.stringify({
      plan: 'standard',
      status: 'active',
      limits: {
        shows: 10,
        boards: 20,
        packingBoxes: 200,
        collaboratorsPerShow: 10,
        props: 500,
        archivedShows: 5
      },
      effectiveLimits: {
        shows: 10,
        boards: 20,
        packingBoxes: 200,
        collaboratorsPerShow: 10,
        props: 500,
        archivedShows: 5
      },
      canPurchaseAddOns: true
    }));
    console.log('✅ Mocked STANDARD plan subscription');
  },

  mockProPlan: () => {
    localStorage.setItem('test-subscription', JSON.stringify({
      plan: 'pro',
      status: 'active',
      limits: {
        shows: 50,
        boards: 100,
        packingBoxes: 1000,
        collaboratorsPerShow: 25,
        props: 2000,
        archivedShows: 25
      },
      effectiveLimits: {
        shows: 50,
        boards: 100,
        packingBoxes: 1000,
        collaboratorsPerShow: 25,
        props: 2000,
        archivedShows: 25
      },
      canPurchaseAddOns: true
    }));
    console.log('✅ Mocked PRO plan subscription');
  },

  mockGodPlan: () => {
    localStorage.setItem('test-subscription', JSON.stringify({
      plan: 'pro',
      status: 'exempt',
      limits: {
        shows: 999999,
        boards: 999999,
        packingBoxes: 999999,
        collaboratorsPerShow: 999999,
        props: 999999,
        archivedShows: 999999
      },
      effectiveLimits: {
        shows: 999999,
        boards: 999999,
        packingBoxes: 999999,
        collaboratorsPerShow: 999999,
        props: 999999,
        archivedShows: 999999
      },
      canPurchaseAddOns: true
    }));
    console.log('✅ Mocked GOD plan subscription');
  },

  // Mock user data
  mockUser: () => {
    localStorage.setItem('test-user', JSON.stringify({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'user'
    }));
    console.log('✅ Mocked test user');
  },

  mockGodUser: () => {
    localStorage.setItem('test-user', JSON.stringify({
      uid: 'god-user-123',
      email: 'god@example.com',
      displayName: 'God User',
      role: 'god'
    }));
    console.log('✅ Mocked GOD user');
  },

  // Mock data at limits
  mockDataAtLimit: (type, limit) => {
    const data = Array(limit).fill(null).map((_, i) => ({
      id: `${type}${i}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
      userId: 'test-user-123',
      showId: 'show1',
      data: {}
    }));
    localStorage.setItem(`test-${type}`, JSON.stringify(data));
    console.log(`✅ Mocked ${limit} ${type} (at limit)`);
  },

  // Mock data approaching limit
  mockDataApproachingLimit: (type, limit) => {
    const approachingLimit = Math.floor(limit * 0.8);
    const data = Array(approachingLimit).fill(null).map((_, i) => ({
      id: `${type}${i}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
      userId: 'test-user-123',
      showId: 'show1',
      data: {}
    }));
    localStorage.setItem(`test-${type}`, JSON.stringify(data));
    console.log(`✅ Mocked ${approachingLimit} ${type} (approaching limit)`);
  },

  // Clear all test data
  clearAll: () => {
    localStorage.removeItem('test-subscription');
    localStorage.removeItem('test-user');
    localStorage.removeItem('test-shows');
    localStorage.removeItem('test-props');
    localStorage.removeItem('test-boards');
    localStorage.removeItem('test-packingBoxes');
    localStorage.removeItem('test-collaborators');
    localStorage.removeItem('test-archivedShows');
    console.log('✅ Cleared all test data');
  },

  // Show current test data
  showCurrent: () => {
    const subscription = localStorage.getItem('test-subscription');
    const user = localStorage.getItem('test-user');
    console.log('📊 Current Test Data:');
    console.log('User:', user ? JSON.parse(user) : 'None');
    console.log('Subscription:', subscription ? JSON.parse(subscription) : 'None');
    
    // Show data counts
    ['shows', 'props', 'boards', 'packingBoxes', 'collaborators', 'archivedShows'].forEach(type => {
      const data = localStorage.getItem(`test-${type}`);
      if (data) {
        const count = JSON.parse(data).length;
        console.log(`${type}: ${count} items`);
      }
    });
  },

  // Test scenarios
  testFreeAtLimit: () => {
    window.testSubscription.clearAll();
    window.testSubscription.mockUser();
    window.testSubscription.mockFreePlan();
    window.testSubscription.mockDataAtLimit('shows', 1);
    window.testSubscription.mockDataAtLimit('props', 10);
    window.testSubscription.mockDataAtLimit('boards', 2);
    console.log('🎯 Set up FREE plan at limits scenario');
  },

  testStandardWithAddons: () => {
    window.testSubscription.clearAll();
    window.testSubscription.mockUser();
    window.testSubscription.mockStandardPlan();
    window.testSubscription.mockDataAtLimit('shows', 25); // 10 + 15 from addons
    window.testSubscription.mockDataAtLimit('props', 1100); // 500 + 600 from addons
    console.log('🎯 Set up STANDARD plan with addons scenario');
  },

  testProWithinLimits: () => {
    window.testSubscription.clearAll();
    window.testSubscription.mockUser();
    window.testSubscription.mockProPlan();
    window.testSubscription.mockDataApproachingLimit('shows', 50);
    window.testSubscription.mockDataApproachingLimit('props', 2000);
    console.log('🎯 Set up PRO plan within limits scenario');
  },

  testGodUnlimited: () => {
    window.testSubscription.clearAll();
    window.testSubscription.mockGodUser();
    window.testSubscription.mockGodPlan();
    window.testSubscription.mockDataAtLimit('shows', 1000);
    window.testSubscription.mockDataAtLimit('props', 5000);
    console.log('🎯 Set up GOD plan unlimited scenario');
  }
};

console.log('🚀 Test Subscription Helper loaded!');
console.log('Available commands:');
console.log('- testSubscription.testFreeAtLimit()');
console.log('- testSubscription.testStandardWithAddons()');
console.log('- testSubscription.testProWithinLimits()');
console.log('- testSubscription.testGodUnlimited()');
console.log('- testSubscription.showCurrent()');
console.log('- testSubscription.clearAll()');

