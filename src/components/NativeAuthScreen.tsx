import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AuthForm } from './AuthForm.tsx';

interface NativeAuthScreenProps {
  onAuthSuccess?: () => void; // Example prop for handling success
}

export function NativeAuthScreen({ onAuthSuccess }: NativeAuthScreenProps) {
  // Handle successful authentication
  const handleClose = () => {

    // Navigate to the main app (tabs)
    router.replace('/(tabs)');
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
