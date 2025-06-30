import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

// Placeholder for Edit Profile Screen

export default function EditProfileScreen() {
  console.log("--- Rendering: Native EditProfileScreen Placeholder ---");
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <Text style={styles.text}>Edit Profile Form Goes Here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1F2937', // Dark background
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
}); 
