/**
 * Centralised logging utility for the application
 * Provides consistent logging across all components with proper environment handling
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  component?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatMessage(level: LogLevel, message: string, component?: string): string {
    const timestamp = new Date().toISOString();
    const componentPrefix = component ? `[${component}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${componentPrefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In development, log everything
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private log(level: LogLevel, message: string, data?: any, component?: string): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, component);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data);
        break;
      case 'info':
        console.info(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'error':
        console.error(formattedMessage, data);
        break;
    }
  }

  debug(message: string, data?: any, component?: string): void {
    this.log('debug', message, data, component);
  }

  info(message: string, data?: any, component?: string): void {
    this.log('info', message, data, component);
  }

  warn(message: string, data?: any, component?: string): void {
    this.log('warn', message, data, component);
  }

  error(message: string, data?: any, component?: string): void {
    this.log('error', message, data, component);
  }

  // Specialised logging methods for common scenarios
  taskBoard(message: string, data?: any): void {
    this.info(message, data, 'TaskBoard');
  }

  taskBoardError(message: string, error?: any): void {
    this.error(message, error, 'TaskBoard');
  }

  mentionData(message: string, data?: any): void {
    this.debug(message, data, 'MentionData');
  }

  firebase(message: string, data?: any): void {
    this.debug(message, data, 'Firebase');
  }

  firebaseError(message: string, error?: any): void {
    this.error(message, error, 'Firebase');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogLevel, LogEntry };
