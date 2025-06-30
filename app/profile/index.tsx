import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext.tsx'; // Adjust path if needed

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Replace the current route stack with the home screen after sign out
      router.replace('/'); 
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  if (!user) {
    // Should ideally not happen if page is protected, but good practice
    return (
      <View style={styles.container}>
         <Stack.Screen options={{ title: 'Profile' }} />
        <Text style={styles.text}>No user logged in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      
      <Text style={styles.label}>Display Name:</Text>
      <Text style={styles.value}>{user.displayName || 'N/A'}</Text>

      <Text style={styles.label}>Email:</Text>
      <Text style={styles.value}>{user.email || 'N/A'}</Text>

      <View style={styles.buttonContainer}>
        <Button title="Sign Out" onPress={handleSignOut} color="#EF4444" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1F2937', // Dark background
    alignItems: 'flex-start', // Align items to the start
  },
  label: {
    fontSize: 16,
    color: '#9CA3AF', // Gray text
    marginTop: 15,
  },
  value: {
    fontSize: 18,
    color: '#FFFFFF', // White text
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 30,
    width: '100%', // Make button container take full width
  },
  text: { // For loading/error states
      color: 'white',
      fontSize: 18,
      textAlign: 'center',
      alignSelf: 'center', // Center text if it's the only element
      marginTop: 50,
  }
}); 
