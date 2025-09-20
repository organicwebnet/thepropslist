import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase functions
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
};

// Mock subscription service
const mockSubscriptionService = {
  getCurrentPlan: vi.fn(),
  getCurrentPropCount: vi.fn(),
  canCreateProp: vi.fn(),
};

// Mock prop creation service
class PropCreationService {
  async createProp(propData: any, userId: string): Promise<{ success: boolean; error?: string }> {
    // Check subscription limits
    const plan = await mockSubscriptionService.getCurrentPlan(userId);
    const currentCount = await mockSubscriptionService.getCurrentPropCount(userId);
    const canCreate = await mockSubscriptionService.canCreateProp(userId);

    if (!canCreate) {
      return {
        success: false,
        error: `Prop limit reached for ${plan} plan. Current: ${currentCount}`,
      };
    }

    // Simulate prop creation
    try {
      await mockFirestore.addDoc(mockFirestore.collection('props'), {
        ...propData,
        userId,
        createdAt: new Date(),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create prop',
      };
    }
  }
}

describe('Prop Creation Integration Tests', () => {
  let propService: PropCreationService;

  beforeEach(() => {
    propService = new PropCreationService();
    vi.clearAllMocks();
  });

  describe('Free Plan (10 props)', () => {
    beforeEach(() => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue('free');
    });

    it('should allow prop creation when under limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(5);
      mockSubscriptionService.canCreateProp.mockResolvedValue(true);
      mockFirestore.addDoc.mockResolvedValue({ id: 'prop-123' });

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should block prop creation when at limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(10);
      mockSubscriptionService.canCreateProp.mockResolvedValue(false);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prop limit reached for free plan');
    });

    it('should block prop creation when over limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(15);
      mockSubscriptionService.canCreateProp.mockResolvedValue(false);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prop limit reached for free plan');
    });
  });

  describe('Starter Plan (50 props)', () => {
    beforeEach(() => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue('starter');
    });

    it('should allow prop creation when under limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(25);
      mockSubscriptionService.canCreateProp.mockResolvedValue(true);
      mockFirestore.addDoc.mockResolvedValue({ id: 'prop-123' });

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(true);
    });

    it('should block prop creation when at limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(50);
      mockSubscriptionService.canCreateProp.mockResolvedValue(false);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prop limit reached for starter plan');
    });
  });

  describe('Standard Plan (100 props)', () => {
    beforeEach(() => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue('standard');
    });

    it('should allow prop creation when under limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(50);
      mockSubscriptionService.canCreateProp.mockResolvedValue(true);
      mockFirestore.addDoc.mockResolvedValue({ id: 'prop-123' });

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(true);
    });

    it('should block prop creation when at limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(100);
      mockSubscriptionService.canCreateProp.mockResolvedValue(false);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prop limit reached for standard plan');
    });
  });

  describe('Pro Plan (1000 props)', () => {
    beforeEach(() => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue('pro');
    });

    it('should allow prop creation when under limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(500);
      mockSubscriptionService.canCreateProp.mockResolvedValue(true);
      mockFirestore.addDoc.mockResolvedValue({ id: 'prop-123' });

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(true);
    });

    it('should block prop creation when at limit', async () => {
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(1000);
      mockSubscriptionService.canCreateProp.mockResolvedValue(false);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prop limit reached for pro plan');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue('free');
      mockSubscriptionService.getCurrentPropCount.mockResolvedValue(5);
      mockSubscriptionService.canCreateProp.mockResolvedValue(true);
      mockFirestore.addDoc.mockRejectedValue(new Error('Database error'));

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create prop');
    });

    it('should handle missing user gracefully', async () => {
      mockSubscriptionService.getCurrentPlan.mockResolvedValue(null);

      const result = await propService.createProp(
        { name: 'Test Prop', description: 'A test prop' },
        'invalid-user'
      );

      expect(result.success).toBe(false);
    });
  });
});
