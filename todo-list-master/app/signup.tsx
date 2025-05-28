import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useRouter, Href } from 'expo-router';

// Assuming firebase config is in app/_firebase/config.ts
import { auth } from './_firebase/config'; 
import Colors from '../constants/Colors'; // Import Colors
import { useColorScheme } from '../components/useColorScheme'; // Import useColorScheme

export default function SignupScreen() {
  const colorScheme = useColorScheme() ?? 'light'; // Get color scheme
  const colors = Colors[colorScheme]; // Get theme colors

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters long.');
      return;
    }
    // Add check for auth initialization
    if (!auth) {
        Alert.alert('Error', 'Authentication service is not ready. Please wait or refresh.');
        console.error("Signup attempt failed: Auth service not initialized.");
        return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      console.log('Signup successful');
      // Auth listener in (tabs)/_layout should handle redirect automatically
      // No need for router.replace here
    } catch (error: any) {
      console.error('Signup Error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      // Use modern error codes if available
      if (error && error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already registered. Please login instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use at least 6 characters.';
            break;
          default:
             // Log the specific code for unknown errors
             console.log("Unknown Signup Error Code:", error.code);
             errorMessage = `Signup failed: ${error.message || 'Please try again.'}`;
            break;
        }
      }
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textSecondary}
        textContentType="emailAddress"
        autoComplete="email"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
        placeholder="Password (min. 6 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={colors.textSecondary}
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor={colors.textSecondary}
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.buttonPrimaryBackground }, loading && styles.buttonDisabled]}
        onPress={handleSignup} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.buttonPrimaryText }]}>Sign Up</Text>
        )}
      </TouchableOpacity>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <View style={styles.linkContainer}>
        <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
        <Link href={"/login" as Href} asChild disabled={loading}>
          <Pressable disabled={loading}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Log In</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

// Basic Styles (adapt from template or previous code)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 35,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#495057',
  },
  button: {
    backgroundColor: '#28a745', // Green color for signup
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    minHeight: 48, 
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#ced4da',
    width: '100%',
    marginVertical: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
}); 