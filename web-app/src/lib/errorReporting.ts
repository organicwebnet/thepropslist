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

class ErrorReportingService {
  private isEnabled: boolean = true;
  private userId?: string;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if error reporting should be enabled
    this.isEnabled = import.meta.env.PROD || 
                    import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true';
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
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error Report:', errorReport);
    }

    // Send to Issue-Logger if available
    await this.sendToIssueLogger(errorReport);
  }

  private async sendToIssueLogger(errorReport: ErrorReport): Promise<void> {
    try {
      const issueLoggerApiUrl = import.meta.env.VITE_ISSUE_LOGGER_API_URL;
      
      if (!issueLoggerApiUrl) {
        console.warn('Issue-Logger API URL not configured. Set VITE_ISSUE_LOGGER_API_URL environment variable.');
        return;
      }

      // Create a comprehensive issue body with error details
      const issueBody = this.formatErrorReportForIssueLogger(errorReport);
      
      const payload = {
        title: `[${errorReport.severity.toUpperCase()}] ${errorReport.message}`,
        body: issueBody,
        labels: [
          'bug',
          `severity-${errorReport.severity}`,
          `platform-${errorReport.platform}`,
          'auto-reported'
        ]
      };

      const response = await fetch(`${issueLoggerApiUrl}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Issue-Logger API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Error reported to Issue-Logger:', result);
    } catch (error) {
      console.error('Failed to send error to Issue-Logger:', error);
      // Fallback to console logging
      console.error('Original error report:', errorReport);
    }
  }

  private formatErrorReportForIssueLogger(errorReport: ErrorReport): string {
    const timestamp = errorReport.timestamp.toISOString();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const url = typeof window !== 'undefined' ? window.location.href : 'Unknown';
    
    let body = `## Error Details

**Message:** ${errorReport.message}
**Severity:** ${errorReport.severity}
**Platform:** ${errorReport.platform}
**Timestamp:** ${timestamp}
**URL:** ${url}
**User Agent:** ${userAgent}`;

    if (errorReport.userId) {
      body += `\n**User ID:** ${errorReport.userId}`;
    }

    if (errorReport.stack) {
      body += `\n\n## Stack Trace\n\`\`\`\n${errorReport.stack}\n\`\`\``;
    }

    if (errorReport.context && Object.keys(errorReport.context).length > 0) {
      body += `\n\n## Context\n\`\`\`json\n${JSON.stringify(errorReport.context, null, 2)}\n\`\`\``;
    }

    body += `\n\n## Browser Information
- **Screen Resolution:** ${typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'Unknown'}
- **Viewport:** ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown'}
- **Device Pixel Ratio:** ${typeof window !== 'undefined' ? window.devicePixelRatio : 'Unknown'}
- **Language:** ${typeof navigator !== 'undefined' ? navigator.language : 'Unknown'}
- **Timezone:** ${typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Unknown'}`;

    return body;
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
  setUserContext(userId: string, _additionalContext?: Record<string, any>) {
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
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Types are already exported as interfaces above

