import React from 'react';
import { Redirect } from 'expo-router';
// import { View, Text } from 'react-native';

export default function Index() {
  // Redirect to the web props list by default
  return <Redirect href="/props" />;
  // Test redirect:
  // return <Redirect href="/props/new" />; 
} 