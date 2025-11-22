import { NotificationService } from '../platforms/mobile/features/notifications/NotificationService';
import { NotificationPreferencesService } from './notificationPreferences';
import type { NotificationPreferences } from '../shared/types/auth';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import type { UserProfile } from '../shared/types/auth';

/**
 * Helper service to send notifications with automatic preference checking.
 * This service fetches user preferences from Firestore and respects them.
 */
export class NotificationHelper {
  /**
   * Get user preferences from Firestore
   */
  static async getUserPreferences(userId: string, firebaseService: any): Promise<NotificationPreferences | undefined> {
    try {
      const profileDoc = await firebaseService.getDocument<UserProfile>('userProfiles', userId);
      return profileDoc?.data?.notificationPreferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return undefined; // Default to all enabled if fetch fails
    }
  }

  /**
   * Send prop status notification with automatic preference checking
   */
  static async sendPropStatusNotification(
    userId: string,
    propName: string,
    newStatus: string,
    firebaseService: any
  ): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId, firebaseService);
    const notificationService = NotificationService.getInstance();
    return await notificationService.schedulePropStatusNotification(propName, newStatus, preferences);
  }

  /**
   * Send maintenance reminder with automatic preference checking
   */
  static async sendMaintenanceReminder(
    userId: string,
    propName: string,
    dueDate: Date,
    firebaseService: any
  ): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId, firebaseService);
    const notificationService = NotificationService.getInstance();
    return await notificationService.scheduleMaintenanceReminder(propName, dueDate, preferences);
  }

  /**
   * Send show reminder with automatic preference checking
   */
  static async sendShowReminder(
    userId: string,
    showName: string,
    startTime: Date,
    firebaseService: any
  ): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId, firebaseService);
    const notificationService = NotificationService.getInstance();
    return await notificationService.scheduleShowReminder(showName, startTime, preferences);
  }
}


