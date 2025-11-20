import type { NotificationType } from '../shared/types/notification';
import { NotificationPreferences } from '../shared/types/auth';
import { NotificationPreferencesService } from './notificationPreferences';

/**
 * Service for managing subscription-related notifications.
 * Checks subscription expiration status and sends appropriate notifications.
 */
export class SubscriptionNotificationService {
  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  static isExpiringSoon(currentPeriodEnd?: number): boolean {
    if (!currentPeriodEnd) return false;
    const now = Date.now();
    const expirationTime = typeof currentPeriodEnd === 'number' 
      ? currentPeriodEnd * 1000 // Convert from seconds to milliseconds if needed
      : currentPeriodEnd;
    const daysUntilExpiration = (expirationTime - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  }

  /**
   * Check if subscription is expiring today
   */
  static isExpiringToday(currentPeriodEnd?: number): boolean {
    if (!currentPeriodEnd) return false;
    const now = Date.now();
    const expirationTime = typeof currentPeriodEnd === 'number' 
      ? currentPeriodEnd * 1000 // Convert from seconds to milliseconds if needed
      : currentPeriodEnd;
    const daysUntilExpiration = (expirationTime - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiration <= 1 && daysUntilExpiration > 0;
  }

  /**
   * Check if subscription has expired
   */
  static isExpired(currentPeriodEnd?: number): boolean {
    if (!currentPeriodEnd) return false;
    const now = Date.now();
    const expirationTime = typeof currentPeriodEnd === 'number' 
      ? currentPeriodEnd * 1000 // Convert from seconds to milliseconds if needed
      : currentPeriodEnd;
    return expirationTime < now;
  }

  /**
   * Get notification type based on subscription status
   */
  static getNotificationType(
    currentPeriodEnd?: number,
    subscriptionStatus?: string
  ): NotificationType | null {
    // Check for payment failure
    if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
      return 'subscription_payment_failed';
    }

    // Check expiration status
    if (this.isExpired(currentPeriodEnd)) {
      return 'subscription_expired';
    }

    if (this.isExpiringToday(currentPeriodEnd)) {
      return 'subscription_expiring_today';
    }

    if (this.isExpiringSoon(currentPeriodEnd)) {
      return 'subscription_expiring_soon';
    }

    return null;
  }

  /**
   * Get notification title based on type
   */
  static getNotificationTitle(type: NotificationType, planName?: string): string {
    const plan = planName ? ` (${planName})` : '';
    switch (type) {
      case 'subscription_expiring_soon':
        return `Subscription Expiring Soon${plan}`;
      case 'subscription_expiring_today':
        return `Subscription Expiring Today${plan}`;
      case 'subscription_expired':
        return `Subscription Expired${plan}`;
      case 'subscription_payment_failed':
        return `Payment Failed${plan}`;
      case 'subscription_upgrade_available':
        return 'Upgrade Available';
      default:
        return 'Subscription Notification';
    }
  }

  /**
   * Get notification message based on type
   */
  static getNotificationMessage(
    type: NotificationType,
    currentPeriodEnd?: number,
    planName?: string
  ): string {
    const plan = planName || 'your subscription';
    
    switch (type) {
      case 'subscription_expiring_soon':
        if (currentPeriodEnd) {
          const expirationTime = typeof currentPeriodEnd === 'number' 
            ? currentPeriodEnd * 1000
            : currentPeriodEnd;
          const daysUntilExpiration = Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24));
          return `Your ${plan} subscription expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}. Renew now to continue enjoying all features.`;
        }
        return `Your ${plan} subscription will expire soon. Renew now to continue enjoying all features.`;
      
      case 'subscription_expiring_today':
        return `Your ${plan} subscription expires today. Renew now to avoid losing access to premium features.`;
      
      case 'subscription_expired':
        return `Your ${plan} subscription has expired. Renew now to restore access to all features.`;
      
      case 'subscription_payment_failed':
        return `Payment for your ${plan} subscription failed. Please update your payment method to continue service.`;
      
      case 'subscription_upgrade_available':
        return `You can upgrade your ${plan} subscription to access more features and higher limits.`;
      
      default:
        return 'Subscription notification';
    }
  }

  /**
   * Check if user should receive notification based on preferences
   */
  static shouldSendNotification(
    type: NotificationType,
    preferences?: NotificationPreferences
  ): boolean {
    switch (type) {
      case 'subscription_expiring_soon':
        return NotificationPreferencesService.shouldReceiveSubscriptionExpiringSoon(preferences);
      case 'subscription_expiring_today':
        return NotificationPreferencesService.shouldReceiveSubscriptionExpiringToday(preferences);
      case 'subscription_expired':
        return NotificationPreferencesService.shouldReceiveSubscriptionExpired(preferences);
      case 'subscription_payment_failed':
        return NotificationPreferencesService.shouldReceiveSubscriptionPaymentFailed(preferences);
      case 'subscription_upgrade_available':
        return NotificationPreferencesService.shouldReceiveSubscriptionUpgradeAvailable(preferences);
      default:
        return false;
    }
  }

  /**
   * Format plan name for display
   */
  static formatPlanName(plan?: string): string {
    if (!plan) return 'subscription';
    const planMap: Record<string, string> = {
      'free': 'Free',
      'starter': 'Starter',
      'standard': 'Standard',
      'pro': 'Pro',
    };
    return planMap[plan.toLowerCase()] || plan;
  }
}

