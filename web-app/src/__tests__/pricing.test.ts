/**
 * @jest-environment jsdom
 */

import { calculateDiscount, getDefaultFeaturesForPlan, DEFAULT_PLAN_FEATURES } from '../shared/types/pricing';

describe('Pricing Utilities', () => {
  describe('calculateDiscount', () => {
    it('should calculate discounts correctly for normal prices', () => {
      const result = calculateDiscount(19, 190); // $19/month vs $190/year
      expect(result.savings).toBe(38); // (19 * 12) - 190 = 228 - 190 = 38
      expect(result.discountPercent).toBe(17); // (38 / 228) * 100 = 16.67% -> 17%
    });

    it('should handle zero monthly price', () => {
      const result = calculateDiscount(0, 0);
      expect(result.savings).toBe(0);
      expect(result.discountPercent).toBe(0);
    });

    it('should handle negative savings (yearly more expensive)', () => {
      const result = calculateDiscount(10, 150); // $10/month vs $150/year
      expect(result.savings).toBe(-30); // (10 * 12) - 150 = 120 - 150 = -30
      expect(result.discountPercent).toBe(-25); // (-30 / 120) * 100 = -25%
    });

    it('should handle edge case where monthly total is zero', () => {
      const result = calculateDiscount(0, 100);
      expect(result.savings).toBe(-100);
      expect(result.discountPercent).toBe(0); // Division by zero protection
    });

    it('should round percentage correctly', () => {
      const result = calculateDiscount(9, 90); // $9/month vs $90/year
      expect(result.savings).toBe(18); // (9 * 12) - 90 = 108 - 90 = 18
      expect(result.discountPercent).toBe(17); // (18 / 108) * 100 = 16.67% -> 17%
    });
  });

  describe('getDefaultFeaturesForPlan', () => {
    it('should return correct features for free plan', () => {
      const features = getDefaultFeaturesForPlan('free');
      expect(features).toEqual([
        '1 Show', '2 Task Boards', '20 Packing Boxes',
        '3 Collaborators per Show', '10 Props', 'Basic Support'
      ]);
    });

    it('should return correct features for starter plan', () => {
      const features = getDefaultFeaturesForPlan('starter');
      expect(features).toEqual([
        '3 Shows', '5 Task Boards', '200 Packing Boxes',
        '5 Collaborators per Show', '50 Props', 'Email Support'
      ]);
    });

    it('should return correct features for standard plan', () => {
      const features = getDefaultFeaturesForPlan('standard');
      expect(features).toEqual([
        '10 Shows', '20 Task Boards', '1000 Packing Boxes',
        '15 Collaborators per Show', '100 Props', 'Priority Support',
        'Custom Branding'
      ]);
    });

    it('should return correct features for pro plan', () => {
      const features = getDefaultFeaturesForPlan('pro');
      expect(features).toEqual([
        '100 Shows', '200 Task Boards', '10000 Packing Boxes',
        '100 Collaborators per Show', '1000 Props', '24/7 Support',
        'Custom Branding'
      ]);
    });

    it('should return empty array for unknown plan', () => {
      const features = getDefaultFeaturesForPlan('unknown');
      expect(features).toEqual([]);
    });
  });

  describe('DEFAULT_PLAN_FEATURES', () => {
    it('should have all required plan types', () => {
      expect(DEFAULT_PLAN_FEATURES).toHaveProperty('free');
      expect(DEFAULT_PLAN_FEATURES).toHaveProperty('starter');
      expect(DEFAULT_PLAN_FEATURES).toHaveProperty('standard');
      expect(DEFAULT_PLAN_FEATURES).toHaveProperty('pro');
    });

    it('should have non-empty feature arrays for all plans', () => {
      Object.values(DEFAULT_PLAN_FEATURES).forEach(features => {
        expect(features).toBeInstanceOf(Array);
        expect(features.length).toBeGreaterThan(0);
      });
    });

    it('should not contain removed features', () => {
      Object.values(DEFAULT_PLAN_FEATURES).forEach(features => {
        expect(features).not.toContain('Basic Analytics');
        expect(features).not.toContain('Advanced Analytics');
        expect(features).not.toContain('API Access');
        expect(features).not.toContain('White-label Options');
      });
    });
  });
});
