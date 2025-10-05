import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/auth';
import { DataViewConfig, DataViewResult } from '../types/dataViews';
import { dataViewService } from '../services/DataViewService';

/**
 * Hook for managing role-based data views
 */
export function useRoleBasedDataView(user: UserProfile | null, showId?: string) {
  const [dataView, setDataView] = useState<DataViewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataView = useCallback(async () => {
    if (!user) {
      setDataView(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await dataViewService.getEffectiveDataView(user, showId);
      setDataView(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data view';
      setError(errorMessage);
      console.error('Error loading data view:', err);
    } finally {
      setLoading(false);
    }
  }, [user, showId]);

  useEffect(() => {
    loadDataView();
  }, [loadDataView]);

  const isFieldVisible = useCallback((fieldName: string): boolean => {
    if (!user) return false;
    return dataViewService.isFieldVisible(fieldName, user);
  }, [user]);

  const getPriorityFields = useCallback((): string[] => {
    if (!user) return [];
    return dataViewService.getPriorityFields(user);
  }, [user]);

  const getQuickActions = useCallback((): string[] => {
    if (!user) return [];
    return dataViewService.getQuickActions(user);
  }, [user]);

  const filterPropData = useCallback(<T extends Record<string, any>>(propData: T): Partial<T> => {
    if (!user) return propData;
    return dataViewService.filterPropData(propData, user);
  }, [user]);

  const refreshDataView = useCallback(() => {
    dataViewService.clearCache();
    loadDataView();
  }, [loadDataView]);

  return {
    dataView,
    loading,
    error,
    isFieldVisible,
    getPriorityFields,
    getQuickActions,
    filterPropData,
    refreshDataView,
  };
}
