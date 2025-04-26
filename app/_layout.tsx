import React, { useEffect, type PropsWithChildren } from 'react';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { PropsProvider } from '../src/contexts/PropsContext';
import { ShowsProvider } from '../src/contexts/ShowsContext';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Add scheme configuration
export const scheme = "propsbible";

// Enhanced router settings
export const unstable_settings = {
  // Ensure any reloading uses the default route
  initialRouteName: '(tabs)',
  // Make sure navigation links work correctly
  router: {
    unstable_enableDirectoryLinks: true,
  },
};

// Setup safe URL handling for Android
const prefix = Linking.createURL('/');

// Set up a safer URL parser for expo-router (this helps with the hostname error)
const getSafeUrl = () => {
  try {
    const url = Linking.useURL();
    if (!url) return null;
    return url;
  } catch (e) {
    console.warn('Error parsing URL:', e);
    return null;
  }
};

function RootLayoutNav() {
  // Use the safe URL parser
  const url = getSafeUrl();

  // Fallback navigation in case of URL parsing errors
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Ensure we have a valid initial route on Android
      try {
        router.navigate('(tabs)');
      } catch (e) {
        console.warn('Navigation error:', e);
      }
    }
  }, []);

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

type ErrorBoundaryProps = PropsWithChildren<{
  error?: Error;
}>;

function ErrorBoundary({ error, children }: ErrorBoundaryProps) {
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong!</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
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
  const [loaded, error] = useFonts({
    'OpenDyslexic': require('../assets/fonts/OpenDyslexic-Regular.otf'),
  });

  useEffect(() => {
    const handleInitialization = async () => {
      try {
        if (error) {
          console.error('Error loading fonts:', error);
          await SplashScreen.hideAsync();
        } else if (loaded) {
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.error('Error handling initialization:', e);
      }
    };

    handleInitialization();
  }, [error, loaded]);

  if (!loaded && !error) {
    return (
      <View style={styles.errorContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary error={error || undefined}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <PropsProvider>
            <ShowsProvider>
              <RootLayoutNav />
            </ShowsProvider>
          </PropsProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
} 