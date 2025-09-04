import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// Context Providers
import { FirebaseProvider } from '../src/platforms/mobile/contexts/FirebaseContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { FontProvider } from '../src/contexts/FontContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { PropsProvider } from '../src/contexts/PropsContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    // Make status bar match app theme and hide white gaps on Pixel
    SystemUI.setBackgroundColorAsync('#18181b').catch(() => {});
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FirebaseProvider>
        <AuthProvider>
          <ThemeProvider>
            <FontProvider>
              <ShowsProvider>
                <PropsProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                  </Stack>
                  <StatusBar style="light" backgroundColor="#18181b" translucent />
                </PropsProvider>
              </ShowsProvider>
            </FontProvider>
          </ThemeProvider>
        </AuthProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
} 
