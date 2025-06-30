import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// Context Providers
import { FirebaseProvider } from '../src/contexts/FirebaseContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { PropsProvider } from '../src/contexts/PropsContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FirebaseProvider>
        <AuthProvider>
          <ThemeProvider>
            <ShowsProvider>
              <PropsProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                </Stack>
              </PropsProvider>
            </ShowsProvider>
          </ThemeProvider>
        </AuthProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
} 
