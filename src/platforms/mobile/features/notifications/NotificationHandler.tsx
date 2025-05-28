import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificationService } from './NotificationService.ts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/types.ts';

export function NotificationHandler() {
  const notificationService = NotificationService.getInstance();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

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
          navigation.navigate<'PropForm'>('PropForm', { id: data.propId });
        }
        break;
      case 'MAINTENANCE_REMINDER':
        // Navigate to maintenance screen
        if (data.propId) {
          navigation.navigate<'PropForm'>('PropForm', { id: data.propId, tab: 'maintenance' });
        }
        break;
      case 'SHOW_REMINDER':
        // Navigate to show details
        if (data.showId) {
          // TODO: Implement show details navigation
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

  return null; // This component doesn't render anything
} 