import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificationService } from './NotificationService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/types';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAuth } from '../../../../contexts/AuthContext';
import type { FirebaseDocument } from '../../../../shared/services/firebase/types';

// Local type definition for notifications (matches web-app notification structure)
interface AppNotification {
  id?: string;
  userId: string;
  showId?: string;
  type: 'task_assigned' | 'task_due_soon' | 'task_due_today' | string;
  title: string;
  message?: string;
  entity?: { kind: 'task' | 'prop' | 'packList' | 'container' | 'shopping_item'; id: string };
  read: boolean;
  createdAt: Date | string | { toDate: () => Date };
  metadata?: Record<string, any>;
  boardId?: string;
  cardId?: string;
}

export function NotificationHandler() {
  const notificationService = NotificationService.getInstance();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { service, isInitialized } = useFirebase();
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const processedNotificationIds = useRef<Set<string>>(new Set());

  const registerForPushNotifications = useCallback(async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      // TODO: Send this token to your server
      console.log('Push Notification Token:', token);
      setExpoPushToken(token);
    }
  }, [notificationService, setExpoPushToken]);

  const handleNotification = useCallback((type: string, notification: Notifications.Notification) => {
    switch (type) {
      case 'PROP_STATUS_UPDATE':
        // Update local state or show UI feedback
        break;
      case 'MAINTENANCE_REMINDER':
        // Show maintenance details
        break;
      case 'SHOW_REMINDER':
        // Show show details
        break;
      case 'task_assigned':
        // Task assignment notification - already handled via Firestore listener
        break;
    }
  }, []);

  const handleNotificationResponse = useCallback((
    type: string,
    response: Notifications.NotificationResponse
  ) => {
    const data = response.notification.request.content.data;

    switch (type) {
      case 'PROP_STATUS_UPDATE':
        // Navigate to prop details
        if (data.propId) {
          navigation.navigate('PropForm', { id: String(data.propId) });
        }
        break;
      case 'MAINTENANCE_REMINDER':
        // Navigate to maintenance screen
        if (data.propId) {
          navigation.navigate('PropForm', { id: String(data.propId), tab: 'maintenance' });
        }
        break;
      case 'SHOW_REMINDER':
        // Navigate to show details
        if (data.showId) {
          // TODO: Implement show details navigation
        }
        break;
      case 'task_assigned':
        // Navigate to task board or task details
        if (data.boardId && data.cardId) {
          // Navigate to the task board with the specific card selected
          // Adjust navigation path based on your app's routing structure
          navigation.navigate('Home' as any, {
            screen: 'Tasks',
            params: { boardId: String(data.boardId), cardId: String(data.cardId) }
          });
        } else if (data.boardId) {
          navigation.navigate('Home' as any, {
            screen: 'Tasks',
            params: { boardId: String(data.boardId) }
          });
        }
        break;
    }
  }, [navigation]);

  useEffect(() => {
    registerForPushNotifications();

    // Listen for incoming notifications
    notificationListener.current = notificationService.addNotificationReceivedListener(
      notificationArg => {
        const type = notificationArg.request.content.data?.type as string;
        handleNotification(type, notificationArg);
      }
    );

    // Listen for notification responses
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      response => {
        const type = response.notification.request.content.data?.type as string;
        handleNotificationResponse(type, response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerForPushNotifications, notificationService, handleNotification, handleNotificationResponse]);

  // Listen to Firestore notifications for the current user
  useEffect(() => {
    if (!service || !user?.uid || !isInitialized) {
      return;
    }

    // Track when listener starts to avoid showing old notifications
    const listenerStartTime = Date.now();

    // Listen to notifications collection for this user
    const unsubscribe = service.listenToCollection<AppNotification>(
      'notifications',
      (notifications: FirebaseDocument<AppNotification>[]) => {
        // Process new notifications
        notifications.forEach((notificationDoc) => {
          const notification = notificationDoc.data;
          const notificationId = notificationDoc.id;

          // Skip if we've already processed this notification
          if (processedNotificationIds.current.has(notificationId)) {
            return;
          }

          // Only process unread notifications of type task_assigned
          if (notification.type === 'task_assigned' && !notification.read) {
            // Convert createdAt to Date if needed
            let createdAt: Date;
            if (notification.createdAt instanceof Date) {
              createdAt = notification.createdAt;
            } else if (notification.createdAt && typeof (notification.createdAt as any).toDate === 'function') {
              // Firestore Timestamp
              createdAt = (notification.createdAt as any).toDate();
            } else if (typeof notification.createdAt === 'string') {
              createdAt = new Date(notification.createdAt);
            } else {
              createdAt = new Date();
            }

            // Only show notifications created within the last 5 minutes to avoid showing old notifications
            // when the listener first connects
            const notificationTime = createdAt.getTime();
            const fiveMinutesAgo = listenerStartTime - (5 * 60 * 1000);
            
            if (notificationTime >= fiveMinutesAgo) {
              // Mark as processed to avoid duplicate notifications
              processedNotificationIds.current.add(notificationId);

              // Show local notification
              notificationService.scheduleNotification({
                title: notification.title || 'Task Assigned',
                body: notification.message || 'You have been assigned to a new task',
                data: {
                  type: 'task_assigned',
                  notificationId,
                  boardId: (notification as any).boardId,
                  cardId: (notification as any).cardId,
                  showId: notification.showId,
                },
              }).catch((error) => {
                console.error('Failed to schedule task assignment notification:', error);
              });
            } else {
              // Mark old notifications as processed so we don't check them again
              processedNotificationIds.current.add(notificationId);
            }
          }
        });
      },
      (error: Error) => {
        console.error('Error listening to notifications:', error);
      },
      {
        where: [
          ['userId', '==', user.uid],
          ['read', '==', false],
        ],
        orderBy: [['createdAt', 'desc']],
      }
    );

    return () => {
      unsubscribe();
    };
  }, [service, user?.uid, notificationService, isInitialized]);

  return null; // This component doesn't render anything
} 
