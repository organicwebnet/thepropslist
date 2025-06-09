import React from 'react';
import { Stack } from 'expo-router';
import { StrictMode } from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { darkTheme, lightTheme } from './styles/theme.ts';
// import { GestureProvider } from './contexts/GestureContext'; // Commented out: Cannot find module

// This is the layout for the root /src folder routes
// Often used for modals, settings, or routes outside the main tab/stack flow

const SrcLayout = () => {
    return (
        // @ts-ignore - Suppress TS2786 for Stack component
        <Stack
            screenOptions={{
                headerShown: true, // Example: Show header for src routes
                // Add other screen options as needed
            }}
        >
            {/* Define screens within the src folder here if needed */}
            {/* Example: <Stack.Screen name="settings" options={{ title: 'Settings' }} /> */}
        </Stack>
    );
};

export default SrcLayout; 