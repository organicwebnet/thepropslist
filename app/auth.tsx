import React, { useEffect, useState } from 'react';
import { NativeAuthScreen } from '../src/components/NativeAuthScreen';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function AuthScreen() {
  const { user, status } = useAuth();
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricOk, setBiometricOk] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const enabled = await AsyncStorage.getItem('biometricEnabled');
        if (enabled === 'true') {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && enrolled) {
            const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock The Props List' });
            setBiometricOk(!!res.success);
          }
        }
      } catch {}
      setBiometricChecked(true);
    })();
  }, []);

  if (user && status === 'in' && biometricChecked && biometricOk) {
    return <Redirect href="/(tabs)" />;
  }

  if (!biometricChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b' }}>
        <Text style={{ color: 'white' }}>Preparing...</Text>
      </View>
    );
  }

  return <NativeAuthScreen />;
}