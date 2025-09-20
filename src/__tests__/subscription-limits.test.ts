import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubscription } from '../hooks/useSubscription';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../contexts/WebAuthContext', () => ({
  useWebAuth: () => ({
    user: { uid: 'test-user' },
  }),
}));

describe('Subscription Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Prop Limits', () => {
    it('should return correct prop limits for free plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      // Mock free plan data
      act(() => {
        // Simulate free plan user profile
        result.current.plan = 'free';
      });

      expect(result.current.limits.props).toBe(10);
    });

    it('should return correct prop limits for starter plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'starter';
      });

      expect(result.current.limits.props).toBe(50);
    });

    it('should return correct prop limits for standard plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'standard';
      });

      expect(result.current.limits.props).toBe(100);
    });

    it('should return correct prop limits for pro plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'pro';
      });

      expect(result.current.limits.props).toBe(1000);
    });
  });

  describe('All Resource Limits', () => {
    it('should return correct limits for free plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'free';
      });

      expect(result.current.limits).toEqual({
        shows: 1,
        boards: 2,
        packingBoxes: 20,
        collaboratorsPerShow: 3,
        props: 10,
      });
    });

    it('should return correct limits for starter plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'starter';
      });

      expect(result.current.limits).toEqual({
        shows: 3,
        boards: 5,
        packingBoxes: 200,
        collaboratorsPerShow: 5,
        props: 50,
      });
    });

    it('should return correct limits for standard plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'standard';
      });

      expect(result.current.limits).toEqual({
        shows: 10,
        boards: 20,
        packingBoxes: 1000,
        collaboratorsPerShow: 15,
        props: 100,
      });
    });

    it('should return correct limits for pro plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'pro';
      });

      expect(result.current.limits).toEqual({
        shows: 100,
        boards: 200,
        packingBoxes: 10000,
        collaboratorsPerShow: 100,
        props: 1000,
      });
    });
  });

  describe('Plan Feature Access', () => {
    it('should return correct feature access for free plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'free';
      });

      // Free plan should have limited access
      expect(result.current.limits.shows).toBe(1);
      expect(result.current.limits.props).toBe(10);
    });

    it('should return correct feature access for pro plan', () => {
      const { result } = renderHook(() => useSubscription());
      
      act(() => {
        result.current.plan = 'pro';
      });

      // Pro plan should have highest limits
      expect(result.current.limits.shows).toBe(100);
      expect(result.current.limits.props).toBe(1000);
    });
  });
});

