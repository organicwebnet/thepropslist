import React from 'react';
import { Stack } from 'expo-router';
import CameraScreen from '../src/platforms/mobile/features/camera/CameraScreen.tsx';

export default function CameraRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Camera' }} />
      <CameraScreen />
    </>
  );
} 
