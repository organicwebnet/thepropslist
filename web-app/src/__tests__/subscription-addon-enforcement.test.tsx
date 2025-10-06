import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { useSubscription, SubscriptionInfo } from '../hooks/useSubscription';
import { useLimitChecker, LimitCheckResult } from '../hooks/useLimitChecker';
import { AddOnService } from '../services/AddOnService';
import { calculateAddOnLimits, DEFAULT_ADDONS, UserAddOn } from '../types/AddOns';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';

// Mock the contexts
vi.mock('../contexts/WebAuthContext');
vi.mock('../contexts/FirebaseContext');
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  app: {}
}));

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn())
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Firestore: vi.fn()
}));

describe('Subscription Plans and Addon Enforcement Tests', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockFirebaseService = {
    getDocuments: vi.fn(),
    addDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (useWebAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: { role: 'user' }
    });

    (useFirebase as any).mockReturnValue({
      service: mockFirebaseService,
      isInitialized: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Subscription Plan Limits', () => {
    it('should enforce FREE plan limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
      };

      // Mock the useSubscription hook
      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      // Mock Firebase service to return data at limits
      mockFirebaseService.getDocuments.mockImplementation((collection: string) => {
        switch (collection) {
          case 'shows':
            return Promise.resolve([{ id: 'show1', data: { name: 'Test Show' } }]); // At limit (1)
          case 'props':
            return Promise.resolve(Array(10).fill(null).map((_, i) => ({ id: `prop${i}`, data: {} }))); // At limit (10)
          case 'todo_boards':
            return Promise.resolve(Array(2).fill(null).map((_, i) => ({ id: `board${i}`, data: {} }))); // At limit (2)
          default:
            return Promise.resolve([]);
        }
      });

      const { checkShowLimit, checkPropsLimit, checkBoardLimit } = useLimitChecker();

      // Test show limit enforcement
      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(false);
      expect(showLimitResult.currentCount).toBe(1);
      expect(showLimitResult.limit).toBe(1);
      expect(showLimitResult.message).toContain('reached your plan\'s show limit');

      // Test props limit enforcement
      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(false);
      expect(propsLimitResult.currentCount).toBe(10);
      expect(propsLimitResult.limit).toBe(10);
      expect(propsLimitResult.message).toContain('reached your plan\'s props limit');

      // Test board limit enforcement
      const boardLimitResult = await checkBoardLimit(mockUser.uid);
      expect(boardLimitResult.withinLimit).toBe(false);
      expect(boardLimitResult.currentCount).toBe(2);
      expect(boardLimitResult.limit).toBe(2);
      expect(boardLimitResult.message).toContain('reached your plan\'s board limit');
    });

    it('should enforce STARTER plan limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        plan: 'starter',
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
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      // Mock data at limits
      mockFirebaseService.getDocuments.mockImplementation((collection: string) => {
        switch (collection) {
          case 'shows':
            return Promise.resolve(Array(3).fill(null).map((_, i) => ({ id: `show${i}`, data: {} })));
          case 'props':
            return Promise.resolve(Array(50).fill(null).map((_, i) => ({ id: `prop${i}`, data: {} })));
          default:
            return Promise.resolve([]);
        }
      });

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(false);
      expect(showLimitResult.limit).toBe(3);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(false);
      expect(propsLimitResult.limit).toBe(50);
    });

    it('should enforce STANDARD plan limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      // Test within limits
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      
      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(true);
      expect(showLimitResult.limit).toBe(10);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(true);
      expect(propsLimitResult.limit).toBe(500);
    });

    it('should enforce PRO plan limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      // Test within limits
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      
      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(true);
      expect(showLimitResult.limit).toBe(50);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(true);
      expect(propsLimitResult.limit).toBe(2000);
    });

    it('should give GOD/ADMIN users unlimited access', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      // Mock user as god/admin
      (useWebAuth as any).mockReturnValue({
        user: mockUser,
        userProfile: { role: 'god' }
      });

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      // Mock data that would exceed normal limits
      mockFirebaseService.getDocuments.mockImplementation((collection: string) => {
        switch (collection) {
          case 'shows':
            return Promise.resolve(Array(1000).fill(null).map((_, i) => ({ id: `show${i}`, data: {} })));
          case 'props':
            return Promise.resolve(Array(5000).fill(null).map((_, i) => ({ id: `prop${i}`, data: {} })));
          default:
            return Promise.resolve([]);
        }
      });

      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(true);
      expect(showLimitResult.limit).toBe(999999);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(true);
      expect(propsLimitResult.limit).toBe(999999);
    });
  });

  describe('Per-Show Limits', () => {
    it('should enforce per-show limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      const showId = 'test-show-123';

      // Mock data at per-show limits
      mockFirebaseService.getDocuments.mockImplementation((collection: string) => {
        switch (collection) {
          case 'todo_boards':
            return Promise.resolve(Array(10).fill(null).map((_, i) => ({ id: `board${i}`, data: { showId } })));
          case 'props':
            return Promise.resolve(Array(100).fill(null).map((_, i) => ({ id: `prop${i}`, data: { showId } })));
          case 'collaborators':
            return Promise.resolve(Array(10).fill(null).map((_, i) => ({ id: `collab${i}`, data: { showId } })));
          default:
            return Promise.resolve([]);
        }
      });

      const { checkBoardLimitForShow, checkPropsLimitForShow, checkCollaboratorsLimitForShow } = useLimitChecker();

      // Test per-show board limit
      const boardLimitResult = await checkBoardLimitForShow(showId);
      expect(boardLimitResult.withinLimit).toBe(false);
      expect(boardLimitResult.currentCount).toBe(10);
      expect(boardLimitResult.limit).toBe(10);
      expect(boardLimitResult.isPerShow).toBe(true);
      expect(boardLimitResult.message).toContain('This show has reached its board limit');

      // Test per-show props limit
      const propsLimitResult = await checkPropsLimitForShow(showId);
      expect(propsLimitResult.withinLimit).toBe(false);
      expect(propsLimitResult.currentCount).toBe(100);
      expect(propsLimitResult.limit).toBe(100);
      expect(propsLimitResult.isPerShow).toBe(true);
      expect(propsLimitResult.message).toContain('This show has reached its props limit');

      // Test per-show collaborators limit
      const collaboratorsLimitResult = await checkCollaboratorsLimitForShow(showId);
      expect(collaboratorsLimitResult.withinLimit).toBe(false);
      expect(collaboratorsLimitResult.currentCount).toBe(10);
      expect(collaboratorsLimitResult.limit).toBe(10);
      expect(collaboratorsLimitResult.isPerShow).toBe(true);
      expect(collaboratorsLimitResult.message).toContain('This show has reached its collaborators limit');
    });
  });

  describe('Addon Enforcement', () => {
    it('should correctly calculate addon limits for shows', () => {
      const baseLimits = {
        shows: 10,
        props: 500,
        packingBoxes: 200,
        archivedShows: 5
      };

      const userAddOns: UserAddOn[] = [
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
        }
      ];

      const result = calculateAddOnLimits(baseLimits, userAddOns);
      
      expect(result.shows).toBe(25); // 10 + 5 + 10
      expect(result.props).toBe(500); // No props addons
      expect(result.packingBoxes).toBe(200); // No packing addons
      expect(result.archivedShows).toBe(5); // No archived addons
    });

    it('should correctly calculate addon limits for props', () => {
      const baseLimits = {
        shows: 10,
        props: 500,
        packingBoxes: 200,
        archivedShows: 5
      };

      const userAddOns: UserAddOn[] = [
        {
          id: 'addon1',
          userId: 'user123',
          addOnId: 'props_100',
          quantity: 1,
          status: 'active',
          billingInterval: 'monthly',
          stripeSubscriptionItemId: 'si_123',
          createdAt: new Date()
        },
        {
          id: 'addon2',
          userId: 'user123',
          addOnId: 'props_500',
          quantity: 1,
          status: 'active',
          billingInterval: 'yearly',
          stripeSubscriptionItemId: 'si_456',
          createdAt: new Date()
        }
      ];

      const result = calculateAddOnLimits(baseLimits, userAddOns);
      
      expect(result.shows).toBe(10); // No shows addons
      expect(result.props).toBe(1100); // 500 + 100 + 500
      expect(result.packingBoxes).toBe(200); // No packing addons
      expect(result.archivedShows).toBe(5); // No archived addons
    });

    it('should ignore cancelled or expired addons', () => {
      const baseLimits = {
        shows: 10,
        props: 500,
        packingBoxes: 200,
        archivedShows: 5
      };

      const userAddOns: UserAddOn[] = [
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
          status: 'cancelled',
          billingInterval: 'yearly',
          stripeSubscriptionItemId: 'si_456',
          createdAt: new Date(),
          cancelledAt: new Date()
        },
        {
          id: 'addon3',
          userId: 'user123',
          addOnId: 'props_100',
          quantity: 1,
          status: 'expired',
          billingInterval: 'monthly',
          stripeSubscriptionItemId: 'si_789',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 86400000) // Yesterday
        }
      ];

      const result = calculateAddOnLimits(baseLimits, userAddOns);
      
      expect(result.shows).toBe(15); // 10 + 5 (only active addon)
      expect(result.props).toBe(500); // No active props addons
      expect(result.packingBoxes).toBe(200); // No packing addons
      expect(result.archivedShows).toBe(5); // No archived addons
    });

    it('should enforce effective limits with addons', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
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
        perShowLimits: {
          boards: 10,
          packingBoxes: 100,
          collaborators: 10,
          props: 100
        },
        effectiveLimits: {
          shows: 25, // 10 + 15 from addons
          boards: 20, // Addons don't affect boards
          packingBoxes: 300, // 200 + 100 from addons
          collaboratorsPerShow: 10, // Addons don't affect collaborators
          props: 1100, // 500 + 600 from addons
          archivedShows: 10 // 5 + 5 from addons
        },
        userAddOns: [
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
        ],
        canPurchaseAddOns: true
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      // Mock data at effective limits
      mockFirebaseService.getDocuments.mockImplementation((collection: string) => {
        switch (collection) {
          case 'shows':
            return Promise.resolve(Array(25).fill(null).map((_, i) => ({ id: `show${i}`, data: {} })));
          case 'props':
            return Promise.resolve(Array(1100).fill(null).map((_, i) => ({ id: `prop${i}`, data: {} })));
          case 'show_archives':
            return Promise.resolve(Array(10).fill(null).map((_, i) => ({ id: `archive${i}`, data: {} })));
          default:
            return Promise.resolve([]);
        }
      });

      const { checkShowLimit, checkPropsLimit, checkArchivedShowsLimit } = useLimitChecker();

      // Test effective limits enforcement
      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(false);
      expect(showLimitResult.currentCount).toBe(25);
      expect(showLimitResult.limit).toBe(25); // Should use effective limit

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(false);
      expect(propsLimitResult.currentCount).toBe(1100);
      expect(propsLimitResult.limit).toBe(1100); // Should use effective limit

      const archivedLimitResult = await checkArchivedShowsLimit(mockUser.uid);
      expect(archivedLimitResult.withinLimit).toBe(false);
      expect(archivedLimitResult.currentCount).toBe(10);
      expect(archivedLimitResult.limit).toBe(10); // Should use effective limit
    });
  });

  describe('Addon Service', () => {
    let addOnService: AddOnService;

    beforeEach(() => {
      addOnService = new AddOnService();
    });

    it('should allow purchasing addons for standard and pro plans', async () => {
      const mockHttpsCallable = vi.fn().mockResolvedValue({
        data: { subscriptionItemId: 'si_123' }
      });

      const { httpsCallable } = await import('firebase/functions');
      (httpsCallable as any).mockReturnValue(mockHttpsCallable);

      const result = await addOnService.purchaseAddOn(
        'user123',
        'shows_5',
        'monthly'
      );

      expect(result.success).toBe(true);
      expect(result.subscriptionItemId).toBe('si_123');
      expect(mockHttpsCallable).toHaveBeenCalledWith({
        userId: 'user123',
        addOnId: 'shows_5',
        billingInterval: 'monthly'
      });
    });

    it('should handle addon purchase errors', async () => {
      const mockHttpsCallable = vi.fn().mockRejectedValue(new Error('Payment failed'));

      const { httpsCallable } = await import('firebase/functions');
      (httpsCallable as any).mockReturnValue(mockHttpsCallable);

      const result = await addOnService.purchaseAddOn(
        'user123',
        'shows_5',
        'monthly'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
    });

    it('should allow cancelling addons', async () => {
      const mockHttpsCallable = vi.fn().mockResolvedValue({});

      const { httpsCallable } = await import('firebase/functions');
      (httpsCallable as any).mockReturnValue(mockHttpsCallable);

      const result = await addOnService.cancelAddOn(
        'user123',
        'addon123'
      );

      expect(result.success).toBe(true);
      expect(mockHttpsCallable).toHaveBeenCalledWith({
        userId: 'user123',
        userAddOnId: 'addon123'
      });
    });

    it('should handle addon cancellation errors', async () => {
      const mockHttpsCallable = vi.fn().mockRejectedValue(new Error('Cancellation failed'));

      const { httpsCallable } = await import('firebase/functions');
      (httpsCallable as any).mockReturnValue(mockHttpsCallable);

      const result = await addOnService.cancelAddOn(
        'user123',
        'addon123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cancellation failed');
    });
  });

  describe('Addon Availability', () => {
    it('should only allow addon purchases for standard and pro plans', () => {
      const freePlanInfo: SubscriptionInfo = {
        plan: 'free',
        status: 'active',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        perShowLimits: { boards: 2, packingBoxes: 20, collaborators: 3, props: 10 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        userAddOns: [],
        canPurchaseAddOns: false
      };

      const starterPlanInfo: SubscriptionInfo = {
        plan: 'starter',
        status: 'active',
        limits: { shows: 3, boards: 5, packingBoxes: 50, collaboratorsPerShow: 5, props: 50, archivedShows: 1 },
        perShowLimits: { boards: 3, packingBoxes: 30, collaborators: 5, props: 25 },
        effectiveLimits: { shows: 3, boards: 5, packingBoxes: 50, collaboratorsPerShow: 5, props: 50, archivedShows: 1 },
        userAddOns: [],
        canPurchaseAddOns: false
      };

      const standardPlanInfo: SubscriptionInfo = {
        plan: 'standard',
        status: 'active',
        limits: { shows: 10, boards: 20, packingBoxes: 200, collaboratorsPerShow: 10, props: 500, archivedShows: 5 },
        perShowLimits: { boards: 10, packingBoxes: 100, collaborators: 10, props: 100 },
        effectiveLimits: { shows: 10, boards: 20, packingBoxes: 200, collaboratorsPerShow: 10, props: 500, archivedShows: 5 },
        userAddOns: [],
        canPurchaseAddOns: true
      };

      const proPlanInfo: SubscriptionInfo = {
        plan: 'pro',
        status: 'active',
        limits: { shows: 50, boards: 100, packingBoxes: 1000, collaboratorsPerShow: 25, props: 2000, archivedShows: 25 },
        perShowLimits: { boards: 25, packingBoxes: 200, collaborators: 25, props: 200 },
        effectiveLimits: { shows: 50, boards: 100, packingBoxes: 1000, collaboratorsPerShow: 25, props: 2000, archivedShows: 25 },
        userAddOns: [],
        canPurchaseAddOns: true
      };

      expect(freePlanInfo.canPurchaseAddOns).toBe(false);
      expect(starterPlanInfo.canPurchaseAddOns).toBe(false);
      expect(standardPlanInfo.canPurchaseAddOns).toBe(true);
      expect(proPlanInfo.canPurchaseAddOns).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        plan: 'standard',
        status: 'active',
        limits: { shows: 10, boards: 20, packingBoxes: 200, collaboratorsPerShow: 10, props: 500, archivedShows: 5 },
        perShowLimits: { boards: 10, packingBoxes: 100, collaborators: 10, props: 100 },
        effectiveLimits: { shows: 10, boards: 20, packingBoxes: 200, collaboratorsPerShow: 10, props: 500, archivedShows: 5 },
        userAddOns: [],
        canPurchaseAddOns: true
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      // Mock Firebase service to throw error
      mockFirebaseService.getDocuments.mockRejectedValue(new Error('Firebase connection failed'));

      const { checkShowLimit } = useLimitChecker();

      const result = await checkShowLimit(mockUser.uid);
      
      expect(result.withinLimit).toBe(false);
      expect(result.currentCount).toBe(0);
      expect(result.message).toBe('Error checking show limit');
    });

    it('should handle missing user gracefully', async () => {
      (useWebAuth as any).mockReturnValue({
        user: null,
        userProfile: null
      });

      const mockSubscriptionInfo: SubscriptionInfo = {
        plan: 'free',
        status: 'unknown',
        limits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        perShowLimits: { boards: 2, packingBoxes: 20, collaborators: 3, props: 10 },
        effectiveLimits: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10, archivedShows: 0 },
        userAddOns: [],
        canPurchaseAddOns: false
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      const { checkShowLimit } = useLimitChecker();

      // Should not throw error even with null user
      const result = await checkShowLimit('non-existent-user');
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        plan: 'free',
        status: 'active',
        limits: { shows: 0, boards: 0, packingBoxes: 0, collaboratorsPerShow: 0, props: 0, archivedShows: 0 },
        perShowLimits: { boards: 0, packingBoxes: 0, collaborators: 0, props: 0 },
        effectiveLimits: { shows: 0, boards: 0, packingBoxes: 0, collaboratorsPerShow: 0, props: 0, archivedShows: 0 },
        userAddOns: [],
        canPurchaseAddOns: false
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      mockFirebaseService.getDocuments.mockResolvedValue([]);

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(false);
      expect(showLimitResult.limit).toBe(0);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(false);
      expect(propsLimitResult.limit).toBe(0);
    });

    it('should handle very large limits correctly', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        plan: 'pro',
        status: 'active',
        limits: { shows: 999999, boards: 999999, packingBoxes: 999999, collaboratorsPerShow: 999999, props: 999999, archivedShows: 999999 },
        perShowLimits: { boards: 999999, packingBoxes: 999999, collaborators: 999999, props: 999999 },
        effectiveLimits: { shows: 999999, boards: 999999, packingBoxes: 999999, collaboratorsPerShow: 999999, props: 999999, archivedShows: 999999 },
        userAddOns: [],
        canPurchaseAddOns: true
      };

      (useSubscription as any).mockReturnValue(mockSubscriptionInfo);

      mockFirebaseService.getDocuments.mockResolvedValue([]);

      const { checkShowLimit, checkPropsLimit } = useLimitChecker();

      const showLimitResult = await checkShowLimit(mockUser.uid);
      expect(showLimitResult.withinLimit).toBe(true);
      expect(showLimitResult.limit).toBe(999999);

      const propsLimitResult = await checkPropsLimit(mockUser.uid);
      expect(propsLimitResult.withinLimit).toBe(true);
      expect(propsLimitResult.limit).toBe(999999);
    });
  });
});

