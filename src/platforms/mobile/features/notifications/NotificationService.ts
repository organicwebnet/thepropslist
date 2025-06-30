import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {
    this.configureNotifications();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private configureNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleNotification({ title, body, data }: NotificationData): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Immediate notification
    });
  }

  async schedulePropStatusNotification(propName: string, newStatus: string): Promise<string> {
    return await this.scheduleNotification({
      title: 'Prop Status Update',
      body: `${propName} is now ${newStatus}`,
      data: { type: 'PROP_STATUS_UPDATE', propName, status: newStatus },
    });
  }

  async scheduleMaintenanceReminder(propName: string, dueDate: Date): Promise<string> {
    return await this.scheduleNotification({
      title: 'Maintenance Reminder',
      body: `${propName} is due for maintenance on ${dueDate.toLocaleDateString()}`,
      data: { type: 'MAINTENANCE_REMINDER', propName, dueDate: dueDate.toISOString() },
    });
  }

  async scheduleShowReminder(showName: string, startTime: Date): Promise<string> {
    return await this.scheduleNotification({
      title: 'Show Starting Soon',
      body: `${showName} is starting at ${startTime.toLocaleTimeString()}`,
      data: { type: 'SHOW_REMINDER', showName, startTime: startTime.toISOString() },
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  addNotificationReceivedListener(
    listener: (event: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (event: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }
} 
