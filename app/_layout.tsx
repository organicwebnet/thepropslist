import '../global.css'; // Import Tailwind styles
import React, { useEffect, type PropsWithChildren } from 'react';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { PropsProvider } from '../src/contexts/PropsContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { AuthForm } from '../src/components/AuthForm';
import { TopNavBar } from '../src/components/navigation/TopNavBar';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
  console.log("--- Rendering: RootLayoutNav (Mobile) ---");
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
        gestureEnabled: false, // Keep gestureEnabled if needed
        headerShown: false // Hide header for the group
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!', presentation: 'modal' }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function AppContent() {
  console.log("--- Rendering: AppContent --- ");
  const { user, loading: authLoading, error: authError } = useAuth();
  console.log(`--- AppContent State: authLoading=${authLoading}, user=${user?.uid}, authError=${authError} ---`);

  if (authLoading) {
    console.log("--- AppContent: Showing loading indicator --- ");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    console.log("--- AppContent: Showing AuthForm --- ");
    return <AuthForm onClose={() => console.log("AuthForm closed/completed")} />;
  }

  console.log(`--- AppContent: User logged in, rendering for Platform: ${Platform.OS} --- `);
  // If user is logged in, show platform-specific layout
  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'web' ? (
        // --- Web Layout ---
        <>
          <TopNavBar />
          {/* Render a base Stack for web. Expo Router should map web routes. */}
          <Stack screenOptions={{ headerShown: false }}>
            {/* Define web-specific screens or groups here if needed, */}
            {/* or let Expo Router find top-level/ (web) group routes. */}
            {/* Example if you have (web) layout: <Stack.Screen name="(web)" /> */}
          </Stack>
        </>
      ) : (
        // --- Mobile Layout ---
        <RootLayoutNav /> // Keep using the existing Stack Nav that points to (tabs)
      )}
    </View>
  );
}

export default function RootLayout() {
  console.log("--- Rendering: RootLayout --- ");
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

  // Wrap AppContent with providers
  console.log("--- RootLayout: Rendering Providers + AppContent --- ");
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <ShowsProvider>
            <PropsProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </PropsProvider>
          </ShowsProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
} 