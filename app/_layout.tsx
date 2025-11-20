import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

// Context Providers
import { FirebaseProvider } from '../src/platforms/mobile/contexts/FirebaseContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { FontProvider } from '../src/contexts/FontContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { PropsProvider } from '../src/contexts/PropsContext';
import { IssueLoggerWidget } from '../src/components/IssueLoggerWidget';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    // Make status bar match app theme and hide white gaps on Pixel
    SystemUI.setBackgroundColorAsync('#18181b').catch(() => {});
  }, []);

  // For web platform, render a simplified version without Firebase
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <ThemeProvider>
          <FontProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="light" backgroundColor="#18181b" translucent={false} />
          </FontProvider>
        </ThemeProvider>
      </View>
    );
  }

  // For mobile platforms, use full Firebase setup
  return (
    <SafeAreaProvider>
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
                      <Stack.Screen name="c/[containerId]" options={{ headerShown: true }} />
                      <Stack.Screen name="view/prop/[propId]" options={{ headerShown: true }} />
                      <Stack.Screen name="feedback" options={{ headerShown: true }} />
                    </Stack>
                    <IssueLoggerWidget
                      enabled={__DEV__}
                    />
                    <StatusBar style="light" backgroundColor="#18181b" translucent={false} />
                  </PropsProvider>
                </ShowsProvider>
              </FontProvider>
            </ThemeProvider>
          </AuthProvider>
        </FirebaseProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
} 
