import { Stack } from 'expo-router';
import { StrictMode } from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '@/theme';
// import { GestureProvider } from './contexts/GestureContext'; // Commented out: Cannot find module

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <StrictMode>
      <ThemeProvider value={colorScheme === 'dark' ? darkTheme : lightTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        />
      </ThemeProvider>
    </StrictMode>
  );
} 