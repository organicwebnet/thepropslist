import React from 'react';
import { Stack } from 'expo-router';
import CameraScreenComponent from '../src/platforms/mobile/features/camera/CameraScreen'; // Use default import

export default function CameraRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Camera' }} />
      <CameraScreenComponent />
    </>
  );
} 