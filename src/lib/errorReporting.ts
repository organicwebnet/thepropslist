/**
 * Error reporting service for production error tracking
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  timestamp: Date;
  platform: 'mobile' | 'web';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ShowDeletionErrorContext {
  show_id: string;
  user_id: string;
  platform: 'mobile' | 'web';
  deletion_method: 'permanent' | 'archive';
  associated_data_count?: number;
  error_phase: 'attempt' | 'associated_data' | 'show_deletion' | 'logging';
}

export interface BiometricErrorContext {
  user_id: string;
  platform: 'mobile' | 'web';
  biometric_type?: string;
  device_capabilities?: {
    has_hardware: boolean;
    is_enrolled: boolean;
    supported_types: string[];
  };
  operation: 'setup' | 'authentication' | 'capability_check' | 'settings_change';
  error_code?: string;
}

class ErrorReportingService {
  private isEnabled: boolean = true;
  private userId?: string;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if error reporting should be enabled
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    process.env.REACT_APP_ERROR_REPORTING_ENABLED === 'true';
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    if (!this.isEnabled) {
      console.log('Error reporting disabled, would report:', errorReport);
      return;
    }

    try {
      // Add user ID if available
      if (this.userId && !errorReport.userId) {
        errorReport.userId = this.userId;
      }

      // Send to error reporting service (implement based on your provider)
      await this.sendToErrorReportingProvider(errorReport);
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  private async sendToErrorReportingProvider(errorReport: ErrorReport): Promise<void> {
    // TODO: Implement actual error reporting provider integration
    // Examples: Sentry, Bugsnag, Rollbar, etc.
    
    // For now, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', errorReport);
    }

    // Example implementation for Sentry:
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(new Error(errorReport.message), {
    //     tags: {
    //       platform: errorReport.platform,
    //       severity: errorReport.severity,
    //     },
    //     user: {
    //       id: errorReport.userId,
    //     },
    //     extra: errorReport.context,
    //   });
    // }

    // Example implementation for Bugsnag:
    // if (typeof Bugsnag !== 'undefined') {
    //   Bugsnag.notify(new Error(errorReport.message), (event) => {
    //     event.setUser(errorReport.userId);
    //     event.addMetadata('context', errorReport.context);
    //     event.addMetadata('platform', { platform: errorReport.platform });
    //     event.addMetadata('severity', { level: errorReport.severity });
    //   });
    // }
  }

  // General error reporting methods
  async reportError(
    error: Error, 
    context?: Record<string, any>, 
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      platform: this.detectPlatform(),
      severity,
    };

    await this.sendErrorReport(errorReport);
  }

  async reportShowDeletionError(
    error: Error,
    context: ShowDeletionErrorContext,
    severity: ErrorReport['severity'] = 'high'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: `Show deletion failed: ${error.message}`,
      stack: error.stack,
      context: {
        ...context,
        error_message: error.message,
        error_stack: error.stack,
      },
      timestamp: new Date(),
      platform: context.platform,
      severity,
    };

    await this.sendErrorReport(errorReport);
  }

  async reportPermissionError(
    error: Error,
    context: { show_id: string; user_id: string; platform: 'mobile' | 'web' },
    severity: ErrorReport['severity'] = 'critical'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: `Permission denied for show deletion: ${error.message}`,
      stack: error.stack,
      context: {
        ...context,
        error_type: 'permission_denied',
        error_message: error.message,
      },
      timestamp: new Date(),
      platform: context.platform,
      severity,
    };

    await this.sendErrorReport(errorReport);
  }

  private detectPlatform(): 'mobile' | 'web' {
    // Detect platform based on environment
    if (typeof window !== 'undefined' && window.navigator) {
      return 'web';
    }
    return 'mobile';
  }

  // Set user context for all future error reports
  setUserContext(userId: string, additionalContext?: Record<string, any>) {
    this.userId = userId;
    // Could also set additional user context here
  }

  // Add breadcrumb for debugging
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (this.isEnabled) {
      console.log(`Breadcrumb [${category}]: ${message}`, data);
      // Could send to error reporting service for context
    }
  }

  // Biometric error reporting methods
  async reportBiometricError(
    error: Error,
    context: BiometricErrorContext,
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: `Biometric ${context.operation} failed: ${error.message}`,
      stack: error.stack,
      context: {
        ...context,
        error_message: error.message,
        error_stack: error.stack,
        error_type: 'biometric_error',
      },
      timestamp: new Date(),
      platform: context.platform,
      severity,
    };

    await this.sendErrorReport(errorReport);
  }

  async reportBiometricCapabilityError(
    error: Error,
    context: Omit<BiometricErrorContext, 'operation'>,
    severity: ErrorReport['severity'] = 'low'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: `Biometric capability check failed: ${error.message}`,
      stack: error.stack,
      context: {
        ...context,
        operation: 'capability_check',
        error_message: error.message,
        error_stack: error.stack,
        error_type: 'biometric_capability_error',
      },
      timestamp: new Date(),
      platform: context.platform,
      severity,
    };

    await this.sendErrorReport(errorReport);
  }

  async reportBiometricAuthenticationError(
    error: Error,
    context: Omit<BiometricErrorContext, 'operation'>,
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: `Biometric authentication failed: ${error.message}`,
      stack: error.stack,
      context: {
        ...context,
        operation: 'authentication',
        error_message: error.message,
        error_stack: error.stack,
        error_type: 'biometric_authentication_error',
      },
      timestamp: new Date(),
      platform: context.platform,
      severity,
    };

    await this.sendErrorReport(errorReport);
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Export types for use in other modules
export type { ErrorReport, ShowDeletionErrorContext, BiometricErrorContext };
