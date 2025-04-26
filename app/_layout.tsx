import React, { useEffect, type PropsWithChildren } from 'react';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { PropsProvider } from '../src/contexts/PropsContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

// Comment out SplashScreen and Linking for now
// SplashScreen.preventAutoHideAsync();
// const prefix = Linking.createURL('/');

// Keep unstable_settings with initialRouteName set
export const unstable_settings = {
  initialRouteName: '(tabs)/props', 
  router: {
    unstable_enableDirectoryLinks: true,
  },
};

function RootLayoutNav() {
  // ... (Keep the Stack navigator definition as is)
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="+not-found"
        options={{
          title: 'Oops!',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

// Restore ErrorBoundary and its styles correctly
type ErrorBoundaryProps = PropsWithChildren<{
  error?: Error | null; // Allow null as error type
}>;

function ErrorBoundary({ error, children }: ErrorBoundaryProps) {
  if (error) {
    console.error("ErrorBoundary caught error:", error); // Log the error
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong!</Text>
        {/* Safely render error message */}
        <Text style={styles.errorMessage}>{String(error.message || 'Unknown error')}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  // Ensure styles are definitely uncommented
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  errorMessage: {
    color: 'red',
  },
});

export default function RootLayout() {
  // ... keep font loading commented for now ...

  // Keep ErrorBoundary commented, keep GestureHandler, Keep Auth/Theme Providers, comment out Props/Shows Providers
  return (
    // <ErrorBoundary error={undefined}> 
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            {/* <PropsProvider>
              <ShowsProvider> */}
                <RootLayoutNav />
              {/* </ShowsProvider>
            </PropsProvider> */}
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    // </ErrorBoundary>
  );
} 