import * as React from 'react';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RichTextEditor } from './src/platforms/mobile/components/RichTextEditor';
import { AuthProvider } from './src/contexts/AuthContext';

const Stack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenDyslexic': require('./assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Editor" 
            component={RichTextEditor}
            options={{ title: 'Rich Text Editor' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
} 