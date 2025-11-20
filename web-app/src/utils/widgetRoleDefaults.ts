/**
 * Widget Role Defaults
 * 
 * Defines which widgets are enabled by default for each user role
 */

import type { WidgetPreferences } from '../components/DashboardWidgets/types';
import { UserRole } from '../../shared/types/auth';

/**
 * Get default widget preferences for a user role
 */
export function getRoleBasedWidgetDefaults(role: string): WidgetPreferences {
  // Universal widgets (shown to all roles)
  const universalWidgets = ['my-tasks', 'taskboard-quick-links'] as const;

  switch (role) {
    case UserRole.PROPS_SUPERVISOR:
    case UserRole.GOD:
    case UserRole.ADMIN:
      return {
        enabled: [
          ...universalWidgets,
          'taskboard-activity-summary',
          'task-planning-assistant',
          'upcoming-deadlines',
          'cut-props-packing',
          'props-needing-work',
          'shopping-approval-needed',
        ],
        config: {},
      };

    case UserRole.STAGE_MANAGER:
    case UserRole.ASSISTANT_STAGE_MANAGER:
      return {
        enabled: [
          ...universalWidgets,
          'taskboard-activity-summary',
          'upcoming-deadlines',
          'shopping-approval-needed',
        ],
        config: {},
      };

    case UserRole.PROP_MAKER:
    case UserRole.PROPS_SUPERVISOR_ASSISTANT:
      return {
        enabled: [
          ...universalWidgets,
          'upcoming-deadlines',
          'cut-props-packing',
          'props-needing-work',
        ],
        config: {},
      };

    case UserRole.ART_DIRECTOR:
      return {
        enabled: [
          ...universalWidgets,
          'taskboard-activity-summary',
          'upcoming-deadlines',
          'shopping-approval-needed',
        ],
        config: {},
      };

    case UserRole.EDITOR:
    case UserRole.VIEWER:
    default:
      return {
        enabled: [
          ...universalWidgets,
          'upcoming-deadlines',
        ],
        config: {},
      };
  }
}







