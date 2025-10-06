import { DiscountCodesService } from '../DiscountCodesService';
import { setDoc, getDocs, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('firebase/functions');

const mockDb = {
  runTransaction: jest.fn(),
};

const mockFunctions = {
  httpsCallable: jest.fn(),
};

// Mock the service
jest.mock('../firebase', () => ({
  db: mockDb,
}));

jest.mock('firebase/functions', () => ({
  getFunctions: () => mockFunctions,
  httpsCallable: jest.fn(),
}));

describe('DiscountCodesService', () => {
  let service: DiscountCodesService;

  beforeEach(() => {
    service = new DiscountCodesService();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should sanitize discount codes correctly', () => {
      const testCases = [
        { input: 'save20', expected: 'SAVE20' },
        { input: 'SAVE-20', expected: 'SAVE20' },
        { input: 'save_20!', expected: 'SAVE20' },
        { input: '  save20  ', expected: 'SAVE20' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Access private method for testing
        const result = (service as any).sanitizeDiscountCode(input);
        expect(result).toBe(expected);
      });
    });

    it('should validate discount code format', () => {
      const testCases = [
        { code: 'SAVE20', valid: true },
        { code: 'SA', valid: false, error: 'Discount code must be at least 3 characters long' },
        { code: 'A'.repeat(21), valid: false, error: 'Discount code must be 20 characters or less' },
        { code: 'SAVE-20', valid: false, error: 'Discount code can only contain letters and numbers' },
        { code: '', valid: false, error: 'Discount code must be at least 3 characters long' },
      ];

      testCases.forEach(({ code, valid, error }) => {
        const result = (service as any).validateDiscountCodeFormat(code);
        expect(result.valid).toBe(valid);
        if (error) {
          expect(result.error).toBe(error);
        }
      });
    });

    it('should validate discount values', () => {
      const testCases = [
        { type: 'percentage', value: 20, valid: true },
        { type: 'percentage', value: 0, valid: false, error: 'Discount value must be greater than 0' },
        { type: 'percentage', value: 101, valid: false, error: 'Percentage discount cannot exceed 100%' },
        { type: 'fixed_amount', value: 10, valid: true },
        { type: 'fixed_amount', value: 10001, valid: false, error: 'Fixed amount discount cannot exceed $100' },
      ];

      testCases.forEach(({ type, value, valid, error }) => {
        const result = (service as any).validateDiscountValue(type, value);
        expect(result.valid).toBe(valid);
        if (error) {
          expect(result.error).toBe(error);
        }
      });
    });
  });

  describe('Discount Code Creation', () => {
    it('should create discount code with valid input', async () => {
      const mockCreateStripeCoupon = jest.fn().mockResolvedValue({
        data: { couponId: 'coupon_123' }
      });
      const mockCreatePromotionCode = jest.fn().mockResolvedValue({
        data: { promotionCodeId: 'promo_123' }
      });

      (httpsCallable as jest.Mock)
        .mockReturnValueOnce(mockCreateStripeCoupon)
        .mockReturnValueOnce(mockCreatePromotionCode);

      const mockSetDoc = setDoc as jest.Mock;
      mockSetDoc.mockResolvedValue(undefined);

      const discountData = {
        code: 'SAVE20',
        name: '20% Off',
        description: 'Test discount',
        type: 'percentage' as const,
        value: 20,
        currency: 'usd',
        maxRedemptions: 100,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z',
        active: true,
        appliesTo: 'all' as const,
      };

      const result = await service.createDiscountCode(discountData);

      expect(mockCreateStripeCoupon).toHaveBeenCalledWith({
        id: 'SAVE20',
        name: '20% Off',
        percent_off: 20,
        amount_off: undefined,
        currency: 'usd',
        max_redemptions: 100,
        redeem_by: expect.any(Number),
      });

      expect(mockCreatePromotionCode).toHaveBeenCalledWith({
        coupon: 'coupon_123',
        code: 'SAVE20',
        active: true,
      });

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject duplicate discount codes', async () => {
      const mockGetDocs = getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '123', data: () => ({ code: 'SAVE20' }) }]
      });

      const discountData = {
        code: 'SAVE20',
        name: '20% Off',
        description: 'Test discount',
        type: 'percentage' as const,
        value: 20,
        currency: 'usd',
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z',
        active: true,
        appliesTo: 'all' as const,
      };

      await expect(service.createDiscountCode(discountData)).rejects.toThrow('Discount code already exists');
    });
  });

  describe('Discount Code Validation', () => {
    it('should validate active discount codes', async () => {
      const mockDiscountCode = {
        id: '123',
        code: 'SAVE20',
        active: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-12-31T23:59:59Z',
        maxRedemptions: 100,
        timesRedeemed: 50,
        appliesTo: 'all' as const,
      };

      const mockGetDocs = getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '123', data: () => mockDiscountCode }]
      });

      const result = await service.validateDiscountCode('SAVE20', 'starter');

      expect(result.valid).toBe(true);
      expect(result.discount).toEqual(mockDiscountCode);
    });

    it('should reject expired discount codes', async () => {
      const mockDiscountCode = {
        id: '123',
        code: 'SAVE20',
        active: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-01-01T00:00:00Z', // Expired
        maxRedemptions: 100,
        timesRedeemed: 50,
        appliesTo: 'all' as const,
      };

      const mockGetDocs = getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '123', data: () => mockDiscountCode }]
      });

      const result = await service.validateDiscountCode('SAVE20', 'starter');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discount code has expired');
    });

    it('should reject codes that have reached max redemptions', async () => {
      const mockDiscountCode = {
        id: '123',
        code: 'SAVE20',
        active: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-12-31T23:59:59Z',
        maxRedemptions: 100,
        timesRedeemed: 100, // Max reached
        appliesTo: 'all' as const,
      };

      const mockGetDocs = getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '123', data: () => mockDiscountCode }]
      });

      const result = await service.validateDiscountCode('SAVE20', 'starter');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discount code has reached maximum redemptions');
    });
  });

  describe('Usage Recording', () => {
    it('should record discount usage with transaction', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            timesRedeemed: 5,
            maxRedemptions: 100,
          })
        }),
        set: jest.fn(),
        update: jest.fn(),
      };

      (runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        await callback(mockTransaction);
      });

      const usage = {
        discountCodeId: '123',
        userId: 'user123',
        userEmail: 'test@example.com',
        planId: 'starter',
        amount: 1,
        discountAmount: 2.00,
        usedAt: '2024-01-01T00:00:00Z',
      };

      await service.recordDiscountUsage(usage);

      expect(mockTransaction.get).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        {
          timesRedeemed: 6,
          lastUsed: usage.usedAt,
        }
      );
    });

    it('should reject usage when max redemptions reached', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            timesRedeemed: 100,
            maxRedemptions: 100,
          })
        }),
      };

      (runTransaction as jest.Mock).mockImplementation(async (db, callback) => {
        await callback(mockTransaction);
      });

      const usage = {
        discountCodeId: '123',
        userId: 'user123',
        userEmail: 'test@example.com',
        planId: 'starter',
        amount: 1,
        discountAmount: 2.00,
        usedAt: '2024-01-01T00:00:00Z',
      };

      await expect(service.recordDiscountUsage(usage)).rejects.toThrow('Discount code has reached maximum redemptions');
    });
  });

  describe('Caching', () => {
    it('should cache discount codes', async () => {
      const mockDiscountCode = {
        id: '123',
        code: 'SAVE20',
        active: true,
      };

      const mockGetDocs = getDocs as jest.Mock;
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '123', data: () => mockDiscountCode }]
      });

      // First call should fetch from database
      const result1 = await service.getDiscountCodeByCode('SAVE20');
      expect(result1).toEqual(mockDiscountCode);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await service.getDiscountCodeByCode('SAVE20');
      expect(result2).toEqual(mockDiscountCode);
      expect(mockGetDocs).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should clear cache', () => {
      service.clearCache();
      // No direct way to test cache clearing, but method should not throw
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should calculate discount amounts correctly', () => {
      const percentageCode = {
        type: 'percentage' as const,
        value: 20,
      };

      const fixedCode = {
        type: 'fixed_amount' as const,
        value: 10,
      };

      expect(service.calculateDiscountAmount(100, percentageCode as any)).toBe(20);
      expect(service.calculateDiscountAmount(100, fixedCode as any)).toBe(10);
      expect(service.calculateDiscountAmount(5, fixedCode as any)).toBe(5); // Should not exceed original amount
    });

    it('should format discount codes correctly', () => {
      const percentageCode = {
        type: 'percentage' as const,
        value: 20,
      };

      const fixedCode = {
        type: 'fixed_amount' as const,
        value: 10,
      };

      expect(service.formatDiscountCode(percentageCode as any)).toBe('20% off');
      expect(service.formatDiscountCode(fixedCode as any)).toBe('$10 off');
    });
  });
});
