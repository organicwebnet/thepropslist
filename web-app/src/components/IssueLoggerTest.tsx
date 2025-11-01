import React, { useState } from 'react';
import { errorReporting } from '../lib/errorReporting';

/**
 * Test component for Issue-Logger integration
 * This component allows you to test both automatic error reporting
 * and the manual widget functionality
 */
const IssueLoggerTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');

  const testAutomaticErrorReporting = async () => {
    try {
      // Create a test error
      const testError = new Error('Test error for Issue-Logger integration');
      testError.stack = `Error: Test error for Issue-Logger integration
    at IssueLoggerTest.testAutomaticErrorReporting (IssueLoggerTest.tsx:15:7)
    at HTMLButtonElement.onClick (IssueLoggerTest.tsx:25:5)`;

      // Report the error
      await errorReporting.reportError(testError, {
        testType: 'automatic',
        component: 'IssueLoggerTest',
        timestamp: new Date().toISOString(),
        userAction: 'test-button-click'
      }, 'medium');

      setTestResult('✅ Automatic error reporting test completed. Check your GitHub repository for the issue.');
    } catch (error) {
      setTestResult(`❌ Automatic error reporting test failed: ${error}`);
    }
  };

  const testErrorBoundary = () => {
    // This will trigger the error boundary
    throw new Error('Test error boundary error for Issue-Logger integration');
  };

  const testPermissionError = async () => {
    try {
      const testError = new Error('Permission denied: Test permission error');
      await errorReporting.reportPermissionError(testError, {
        show_id: 'test-show-123',
        user_id: 'test-user-456',
        platform: 'web'
      }, 'critical');

      setTestResult('✅ Permission error reporting test completed. Check your GitHub repository for the issue.');
    } catch (error) {
      setTestResult(`❌ Permission error reporting test failed: ${error}`);
    }
  };

  const testShowDeletionError = async () => {
    try {
      const testError = new Error('Show deletion failed: Test deletion error');
      await errorReporting.reportShowDeletionError(testError, {
        show_id: 'test-show-789',
        user_id: 'test-user-101',
        platform: 'web',
        deletion_method: 'permanent',
        associated_data_count: 5,
        error_phase: 'show_deletion'
      }, 'high');

      setTestResult('✅ Show deletion error reporting test completed. Check your GitHub repository for the issue.');
    } catch (error) {
      setTestResult(`❌ Show deletion error reporting test failed: ${error}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Issue-Logger Integration Test
      </h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Manual Testing</h3>
          <p className="text-blue-700 text-sm mb-3">
            Look for the floating action button (🐞) in the bottom-right corner of the page.
            Click it to test the manual issue reporting widget.
          </p>
          <div className="text-sm text-blue-600">
            <p>• Screenshot capture</p>
            <p>• Screen recording</p>
            <p>• Text reports</p>
            <p>• Settings configuration</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Automatic Error Reporting Tests</h3>
          <p className="text-green-700 text-sm mb-3">
            These tests will create issues in your GitHub repository automatically.
          </p>
          
          <div className="space-y-2">
            <button
              onClick={testAutomaticErrorReporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Test General Error Reporting
            </button>
            
            <button
              onClick={testPermissionError}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Test Permission Error Reporting
            </button>
            
            <button
              onClick={testShowDeletionError}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Test Show Deletion Error Reporting
            </button>
            
            <button
              onClick={testErrorBoundary}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Test Error Boundary (Will Crash Component)
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Test Result:</h4>
            <p className="text-gray-700 text-sm">{testResult}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Configuration Check</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>Issue-Logger Enabled:</strong> {import.meta.env.VITE_ISSUE_LOGGER_ENABLED || 'false'}</p>
            <p><strong>API URL:</strong> {import.meta.env.VITE_ISSUE_LOGGER_API_URL || 'Not configured'}</p>
            <p><strong>Owner:</strong> {import.meta.env.VITE_ISSUE_LOGGER_OWNER || 'Not configured'}</p>
            <p><strong>Repository:</strong> {import.meta.env.VITE_ISSUE_LOGGER_REPO || 'Not configured'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueLoggerTest;
