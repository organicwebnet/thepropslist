import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, HelpCircle, Sun, Moon, Type } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import type { ConfigFormData, Currency } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useFont, FontOption } from '../contexts/FontContext';

const currencies: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

interface TestResults {
  firebase: boolean | null;
  googleSheets: boolean | null;
  googleDocs: boolean | null;
}

export interface HelpInfo {
  [key: string]: {
    description: string;
    link?: string;
  };
}

const helpInfo: HelpInfo = {
  FIREBASE_API_KEY: {
    description: "Found in your Firebase project settings under 'General' tab > 'Project settings' > 'Web API Key'",
    link: "https://console.firebase.google.com/project/_/settings/general"
  },
  FIREBASE_AUTH_DOMAIN: {
    description: "Found in Firebase SDK configuration. Format: your-project-id.firebaseapp.com",
    link: "https://console.firebase.google.com/project/_/settings/general"
  },
  FIREBASE_PROJECT_ID: {
    description: "Your Firebase project ID, found in project settings",
    link: "https://console.firebase.google.com/project/_/settings/general"
  },
  FIREBASE_STORAGE_BUCKET: {
    description: "Found in Firebase SDK configuration. Format: your-project-id.appspot.com",
    link: "https://console.firebase.google.com/project/_/settings/general"
  },
  FIREBASE_MESSAGING_SENDER_ID: {
    description: "Found in Firebase project settings under 'Cloud Messaging'",
    link: "https://console.firebase.google.com/project/_/settings/cloudmessaging"
  },
  FIREBASE_APP_ID: {
    description: "Found in Firebase SDK configuration when you register your web app",
    link: "https://console.firebase.google.com/project/_/settings/general"
  },
  GOOGLE_SHEETS_API_KEY: {
    description: "Create in Google Cloud Console > APIs & Services > Credentials. Enable Google Sheets API first.",
    link: "https://console.cloud.google.com/apis/credentials"
  },
  GOOGLE_DOCS_API_KEY: {
    description: "Create in Google Cloud Console > APIs & Services > Credentials. Enable Google Docs API first.",
    link: "https://console.cloud.google.com/apis/credentials"
  },
  CURRENCY: {
    description: "Select the currency to be used throughout the application"
  },
  SHOW_NAME: {
    description: "Enter the name of your show"
  },
  SHOW_ACTS: {
    description: "Enter the number of acts in your show"
  },
  SHOW_SCENES: {
    description: "Enter the total number of scenes across all acts"
  }
};

export type TabType = 'show' | 'api' | 'appearance';

const getInitialConfig = (): ConfigFormData => {
  const savedConfig = localStorage.getItem('apiConfig');
  if (savedConfig) {
    return JSON.parse(savedConfig);
  }

  // Initialize with environment variables
  return {
    FIREBASE_API_KEY: import.meta.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: import.meta.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: import.meta.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: import.meta.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: import.meta.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    GOOGLE_SHEETS_API_KEY: import.meta.env.EXPO_PUBLIC_GOOGLE_SHEETS_API_KEY || '',
    GOOGLE_DOCS_API_KEY: import.meta.env.EXPO_PUBLIC_GOOGLE_DOCS_API_KEY || '',
    CURRENCY: import.meta.env.EXPO_PUBLIC_CURRENCY || 'USD',
    SHOW_NAME: import.meta.env.EXPO_PUBLIC_SHOW_NAME || '',
    SHOW_ACTS: parseInt(import.meta.env.EXPO_PUBLIC_SHOW_ACTS || '1', 10),
    SHOW_SCENES: parseInt(import.meta.env.EXPO_PUBLIC_SHOW_SCENES || '1', 10)
  };
};

