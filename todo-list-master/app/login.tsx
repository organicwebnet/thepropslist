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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useRouter, Href } from 'expo-router';

// Assuming firebase config is in app/_firebase/config.ts
import { auth } from './_firebase/config'; 
import Colors from '../constants/Colors'; // Import Colors
import { useColorScheme } from '../components/useColorScheme'; // Import useColorScheme

export default function LoginScreen() { 
  const colorScheme = useColorScheme() ?? 'light'; // Get color scheme
  const colors = Colors[colorScheme]; // Get theme colors

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    // Add check for auth initialization
    if (!auth) {
        Alert.alert('Error', 'Authentication service is not ready. Please wait or refresh.');
        console.error("Login attempt failed: Auth service not initialized.");
        return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('Login successful');
      // Explicitly redirect to root after successful login
      router.replace('/'); 
      // Auth listener in (tabs)/_layout should handle redirect automatically
      // No need for router.replace here --> // We now DO need it here for robustness
    } catch (error: any) { 
      console.error('Login Error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      // Use modern error codes if available
      if (error && error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This user account has been disabled.';
            break;
          case 'auth/invalid-credential': // Covers user-not-found and wrong-password
             errorMessage = 'Invalid email or password. Please try again.';
             break;
          case 'auth/too-many-requests':
            errorMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
            break;
          default:
            // Log the specific code for unknown errors
            console.log("Unknown Login Error Code:", error.code);
            errorMessage = `Login failed: ${error.message || 'Please try again.'}`;
            break;
        }
      } 
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Login</Text>
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
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={colors.textSecondary}
        textContentType="password"
        autoComplete="current-password"
      />
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.buttonPrimaryBackground }, loading && styles.buttonDisabled]}
        onPress={handleLogin} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.buttonPrimaryText }]}>Login</Text>
        )}
      </TouchableOpacity>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <View style={styles.linkContainer}>
        <Text style={{ color: colors.textSecondary }}>Don't have an account? </Text>
        <Link href={"/signup" as Href} asChild disabled={loading}>
          <Pressable disabled={loading}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
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
    backgroundColor: '#007bff',
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
    backgroundColor: '#6c757d',
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