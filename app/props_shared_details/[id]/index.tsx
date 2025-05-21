import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function SimplifiedNativePropDetailScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Native Prop Detail (Test)' }} />
      <Text style={styles.text}>This is the NATIVE Prop Detail Screen (Simplified for Testing)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // gray-900
  },
  text: {
    color: '#F9FAFB', // gray-50
    fontSize: 18,
  },
}); 