export function ConfigForm(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('show');
  const [isTesting, setIsTesting] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResults>({
    firebase: null,
    googleSheets: null,
    googleDocs: null
  });
  const [config, setConfig] = useState<ConfigFormData>(getInitialConfig());
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  useEffect(() => {
    setConfig(getInitialConfig());
  }, []);

  const testFirebaseConnection = async () => {
    try {
      const testApp = initializeApp({
        apiKey: config.FIREBASE_API_KEY,
        authDomain: config.FIREBASE_AUTH_DOMAIN,
        projectId: config.FIREBASE_PROJECT_ID,
        storageBucket: config.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
        appId: config.FIREBASE_APP_ID
      }, 'testApp');
      
      const testDb = getFirestore(testApp);
      await getDocs(collection(testDb, 'test'));
      return true;
    } catch (error) {
      console.error('Firebase test failed:', error);
      return false;
    }
  };

  const testGoogleSheetsAPI = async () => {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/test?key=${config.GOOGLE_SHEETS_API_KEY}`,
        { method: 'GET' }
      );
      const data = await response.json();
      return !data.error?.status?.includes('INVALID_ARGUMENT');
    } catch (error) {
      console.error('Google Sheets test failed:', error);
      return false;
    }
  };

  const testGoogleDocsAPI = async () => {
    try {
      const response = await fetch(
        `https://docs.googleapis.com/v1/documents/test?key=${config.GOOGLE_DOCS_API_KEY}`,
        { method: 'GET' }
      );
      const data = await response.json();
      return !data.error?.status?.includes('INVALID_ARGUMENT');
    } catch (error) {
      console.error('Google Docs test failed:', error);
      return false;
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResults({
      firebase: null,
      googleSheets: null,
      googleDocs: null
    });

    const results = {
      firebase: await testFirebaseConnection(),
      googleSheets: await testGoogleSheetsAPI(),
      googleDocs: await testGoogleDocsAPI()
    };

    setTestResults(results);
    setIsTesting(false);

    return Object.values(results).every(result => result);
  };

  const saveConfig = () => {
    localStorage.setItem('apiConfig', JSON.stringify(config));

    const envContent = Object.entries(config)
      .map(([key, value]) => `VITE_${key}=${value}`)
      .join('\n');

    try {
      const blob = new Blob([envContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = '.env';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Configuration saved! Please place the downloaded .env file in your project root directory.');
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'api') {
      const isValid = await handleTest();
      if (!isValid && !confirm('Some API tests failed. Do you still want to save the configuration?')) {
        return;
      }
    }
    
    saveConfig();
  };

  const TestIndicator = ({ status }: { status: boolean | null }) => {
    if (status === null) return null;
    return status ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-full shadow-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
        title="Configure Settings"
      >
        <Settings className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <div className="border-b border-gray-800">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('show')}
                    className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                      activeTab === 'show'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Show Information
                  </button>
                  <button
                    onClick={() => setActiveTab('api')}
                    className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                      activeTab === 'api'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    API Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('appearance')}
                    className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                      activeTab === 'appearance'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Appearance
                  </button>
                </nav>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'show' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Show Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-300">
                            Show Name
                          </label>
                          <div className="relative ml-2">
                            <button
                              type="button"
                              onMouseEnter={() => setActiveTooltip('SHOW_NAME')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                            {activeTooltip === 'SHOW_NAME' && (
                              <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                                <p>{helpInfo.SHOW_NAME.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={config.SHOW_NAME}
                          onChange={(e) => setConfig({ ...config, SHOW_NAME: e.target.value })}
                          className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter show name"
                        />
                      </div>
                      <div className="relative">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-300">
                            Number of Acts
                          </label>
                          <div className="relative ml-2">
                            <button
                              type="button"
                              onMouseEnter={() => setActiveTooltip('SHOW_ACTS')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                            {activeTooltip === 'SHOW_ACTS' && (
                              <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                                <p>{helpInfo.SHOW_ACTS.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={config.SHOW_ACTS}
                          onChange={(e) => setConfig({ ...config, SHOW_ACTS: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="relative md:col-span-2">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-300">
                            Total Number of Scenes
                          </label>
                          <div className="relative ml-2">
                            <button
                              type="button"
                              onMouseEnter={() => setActiveTooltip('SHOW_SCENES')}
                              onMouseLeave={() => setActiveTooltip(null)}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                            {activeTooltip === 'SHOW_SCENES' && (
                              <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                                <p>{helpInfo.SHOW_SCENES.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={config.SHOW_SCENES}
                          onChange={(e) => setConfig({ ...config, SHOW_SCENES: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Currency</h3>
                    </div>
                    <div className="relative">
                      <div className="flex items-center mb-1">
                        <label className="block text-sm font-medium text-gray-300">
                          Currency
                        </label>
                        <div className="relative ml-2">
                          <button
                            type="button"
                            onMouseEnter={() => setActiveTooltip('CURRENCY')}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                          {activeTooltip === 'CURRENCY' && (
                            <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                              <p>{helpInfo.CURRENCY.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <select
                        value={config.CURRENCY}
                        onChange={(e) => setConfig({ ...config, CURRENCY: e.target.value })}
                        className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#2A2A2A] rounded-lg border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Firebase Console</a></li>
                      <li>Enable Google Sheets and Docs APIs in your <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Google Cloud Console</a></li>
                      <li>Create API credentials in the Google Cloud Console</li>
                      <li>Hover over the help icon (?) next to each field for specific instructions</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Firebase Configuration</h3>
                      <TestIndicator status={testResults.firebase} />
                    </div>
                    {Object.entries(config)
                      .filter(([key]) => key.startsWith('FIREBASE'))
                      .map(([key, value]) => (
                        <div key={key} className="relative">
                          <div className="flex items-center mb-1">
                            <label className="block text-sm font-medium text-gray-300">
                              {key.replace('FIREBASE_', '')}
                            </label>
                            <div className="relative ml-2">
                              <button
                                type="button"
                                onMouseEnter={() => setActiveTooltip(key)}
                                onMouseLeave={() => setActiveTooltip(null)}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                              {activeTooltip === key && (
                                <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                                  <p>{helpInfo[key].description}</p>
                                  {helpInfo[key].link && (
                                    <a
                                      href={helpInfo[key].link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block mt-1 text-blue-400 hover:text-blue-300 relative z-[201]"
                                    >
                                      View in Console →
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                            className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter your ${key.toLowerCase().replace(/_/g, ' ')}`}
                          />
                        </div>
                      ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Google APIs Configuration</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Sheets:</span>
                        <TestIndicator status={testResults.googleSheets} />
                        <span className="text-sm text-gray-400 ml-2">Docs:</span>
                        <TestIndicator status={testResults.googleDocs} />
                      </div>
                    </div>
                    {Object.entries(config)
                      .filter(([key]) => key.startsWith('GOOGLE'))
                      .map(([key, value]) => (
                        <div key={key} className="relative">
                          <div className="flex items-center mb-1">
                            <label className="block text-sm font-medium text-gray-300">
                              {key.replace('GOOGLE_', '')}
                            </label>
                            <div className="relative ml-2">
                              <button
                                type="button"
                                onMouseEnter={() => setActiveTooltip(key)}
                                onMouseLeave={() => setActiveTooltip(null)}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                              {activeTooltip === key && (
                                <div className="absolute z-[200] w-64 p-2 mt-1 text-sm text-left text-white bg-[#2A2A2A] rounded-lg shadow-lg -left-32 top-6 border border-gray-800">
                                  <p>{helpInfo[key].description}</p>
                                  {helpInfo[key].link && (
                                    <a
                                      href={helpInfo[key].link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block mt-1 text-blue-400 hover:text-blue-300 relative z-[201]"
                                    >
                                      View in Console →
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                            className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter your ${key.toLowerCase().replace(/_/g, ' ')}`}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-lg border ${
                          theme === 'light'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-800 hover:border-gray-700'
                        } transition-all`}
                      >
                        <div className="bg-white rounded-md p-3 mb-2">
                          <Sun className="h-6 w-6 text-gray-900 mx-auto" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">Light</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-800 hover:border-gray-700'
                        } transition-all`}
                      >
                        <div className="bg-gray-900 rounded-md p-3 mb-2">
                          <Moon className="h-6 w-6 text-white mx-auto" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">Dark</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Type className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-white">Font</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="font-system"
                          name="font"
                          value="system"
                          checked={font === 'system'}
                          onChange={(e) => setFont(e.target.value as FontOption)}
                          className="mr-3"
                        />
                        <label htmlFor="font-system" className="text-gray-300">
                          System Default
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="font-opendyslexic"
                          name="font"
                          value="opendyslexic"
                          checked={font === 'opendyslexic'}
                          onChange={(e) => setFont(e.target.value as FontOption)}
                          className="mr-3"
                        />
                        <label htmlFor="font-opendyslexic" className="text-gray-300">
                          OpenDyslexic (Dyslexia-friendly)
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="font-arial"
                          name="font"
                          value="arial"
                          checked={font === 'arial'}
                          onChange={(e) => setFont(e.target.value as FontOption)}
                          className="mr-3"
                        />
                        <label htmlFor="font-arial" className="text-gray-300">
                          Arial
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="font-verdana"
                          name="font"
                          value="verdana"
                          checked={font === 'verdana'}
                          onChange={(e) => setFont(e.target.value as FontOption)}
                          className="mr-3"
                        />
                        <label htmlFor="font-verdana" className="text-gray-300">
                          Verdana
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                {activeTab === 'api' && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-4 py-2 bg-[#2A2A2A] text-gray-300 rounded-md hover:bg-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-colors"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}