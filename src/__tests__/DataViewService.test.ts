import { DataViewService } from '../shared/services/DataViewService';
import { UserRole, UserProfile } from '../shared/types/auth';
import { PropFieldCategory } from '../shared/types/dataViews';

// Mock the role-based data views utilities
jest.mock('../shared/utils/roleBasedDataViews', () => ({
  getRoleDataView: jest.fn(),
  isFieldVisibleForRole: jest.fn(),
  getPriorityFieldsForRole: jest.fn(),
}));

import {
  getRoleDataView,
  isFieldVisibleForRole,
  getPriorityFieldsForRole,
} from '../shared/utils/roleBasedDataViews';

const mockGetRoleDataView = getRoleDataView as jest.MockedFunction<typeof getRoleDataView>;
const mockIsFieldVisibleForRole = isFieldVisibleForRole as jest.MockedFunction<typeof isFieldVisibleForRole>;
const mockGetPriorityFieldsForRole = getPriorityFieldsForRole as jest.MockedFunction<typeof getPriorityFieldsForRole>;

describe('DataViewService', () => {
  let service: DataViewService;
  let mockUser: UserProfile;

  beforeEach(() => {
    service = DataViewService.getInstance();
    service.clearCache(); // Clear cache before each test
    
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.STAGE_MANAGER,
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getEffectiveDataView', () => {
    it('should return cached data view when available', async () => {
      const mockConfig = {
        visibleFields: ['location', 'currentLocation'],
        hiddenFields: ['price'],
        priorityFields: ['currentLocation'],
        visibleCategories: [PropFieldCategory.LOCATION],
        hiddenCategories: [PropFieldCategory.FINANCIAL],
        cardLayout: 'detailed' as const,
        showImages: true,
        showStatusIndicators: true,
        quickActions: ['updateLocation'],
      };

      mockGetRoleDataView.mockReturnValue({
        role: UserRole.STAGE_MANAGER,
        displayName: 'Stage Manager',
        description: 'Test description',
        isDefault: true,
        config: mockConfig,
      });

      // First call should not be cached
      const result1 = await service.getEffectiveDataView(mockUser);
      expect(result1.source).toBe('default');
      expect(mockGetRoleDataView).toHaveBeenCalledTimes(1);

      // Second call should be cached
      const result2 = await service.getEffectiveDataView(mockUser);
      expect(result2.source).toBe('cached');
      expect(mockGetRoleDataView).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should return default data view for user with role', async () => {
      const mockConfig = {
        visibleFields: ['location'],
        hiddenFields: ['price'],
        priorityFields: ['location'],
        visibleCategories: [PropFieldCategory.LOCATION],
        hiddenCategories: [PropFieldCategory.FINANCIAL],
        cardLayout: 'detailed' as const,
        showImages: true,
        showStatusIndicators: true,
        quickActions: ['updateLocation'],
      };

      mockGetRoleDataView.mockReturnValue({
        role: UserRole.STAGE_MANAGER,
        displayName: 'Stage Manager',
        description: 'Test description',
        isDefault: true,
        config: mockConfig,
      });

      const result = await service.getEffectiveDataView(mockUser);

      expect(result.config).toEqual(mockConfig);
      expect(result.role).toBe(UserRole.STAGE_MANAGER);
      expect(result.isCustom).toBe(false);
      expect(result.source).toBe('default');
    });

    it('should fallback to viewer role when user has no role', async () => {
      const userWithoutRole = { ...mockUser, role: undefined };
      const mockConfig = {
        visibleFields: ['name', 'description'],
        hiddenFields: ['price'],
        priorityFields: ['name'],
        visibleCategories: [PropFieldCategory.CREATIVE],
        hiddenCategories: [PropFieldCategory.FINANCIAL],
        cardLayout: 'compact' as const,
        showImages: true,
        showStatusIndicators: false,
        quickActions: ['viewDetails'],
      };

      mockGetRoleDataView.mockReturnValue({
        role: UserRole.VIEWER,
        displayName: 'Viewer',
        description: 'Test description',
        isDefault: true,
        config: mockConfig,
      });

      const result = await service.getEffectiveDataView(userWithoutRole);

      expect(result.role).toBe(UserRole.VIEWER);
      expect(mockGetRoleDataView).toHaveBeenCalledWith(UserRole.VIEWER);
    });

    it('should handle errors gracefully and fallback to viewer role', async () => {
      mockGetRoleDataView.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await service.getEffectiveDataView(mockUser);

      expect(result.role).toBe(UserRole.VIEWER);
      expect(result.source).toBe('computed');
    });

    it('should include showId in cache key', async () => {
      const showId = 'test-show-id';
      const mockConfig = {
        visibleFields: ['location'],
        hiddenFields: ['price'],
        priorityFields: ['location'],
        visibleCategories: [PropFieldCategory.LOCATION],
        hiddenCategories: [PropFieldCategory.FINANCIAL],
        cardLayout: 'detailed' as const,
        showImages: true,
        showStatusIndicators: true,
        quickActions: ['updateLocation'],
      };

      mockGetRoleDataView.mockReturnValue({
        role: UserRole.STAGE_MANAGER,
        displayName: 'Stage Manager',
        description: 'Test description',
        isDefault: true,
        config: mockConfig,
      });

      await service.getEffectiveDataView(mockUser, showId);
      await service.getEffectiveDataView(mockUser, showId);

      // Should be cached (only called once)
      expect(mockGetRoleDataView).toHaveBeenCalledTimes(1);
    });
  });

  describe('isFieldVisible', () => {
    it('should return true for visible field', () => {
      mockIsFieldVisibleForRole.mockReturnValue(true);

      const result = service.isFieldVisible('location', mockUser);

      expect(result).toBe(true);
      expect(mockIsFieldVisibleForRole).toHaveBeenCalledWith('location', UserRole.STAGE_MANAGER);
    });

    it('should return false for hidden field', () => {
      mockIsFieldVisibleForRole.mockReturnValue(false);

      const result = service.isFieldVisible('price', mockUser);

      expect(result).toBe(false);
      expect(mockIsFieldVisibleForRole).toHaveBeenCalledWith('price', UserRole.STAGE_MANAGER);
    });

    it('should handle user without role', () => {
      const userWithoutRole = { ...mockUser, role: undefined };
      mockIsFieldVisibleForRole.mockReturnValue(false);

      const result = service.isFieldVisible('location', userWithoutRole);

      expect(result).toBe(false);
      expect(mockIsFieldVisibleForRole).toHaveBeenCalledWith('location', UserRole.VIEWER);
    });

    it('should handle errors gracefully', () => {
      mockIsFieldVisibleForRole.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = service.isFieldVisible('location', mockUser);

      expect(result).toBe(false);
    });
  });

  describe('getPriorityFields', () => {
    it('should return priority fields for user role', () => {
      const mockPriorityFields = ['currentLocation', 'act', 'scene'];
      mockGetPriorityFieldsForRole.mockReturnValue(mockPriorityFields);

      const result = service.getPriorityFields(mockUser);

      expect(result).toEqual(mockPriorityFields);
      expect(mockGetPriorityFieldsForRole).toHaveBeenCalledWith(UserRole.STAGE_MANAGER);
    });

    it('should handle user without role', () => {
      const userWithoutRole = { ...mockUser, role: undefined };
      mockGetPriorityFieldsForRole.mockReturnValue([]);

      const result = service.getPriorityFields(userWithoutRole);

      expect(result).toEqual([]);
      expect(mockGetPriorityFieldsForRole).toHaveBeenCalledWith(UserRole.VIEWER);
    });

    it('should handle errors gracefully', () => {
      mockGetPriorityFieldsForRole.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = service.getPriorityFields(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('filterPropData', () => {
    it('should filter prop data based on field visibility', () => {
      const propData = {
        name: 'Test Prop',
        location: 'Stage Left',
        price: 100,
        description: 'A test prop',
        hiddenField: 'should be hidden',
      };

      mockIsFieldVisibleForRole
        .mockReturnValueOnce(true)  // name
        .mockReturnValueOnce(true)  // location
        .mockReturnValueOnce(false) // price
        .mockReturnValueOnce(true)  // description
        .mockReturnValueOnce(false); // hiddenField

      const result = service.filterPropData(propData, mockUser);

      expect(result).toEqual({
        name: 'Test Prop',
        location: 'Stage Left',
        description: 'A test prop',
      });
    });

    it('should return original data on error', () => {
      const propData = { name: 'Test Prop', location: 'Stage Left' };
      mockIsFieldVisibleForRole.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = service.filterPropData(propData, mockUser);

      expect(result).toEqual(propData);
    });
  });

  describe('getQuickActions', () => {
    it('should return quick actions for user role', () => {
      const mockActions = ['updateLocation', 'addMaintenanceNote'];
      mockGetRoleDataView.mockReturnValue({
        role: UserRole.STAGE_MANAGER,
        displayName: 'Stage Manager',
        description: 'Test description',
        isDefault: true,
        config: {
          visibleFields: [],
          hiddenFields: [],
          priorityFields: [],
          visibleCategories: [],
          hiddenCategories: [],
          cardLayout: 'detailed',
          showImages: true,
          showStatusIndicators: true,
          quickActions: mockActions,
        },
      });

      const result = service.getQuickActions(mockUser);

      expect(result).toEqual(mockActions);
    });

    it('should handle errors gracefully', () => {
      mockGetRoleDataView.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = service.getQuickActions(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);

      // Add something to cache
      service['cache'].set('test-key', {
        visibleFields: [],
        hiddenFields: [],
        priorityFields: [],
        visibleCategories: [],
        hiddenCategories: [],
        cardLayout: 'detailed',
        showImages: true,
        showStatusIndicators: true,
        quickActions: [],
      });

      expect(service.getCacheStats().size).toBe(1);

      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DataViewService.getInstance();
      const instance2 = DataViewService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
