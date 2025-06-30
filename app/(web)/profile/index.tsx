import React from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext.tsx'; // Adjust path if needed
import { useTheme } from '../../../src/contexts/ThemeContext.tsx'; // Import useTheme

// Renaming to WebProfileScreen for clarity
export default function WebProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme(); // Get theme state and setter
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
         {/* Stack.Screen might not be applicable here as it's inside a web layout slot */}
        <Text style={styles.text}>No user logged in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stack.Screen might not be applicable here as it's inside a web layout slot */}
      
      <Text style={styles.label}>Display Name:</Text>
      <Text style={styles.value}>{user.displayName || 'N/A'}</Text>

      <Text style={styles.label}>Email:</Text>
      <Text style={styles.value}>{user.email || 'N/A'}</Text>

      {/* --- Theme Selection --- */}
      <Text style={styles.label}>Theme:</Text>
      <View style={styles.themeButtonsContainer}>
        <TouchableOpacity 
          style={[styles.themeButton, theme === 'light' && styles.themeButtonActive]}
          onPress={() => setTheme('light')}
        >
          <Text style={styles.themeButtonText}>Light</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.themeButton, theme === 'dark' && styles.themeButtonActive]}
          onPress={() => setTheme('dark')}
        >
          <Text style={styles.themeButtonText}>Dark</Text>
        </TouchableOpacity>
      </View>
      {/* --- End Theme Selection --- */}

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
  themeButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4B5563', // Gray border
    marginRight: 10,
  },
  themeButtonActive: {
    backgroundColor: '#3B82F6', // Blue background for active
    borderColor: '#3B82F6',
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
