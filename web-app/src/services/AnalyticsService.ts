/**
 * Analytics Service for tracking user interactions and events
 * This service provides a centralized way to track analytics events
 * and can be easily extended to integrate with external analytics providers
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

class AnalyticsService {
  private isEnabled: boolean;

  constructor() {
    // Enable analytics in production or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
  }

  /**
   * Track an analytics event
   */
  track(event: string, properties?: Record<string, any>, userId?: string): void {
    if (!this.isEnabled) {
      console.log('Analytics (disabled):', event, properties);
      return;
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      userId,
      timestamp: new Date(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics:', analyticsEvent);
    }

    // TODO: Integrate with external analytics service (e.g., Mixpanel, Amplitude, etc.)
    // Example:
    // if (window.mixpanel) {
    //   window.mixpanel.track(event, properties);
    // }
  }

  /**
   * Track add-on purchase attempt
   */
  trackAddOnPurchaseAttempted(
    addOnId: string,
    addOnType: string,
    billingInterval: 'monthly' | 'yearly',
    userPlan: string,
    userId?: string
  ): void {
    this.track('addon_purchase_attempted', {
      addon_id: addOnId,
      addon_type: addOnType,
      billing_interval: billingInterval,
      user_plan: userPlan,
    }, userId);
  }

  /**
   * Track add-on purchase completion
   */
  trackAddOnPurchaseCompleted(
    addOnId: string,
    subscriptionItemId: string,
    userId?: string
  ): void {
    this.track('addon_purchase_completed', {
      addon_id: addOnId,
      subscription_item_id: subscriptionItemId,
    }, userId);
  }

  /**
   * Track add-on purchase failure
   */
  trackAddOnPurchaseFailed(
    addOnId: string,
    error: string,
    userId?: string
  ): void {
    this.track('addon_purchase_failed', {
      addon_id: addOnId,
      error,
    }, userId);
  }

  /**
   * Track availability counter view
   */
  trackAvailabilityCounterViewed(
    type: string,
    currentCount: number,
    limit: number,
    isAtLimit: boolean,
    userPlan: string,
    userId?: string
  ): void {
    this.track('availability_counter_viewed', {
      type,
      current_count: currentCount,
      limit,
      is_at_limit: isAtLimit,
      user_plan: userPlan,
    }, userId);
  }

  /**
   * Track add-ons marketplace view
   */
  trackAddOnsMarketplaceViewed(
    userPlan: string,
    canPurchaseAddOns: boolean,
    userId?: string
  ): void {
    this.track('addons_marketplace_viewed', {
      user_plan: userPlan,
      can_purchase_addons: canPurchaseAddOns,
    }, userId);
  }

  /**
   * Track marketing site add-on view
   */
  trackMarketingAddOnViewed(
    addOnId: string,
    addOnType: string,
    billingInterval: 'monthly' | 'yearly'
  ): void {
    this.track('marketing_addon_viewed', {
      addon_id: addOnId,
      addon_type: addOnType,
      billing_interval: billingInterval,
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();
export default analytics;
