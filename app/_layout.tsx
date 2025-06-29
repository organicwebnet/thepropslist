// import '../global.css'; // REMOVE THIS LINE - Incorrect for native
// Conditionally import global CSS for web
// if (Platform.OS === 'web') {
//   require('../global.css'); 
// }

import React, { useEffect, type PropsWithChildren } from 'react';
import { Slot, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/ThemeContext.tsx';
import { PropsProvider } from '../src/contexts/PropsContext.tsx';
import { ShowsProvider } from '../src/contexts/ShowsContext.tsx';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext.tsx';
import { FontProvider, useFont, FontChoice } from '../src/contexts/FontContext.tsx';
import { NativeAuthScreen } from '../src/components/NativeAuthScreen.tsx';
import { View, ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { FirebaseProvider } from '@/contexts/FirebaseContext.tsx';
import { AuthForm } from '../src/components/AuthForm.tsx';
// import * as SplashScreen from 'expo-splash-screen'; // Commented out

// SplashScreen.preventAutoHideAsync(); // Commented out

// Original RootLayoutNav (slightly simplified for now)
function RootLayoutNav() {
  console.log("--- Rendering: RootLayoutNav (Mobile) with Stack & Slot ---");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        headerTransparent: true,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="taskBoard/[boardId]"
        options={{
          headerShown: true,
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack>
  );
}

// Restore ErrorBoundary and its styles correctly
const errorBoundaryStyles = StyleSheet.create({
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

function ErrorBoundary({ error, children }: PropsWithChildren<{ error?: Error | null}>) {
  if (error) {
    console.error("ErrorBoundary caught error:", error);
    return (
      <View style={errorBoundaryStyles.errorContainer}>
        <Text style={errorBoundaryStyles.errorTitle}>Something went wrong!</Text>
        <Text style={errorBoundaryStyles.errorMessage}>{String(error.message || 'Unknown error')}</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const appContentStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function AppContent({ currentFont }: { currentFont: FontChoice }) {
  console.log("--- Rendering: AppContent --- ");
  const { user, loading: authLoading, error: authError } = useAuth();
  // console.log(`--- AppContent State: authLoading=${authLoading}, user=${user?.uid}, authError=${authError}, font=${currentFont} ---`);

  // Define base text style based on currentFont
  // const baseTextStyle = {
  //   fontFamily: currentFont === 'openDyslexic' ? 'OpenDyslexic-Regular' : undefined, // undefined will use system default
  //   // Add other global text properties if needed, e.g., color from theme
  // };

  // This is a conceptual attempt. Text components need to individually apply this.
  // It's more common to create a <StyledText> component that consumes the font context.

  if (authLoading) {
    console.log("--- AppContent: Showing loading indicator --- ");
    return (
      <View style={[appContentStyles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  // Pass authError to ErrorBoundary if it exists
  // Note: This ErrorBoundary will only catch errors from its children (AppContent's return values here)
  // For a more global error boundary, it would need to be higher up.
  if (authError) {
      return <ErrorBoundary error={authError}><View style={{ backgroundColor: 'transparent' }} /></ErrorBoundary>; // Render error via ErrorBoundary
  }

  if (user) {
      console.log(`--- AppContent: User logged in, rendering for Platform: ${Platform.OS} --- `);
      if (Platform.OS === 'web') {
        // For web, you might apply to a root element or rely on CSS
        // Removed baseTextStyle from here
        return <View style={{flex: 1, backgroundColor: 'transparent'}}><Slot /></View>;
      } else {
        // For mobile, wrap RootLayoutNav, hoping Text children inherit, or use defaultProps if possible (less standard)
        // Removed baseTextStyle from here
        return <View style={{flex: 1, backgroundColor: 'transparent'}}><RootLayoutNav /></View>;
      }
  } else {
    // No user, show NativeAuthScreen for mobile. For web, show AuthForm.
    console.log("--- AppContent: Showing AuthForm (Web) or NativeAuthScreen (Mobile) --- ");
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
          <AuthForm onClose={() => {}} />
        </View>
      );
    } else {
      return <NativeAuthScreen />;
    }
  }
}

// MainApp is kept but not rendered directly if FontProvider is removed, to avoid useFont() crash
function MainApp() {
  console.log("--- Rendering: MainApp (consumes font context) ---");
  const { font: chosenFont, isLoadingFont } = useFont(); 
  const [expoFontsLoaded, expoFontError] = useFonts({
    'OpenDyslexic-Regular': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
    'OpenDyslexic-Italic': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
  });

  useEffect(() => {
    // if (expoFontsLoaded && !isLoadingFont && !expoFontError) { // Commented out
    //   SplashScreen.hideAsync(); // Commented out
    // }
  }, [expoFontsLoaded, isLoadingFont, expoFontError]);

  if (!expoFontsLoaded || isLoadingFont) {
    return (
      <View style={{flex:1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent'}}>
        <ActivityIndicator size="large" color="#ffd33d" />
        <Text style={{color: '#ffd33d', marginTop: 16}}>Loading custom fonts...</Text>
      </View>
    );
  }

  if (expoFontError) {
      console.error("Expo Font loading error in MainApp:", expoFontError);
      // SplashScreen.hideAsync().catch(e => console.warn("SplashScreen.hideAsync failed in error path:", e)); // Commented out
      return (
        <View style={{flex:1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent'}}>
            <Text style={{color: 'orange', padding: 10, textAlign: 'center'}}>
                There was an error loading custom fonts. The application will use default fonts.
            </Text>
            <AppContent currentFont={'default'} />
        </View>
      );
  }
  
  return <AppContent currentFont={chosenFont} />;
}

// SplashScreen.preventAutoHideAsync(); // Also comment out this one if it was duplicated, ensure only one instance if re-enabled

export default function RootLayout() {
  console.log("--- Rendering: RootLayout (Restoring Full App) ---");
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <FirebaseProvider>
          <ThemeProvider>
            <ShowsProvider>
              <PropsProvider>
                <FontProvider>
                  <ErrorBoundary>
                    <MainApp />
                  </ErrorBoundary>
                </FontProvider>
              </PropsProvider>
            </ShowsProvider>
          </ThemeProvider>
        </FirebaseProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
} 