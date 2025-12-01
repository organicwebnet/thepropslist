import React, { useEffect, useState, useRef } from 'react';
import { NativeAuthScreen } from '../src/components/NativeAuthScreen';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { BiometricService } from '../src/services/biometric';
import { useFirebase } from '../src/platforms/mobile/contexts/FirebaseContext';
import NetInfo from '@react-native-community/netinfo';

export default function AuthScreen() {
  const { user, status } = useAuth();
  const { service: firebaseService, isInitialized } = useFirebase();
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricOk, setBiometricOk] = useState(true);
  const [attemptingBiometricSignIn, setAttemptingBiometricSignIn] = useState(false);
  // Track if we just completed a biometric sign-in to avoid duplicate prompts
  const justCompletedBiometricSignIn = useRef(false);
  // Track initial user state to distinguish between "already signed in" vs "just signed in"
  const initialUserState = useRef<{ user: typeof user; status: typeof status } | null>(null);
  // Track if we've already attempted auto-prompt to prevent duplicates
  const hasAttemptedAutoPrompt = useRef(false);
  // Track if we're currently in the process of signing in to prevent race conditions
  const isSigningInRef = useRef(false);

  useEffect(() => {
    // Capture initial user state on first render
    if (initialUserState.current === null) {
      initialUserState.current = { user, status };
    }

    (async () => {
      try {
        // If user is already signed in, check for biometric unlock
        // Only do this if user was already signed in initially (not if they just signed in)
        if (user && status === 'in') {
          // Skip unlock check if we just completed biometric sign-in AND user was not initially signed in
          // This prevents unlock check from running after biometric sign-in
          if (justCompletedBiometricSignIn.current && !initialUserState.current?.user) {
            justCompletedBiometricSignIn.current = false; // Reset flag
            setBiometricOk(true);
            setBiometricChecked(true);
            return;
          }

          // Only do unlock check if user was already signed in when component mounted
          if (initialUserState.current?.user && initialUserState.current?.status === 'in') {
            const isBiometricEnabled = await BiometricService.isBiometricEnabled();
            if (isBiometricEnabled) {
              const result = await BiometricService.authenticate('Unlock The Props List');
              setBiometricOk(result.success);
              
              // Log specific error information for debugging
              if (!result.success) {
                console.error('Biometric authentication failed:', {
                  error: result.error,
                  errorCode: result.errorCode,
                  timestamp: new Date().toISOString()
                });
              }
            }
          } else {
            // User just signed in (not initially signed in) - skip unlock check
            setBiometricOk(true);
          }
        } 
        // If user is not signed in, check for stored credentials and attempt biometric sign-in
        // NOTE: We only auto-prompt once. If user cancels or it fails, show the login form with button
        else if (!user && status === 'out') {
          // Check network connectivity first
          const networkState = await NetInfo.fetch();
          const isOnline = networkState.isConnected ?? false;
          
          const hasStoredCredentials = await BiometricService.hasStoredCredentials();
          const isBiometricEnabled = await BiometricService.isBiometricEnabled();
          
          // Only auto-prompt if we haven't already attempted and user has credentials
          // This prevents duplicate prompts when AuthForm also shows biometric button
          // Also check isSigningInRef to prevent race conditions during rapid auth state changes
          // IMPORTANT: Skip sign-in attempt if offline - Firebase Auth requires network for new sign-ins
          if (hasStoredCredentials && isBiometricEnabled && isInitialized && firebaseService && !hasAttemptedAutoPrompt.current && !isSigningInRef.current && isOnline) {
            isSigningInRef.current = true; // Guard against race conditions
            hasAttemptedAutoPrompt.current = true; // Mark that we've attempted
            setAttemptingBiometricSignIn(true);
            
            let signInTimeout: NodeJS.Timeout | null = null;
            try {
              // Add timeout for sign-in attempt to prevent infinite loading
              signInTimeout = setTimeout(() => {
                console.warn('Sign-in attempt timed out');
                isSigningInRef.current = false;
                setAttemptingBiometricSignIn(false);
                setBiometricOk(false);
              }, 15000); // 15 second timeout
              
              const result = await BiometricService.authenticateAndGetCredentials('Sign in to The Props List');
              
              if (result.success && result.credentials) {
                try {
                  await firebaseService.signInWithEmailAndPassword(
                    result.credentials.email,
                    result.credentials.password
                  );
                  // Sign-in successful - mark that we just completed biometric sign-in
                  // This prevents the unlock check from running when user state updates
                  justCompletedBiometricSignIn.current = true;
                  setBiometricOk(true);
                } catch (signInError: any) {
                  console.error('Biometric sign-in failed:', signInError);
                  
                  // Check if error is network-related
                  const isNetworkError = signInError?.code === 'auth/network-request-failed' || 
                                        signInError?.message?.toLowerCase().includes('network') ||
                                        signInError?.message?.toLowerCase().includes('offline');
                  
                  if (isNetworkError) {
                    // Network error - don't clear credentials, just show login screen
                    console.warn('Sign-in failed due to network error. User can try again when online.');
                  } else {
                    // Other errors - clear invalid credentials
                    await BiometricService.clearStoredCredentials();
                  }
                  setBiometricOk(false);
                }
              } else if (result.errorCode === 'USER_CANCELLED') {
                // User cancelled biometric - proceed to normal login screen
                // Don't auto-prompt again, let them use the button in AuthForm
                setBiometricOk(true);
              } else {
                // Other errors - show login screen
                setBiometricOk(false);
              }
            } catch (error) {
              console.error('Error during biometric sign-in process:', error);
              setBiometricOk(false);
            } finally {
              // Always clear timeout and reset the signing in flag and loading state
              if (signInTimeout) {
                clearTimeout(signInTimeout);
              }
              isSigningInRef.current = false;
              setAttemptingBiometricSignIn(false);
            }
          } else {
            // No stored credentials, biometric not enabled, or offline - show login screen
            setBiometricOk(true);
          }
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
        setBiometricOk(false);
        setAttemptingBiometricSignIn(false);
      }
      setBiometricChecked(true);
    })();
  }, [user, status, isInitialized, firebaseService]);

  // If user is signed in and biometric check passed, redirect to main app
  if (user && status === 'in' && biometricChecked && biometricOk) {
    return <Redirect href="/(tabs)" />;
  }

  // Show loading while checking biometric or attempting sign-in
  if (!biometricChecked || attemptingBiometricSignIn) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>
          {attemptingBiometricSignIn ? 'Signing in...' : 'Preparing authentication...'}
        </Text>
      </View>
    );
  }

  // Show login screen if:
  // - User is not signed in AND biometric check is complete
  // - OR biometric authentication failed/cancelled
  if (!user && status === 'out' && biometricChecked) {
    return <NativeAuthScreen />;
  }

  // Default: show loading while waiting for auth state
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b' }}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>
        Loading...
      </Text>
    </View>
  );
}