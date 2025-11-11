/**
 * Hook for managing widget preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { useWidgetPreferencesService } from '../services/widgetPreferencesService';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import type { WidgetPreferences, WidgetId } from '../components/DashboardWidgets/types';
import { getRoleBasedWidgetDefaults } from '../utils/widgetRoleDefaults';

export function useWidgetPreferences(userRole?: string) {
  const service = useWidgetPreferencesService();
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();
  const [preferences, setPreferences] = useState<WidgetPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to real-time updates from user profile
  useEffect(() => {
    if (!user?.uid || !firebaseService) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Listen to user profile document for real-time updates
    const unsubscribe = firebaseService.listenToDocument(
      `userProfiles/${user.uid}`,
      (doc) => {
        if (!doc?.data) {
          // No profile yet, use defaults
          if (userRole) {
            const defaults = getRoleBasedWidgetDefaults(userRole);
            setPreferences(defaults);
            // Save defaults to user profile
            service.savePreferences(defaults).catch(err => {
              console.warn('Could not save default preferences:', err);
            });
          } else {
            setPreferences({ enabled: [], config: undefined });
          }
          setLoading(false);
          return;
        }

        const dashboardWidgets = doc.data.dashboardWidgets;
        if (!dashboardWidgets) {
          // No preferences yet, use defaults
          if (userRole) {
            const defaults = getRoleBasedWidgetDefaults(userRole);
            setPreferences(defaults);
            // Save defaults to user profile
            service.savePreferences(defaults).catch(err => {
              console.warn('Could not save default preferences:', err);
            });
          } else {
            setPreferences({ enabled: [], config: undefined });
          }
          setLoading(false);
          return;
        }

        const prefs: WidgetPreferences = {
          enabled: dashboardWidgets.enabled || [],
          config: dashboardWidgets.config || undefined,
        };

        // Merge with role defaults to add any new widgets
        if (userRole) {
          const defaults = getRoleBasedWidgetDefaults(userRole);
          const existingEnabled = prefs.enabled || [];
          const defaultEnabled = defaults.enabled || [];
          
          // Find widgets that are in defaults but not in existing preferences
          const missingWidgets = defaultEnabled.filter(widgetId => !existingEnabled.includes(widgetId));
          
          if (missingWidgets.length > 0) {
            // Merge: keep existing preferences, add missing widgets from defaults
            const mergedPreferences: WidgetPreferences = {
              enabled: [...existingEnabled, ...missingWidgets],
              config: prefs.config || defaults.config,
            };
            setPreferences(mergedPreferences);
            // Save merged preferences to user profile (async, don't wait)
            service.savePreferences(mergedPreferences).catch(err => {
              console.warn('Could not save merged preferences:', err);
            });
          } else {
            // No new widgets to add, use existing preferences
            setPreferences(prefs);
          }
        } else {
          setPreferences(prefs);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to widget preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
        // Fall back to role defaults on error
        if (userRole) {
          const defaults = getRoleBasedWidgetDefaults(userRole);
          setPreferences(defaults);
        } else {
          setPreferences({ enabled: [], config: undefined });
        }
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, firebaseService, userRole, service]);

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

