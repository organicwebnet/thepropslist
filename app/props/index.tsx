import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

// app/props/index.tsx - This file should ideally not be directly navigated to.
// It acts as a catch-all or an explicit router file if no grouped route matches.

export default function PropsIndexScreen() {
  if (Platform.OS === 'web') {
    // This scenario implies that the (web) group route for /props didn't catch the navigation.
    // This could be due to direct navigation to /props instead of the grouped route.
    // Redirect to the main web props page which is in the (web) group.
    console.warn("[app/props/index.tsx] Reached on WEB. This usually means direct navigation to /props. Redirecting to app/(web)/props/index.tsx.");
    return <Redirect href="/(web)/props/" />;
  } else {
    // Native Platform
    console.error("[app/props/index.tsx] Reached on NATIVE. This screen should ideally be superseded by a specific native props list or dashboard. Displaying placeholder.");
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Native Props Route Reached (app/props/index.tsx)
        </Text>
        <Text style={styles.text}>
          This is a placeholder. Navigation should target a specific native screen for props.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#333', // Darker background for native placeholder
  },
  text: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#fff', // Light text for native placeholder
  },
}); 