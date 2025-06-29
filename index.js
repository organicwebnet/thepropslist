// CRITICAL: Fix global object IMMEDIATELY before any imports
if (typeof global === 'undefined') {
  var global = this;
}
if (typeof globalThis === 'undefined') {
  globalThis = global;
}
// Ensure global object is properly set up for React Native
global.global = global;

// CRITICAL: Load polyfills FIRST before anything else
import './polyfills.js';

import 'react-native-gesture-handler'; // THIS MUST BE AT THE VERY TOP

// Global polyfills for React Native
import 'react-native-get-random-values';
import 'buffer';
import 'text-encoding-polyfill';

// Ensure global object exists
if (typeof global === 'undefined') {
  var global = globalThis;
}

// Polyfill for React Native
global.Buffer = global.Buffer || require('buffer').Buffer;

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';
import { Platform } from 'react-native';
// Only import global.css on web
if (Platform.OS === 'web') {
  require('./global.css');
}
// import { LogBox } from 'react-native'; // Comment out original imports if not needed for test
import { ExpoRoot } from 'expo-router'; // Uncomment Expo Router
import { FirebaseProvider } from './src/contexts/FirebaseContext'; // Uncomment FirebaseProvider
import { AuthContextProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { FontProvider } from './src/contexts/FontContext';
// import FirebaseTest from './src/components/FirebaseTest'; // Remove test component import

// Ignore specific warnings that are known and handled (Keep LogBox if desired)
// LogBox.ignoreLogs([
//   'Warning: Failed prop type',
//   ...
// ]);

// Render the main app with Expo Router and Firebase Provider
function App() {
  // Handle require.context properly for different platforms
  let contextProps = {};
  try {
    if (typeof require.context === 'function') {
      contextProps.context = require.context('./app');
    }
  } catch (error) {
    console.warn('require.context not available:', error);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FirebaseProvider>
        <AuthContextProvider>
          <ThemeProvider>
            <FontProvider>
              <ExpoRoot {...contextProps} />
            </FontProvider>
          </ThemeProvider>
        </AuthContextProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
}

// Register the root component
registerRootComponent(App);