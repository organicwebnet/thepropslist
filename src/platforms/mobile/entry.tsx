import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../../contexts/AuthContext';
import { FontProvider } from '../../contexts/FontContext';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './screens/HomeScreen';
import { PropsListScreen } from './screens/PropsListScreen';
import { PropFormScreen } from './screens/PropFormScreen';
import { NotificationHandler } from './features/notifications/NotificationHandler';
import { useFonts } from '../../shared/hooks/useFonts';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { FirebaseProvider } from '../../contexts/FirebaseContext';

const Stack = createNativeStackNavigator();

export default function MobileApp() {
  const { fontsLoaded, fontError } = useFonts();

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading fonts...</Text>
      </View>
    );
  }

  if (fontError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {fontError}
        </Text>
        <Text style={styles.errorSubText}>
          Please restart the app or contact support if the issue persists.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <FirebaseProvider>
        <AuthProvider>
          <FontProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen 
                  name="Home" 
                  component={HomeScreen}
                  options={{ title: 'Props Bible' }}
                />
                <Stack.Screen 
                  name="PropsList" 
                  component={PropsListScreen}
                  options={{ title: 'Props List' }}
                />
                <Stack.Screen 
                  name="PropForm" 
                  component={PropFormScreen}
                  options={{ title: 'Add/Edit Prop' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
            <NotificationHandler />
          </FontProvider>
        </AuthProvider>
      </FirebaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b5563',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
}); 