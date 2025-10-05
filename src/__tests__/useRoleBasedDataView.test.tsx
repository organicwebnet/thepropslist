import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useRoleBasedDataView } from '../hooks/useRoleBasedDataView';
import { UserRole, UserProfile } from '../shared/types/auth';
import { DataViewResult } from '../shared/types/dataViews';

// Mock the DataViewService
jest.mock('../shared/services/DataViewService', () => ({
  dataViewService: {
    getEffectiveDataView: jest.fn(),
    isFieldVisible: jest.fn(),
    getPriorityFields: jest.fn(),
    getQuickActions: jest.fn(),
    filterPropData: jest.fn(),
    clearCache: jest.fn(),
  },
}));

import { dataViewService } from '../shared/services/DataViewService';

const mockDataViewService = dataViewService as jest.Mocked<typeof dataViewService>;

describe('useRoleBasedDataView', () => {
  let mockUser: UserProfile;
  let mockDataViewResult: DataViewResult;

  beforeEach(() => {
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.STAGE_MANAGER,
    };

    mockDataViewResult = {
      config: {
        visibleFields: ['location', 'currentLocation'],
        hiddenFields: ['price'],
        priorityFields: ['currentLocation'],
        visibleCategories: [],
        hiddenCategories: [],
        cardLayout: 'detailed',
        showImages: true,
        showStatusIndicators: true,
        quickActions: ['updateLocation'],
      },
      role: UserRole.STAGE_MANAGER,
      isCustom: false,
      source: 'default',
    };

    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state when user is null', () => {
      const { result } = renderHook(() => useRoleBasedDataView(null));

      expect(result.current.dataView).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start loading when user is provided', async () => {
      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);

      const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser));

      expect(result.current.loading).toBe(true);
      expect(result.current.dataView).toBeNull();

      await waitForNextUpdate();

      expect(result.current.loading).toBe(false);
      expect(result.current.dataView).toEqual(mockDataViewResult);
    });
  });

  describe('Data Loading', () => {
    it('should load data view successfully', async () => {
      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);

      const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser));

      await waitForNextUpdate();

      expect(result.current.dataView).toEqual(mockDataViewResult);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(mockUser, undefined);
    });

    it('should load data view with showId', async () => {
      const showId = 'test-show-id';
      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);

      const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser, showId));

      await waitForNextUpdate();

      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(mockUser, showId);
    });

    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load data view';
      mockDataViewService.getEffectiveDataView.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser));

      await waitForNextUpdate();

      expect(result.current.dataView).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      mockDataViewService.getEffectiveDataView.mockRejectedValue('String error');

      const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser));

      await waitForNextUpdate();

      expect(result.current.error).toBe('Failed to load data view');
    });
  });

  describe('User Changes', () => {
    it('should reload when user changes', async () => {
      const user1 = { ...mockUser, id: 'user1' };
      const user2 = { ...mockUser, id: 'user2' };

      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ user }) => useRoleBasedDataView(user),
        { initialProps: { user: user1 } }
      );

      await waitForNextUpdate();
      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(user1, undefined);

      rerender({ user: user2 });
      await waitForNextUpdate();
      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(user2, undefined);
    });

    it('should clear data when user becomes null', () => {
      const { result, rerender } = renderHook(
        ({ user }) => useRoleBasedDataView(user),
        { initialProps: { user: mockUser } }
      );

      rerender({ user: null });

      expect(result.current.dataView).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('ShowId Changes', () => {
    it('should reload when showId changes', async () => {
      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ user, showId }) => useRoleBasedDataView(user, showId),
        { initialProps: { user: mockUser, showId: 'show1' } }
      );

      await waitForNextUpdate();
      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(mockUser, 'show1');

      rerender({ user: mockUser, showId: 'show2' });
      await waitForNextUpdate();
      expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledWith(mockUser, 'show2');
    });
  });

  describe('Helper Functions', () => {
    beforeEach(async () => {
      mockDataViewService.getEffectiveDataView.mockResolvedValue(mockDataViewResult);
    });

    describe('isFieldVisible', () => {
      it('should return false when user is null', () => {
        const { result } = renderHook(() => useRoleBasedDataView(null));

        const isVisible = result.current.isFieldVisible('location');

        expect(isVisible).toBe(false);
        expect(mockDataViewService.isFieldVisible).not.toHaveBeenCalled();
      });

      it('should call service with correct parameters', () => {
        mockDataViewService.isFieldVisible.mockReturnValue(true);

        const { result } = renderHook(() => useRoleBasedDataView(mockUser));

        const isVisible = result.current.isFieldVisible('location');

        expect(isVisible).toBe(true);
        expect(mockDataViewService.isFieldVisible).toHaveBeenCalledWith('location', mockUser);
      });
    });

    describe('getPriorityFields', () => {
      it('should return empty array when user is null', () => {
        const { result } = renderHook(() => useRoleBasedDataView(null));

        const priorityFields = result.current.getPriorityFields();

        expect(priorityFields).toEqual([]);
        expect(mockDataViewService.getPriorityFields).not.toHaveBeenCalled();
      });

      it('should call service with correct parameters', () => {
        const mockPriorityFields = ['currentLocation', 'act'];
        mockDataViewService.getPriorityFields.mockReturnValue(mockPriorityFields);

        const { result } = renderHook(() => useRoleBasedDataView(mockUser));

        const priorityFields = result.current.getPriorityFields();

        expect(priorityFields).toEqual(mockPriorityFields);
        expect(mockDataViewService.getPriorityFields).toHaveBeenCalledWith(mockUser);
      });
    });

    describe('getQuickActions', () => {
      it('should return empty array when user is null', () => {
        const { result } = renderHook(() => useRoleBasedDataView(null));

        const quickActions = result.current.getQuickActions();

        expect(quickActions).toEqual([]);
        expect(mockDataViewService.getQuickActions).not.toHaveBeenCalled();
      });

      it('should call service with correct parameters', () => {
        const mockActions = ['updateLocation', 'addNote'];
        mockDataViewService.getQuickActions.mockReturnValue(mockActions);

        const { result } = renderHook(() => useRoleBasedDataView(mockUser));

        const quickActions = result.current.getQuickActions();

        expect(quickActions).toEqual(mockActions);
        expect(mockDataViewService.getQuickActions).toHaveBeenCalledWith(mockUser);
      });
    });

    describe('filterPropData', () => {
      it('should return original data when user is null', () => {
        const { result } = renderHook(() => useRoleBasedDataView(null));

        const propData = { name: 'Test Prop', location: 'Stage Left' };
        const filteredData = result.current.filterPropData(propData);

        expect(filteredData).toEqual(propData);
        expect(mockDataViewService.filterPropData).not.toHaveBeenCalled();
      });

      it('should call service with correct parameters', () => {
        const propData = { name: 'Test Prop', location: 'Stage Left' };
        const filteredData = { name: 'Test Prop' };
        mockDataViewService.filterPropData.mockReturnValue(filteredData);

        const { result } = renderHook(() => useRoleBasedDataView(mockUser));

        const resultData = result.current.filterPropData(propData);

        expect(resultData).toEqual(filteredData);
        expect(mockDataViewService.filterPropData).toHaveBeenCalledWith(propData, mockUser);
      });
    });

    describe('refreshDataView', () => {
      it('should clear cache and reload data', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useRoleBasedDataView(mockUser));

        await waitForNextUpdate();

        act(() => {
          result.current.refreshDataView();
        });

        expect(mockDataViewService.clearCache).toHaveBeenCalled();
        expect(mockDataViewService.getEffectiveDataView).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Memoization', () => {
    it('should memoize helper functions', () => {
      const { result, rerender } = renderHook(() => useRoleBasedDataView(mockUser));

      const isFieldVisible1 = result.current.isFieldVisible;
      const getPriorityFields1 = result.current.getPriorityFields;
      const getQuickActions1 = result.current.getQuickActions;
      const filterPropData1 = result.current.filterPropData;

      rerender();

      const isFieldVisible2 = result.current.isFieldVisible;
      const getPriorityFields2 = result.current.getPriorityFields;
      const getQuickActions2 = result.current.getQuickActions;
      const filterPropData2 = result.current.filterPropData;

      expect(isFieldVisible1).toBe(isFieldVisible2);
      expect(getPriorityFields1).toBe(getPriorityFields2);
      expect(getQuickActions1).toBe(getQuickActions2);
      expect(filterPropData1).toBe(filterPropData2);
    });

    it('should update memoized functions when user changes', () => {
      const user1 = { ...mockUser, id: 'user1' };
      const user2 = { ...mockUser, id: 'user2' };

      const { result, rerender } = renderHook(
        ({ user }) => useRoleBasedDataView(user),
        { initialProps: { user: user1 } }
      );

      const isFieldVisible1 = result.current.isFieldVisible;

      rerender({ user: user2 });

      const isFieldVisible2 = result.current.isFieldVisible;

      expect(isFieldVisible1).not.toBe(isFieldVisible2);
    });
  });
});
