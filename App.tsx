import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

console.log('[App] Starting app initialization');

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Error preventing splash screen auto-hide:', error);
});

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loadingText}>Loading resources...</Text>
    </SafeAreaView>
  );
}

function ErrorScreen({ error }: { error: Error | string }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.errorText}>An error occurred</Text>
      <Text style={[styles.errorText, { fontSize: 14 }]}>
        {error instanceof Error ? error.message : error}
      </Text>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'OpenDyslexic-Regular': require('./assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('./assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
    'OpenDyslexic-Italic': require('./assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.error('Error hiding splash screen:', e);
      }
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      onLayoutRootView();
    }
  }, [fontsLoaded, onLayoutRootView]);

  if (!fontsLoaded) {
    if (fontError) {
      console.error('Font loading error:', fontError);
      return <ErrorScreen error={fontError} />;
    }
    return <LoadingScreen />;
  }

  // Wrap the app in GestureHandlerRootView for proper gesture handling
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <View style={styles.content}>
          <Text style={styles.mainText}>
            Props Bible
          </Text>
          <Text style={[styles.mainText, { fontFamily: 'OpenDyslexic-Bold' }]}>
            Welcome to Props Bible
          </Text>
          <Text style={[styles.mainText, { fontFamily: 'OpenDyslexic-Italic' }]}>
            Your digital props management solution
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System'
    })
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System'
    })
  },
  mainText: {
    fontSize: 24,
    color: '#000',
    marginVertical: 10,
    fontFamily: 'OpenDyslexic-Regular',
    textAlign: 'center',
  }
}); 