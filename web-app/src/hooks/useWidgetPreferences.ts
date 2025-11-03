/**
 * Hook for managing widget preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { useWidgetPreferencesService } from '../services/widgetPreferencesService';
import type { WidgetPreferences, WidgetId } from '../components/DashboardWidgets/types';
import { getRoleBasedWidgetDefaults } from '../utils/widgetRoleDefaults';

export function useWidgetPreferences(userRole?: string) {
  const service = useWidgetPreferencesService();
  const [preferences, setPreferences] = useState<WidgetPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      setLoading(true);
      setError(null);
      try {
        const prefs = await service.loadPreferences();
        
        // If no preferences exist, use role-based defaults
        if (!prefs && userRole) {
          const defaults = getRoleBasedWidgetDefaults(userRole);
          setPreferences(defaults);
          // Save defaults to user profile
          try {
            await service.savePreferences(defaults);
          } catch (err) {
            console.warn('Could not save default preferences:', err);
          }
        } else {
          setPreferences(prefs || { enabled: [], config: undefined });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
        // Fall back to role defaults on error
        if (userRole) {
          const defaults = getRoleBasedWidgetDefaults(userRole);
          setPreferences(defaults);
        } else {
          setPreferences({ enabled: [], config: undefined });
        }
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [service, userRole]);

  const toggleWidget = useCallback(async (widgetId: WidgetId, enabled: boolean) => {
    try {
      await service.toggleWidget(widgetId, enabled);
      setPreferences(prev => {
        if (!prev) return null;
        const enabledWidgets = prev.enabled || [];
        const newEnabled = enabled
          ? (enabledWidgets.includes(widgetId) ? enabledWidgets : [...enabledWidgets, widgetId])
          : enabledWidgets.filter(id => id !== widgetId);
        return {
          ...prev,
          enabled: newEnabled,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle widget');
      throw err;
    }
  }, [service]);

  const updateConfig = useCallback(async (widgetId: WidgetId, config: Record<string, any>) => {
    try {
      await service.updateWidgetConfig(widgetId, config);
      setPreferences(prev => {
        if (!prev) return null;
        return {
          ...prev,
          config: {
            ...(prev.config || undefined),
            [widgetId]: config,
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    }
  }, [service]);

  const isWidgetEnabled = useCallback((widgetId: WidgetId): boolean => {
    return preferences?.enabled.includes(widgetId) ?? false;
  }, [preferences]);

  const getWidgetConfig = useCallback((widgetId: WidgetId): Record<string, any> => {
    return preferences?.config?.[widgetId] || {};
  }, [preferences]);

  return {
    preferences,
    loading,
    error,
    toggleWidget,
    updateConfig,
    isWidgetEnabled,
    getWidgetConfig,
  };
}

