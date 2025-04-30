import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

interface NativeAuthScreenProps {
  // Add necessary props like onSignIn, onSignUp etc. later
}

export function NativeAuthScreen({}: NativeAuthScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication</Text>
      <Text style={styles.message}>Native Auth Screen Placeholder</Text>
      {/* Add TextInput and Buttons for actual auth later */}
      <Button title="Sign In (Placeholder)" onPress={() => alert('Sign In Native')}/>
      <Button title="Sign Up (Placeholder)" onPress={() => alert('Sign Up Native')}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1F2937',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 30,
  },
}); 