import { Stack } from 'expo-router';
import { StrictMode } from 'react';
import { View } from 'react-native';
import { GestureProvider } from './contexts/GestureContext';

export default function RootLayout() {
  return (
    <StrictMode>
      <GestureProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              animation: 'slide_from_right',
            }}
          />
        </View>
      </GestureProvider>
    </StrictMode>
  );
} 