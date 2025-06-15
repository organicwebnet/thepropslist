import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import RootLayout from './app/_layout';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#2B2E8C', '#6C3A8C', '#FF6A88', '#FFD36E', '#6EE7B7']}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}>
        <RootLayout />
      </LinearGradient>
    </GestureHandlerRootView>
  );
} 