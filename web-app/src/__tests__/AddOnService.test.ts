import { AddOnService } from '../services/AddOnService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/functions');
jest.mock('firebase/firestore');

const _mockGetFunctions = getFunctions as jest.MockedFunction<typeof getFunctions>;
const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;

describe('AddOnService', () => {
  let addOnService: AddOnService;
  let mockPurchaseAddOnCallable: jest.Mock;
  let mockCancelAddOnCallable: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    addOnService = new AddOnService();
    
    mockPurchaseAddOnCallable = jest.fn();
    mockCancelAddOnCallable = jest.fn();
    
    mockHttpsCallable.mockImplementation((functions, name) => {
      if (name === 'purchaseAddOn') return mockPurchaseAddOnCallable;
      if (name === 'cancelAddOn') return mockCancelAddOnCallable;
      return jest.fn();
    });
  });

  describe('purchaseAddOn', () => {
    it('should successfully purchase an add-on', async () => {
      mockPurchaseAddOnCallable.mockResolvedValue({
        data: {
          success: true,
          subscriptionItemId: 'sub_item_123',
          userAddOnId: 'user_addon_456',
        },
      });

      const result = await addOnService.purchaseAddOn('user123', 'shows_5', 'monthly');

      expect(result).toEqual({
        success: true,
        subscriptionItemId: 'sub_item_123',
        userAddOnId: 'user_addon_456',
      });
      expect(mockPurchaseAddOnCallable).toHaveBeenCalledWith({
        userId: 'user123',
        addOnId: 'shows_5',
        billingInterval: 'monthly',
      });
    });

    it('should handle purchase failure', async () => {
      mockPurchaseAddOnCallable.mockResolvedValue({
        data: {
          success: false,
          error: 'Insufficient funds',
        },
      });

      const result = await addOnService.purchaseAddOn('user123', 'shows_5', 'monthly');

      expect(result).toEqual({
        success: false,
        error: 'Insufficient funds',
      });
    });

    it('should handle network errors', async () => {
      mockPurchaseAddOnCallable.mockRejectedValue(new Error('Network error'));

      const result = await addOnService.purchaseAddOn('user123', 'shows_5', 'monthly');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('cancelAddOn', () => {
    it('should successfully cancel an add-on', async () => {
      mockCancelAddOnCallable.mockResolvedValue({
        data: {
          success: true,
        },
      });

      const result = await addOnService.cancelAddOn('user123', 'user_addon_456');

      expect(result).toEqual({
        success: true,
      });
      expect(mockCancelAddOnCallable).toHaveBeenCalledWith({
        userId: 'user123',
        userAddOnId: 'user_addon_456',
      });
    });

    it('should handle cancellation failure', async () => {
      mockCancelAddOnCallable.mockResolvedValue({
        data: {
          success: false,
          error: 'Add-on not found',
        },
      });

      const result = await addOnService.cancelAddOn('user123', 'user_addon_456');

      expect(result).toEqual({
        success: false,
        error: 'Add-on not found',
      });
    });
  });

  describe('getUserAddOns', () => {
    it('should fetch user add-ons successfully', async () => {
      const mockUserAddOns = [
        {
          id: 'addon1',
          userId: 'user123',
          addOnId: 'shows_5',
          status: 'active',
          quantity: 1,
          billingInterval: 'monthly',
          stripeSubscriptionItemId: 'sub_item_123',
          createdAt: new Date(),
        },
      ];

      const mockDocSnap = {
        exists: () => true,
        data: () => ({ addOns: mockUserAddOns }),
      };

      mockGetDoc.mockResolvedValue(mockDocSnap as any);

      const result = await addOnService.getUserAddOns('user123');

      expect(result).toEqual(mockUserAddOns);
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'userAddOns', 'user123');
    });

    it('should return empty array when user has no add-ons', async () => {
      const mockDocSnap = {
        exists: () => false,
        data: () => ({}),
      };

      mockGetDoc.mockResolvedValue(mockDocSnap as any);

      const result = await addOnService.getUserAddOns('user123');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await addOnService.getUserAddOns('user123');

      expect(result).toEqual([]);
    });
  });
});
