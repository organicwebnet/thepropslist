import { useEffect } from 'react';

interface IssueLoggerConfig {
  apiBaseUrl?: string;
  owner?: string;
  repo?: string;
  cssUrl?: string;
}

declare global {
  interface Window {
    IssueLogger?: IssueLoggerConfig;
    __issueLoggerInjected?: boolean;
  }
}

interface IssueLoggerWidgetProps {
  apiBaseUrl?: string;
  owner?: string;
  repo?: string;
  cssUrl?: string;
  enabled?: boolean;
}

const IssueLoggerWidget: React.FC<IssueLoggerWidgetProps> = ({
  apiBaseUrl,
  owner,
  repo,
  cssUrl,
  enabled = true
}) => {
  useEffect(() => {
    if (!enabled) return;

    // Configure Issue-Logger
    window.IssueLogger = {
      apiBaseUrl: apiBaseUrl || import.meta.env.VITE_ISSUE_LOGGER_API_URL,
      owner: owner || import.meta.env.VITE_ISSUE_LOGGER_OWNER,
      repo: repo || import.meta.env.VITE_ISSUE_LOGGER_REPO,
      cssUrl: cssUrl || '/widget/issueWidget.css'
    };

    // Load the Issue-Logger widget script
    const loadIssueLogger = () => {
      // Check if already loaded
      if (window.__issueLoggerInjected) {
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="issueWidget.js"]');
      if (existingScript) {
        return;
      }

      const script = document.createElement('script');
      script.src = '/widget/issueWidget.js';
      script.async = true;
      script.onload = () => {
        console.log('Issue-Logger widget loaded successfully');
      };
      script.onerror = (error) => {
        console.error('Failed to load Issue-Logger widget:', error);
      };
      
      document.head.appendChild(script);
    };

    // Load the widget
    loadIssueLogger();

    // Cleanup function
    return () => {
      // Remove the widget if needed
      const widget = document.querySelector('#issue-logger-widget');
      if (widget) {
        widget.remove();
      }
      
      // Remove the FAB button
      const fab = document.querySelector('.il-fab');
      if (fab) {
        fab.remove();
      }
      
      // Remove the menu if open
      const menu = document.querySelector('.il-fab-menu');
      if (menu) {
        menu.remove();
      }
    };
  }, [apiBaseUrl, owner, repo, cssUrl, enabled]);

  // This component doesn't render anything visible
  return null;
};

export default IssueLoggerWidget;
