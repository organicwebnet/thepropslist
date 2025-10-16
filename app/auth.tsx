import React, { useEffect, useState } from 'react';
import { NativeAuthScreen } from '../src/components/NativeAuthScreen';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { BiometricService } from '../src/services/biometric';

export default function AuthScreen() {
  const { user, status } = useAuth();
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricOk, setBiometricOk] = useState(true);

  useEffect(() => {
    (async () => {
      try {
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
      } catch (error) {
        console.error('Biometric authentication error:', error);
        setBiometricOk(false);
      }
      setBiometricChecked(true);
    })();
  }, []);

  if (user && status === 'in' && biometricChecked && biometricOk) {
    return <Redirect href="/(tabs)" />;
  }

  if (!biometricChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: 'white', marginTop: 16, fontSize: 16 }}>Preparing authentication...</Text>
      </View>
    );
  }

  return <NativeAuthScreen />;
}