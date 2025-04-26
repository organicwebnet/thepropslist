import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the props tab, which is our main screen
  return <Redirect href="/(tabs)/props" />;
} 