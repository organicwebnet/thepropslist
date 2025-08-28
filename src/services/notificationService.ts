import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface ShoppingNotification {
  id: string;
  type: 'option_selected';
  shoppingItemId: string;
  optionIndex: number;
  message: string;
  createdAt: string;
  userId: string; // The user who should receive the notification
  data: {
    shoppingItemId: string;
    optionIndex: number;
    itemDescription: string;
    shopName?: string;
    price: number;
  };
}

export class NotificationService {
  static async initialize() {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Get push token for remote notifications
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return await Notifications.getExpoPushTokenAsync();
  }

  static async sendShoppingOptionSelectedNotification(
    recipientUserId: string,
    shoppingItemId: string,
    optionIndex: number,
    itemDescription: string,
    shopName?: string,
    price?: number
  ) {
    try {
      const notification: ShoppingNotification = {
        id: `shopping_${Date.now()}`,
        type: 'option_selected',
        shoppingItemId,
        optionIndex,
        message: `Your option from ${shopName || 'a shop'} has been selected to buy!`,
        createdAt: new Date().toISOString(),
        userId: recipientUserId,
        data: {
          shoppingItemId,
          optionIndex,
          itemDescription,
          shopName,
          price: price || 0,
        },
      };

      // Send local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🛒 Shopping Option Selected!',
          body: `Your ${itemDescription} option from ${shopName || 'a shop'} was chosen to buy${price ? ` for £${price.toFixed(2)}` : ''}`,
          data: notification.data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      // Store notification in user's collection (optional - for notification history)
      // This could be implemented with Firebase Firestore

      return notification;
    } catch (error) {
      console.error('Error sending shopping notification:', error);
      throw error;
    }
  }

  static async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    if (data.shoppingItemId && data.optionIndex !== undefined) {
      // Navigate to the specific shopping item and option
      // This should be implemented in the app's navigation system
      return {
        route: '/(tabs)/shopping/[id]',
        params: { 
          id: data.shoppingItemId,
          highlightOption: data.optionIndex 
        }
      };
    }
    
    return null;
  }

  static setupNotificationListeners() {
    // Listen for notifications when app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Listen for notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const navigationData = NotificationService.handleNotificationResponse(response);
      // This should trigger navigation in the app
    });

    return {
      foregroundSubscription,
      responseSubscription,
    };
  }
} 