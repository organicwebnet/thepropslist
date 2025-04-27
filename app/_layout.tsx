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

// Uncomment SplashScreen 
SplashScreen.preventAutoHideAsync();
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
  // Uncomment font loading
  const [fontsLoaded, fontError] = useFonts({
    'OpenDyslexic-Regular': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
    'OpenDyslexic-Italic': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after fonts have loaded or an error occurred
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Prevent rendering until the fonts have loaded or an error occurred
  if (!fontsLoaded && !fontError) {
    return null; // Render nothing or a basic loading indicator if preferred
  }

  // Handle font loading errors (optional, but recommended)
  if (fontError) {
      console.error("Font loading error in RootLayout:", fontError);
      // Optionally render an error message or fallback UI
      // For now, we allow rendering to continue with system fonts
  }

  // Keep ErrorBoundary commented, keep GestureHandler, Keep Auth/Theme Providers
  // Keep Props/Shows Providers uncommented
  return (
    // <ErrorBoundary error={undefined}> 
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <PropsProvider>
              <ShowsProvider>
                <RootLayoutNav />
              </ShowsProvider>
            </PropsProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    // </ErrorBoundary>
  );
} 