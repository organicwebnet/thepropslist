import React from 'react';
import { Redirect } from 'expo-router';
// import { View, Text } from 'react-native';

export default function Index() {
  // Restore the original redirect
  return <Redirect href="/(tabs)/props" />;
  // Test redirect:
  // return <Redirect href="/props/new" />; 
} 