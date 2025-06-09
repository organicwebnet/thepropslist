import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';


SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs(['Support for defaultProps will be removed']);


export default function App() {
 
  return null;
} 