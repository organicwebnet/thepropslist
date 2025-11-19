import { NotificationPreferences } from '../shared/types/auth';

/**
 * Helper service to check if a user should receive a specific notification type.
 * Returns true by default if preference is not set (opt-out model).
 */
export class NotificationPreferencesService {
  /**
   * Check if user should receive prop status update notifications
   */
  static shouldReceivePropStatusUpdate(preferences?: NotificationPreferences): boolean {
    return preferences?.propStatusUpdates !== false;
  }

  /**
   * Check if user should receive maintenance reminder notifications
   */
  static shouldReceiveMaintenanceReminder(preferences?: NotificationPreferences): boolean {
    return preferences?.maintenanceReminders !== false;
  }

  /**
   * Check if user should receive show reminder notifications
   */
  static shouldReceiveShowReminder(preferences?: NotificationPreferences): boolean {
    return preferences?.showReminders !== false;
  }

  /**
   * Check if user should receive shopping item assigned notifications
   */
  static shouldReceiveShoppingItemAssigned(preferences?: NotificationPreferences): boolean {
    return preferences?.shoppingItemAssigned !== false;
  }

  /**
   * Check if user should receive shopping item approved notifications
   */
  static shouldReceiveShoppingItemApproved(preferences?: NotificationPreferences): boolean {
    return preferences?.shoppingItemApproved !== false;
  }

  /**
   * Check if user should receive shopping item rejected notifications
   */
  static shouldReceiveShoppingItemRejected(preferences?: NotificationPreferences): boolean {
    return preferences?.shoppingItemRejected !== false;
  }

  /**
   * Check if user should receive shopping option selected notifications
   */
  static shouldReceiveShoppingOptionSelected(preferences?: NotificationPreferences): boolean {
    return preferences?.shoppingOptionSelected !== false;
  }

  /**
   * Check if user should receive shopping option added notifications
   */
  static shouldReceiveShoppingOptionAdded(preferences?: NotificationPreferences): boolean {
    return preferences?.shoppingOptionAdded !== false;
  }

  /**
   * Check if user should receive task assigned notifications
   */
  static shouldReceiveTaskAssigned(preferences?: NotificationPreferences): boolean {
    return preferences?.taskAssigned !== false;
  }

  /**
   * Check if user should receive task due soon notifications
   */
  static shouldReceiveTaskDueSoon(preferences?: NotificationPreferences): boolean {
    return preferences?.taskDueSoon !== false;
  }

  /**
   * Check if user should receive task due today notifications
   */
  static shouldReceiveTaskDueToday(preferences?: NotificationPreferences): boolean {
    return preferences?.taskDueToday !== false;
  }

  /**
   * Check if user should receive comment notifications
   */
  static shouldReceiveComments(preferences?: NotificationPreferences): boolean {
    return preferences?.comments !== false;
  }

  /**
   * Check if user should receive system notifications
   */
  static shouldReceiveSystemNotifications(preferences?: NotificationPreferences): boolean {
    return preferences?.systemNotifications !== false;
  }

  /**
   * Get default notification preferences (all enabled)
   */
  static getDefaultPreferences(): NotificationPreferences {
    return {
      propStatusUpdates: true,
      maintenanceReminders: true,
      showReminders: true,
      shoppingItemAssigned: true,
      shoppingItemApproved: true,
      shoppingItemRejected: true,
      shoppingOptionSelected: true,
      shoppingOptionAdded: true,
      taskAssigned: true,
      taskDueSoon: true,
      taskDueToday: true,
      comments: true,
      systemNotifications: true,
    };
  }
}

