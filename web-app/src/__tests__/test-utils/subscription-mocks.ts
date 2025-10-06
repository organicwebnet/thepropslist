import { SubscriptionInfo, PlanKey } from '../../hooks/useSubscription';
import { UserAddOn } from '../../types/AddOns';

/**
 * Test utilities for mocking subscription data
 */

export const MOCK_PLANS = {
  FREE: {
    plan: 'free' as PlanKey,
    status: 'active',
    limits: {
      shows: 1,
      boards: 2,
      packingBoxes: 20,
      collaboratorsPerShow: 3,
      props: 10,
      archivedShows: 0
    },
    perShowLimits: {
      boards: 2,
      packingBoxes: 20,
      collaborators: 3,
      props: 10
    },
    effectiveLimits: {
      shows: 1,
      boards: 2,
      packingBoxes: 20,
      collaboratorsPerShow: 3,
      props: 10,
      archivedShows: 0
    },
    userAddOns: [],
    canPurchaseAddOns: false
  },
  
  STARTER: {
    plan: 'starter' as PlanKey,
    status: 'active',
    limits: {
      shows: 3,
      boards: 5,
      packingBoxes: 50,
      collaboratorsPerShow: 5,
      props: 50,
      archivedShows: 1
    },
    perShowLimits: {
      boards: 3,
      packingBoxes: 30,
      collaborators: 5,
      props: 25
    },
    effectiveLimits: {
      shows: 3,
      boards: 5,
      packingBoxes: 50,
      collaboratorsPerShow: 5,
      props: 50,
      archivedShows: 1
    },
    userAddOns: [],
    canPurchaseAddOns: false
  },
  
  STANDARD: {
    plan: 'standard' as PlanKey,
    status: 'active',
    limits: {
      shows: 10,
      boards: 20,
      packingBoxes: 200,
      collaboratorsPerShow: 10,
      props: 500,
      archivedShows: 5
    },
    perShowLimits: {
      boards: 10,
      packingBoxes: 100,
      collaborators: 10,
      props: 100
    },
    effectiveLimits: {
      shows: 10,
      boards: 20,
      packingBoxes: 200,
      collaboratorsPerShow: 10,
      props: 500,
      archivedShows: 5
    },
    userAddOns: [],
    canPurchaseAddOns: true
  },
  
  PRO: {
    plan: 'pro' as PlanKey,
    status: 'active',
    limits: {
      shows: 50,
      boards: 100,
      packingBoxes: 1000,
      collaboratorsPerShow: 25,
      props: 2000,
      archivedShows: 25
    },
    perShowLimits: {
      boards: 25,
      packingBoxes: 200,
      collaborators: 25,
      props: 200
    },
    effectiveLimits: {
      shows: 50,
      boards: 100,
      packingBoxes: 1000,
      collaboratorsPerShow: 25,
      props: 2000,
      archivedShows: 25
    },
    userAddOns: [],
    canPurchaseAddOns: true
  },
  
  GOD: {
    plan: 'pro' as PlanKey,
    status: 'exempt',
    limits: {
      shows: 999999,
      boards: 999999,
      packingBoxes: 999999,
      collaboratorsPerShow: 999999,
      props: 999999,
      archivedShows: 999999
    },
    perShowLimits: {
      boards: 999999,
      packingBoxes: 999999,
      collaborators: 999999,
      props: 999999
    },
    effectiveLimits: {
      shows: 999999,
      boards: 999999,
      packingBoxes: 999999,
      collaboratorsPerShow: 999999,
      props: 999999,
      archivedShows: 999999
    },
    userAddOns: [],
    canPurchaseAddOns: true
  }
};

