import { registerRootComponent } from 'expo';
import React from 'react';
import { LogBox } from 'react-native';
import { ExpoRoot } from 'expo-router';

// Ignore specific warnings that are known and handled
LogBox.ignoreLogs([
  'Warning: Failed prop type',
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  // Add this to ignore hostname-related warnings
  'Cannot read property \'hostname\' of undefined',
]);

// Create a simple app component that renders the router
function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

// Register the root component
registerRootComponent(App);