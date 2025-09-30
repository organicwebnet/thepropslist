/**
 * Analytics service for tracking user actions and system events
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

export interface ShowDeletionEvent {
  show_id: string;
  user_id: string;
  platform: 'mobile' | 'web';
  associated_data_count?: number;
  deletion_method: 'permanent' | 'archive';
  success: boolean;
  error_message?: string;
}

export interface ShowDeletionAttemptEvent {
  show_id: string;
  user_id: string;
  platform: 'mobile' | 'web';
  deletion_method: 'permanent' | 'archive';
}

export interface BiometricSetupEvent {
  user_id: string;
  platform: 'mobile' | 'web';
  biometric_type?: string;
  device_capabilities?: {
    has_hardware: boolean;
    is_enrolled: boolean;
    supported_types: string[];
  };
  success: boolean;
  error_message?: string;
}

export interface BiometricAuthenticationEvent {
  user_id: string;
  platform: 'mobile' | 'web';
  biometric_type?: string;
  success: boolean;
  error_message?: string;
  context: 'setup' | 'login' | 'settings';
}

class AnalyticsService {
  private isEnabled: boolean = true;
  private userId?: string;

  constructor() {
    // Initialize analytics service
    this.initialize();
  }

  private initialize() {
    // Check if analytics should be enabled
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isEnabled) {
      console.log('Analytics disabled, would track:', event);
      return;
    }

    try {
      // Add user ID if available
      if (this.userId && !event.userId) {
        event.userId = this.userId;
      }

      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      // Send to analytics service (implement based on your analytics provider)
      await this.sendToAnalyticsProvider(event);
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  private async sendToAnalyticsProvider(event: AnalyticsEvent): Promise<void> {
    // TODO: Implement actual analytics provider integration
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    
    // For now, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }

    // Example implementation for Google Analytics 4:
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', event.event, {
    //     ...event.properties,
    //     user_id: event.userId,
    //   });
    // }

    // Example implementation for Mixpanel:
    // if (typeof mixpanel !== 'undefined') {
    //   mixpanel.track(event.event, {
    //     ...event.properties,
    //     distinct_id: event.userId,
    //   });
    // }
  }

  // Show deletion specific tracking methods
  async trackShowDeletionAttempt(event: ShowDeletionAttemptEvent): Promise<void> {
    await this.trackEvent({
      event: 'show_deletion_attempted',
      properties: {
        show_id: event.show_id,
        platform: event.platform,
        deletion_method: event.deletion_method,
      },
      userId: event.user_id,
    });
  }

  async trackShowDeletionCompleted(event: ShowDeletionEvent): Promise<void> {
    await this.trackEvent({
      event: 'show_deletion_completed',
      properties: {
        show_id: event.show_id,
        platform: event.platform,
        associated_data_count: event.associated_data_count,
        deletion_method: event.deletion_method,
        success: event.success,
        error_message: event.error_message,
      },
      userId: event.user_id,
    });
  }

  async trackShowDeletionFailed(event: ShowDeletionEvent): Promise<void> {
    await this.trackEvent({
      event: 'show_deletion_failed',
      properties: {
        show_id: event.show_id,
        platform: event.platform,
        deletion_method: event.deletion_method,
        error_message: event.error_message,
      },
      userId: event.user_id,
    });
  }

  // General analytics methods
  async trackUserAction(action: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event: 'user_action',
      properties: {
        action,
        ...properties,
      },
    });
  }

  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event: 'error_occurred',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      },
    });
  }

  async trackPerformance(metric: string, value: number, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      event: 'performance_metric',
      properties: {
        metric,
        value,
        ...properties,
      },
    });
  }

  // Biometric analytics methods
  async trackBiometricSetupOffered(event: Omit<BiometricSetupEvent, 'success' | 'error_message'>): Promise<void> {
    await this.trackEvent({
      event: 'biometric_setup_offered',
      properties: {
        platform: event.platform,
        biometric_type: event.biometric_type,
        device_capabilities: event.device_capabilities,
      },
      userId: event.user_id,
    });
  }

  async trackBiometricSetupCompleted(event: BiometricSetupEvent): Promise<void> {
    await this.trackEvent({
      event: 'biometric_setup_completed',
      properties: {
        platform: event.platform,
        biometric_type: event.biometric_type,
        device_capabilities: event.device_capabilities,
        success: event.success,
        error_message: event.error_message,
      },
      userId: event.user_id,
    });
  }

  async trackBiometricSetupSkipped(event: Omit<BiometricSetupEvent, 'success' | 'error_message'>): Promise<void> {
    await this.trackEvent({
      event: 'biometric_setup_skipped',
      properties: {
        platform: event.platform,
        biometric_type: event.biometric_type,
        device_capabilities: event.device_capabilities,
      },
      userId: event.user_id,
    });
  }

  async trackBiometricAuthentication(event: BiometricAuthenticationEvent): Promise<void> {
    await this.trackEvent({
      event: 'biometric_authentication',
      properties: {
        platform: event.platform,
        biometric_type: event.biometric_type,
        success: event.success,
        error_message: event.error_message,
        context: event.context,
      },
      userId: event.user_id,
    });
  }

  async trackBiometricSettingsChanged(event: {
    user_id: string;
    platform: 'mobile' | 'web';
    biometric_type?: string;
    action: 'enabled' | 'disabled';
  }): Promise<void> {
    await this.trackEvent({
      event: 'biometric_settings_changed',
      properties: {
        platform: event.platform,
        biometric_type: event.biometric_type,
        action: event.action,
      },
      userId: event.user_id,
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types for use in other modules
export type { AnalyticsEvent, ShowDeletionEvent, ShowDeletionAttemptEvent, BiometricSetupEvent, BiometricAuthenticationEvent };