export const MOCK_ADDONS: UserAddOn[] = [
  {
    id: 'addon1',
    userId: 'user123',
    addOnId: 'shows_5',
    quantity: 1,
    status: 'active',
    billingInterval: 'monthly',
    stripeSubscriptionItemId: 'si_123',
    createdAt: new Date()
  },
  {
    id: 'addon2',
    userId: 'user123',
    addOnId: 'shows_10',
    quantity: 1,
    status: 'active',
    billingInterval: 'yearly',
    stripeSubscriptionItemId: 'si_456',
    createdAt: new Date()
  },
  {
    id: 'addon3',
    userId: 'user123',
    addOnId: 'props_100',
    quantity: 1,
    status: 'active',
    billingInterval: 'monthly',
    stripeSubscriptionItemId: 'si_789',
    createdAt: new Date()
  },
  {
    id: 'addon4',
    userId: 'user123',
    addOnId: 'props_500',
    quantity: 1,
    status: 'active',
    billingInterval: 'yearly',
    stripeSubscriptionItemId: 'si_101',
    createdAt: new Date()
  },
  {
    id: 'addon5',
    userId: 'user123',
    addOnId: 'packing_100',
    quantity: 1,
    status: 'active',
    billingInterval: 'monthly',
    stripeSubscriptionItemId: 'si_102',
    createdAt: new Date()
  },
  {
    id: 'addon6',
    userId: 'user123',
    addOnId: 'archived_5',
    quantity: 1,
    status: 'active',
    billingInterval: 'yearly',
    stripeSubscriptionItemId: 'si_103',
    createdAt: new Date()
  }
];

export const MOCK_CANCELLED_ADDONS: UserAddOn[] = [
  {
    id: 'addon1',
    userId: 'user123',
    addOnId: 'shows_5',
    quantity: 1,
    status: 'cancelled',
    billingInterval: 'monthly',
    stripeSubscriptionItemId: 'si_123',
    createdAt: new Date(),
    cancelledAt: new Date()
  },
  {
    id: 'addon2',
    userId: 'user123',
    addOnId: 'props_100',
    quantity: 1,
    status: 'expired',
    billingInterval: 'monthly',
    stripeSubscriptionItemId: 'si_456',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() - 86400000) // Yesterday
  }
];

/**
 * Create a subscription info with addons
 */
export function createSubscriptionWithAddons(
  basePlan: SubscriptionInfo,
  addons: UserAddOn[] = []
): SubscriptionInfo {
  return {
    ...basePlan,
    userAddOns: addons,
    effectiveLimits: {
      ...basePlan.effectiveLimits,
      // This would normally be calculated by calculateAddOnLimits
      // For testing, we'll manually set the expected values
      shows: basePlan.limits.shows + addons
        .filter(a => a.status === 'active' && a.addOnId.startsWith('shows_'))
        .reduce((sum, a) => {
          const addon = a.addOnId === 'shows_5' ? 5 : a.addOnId === 'shows_10' ? 10 : a.addOnId === 'shows_25' ? 25 : 0;
          return sum + addon;
        }, 0),
      props: basePlan.limits.props + addons
        .filter(a => a.status === 'active' && a.addOnId.startsWith('props_'))
        .reduce((sum, a) => {
          const addon = a.addOnId === 'props_100' ? 100 : a.addOnId === 'props_500' ? 500 : a.addOnId === 'props_1000' ? 1000 : 0;
          return sum + addon;
        }, 0),
      packingBoxes: basePlan.limits.packingBoxes + addons
        .filter(a => a.status === 'active' && a.addOnId.startsWith('packing_'))
        .reduce((sum, a) => {
          const addon = a.addOnId === 'packing_100' ? 100 : a.addOnId === 'packing_500' ? 500 : a.addOnId === 'packing_1000' ? 1000 : 0;
          return sum + addon;
        }, 0),
      archivedShows: basePlan.limits.archivedShows + addons
        .filter(a => a.status === 'active' && a.addOnId.startsWith('archived_'))
        .reduce((sum, a) => {
          const addon = a.addOnId === 'archived_5' ? 5 : a.addOnId === 'archived_10' ? 10 : a.addOnId === 'archived_25' ? 25 : 0;
          return sum + addon;
        }, 0)
    }
  };
}

/**
 * Create mock data for testing limit enforcement
 */
