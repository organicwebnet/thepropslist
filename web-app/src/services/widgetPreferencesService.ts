/**
 * Widget Preferences Service
 * 
 * Handles saving and loading widget preferences from Firestore user profile
 */

import React from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import type { FirebaseService } from '../../shared/services/firebase/types';
import type { WidgetPreferences, WidgetId } from '../components/DashboardWidgets/types';

export class WidgetPreferencesService {
  private service: FirebaseService;
  private userId: string | null;

  constructor(service: FirebaseService, userId: string | null) {
    this.service = service;
    this.userId = userId;
  }

  /**
   * Load widget preferences from user profile
   */
  async loadPreferences(): Promise<WidgetPreferences | null> {
    if (!this.userId || !this.service) {
      return null;
    }

    try {
      const userDoc = await this.service.getDocument('userProfiles', this.userId);
      if (!userDoc?.data) {
        return null;
      }

      const dashboardWidgets = userDoc.data.dashboardWidgets;
      if (!dashboardWidgets) {
        return null;
      }

      return {
        enabled: dashboardWidgets.enabled || [],
        config: dashboardWidgets.config || undefined,
      };
    } catch (error) {
      console.error('Error loading widget preferences:', error);
      return null;
    }
  }

  /**
   * Save widget preferences to user profile
   */
  async savePreferences(preferences: WidgetPreferences): Promise<void> {
    if (!this.userId || !this.service) {
      throw new Error('User not authenticated or service not available');
    }

    try {
      await this.service.updateDocument('userProfiles', this.userId, {
        dashboardWidgets: {
          enabled: preferences.enabled,
          config: preferences.config || {},
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving widget preferences:', error);
      throw error;
    }
  }

  /**
   * Toggle a widget on/off
   */
  async toggleWidget(widgetId: WidgetId, enabled: boolean): Promise<void> {
    const current = await this.loadPreferences();
    const enabledWidgets = current?.enabled || [];

    let newEnabled: WidgetId[];
    if (enabled) {
      // Add widget if not already present
      newEnabled = enabledWidgets.includes(widgetId)
        ? enabledWidgets
        : [...enabledWidgets, widgetId];
    } else {
      // Remove widget
      newEnabled = enabledWidgets.filter(id => id !== widgetId);
    }

    await this.savePreferences({
      enabled: newEnabled,
      config: current?.config || {},
    });
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(widgetId: WidgetId, config: Record<string, any>): Promise<void> {
    const current = await this.loadPreferences();
    await this.savePreferences({
      enabled: current?.enabled || [],
      config: {
        ...(current?.config || undefined),
        [widgetId]: config,
      },
    });
  }
}

/**
 * Hook to use WidgetPreferencesService
 * Note: Service instance is recreated on each render, but FirebaseService is stable from context
 */
export function useWidgetPreferencesService(): WidgetPreferencesService {
  const { service } = useFirebase();
  const { user } = useWebAuth();

  // Use useMemo to avoid recreating service unnecessarily
  // The FirebaseService from context is stable, so this is safe
  return React.useMemo(
    () => new WidgetPreferencesService(service, user?.uid || null),
    [service, user?.uid]
  );
}

