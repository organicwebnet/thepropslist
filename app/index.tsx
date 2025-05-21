import React from 'react';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
// import { View, Text } from 'react-native';

export default function Index() {
  if (Platform.OS === 'web') {
    // Redirect to the main web props list page
    return <Redirect href="/(web)/props/" />;
  } else {
    // Redirect to the root of the native tabs navigator
    return <Redirect href="/(tabs)" />;
  }
  // Test redirect:
  // return <Redirect href="/props/new" />; 
} 