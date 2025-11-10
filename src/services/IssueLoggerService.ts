/**
 * Issue Logger Service
 * Handles error reporting and manual issue logging
 * Integrates with Issue-Logger API for GitHub issue creation
 */

export interface IssueReport {
  title: string;
  body: string;
  imageDataUrl?: string;
  videoWebmBase64?: string;
  labels?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  platform?: 'mobile' | 'web';
}

export interface IssueLoggerConfig {
  apiBaseUrl?: string;
  owner?: string;
  repo?: string;
  enabled?: boolean;
}

class IssueLoggerService {
  private config: IssueLoggerConfig = {};
  private isEnabled: boolean = true;

  /**
   * Initialize the service with configuration
   */
  initialize(config: IssueLoggerConfig) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl || process.env.EXPO_PUBLIC_ISSUE_LOGGER_API_URL,
      owner: config.owner || process.env.EXPO_PUBLIC_ISSUE_LOGGER_OWNER,
      repo: config.repo || process.env.EXPO_PUBLIC_ISSUE_LOGGER_REPO,
      enabled: config.enabled !== false,
    };
    this.isEnabled = this.config.enabled === true && !!this.config.apiBaseUrl;
  }

  /**
   * Report an error automatically
   */
  async reportError(
    error: Error,
    context?: Record<string, unknown>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('Issue Logger disabled, would report:', error);
      return;
    }

    try {
      const issueBody = this.formatErrorReport(error, context, severity);
      
      await this.submitIssue({
        title: `[${severity.toUpperCase()}] ${error.message}`,
        body: issueBody,
        labels: ['bug', `severity-${severity}`, 'platform-mobile', 'auto-reported'],
        severity,
        platform: 'mobile',
      });
    } catch (reportError) {
      console.error('Failed to report error to Issue Logger:', reportError);
    }
  }

  /**
   * Submit a manual issue report
   */
  async submitIssue(report: IssueReport): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'Issue Logger is not enabled or configured',
      };
    }

    if (!this.config.apiBaseUrl) {
      return {
        success: false,
        error: 'Issue Logger API URL not configured',
      };
    }

    try {
      const payload = {
        title: report.title,
        body: report.body,
        imageDataUrl: report.imageDataUrl,
        videoWebmBase64: report.videoWebmBase64,
        labels: report.labels || ['bug', 'platform-mobile', 'manual-report'],
        owner: this.config.owner,
        repo: this.config.repo,
      };

      const response = await fetch(`${this.config.apiBaseUrl}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        issueUrl: data.html_url || data.url,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to submit issue:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Format error report for Issue Logger
   */
  private formatErrorReport(
    error: Error,
    context?: Record<string, unknown>,
    severity: string = 'medium'
  ): string {
    let body = `## Error Message\n\`\`\`\n${error.message}\n\`\`\`\n\n`;

    if (error.stack) {
      body += `## Stack Trace\n\`\`\`\n${error.stack}\n\`\`\`\n\n`;
    }

    if (context && Object.keys(context).length > 0) {
      body += `## Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\n`;
    }

    body += `## Platform Information\n`;
    body += `- **Platform**: Mobile (React Native)\n`;
    body += `- **Severity**: ${severity}\n`;
    body += `- **Timestamp**: ${new Date().toISOString()}\n`;
    body += `- **User Agent**: ${this.getUserAgent()}\n\n`;

    body += `_This issue was automatically reported by The Props List mobile app._`;

    return body;
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    // In React Native, we can use Platform and DeviceInfo if available
    return 'React Native Mobile App';
  }

  /**
   * Check if Issue Logger is enabled and configured
   */
  isConfigured(): boolean {
    return this.isEnabled && !!this.config.apiBaseUrl && !!this.config.owner && !!this.config.repo;
  }
}

export const issueLoggerService = new IssueLoggerService();

