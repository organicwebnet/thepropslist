import 'react-native-gesture-handler'; // THIS MUST BE AT THE VERY TOP
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'buffer';
import 'text-encoding-polyfill';
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
// import FirebaseTest from './src/components/FirebaseTest'; // Remove test component import

// Ignore specific warnings that are known and handled (Keep LogBox if desired)
// LogBox.ignoreLogs([
//   'Warning: Failed prop type',
//   ...
// ]);

// Render the main app with Expo Router and Firebase Provider
function App() {
  let expoRootProps = {};
  // Only use require.context for web (Webpack)
  if (Platform.OS === 'web' && typeof require.context === 'function') {
    expoRootProps.context = require.context('./app');
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FirebaseProvider>
        <ExpoRoot {...expoRootProps} />
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
}

// Register the root component
registerRootComponent(App);