export function createMockDataAtLimit(limit: number, type: 'shows' | 'props' | 'boards' | 'packingBoxes' | 'collaborators' | 'archivedShows') {
  const data = Array(limit).fill(null).map((_, i) => ({
    id: `${type}${i}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
    userId: 'test-user',
    showId: 'show1',
    data: {}
  }));

  return data;
}

/**
 * Create mock data approaching limit (limit - 1)
 */
export function createMockDataApproachingLimit(limit: number, type: 'shows' | 'props' | 'boards' | 'packingBoxes' | 'collaborators' | 'archivedShows') {
  return createMockDataAtLimit(limit - 1, type);
}

/**
 * Create mock data within limit (limit - 2)
 */
export function createMockDataWithinLimit(limit: number, type: 'shows' | 'props' | 'boards' | 'packingBoxes' | 'collaborators' | 'archivedShows') {
  return createMockDataAtLimit(Math.max(0, limit - 2), type);
}

/**
 * Test scenarios for different subscription states
 */
export const TEST_SCENARIOS = {
  FREE_AT_LIMIT: {
    subscription: MOCK_PLANS.FREE,
    mockData: {
      shows: createMockDataAtLimit(1, 'shows'),
      props: createMockDataAtLimit(10, 'props'),
      boards: createMockDataAtLimit(2, 'boards')
    }
  },
  
  FREE_APPROACHING_LIMIT: {
    subscription: MOCK_PLANS.FREE,
    mockData: {
      shows: createMockDataApproachingLimit(1, 'shows'),
      props: createMockDataApproachingLimit(10, 'props'),
      boards: createMockDataApproachingLimit(2, 'boards')
    }
  },
  
  STANDARD_WITH_ADDONS: {
    subscription: createSubscriptionWithAddons(MOCK_PLANS.STANDARD, MOCK_ADDONS),
    mockData: {
      shows: createMockDataAtLimit(25, 'shows'), // 10 + 15 from addons
      props: createMockDataAtLimit(1100, 'props'), // 500 + 600 from addons
      boards: createMockDataAtLimit(20, 'boards') // No addons for boards
    }
  },
  
  STANDARD_WITH_CANCELLED_ADDONS: {
    subscription: createSubscriptionWithAddons(MOCK_PLANS.STANDARD, MOCK_CANCELLED_ADDONS),
    mockData: {
      shows: createMockDataAtLimit(10, 'shows'), // Base limit only
      props: createMockDataAtLimit(500, 'props'), // Base limit only
      boards: createMockDataAtLimit(20, 'boards')
    }
  },
  
  PRO_WITHIN_LIMITS: {
    subscription: MOCK_PLANS.PRO,
    mockData: {
      shows: createMockDataWithinLimit(50, 'shows'),
      props: createMockDataWithinLimit(2000, 'props'),
      boards: createMockDataWithinLimit(100, 'boards')
    }
  },
  
  GOD_UNLIMITED: {
    subscription: MOCK_PLANS.GOD,
    mockData: {
      shows: createMockDataAtLimit(1000, 'shows'), // Large number but within god limits
      props: createMockDataAtLimit(5000, 'props'),
      boards: createMockDataAtLimit(500, 'boards')
    }
  }
};

/**
 * Helper to set up browser localStorage with mock data
 */
export function setupBrowserMocks(page: any, scenario: keyof typeof TEST_SCENARIOS) {
  const testScenario = TEST_SCENARIOS[scenario];
  
  return page.evaluate((data: any) => {
    window.localStorage.setItem('mock-subscription', JSON.stringify(data.subscription));
    window.localStorage.setItem('mock-shows', JSON.stringify(data.mockData.shows || []));
    window.localStorage.setItem('mock-props', JSON.stringify(data.mockData.props || []));
    window.localStorage.setItem('mock-boards', JSON.stringify(data.mockData.boards || []));
    window.localStorage.setItem('mock-packing-boxes', JSON.stringify(data.mockData.packingBoxes || []));
    window.localStorage.setItem('mock-collaborators', JSON.stringify(data.mockData.collaborators || []));
    window.localStorage.setItem('mock-archived-shows', JSON.stringify(data.mockData.archivedShows || []));
  }, testScenario);
}

/**
 * Helper to create mock Firebase service responses
 */
export function createMockFirebaseService(mockData: any) {
  return {
    getDocuments: vi.fn().mockImplementation((collection: string) => {
      switch (collection) {
        case 'shows':
          return Promise.resolve(mockData.shows || []);
        case 'props':
          return Promise.resolve(mockData.props || []);
        case 'todo_boards':
          return Promise.resolve(mockData.boards || []);
        case 'packing_lists':
          return Promise.resolve(mockData.packingBoxes || []);
        case 'collaborators':
          return Promise.resolve(mockData.collaborators || []);
        case 'show_archives':
          return Promise.resolve(mockData.archivedShows || []);
        default:
          return Promise.resolve([]);
      }
    }),
    addDocument: vi.fn().mockResolvedValue('new-doc-id'),
    updateDocument: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined)
  };
}

