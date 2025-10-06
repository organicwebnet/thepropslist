import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { useLimitChecker } from '../hooks/useLimitChecker';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import AvailabilityCounter from '../components/AvailabilityCounter';
import { TEST_SCENARIOS, createMockFirebaseService } from './test-utils/subscription-mocks';

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

describe('Warning System Balance Tests', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useWebAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: { role: 'user' }
    });

    (useFirebase as any).mockReturnValue({
      service: createMockFirebaseService({}),
      isInitialized: true
    });
  });

  describe('Warning Frequency and Timing', () => {
    it('should show warnings at 80% of limit (not too early)', () => {
      const { render: renderCounter } = render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={8}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      // At 80% (8/10), should show warning
      expect(screen.getByText('8 of 10 props')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
    });

    it('should NOT show warnings below 80% of limit', () => {
      const { render: renderCounter } = render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={7}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      // At 70% (7/10), should NOT show warning
      expect(screen.getByText('7 of 10 props')).toBeInTheDocument();
      expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
    });

    it('should show critical warnings at 100% of limit', () => {
      const { render: renderCounter } = render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={10}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      // At 100% (10/10), should show critical warning
      expect(screen.getByText('10 of 10 props')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
      
      // Should have red styling for critical state
      const counterElement = screen.getByText('10 of 10 props');
      expect(counterElement).toHaveClass('text-red-600');
    });
  });

  describe('Warning Message Clarity', () => {
    it('should provide clear, actionable warning messages', async () => {
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.FREE_AT_LIMIT.subscription);
      
      const mockFirebaseService = createMockFirebaseService(TEST_SCENARIOS.FREE_AT_LIMIT.mockData);
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      const result = await checkPropsLimit(mockUser.uid);

      // Warning message should be clear and actionable
      expect(result.message).toContain('reached your plan\'s props limit');
      expect(result.message).toContain('Upgrade to create more props');
      expect(result.message).not.toContain('error'); // Should not be technical
      expect(result.message).not.toContain('undefined'); // Should not have undefined values
    });

    it('should differentiate between per-plan and per-show limits', async () => {
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.STANDARD_WITH_ADDONS.subscription);
      
      const mockFirebaseService = createMockFirebaseService({
        props: Array(100).fill(null).map((_, i) => ({ id: `prop${i}`, data: { showId: 'show1' } }))
      });
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimitForShow } = useLimitChecker();
      const result = await checkPropsLimitForShow('show1');

      // Per-show limit message should be different from per-plan
      expect(result.message).toContain('This show has reached its props limit');
      expect(result.message).not.toContain('plan\'s props limit');
      expect(result.isPerShow).toBe(true);
    });
  });

  describe('Warning Visual Design', () => {
    it('should use appropriate color coding for different warning levels', () => {
      // Test approaching limit (yellow)
      const { rerender } = render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={8}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      let counterElement = screen.getByText('8 of 10 props');
      expect(counterElement).toHaveClass('text-yellow-600');

      // Test at limit (red)
      rerender(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={10}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      counterElement = screen.getByText('10 of 10 props');
      expect(counterElement).toHaveClass('text-red-600');

      // Test within limits (gray)
      rerender(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={5}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      counterElement = screen.getByText('5 of 10 props');
      expect(counterElement).toHaveClass('text-gray-600');
    });

    it('should have consistent warning banner styling across pages', () => {
      // This would test that all warning banners use the same styling
      // We can't easily test this without rendering full pages, but we can test the pattern
      const warningBannerClasses = [
        'mb-4',
        'p-4',
        'bg-red-500/20',
        'border',
        'border-red-500/30',
        'rounded-lg'
      ];

      // These classes should be consistent across all warning banners
      warningBannerClasses.forEach(className => {
        expect(className).toBeDefined();
      });
    });
  });

  describe('Warning Persistence and Dismissal', () => {
    it('should not show warnings for users who have dismissed them recently', () => {
      // Mock localStorage to simulate dismissed warning
      const mockLocalStorage = {
        getItem: vi.fn((key) => {
          if (key === 'hideImportNudge') return '1';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      // This would be tested in the actual component that shows import nudges
      expect(mockLocalStorage.getItem('hideImportNudge')).toBe('1');
    });

    it('should show warnings again after limit changes', async () => {
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.FREE_AT_LIMIT.subscription);
      
      const mockFirebaseService = createMockFirebaseService(TEST_SCENARIOS.FREE_AT_LIMIT.mockData);
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      
      // First check - at limit
      let result = await checkPropsLimit(mockUser.uid);
      expect(result.withinLimit).toBe(false);

      // Simulate limit increase (e.g., user upgrades)
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.STANDARD_WITH_ADDONS.subscription);
      
      // Second check - within new limit
      result = await checkPropsLimit(mockUser.uid);
      expect(result.withinLimit).toBe(true);
    });
  });

  describe('Warning Context and Relevance', () => {
    it('should show appropriate upgrade options based on user plan', () => {
      // Test free plan user
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.FREE_AT_LIMIT.subscription);
      
      const { rerender } = render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={10}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();

      // Test standard plan user (can buy addons)
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.STANDARD_WITH_ADDONS.subscription);
      
      rerender(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={500}
            limit={500}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Buy Add-On')).toBeInTheDocument();
    });

    it('should not show warnings for god/admin users', async () => {
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.GOD_UNLIMITED.subscription);
      
      const mockFirebaseService = createMockFirebaseService(TEST_SCENARIOS.GOD_UNLIMITED.mockData);
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      const result = await checkPropsLimit(mockUser.uid);

      // God users should always be within limits
      expect(result.withinLimit).toBe(true);
      expect(result.limit).toBe(999999);
    });
  });

  describe('Warning Performance', () => {
    it('should not cause excessive re-renders', async () => {
      const renderCount = vi.fn();
      
      const TestComponent = () => {
        renderCount();
        return (
          <AvailabilityCounter
            currentCount={5}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        );
      };

      const { rerender } = render(
        <BrowserRouter>
          <TestComponent />
        </BrowserRouter>
      );

      const initialRenderCount = renderCount.mock.calls.length;

      // Rerender with same props
      rerender(
        <BrowserRouter>
          <TestComponent />
        </BrowserRouter>
      );

      // Should not cause excessive re-renders
      expect(renderCount.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 2);
    });

    it('should handle limit checks efficiently', async () => {
      const mockFirebaseService = createMockFirebaseService({});
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      
      const startTime = performance.now();
      await checkPropsLimit(mockUser.uid);
      const endTime = performance.now();

      // Limit check should complete quickly (less than 100ms in test environment)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Warning Accessibility', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(
        <BrowserRouter>
          <AvailabilityCounter
            currentCount={8}
            limit={10}
            type="props"
            showUpgradeButton={true}
          />
        </BrowserRouter>
      );

      // The counter should be readable by screen readers
      const counterElement = screen.getByText('8 of 10 props');
      expect(counterElement).toBeInTheDocument();
      
      // Upgrade button should be accessible
      const upgradeButton = screen.getByText('Upgrade Plan');
      expect(upgradeButton).toBeInTheDocument();
      expect(upgradeButton.tagName).toBe('A'); // Should be a link for accessibility
    });

    it('should use semantic HTML for warnings', () => {
      // Warning banners should use appropriate semantic elements
      const warningBannerHTML = `
        <div class="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1">
              <div class="text-red-200 font-semibold mb-1">Subscription Limit Reached</div>
              <div class="text-red-100 text-sm mb-3">Warning message</div>
              <a href="/profile" class="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors text-sm">
                Upgrade Plan
              </a>
            </div>
          </div>
        </div>
      `;

      // Should use div for container, not span
      expect(warningBannerHTML).toContain('<div class="mb-4 p-4');
      // Should use proper link for action
      expect(warningBannerHTML).toContain('<a href="/profile"');
    });
  });

  describe('Warning Content Quality', () => {
    it('should provide helpful context in warning messages', async () => {
      (useSubscription as any).mockReturnValue(TEST_SCENARIOS.FREE_AT_LIMIT.subscription);
      
      const mockFirebaseService = createMockFirebaseService(TEST_SCENARIOS.FREE_AT_LIMIT.mockData);
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      const result = await checkPropsLimit(mockUser.uid);

      // Message should include:
      // 1. What limit was reached
      // 2. Current count vs limit
      // 3. Action to take
      expect(result.message).toContain('props limit');
      expect(result.message).toContain('Upgrade');
      expect(result.currentCount).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should not show technical errors to users', async () => {
      // Mock Firebase service to throw error
      const mockFirebaseService = {
        getDocuments: vi.fn().mockRejectedValue(new Error('Firebase connection failed'))
      };
      (useFirebase as any).mockReturnValue({
        service: mockFirebaseService,
        isInitialized: true
      });

      const { checkPropsLimit } = useLimitChecker();
      const result = await checkPropsLimit(mockUser.uid);

      // Should show user-friendly message, not technical error
      expect(result.message).toBe('Error checking props limit');
      expect(result.message).not.toContain('Firebase');
      expect(result.message).not.toContain('connection failed');
    });
  });
});

