import { useEffect, useRef } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionNotificationService } from '../services/subscriptionNotificationService';
import type { NotificationType } from '../shared/types/notification';
import { NotificationService } from '../platforms/mobile/features/notifications/NotificationService';
import { NotificationPreferencesService } from '../services/notificationPreferences';

/**
 * Hook to automatically check subscription status and send notifications
 * when subscription is expiring or expired.
 * 
 * This hook should be used in a component that's always mounted (like App.tsx)
 * to periodically check subscription status.
 */
export function useSubscriptionNotifications() {
  const { plan, status, currentPeriodEnd } = useSubscription();
  const { userProfile } = useAuth();
  const lastNotificationType = useRef<NotificationType | null>(null);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only check if user has a subscription (not free or exempt)
    if (plan === 'free' || status === 'exempt' || !currentPeriodEnd) {
      return;
    }

    const checkAndSendNotification = async () => {
      try {
        const notificationType = SubscriptionNotificationService.getNotificationType(
          currentPeriodEnd,
          status
        );

        // Only send notification if:
        // 1. There's a notification type to send
        // 2. User preferences allow it
        // 3. We haven't already sent this notification type
        if (
          notificationType &&
          notificationType !== lastNotificationType.current &&
          SubscriptionNotificationService.shouldSendNotification(
            notificationType,
            userProfile?.notificationPreferences
          )
        ) {
          const planName = SubscriptionNotificationService.formatPlanName(plan);
          const title = SubscriptionNotificationService.getNotificationTitle(
            notificationType,
            planName
          );
          const message = SubscriptionNotificationService.getNotificationMessage(
            notificationType,
            currentPeriodEnd,
            planName
          );

          // Send local notification (for mobile app)
          const notificationService = NotificationService.getInstance();
          await notificationService.scheduleNotification({
            title,
            body: message,
            data: {
              type: notificationType,
              subscriptionPlan: plan,
              currentPeriodEnd,
            },
          });

          // Update last notification type to prevent duplicate notifications
          lastNotificationType.current = notificationType;
        }
      } catch (error) {
        console.error('Error checking subscription notifications:', error);
      }
    };

    // Check immediately
    checkAndSendNotification();

    // Check every hour (subscription status doesn't change frequently)
    checkInterval.current = setInterval(checkAndSendNotification, 60 * 60 * 1000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [plan, status, currentPeriodEnd, userProfile?.notificationPreferences]);

  // Reset last notification type when subscription changes
  useEffect(() => {
    lastNotificationType.current = null;
  }, [plan, status, currentPeriodEnd]);
}

