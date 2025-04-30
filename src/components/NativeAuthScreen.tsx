import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { AuthForm } from './AuthForm'; // Import the actual AuthForm

interface NativeAuthScreenProps {
  // Add necessary props like onSignIn, onSignUp etc. later
  // We might need a navigation prop here eventually
  onAuthSuccess?: () => void; // Example prop for handling success
}

export function NativeAuthScreen({ onAuthSuccess }: NativeAuthScreenProps) {
  // Placeholder function for onClose needed by AuthForm
  const handleClose = () => {
    console.log("AuthForm closed/succeeded.");
    // TODO: Implement navigation logic here, e.g., navigate to tabs
    onAuthSuccess?.(); 
  };

  return (
    <View style={styles.container}>
      {/* Remove placeholder elements */}
      {/* <Text style={styles.title}>Authentication</Text> */}
      {/* <Text style={styles.message}>Native Auth Screen Placeholder</Text> */}
      {/* <Button title="Sign In (Placeholder)" onPress={() => alert('Sign In Native')}/> */}
      {/* <Button title="Sign Up (Placeholder)" onPress={() => alert('Sign Up Native')}/> */}
      
      {/* Render the actual AuthForm */}
      <AuthForm onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Keep container styles, but AuthForm might control its own background/padding
    // justifyContent: 'center', 
    // alignItems: 'center',
    // padding: 20, 
    backgroundColor: '#1F2937', // Or let AuthForm handle background
  },
  // Remove unused styles
  // title: { ... },
  // message: { ... },
}); 